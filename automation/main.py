"""FastAPI app — /scrape, /apply, /health.

All non-health endpoints require header ``X-API-Key`` matching the
``AUTOMATION_API_KEY`` env var. Loaded from .env via python-dotenv.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Literal, Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, status
from pydantic import BaseModel, Field

load_dotenv()

from filler.apply import submit_application
from scrapers.base import JobListing
from scrapers.ghost_detector import filter_ghost_jobs
from scrapers.greenhouse import search_greenhouse
from scrapers.indeed import search_indeed
from scrapers.lever import search_lever
from scrapers.linkedin import search_linkedin
from scrapers.workday import search_workday
from stealth.engine import can_apply


logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
)
logger = logging.getLogger("hireloop.api")


VERSION = "1.0.0"
SUPPORTED_PLATFORMS = {"linkedin", "indeed", "greenhouse", "lever", "workday"}


app = FastAPI(
    title="HireLoop Automation Service",
    version=VERSION,
    description="Selenium scraping + Stealth Engine + form filling.",
)


async def require_api_key(x_api_key: Optional[str] = Header(default=None)) -> None:
    expected = os.environ.get("AUTOMATION_API_KEY")
    if not expected:
        # Fail-closed: never allow access when the shared secret is missing.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AUTOMATION_API_KEY not configured on server",
        )
    if not x_api_key or x_api_key != expected:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid API key")


# ----- /scrape -----------------------------------------------------------------


PlatformLiteral = Literal["linkedin", "indeed", "greenhouse", "lever", "workday"]


class ScrapeRequest(BaseModel):
    platforms: List[PlatformLiteral] = Field(default_factory=list)
    query: str = ""
    location: str = ""
    # Shorthand: single company slug applied to greenhouse + lever when their
    # per-platform slug list is empty. Lets callers send {"platforms":["greenhouse"],"company":"anthropic"}.
    company: Optional[str] = None
    # Per-platform extras (optional). Only used when relevant.
    greenhouse_slugs: List[str] = Field(default_factory=list)
    lever_slugs: List[str] = Field(default_factory=list)
    workday_urls: List[str] = Field(default_factory=list)


class ScrapeResponse(BaseModel):
    jobs: List[JobListing]
    ghost_count: int
    per_platform_counts: Dict[str, int]


def _scrape_for_platform(
    platform: str,
    *,
    query: str,
    location: str,
    greenhouse_slugs: List[str],
    lever_slugs: List[str],
    workday_urls: List[str],
) -> List[JobListing]:
    try:
        if platform == "indeed":
            return search_indeed(query, location)
        if platform == "linkedin":
            return search_linkedin(query, location)
        if platform == "greenhouse":
            results: List[JobListing] = []
            for slug in greenhouse_slugs:
                results.extend(search_greenhouse(slug, query))
            return results
        if platform == "lever":
            results = []
            for slug in lever_slugs:
                results.extend(search_lever(slug, query))
            return results
        if platform == "workday":
            results = []
            for url in workday_urls:
                results.extend(search_workday(url, query))
            return results
    except Exception as exc:  # noqa: BLE001 — never let one scraper kill the request
        logger.exception("scrape: %s failed: %s", platform, exc)
        return []
    return []


@app.post("/scrape", response_model=ScrapeResponse, dependencies=[Depends(require_api_key)])
async def scrape_endpoint(body: ScrapeRequest) -> ScrapeResponse:
    platforms = [p for p in body.platforms if p in SUPPORTED_PLATFORMS]
    if not platforms:
        platforms = list(SUPPORTED_PLATFORMS)

    greenhouse_slugs = body.greenhouse_slugs or ([body.company] if body.company else [])
    lever_slugs = body.lever_slugs or ([body.company] if body.company else [])

    all_jobs: List[JobListing] = []
    per_platform: Dict[str, int] = {}

    for platform in platforms:
        found = _scrape_for_platform(
            platform,
            query=body.query,
            location=body.location,
            greenhouse_slugs=greenhouse_slugs,
            lever_slugs=lever_slugs,
            workday_urls=body.workday_urls,
        )
        per_platform[platform] = len(found)
        all_jobs.extend(found)

    kept, ghosts = filter_ghost_jobs(all_jobs)
    logger.info(
        "scrape: platforms=%s total=%d kept=%d ghosts=%d",
        platforms,
        len(all_jobs),
        len(kept),
        len(ghosts),
    )
    return ScrapeResponse(jobs=kept, ghost_count=len(ghosts), per_platform_counts=per_platform)


# ----- /apply ------------------------------------------------------------------


class ApplyRequest(BaseModel):
    application_url: str
    platform: PlatformLiteral
    tailored_cv: Dict[str, Any] = Field(default_factory=dict)
    cover_letter: str
    user_preferences: Dict[str, Any] = Field(default_factory=dict)
    user_id: str
    skip_delay: bool = False


class ApplyResponse(BaseModel):
    success: bool
    screenshot_b64: str
    message: str
    reason: Optional[str] = None
    fields_filled: int = 0
    dry_run: bool = False
    retry_after: Optional[int] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


def _retry_after_from_reason(reason: Optional[str]) -> Optional[int]:
    if not reason:
        return None
    if reason.startswith("min_gap:"):
        # Format: "min_gap:<seconds>s"
        digits = "".join(ch for ch in reason.split(":", 1)[1] if ch.isdigit())
        if digits:
            try:
                return int(digits)
            except ValueError:
                return None
    if reason.startswith("daily_limit"):
        return 24 * 3600
    if reason.startswith("outside_hours"):
        return 3600
    return None


@app.post("/apply", response_model=ApplyResponse, dependencies=[Depends(require_api_key)])
async def apply_endpoint(body: ApplyRequest) -> ApplyResponse:
    allowed, reason = can_apply(body.platform, body.user_id)
    if not allowed:
        logger.info(
            "apply: rate-limited user=%s platform=%s reason=%s",
            body.user_id,
            body.platform,
            reason,
        )
        return ApplyResponse(
            success=False,
            screenshot_b64="",
            message="blocked by stealth engine",
            reason=reason or "rate_limit",
            retry_after=_retry_after_from_reason(reason),
        )

    result = submit_application(
        application_url=body.application_url,
        platform=body.platform,
        tailored_cv=body.tailored_cv,
        cover_letter=body.cover_letter,
        user_preferences=body.user_preferences,
        user_id=body.user_id,
        skip_delay=body.skip_delay,
    )
    return ApplyResponse(
        retry_after=_retry_after_from_reason(result.reason),
        **result.to_dict(),
    )


# ----- /health -----------------------------------------------------------------


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    version: str = VERSION


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse()


if __name__ == "__main__":  # pragma: no cover
    import uvicorn

    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
