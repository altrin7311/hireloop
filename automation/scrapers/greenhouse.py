"""Greenhouse scraper — uses the public Boards API.

Greenhouse exposes ``https://boards-api.greenhouse.io/v1/boards/{slug}/jobs``
returning JSON with title, location, absolute_url, updated_at, content (HTML).
No auth required.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from html import unescape
from re import sub
from typing import List, Optional

import requests

from scrapers.base import JobListing

logger = logging.getLogger("hireloop.scrapers.greenhouse")

API_BASE = "https://boards-api.greenhouse.io/v1/boards"
TIMEOUT = 15


def _strip_html(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    no_tags = sub(r"<[^>]+>", " ", raw)
    return sub(r"\s+", " ", unescape(no_tags)).strip()


def _parse_iso(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        if value.endswith("Z"):
            value = value[:-1] + "+00:00"
        return datetime.fromisoformat(value).astimezone(timezone.utc)
    except ValueError:
        return None


def search_greenhouse(company_slug: str, query: Optional[str] = None) -> List[JobListing]:
    """Hit Greenhouse Boards API for a company. Filters by query (case-insensitive in title)."""
    try:
        url = f"{API_BASE}/{company_slug}/jobs?content=true"
        print(f"[greenhouse:{company_slug}] GET {url}")
        logger.info("greenhouse: GET %s", url)

        resp = requests.get(url, timeout=TIMEOUT, headers={"Accept": "application/json"})
        print(f"[greenhouse:{company_slug}] HTTP {resp.status_code} raw[:500]={resp.text[:500]!r}")

        if resp.status_code != 200:
            logger.warning("greenhouse: HTTP %d for slug=%s", resp.status_code, company_slug)
            return []

        payload = resp.json()
        jobs = payload.get("jobs", [])
        q = (query or "").lower().strip()
        results: List[JobListing] = []

        for job in jobs:
            title = job.get("title")
            if not title:
                continue
            if q and q not in title.lower():
                continue

            location = (job.get("location") or {}).get("name")
            remote = bool(location and "remote" in location.lower())
            description = _strip_html(job.get("content"))
            absolute_url = job.get("absolute_url") or ""
            external_id = str(job.get("id") or absolute_url)
            posted_at = _parse_iso(job.get("updated_at") or job.get("first_published"))

            results.append(
                JobListing(
                    platform="greenhouse",
                    external_id=external_id,
                    title=title,
                    company=company_slug,
                    location=location,
                    remote=remote,
                    description=description,
                    application_url=absolute_url,
                    posted_at=posted_at,
                )
            )

        print(f"[greenhouse:{company_slug}] parsed {len(results)} listings (filtered by {q or None!r})")
        logger.info("greenhouse: parsed %d listings (filtered by %r)", len(results), q or None)
        return results
    except Exception as e:
        print(f"ERROR: greenhouse scraper failed for slug={company_slug!r}: {type(e).__name__}: {e}")
        logger.exception("greenhouse: unexpected failure for slug=%s", company_slug)
        return []
