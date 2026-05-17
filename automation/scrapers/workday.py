"""Workday scraper — generic CXS endpoint.

Most Workday-hosted careers sites expose a JSON CXS endpoint at:

    {tenant_url}/wday/cxs/{tenant}/{site}/jobs

We POST `{ "appliedFacets": {}, "limit": 20, "offset": 0, "searchText": query }`
and parse `jobPostings`. Caller supplies the full tenant URL.
"""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import List, Optional

import requests

from scrapers.base import JobListing

logger = logging.getLogger("hireloop.scrapers.workday")

TIMEOUT = 20
MAX_RESULTS = 20


_CXS_PATTERN = re.compile(r"https?://[^/]+/wday/cxs/([^/]+)/([^/]+)/jobs", re.IGNORECASE)


def _normalise_endpoint(workday_url: str) -> Optional[str]:
    """Accept either the human-facing careers URL or a CXS endpoint."""
    if not workday_url:
        return None
    if _CXS_PATTERN.match(workday_url):
        return workday_url

    m = re.search(r"https?://([^/]+)/(?:en-US/)?([^/]+)/?$", workday_url)
    if not m:
        return None
    host, site = m.group(1), m.group(2)
    tenant = host.split(".")[0]
    return f"https://{host}/wday/cxs/{tenant}/{site}/jobs"


def _parse_posted(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    lower = value.lower()
    now = datetime.now(timezone.utc)
    if "today" in lower or "just" in lower:
        return now
    m = re.search(r"(\d+)\+?\s*(day|week|month)", lower)
    if not m:
        return None
    n = int(m.group(1))
    unit = m.group(2)
    from datetime import timedelta

    if unit == "day":
        return now - timedelta(days=n)
    if unit == "week":
        return now - timedelta(weeks=n)
    if unit == "month":
        return now - timedelta(days=n * 30)
    return None


def search_workday(workday_url: str, query: str = "", company: Optional[str] = None) -> List[JobListing]:
    """Search a Workday tenant. ``workday_url`` can be the careers URL or the CXS endpoint."""
    endpoint = _normalise_endpoint(workday_url)
    if not endpoint:
        logger.warning("workday: could not derive CXS endpoint from %s", workday_url)
        return []

    payload = {
        "appliedFacets": {},
        "limit": MAX_RESULTS,
        "offset": 0,
        "searchText": query or "",
    }
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
        ),
    }
    logger.info("workday: POST %s", endpoint)

    try:
        resp = requests.post(endpoint, json=payload, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as exc:
        logger.warning("workday: request failed: %s", exc)
        return []

    if resp.status_code != 200:
        logger.warning("workday: HTTP %d for %s", resp.status_code, endpoint)
        return []

    try:
        data = resp.json()
    except ValueError:
        logger.warning("workday: invalid JSON for %s", endpoint)
        return []

    postings = data.get("jobPostings") or []
    company_name = company or endpoint.split("/wday/cxs/")[-1].split("/")[0]
    base = endpoint.split("/wday/cxs/")[0]
    results: List[JobListing] = []

    for posting in postings[:MAX_RESULTS]:
        title = posting.get("title")
        if not title:
            continue
        external_path = posting.get("externalPath") or ""
        external_id = posting.get("bulletFields", [None])[0] or external_path
        location = posting.get("locationsText") or posting.get("location")
        posted_text = posting.get("postedOn")
        posted_at = _parse_posted(posted_text)
        application_url = f"{base}{external_path}" if external_path else endpoint
        remote = bool(location and "remote" in str(location).lower())

        results.append(
            JobListing(
                platform="workday",
                external_id=str(external_id),
                title=title,
                company=company_name,
                location=location if isinstance(location, str) else None,
                remote=remote,
                application_url=application_url,
                posted_at=posted_at,
            )
        )

    logger.info("workday: parsed %d listings", len(results))
    return results
