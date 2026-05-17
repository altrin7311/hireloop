"""Indeed scraper — requests + BeautifulSoup, up to 20 listings.

Indeed actively blocks bots. This scraper is best-effort and may return
0 results when challenged. Treat empty results as a soft failure.
"""

from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from urllib.parse import urlencode, urljoin

import requests
from bs4 import BeautifulSoup

from scrapers.base import JobListing

logger = logging.getLogger("hireloop.scrapers.indeed")

BASE_URL = "https://www.indeed.com"
SEARCH_URL = f"{BASE_URL}/jobs"
MAX_RESULTS = 20
TIMEOUT = 15

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
}


_RELATIVE_DATE_RE = re.compile(r"(\d+)\s*\+?\s*(day|hour|minute|month)", re.IGNORECASE)
_SALARY_RE = re.compile(
    r"\$?(\d{1,3}(?:,\d{3})*|\d+)(?:K|,000)?\s*(?:-|to|–)\s*\$?(\d{1,3}(?:,\d{3})*|\d+)(?:K|,000)?",
    re.IGNORECASE,
)


def _parse_relative_date(text: str) -> Optional[datetime]:
    if not text:
        return None
    m = _RELATIVE_DATE_RE.search(text)
    if not m:
        if "today" in text.lower() or "just posted" in text.lower():
            return datetime.now(timezone.utc)
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
    if unit == "month":
        return now - timedelta(days=n * 30)
    return None


def _parse_salary(text: Optional[str]) -> tuple[Optional[int], Optional[int]]:
    if not text:
        return None, None
    m = _SALARY_RE.search(text)
    if not m:
        return None, None
    low_raw = m.group(1).replace(",", "")
    high_raw = m.group(2).replace(",", "")
    try:
        low = int(low_raw)
        high = int(high_raw)
    except ValueError:
        return None, None
    if "K" in text.upper() or low < 1000:
        low *= 1000
        high *= 1000
    return low, high


def search_indeed(query: str, location: str = "") -> List[JobListing]:
    """Search Indeed for jobs. Returns up to MAX_RESULTS listings."""
    params = {"q": query, "l": location, "limit": "20"}
    url = f"{SEARCH_URL}?{urlencode(params)}"
    logger.info("indeed: GET %s", url)

    try:
        resp = requests.get(url, headers=DEFAULT_HEADERS, timeout=TIMEOUT)
    except requests.RequestException as exc:
        logger.warning("indeed: request failed: %s", exc)
        return []

    if resp.status_code != 200:
        logger.warning("indeed: HTTP %d (likely blocked)", resp.status_code)
        return []

    soup = BeautifulSoup(resp.text, "lxml")
    cards = soup.select("div.job_seen_beacon") or soup.select("[data-jk]")
    results: List[JobListing] = []

    for card in cards[:MAX_RESULTS]:
        jk = card.get("data-jk") or (card.find(attrs={"data-jk": True}) or {}).get("data-jk")
        if not jk:
            continue

        title_el = card.select_one("h2.jobTitle span") or card.select_one("h2.jobTitle a")
        title = title_el.get_text(strip=True) if title_el else None

        company_el = card.select_one("[data-testid='company-name']") or card.select_one("span.companyName")
        company = company_el.get_text(strip=True) if company_el else None

        loc_el = card.select_one("[data-testid='text-location']") or card.select_one("div.companyLocation")
        loc_text = loc_el.get_text(strip=True) if loc_el else None

        salary_el = card.select_one(".metadata.salary-snippet-container") or card.select_one(".salary-snippet-container")
        salary_text = salary_el.get_text(strip=True) if salary_el else None
        salary_min, salary_max = _parse_salary(salary_text)

        posted_el = card.select_one("span.date") or card.select_one("[data-testid='myJobsStateDate']")
        posted_at = _parse_relative_date(posted_el.get_text(strip=True) if posted_el else "")

        desc_el = card.select_one(".job-snippet")
        description = desc_el.get_text(" ", strip=True) if desc_el else None

        remote = bool(loc_text and "remote" in loc_text.lower())
        app_url = urljoin(BASE_URL, f"/viewjob?jk={jk}")

        if not (title and company):
            continue

        results.append(
            JobListing(
                platform="indeed",
                external_id=str(jk),
                title=title,
                company=company,
                location=loc_text,
                remote=remote,
                salary_min=salary_min,
                salary_max=salary_max,
                description=description,
                application_url=app_url,
                posted_at=posted_at,
            )
        )

    logger.info("indeed: parsed %d listings", len(results))
    return results
