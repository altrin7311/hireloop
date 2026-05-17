"""LinkedIn jobs scraper — public guest endpoint, no auth.

LinkedIn blocks aggressively. We use the public ``guest_jobs/api/jobPostings/search``
endpoint with realistic headers. Even so, 429/302 challenges are common.
Empty results = soft failure.
"""

from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from urllib.parse import urlencode

import requests
from bs4 import BeautifulSoup

from scrapers.base import JobListing

logger = logging.getLogger("hireloop.scrapers.linkedin")

SEARCH_URL = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
JOB_VIEW_URL = "https://www.linkedin.com/jobs/view"
MAX_RESULTS = 20
TIMEOUT = 15

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.linkedin.com/jobs/search",
}


_RELATIVE_DATE_RE = re.compile(r"(\d+)\s*(day|hour|minute|month|week)s?\s*ago", re.IGNORECASE)
_JOB_ID_RE = re.compile(r"-(\d+)\?")


def _parse_relative(text: Optional[str]) -> Optional[datetime]:
    if not text:
        return None
    m = _RELATIVE_DATE_RE.search(text)
    if not m:
        return None
    n = int(m.group(1))
    unit = m.group(2).lower()
    now = datetime.now(timezone.utc)
    if unit == "minute":
        return now - timedelta(minutes=n)
    if unit == "hour":
        return now - timedelta(hours=n)
    if unit == "day":
        return now - timedelta(days=n)
    if unit == "week":
        return now - timedelta(weeks=n)
    if unit == "month":
        return now - timedelta(days=n * 30)
    return None


def search_linkedin(query: str, location: str = "", start: int = 0) -> List[JobListing]:
    params = {"keywords": query, "location": location, "start": str(start)}
    url = f"{SEARCH_URL}?{urlencode(params)}"
    logger.info("linkedin: GET %s", url)

    try:
        resp = requests.get(url, headers=DEFAULT_HEADERS, timeout=TIMEOUT)
    except requests.RequestException as exc:
        logger.warning("linkedin: request failed: %s", exc)
        return []

    if resp.status_code != 200:
        logger.warning("linkedin: HTTP %d (likely throttled)", resp.status_code)
        return []

    soup = BeautifulSoup(resp.text, "lxml")
    cards = soup.select("li") or soup.select("div.base-card")
    results: List[JobListing] = []

    for card in cards[:MAX_RESULTS]:
        link_el = card.select_one("a.base-card__full-link") or card.select_one("a")
        href = link_el.get("href") if link_el else None
        if not href:
            continue

        title_el = card.select_one("h3.base-search-card__title") or card.select_one("h3")
        company_el = card.select_one("h4.base-search-card__subtitle a") or card.select_one("h4")
        location_el = card.select_one(".job-search-card__location")
        time_el = card.select_one("time")

        title = title_el.get_text(strip=True) if title_el else None
        company = company_el.get_text(strip=True) if company_el else None
        loc_text = location_el.get_text(strip=True) if location_el else None

        posted_at: Optional[datetime] = None
        if time_el and time_el.has_attr("datetime"):
            try:
                posted_at = datetime.fromisoformat(time_el["datetime"]).replace(tzinfo=timezone.utc)
            except ValueError:
                posted_at = None
        if posted_at is None:
            posted_at = _parse_relative(time_el.get_text(strip=True) if time_el else None)

        match = _JOB_ID_RE.search(href + "?") if href else None
        external_id = match.group(1) if match else href.split("/")[-1].split("?")[0]
        application_url = f"{JOB_VIEW_URL}/{external_id}" if external_id.isdigit() else href

        if not (title and company and application_url):
            continue

        remote = bool(loc_text and "remote" in loc_text.lower())

        results.append(
            JobListing(
                platform="linkedin",
                external_id=str(external_id),
                title=title,
                company=company,
                location=loc_text,
                remote=remote,
                application_url=application_url,
                posted_at=posted_at,
            )
        )

    logger.info("linkedin: parsed %d listings", len(results))
    return results
