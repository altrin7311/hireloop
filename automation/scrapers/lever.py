"""Lever scraper — uses public Postings API.

URL: ``https://api.lever.co/v0/postings/{company}?mode=json``
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from html import unescape
from re import sub
from typing import List, Optional

import requests

from scrapers.base import JobListing

logger = logging.getLogger("hireloop.scrapers.lever")

API_BASE = "https://api.lever.co/v0/postings"
TIMEOUT = 15


def _strip_html(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    no_tags = sub(r"<[^>]+>", " ", raw)
    return sub(r"\s+", " ", unescape(no_tags)).strip()


def _parse_epoch_ms(value) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromtimestamp(int(value) / 1000, tz=timezone.utc)
    except (TypeError, ValueError, OSError):
        return None


def search_lever(company_slug: str, query: Optional[str] = None) -> List[JobListing]:
    try:
        url = f"{API_BASE}/{company_slug}?mode=json"
        print(f"[lever:{company_slug}] GET {url}")
        logger.info("lever: GET %s", url)

        resp = requests.get(url, timeout=TIMEOUT, headers={"Accept": "application/json"})
        print(f"[lever:{company_slug}] HTTP {resp.status_code} raw[:500]={resp.text[:500]!r}")

        if resp.status_code != 200:
            logger.warning("lever: HTTP %d for slug=%s", resp.status_code, company_slug)
            return []

        postings = resp.json()

        if isinstance(postings, dict) and postings.get("ok") is False:
            logger.warning(
                "lever: API error for slug=%s — %s (slug likely not on Lever)",
                company_slug,
                postings.get("error"),
            )
            return []

        if not isinstance(postings, list):
            logger.warning("lever: unexpected payload type=%s for slug=%s", type(postings).__name__, company_slug)
            return []

        q = (query or "").lower().strip()
        results: List[JobListing] = []
        commitment = team = None

        for posting in postings:
            title = posting.get("text") or posting.get("title")
            if not title:
                continue
            if q and q not in title.lower():
                continue

            categories = posting.get("categories") or {}
            location = categories.get("location")
            commitment = categories.get("commitment")
            team = categories.get("team")
            workplace_type = categories.get("workplaceType") or categories.get("workplace_type")
            remote = workplace_type == "remote" or (location and "remote" in str(location).lower())

            description = _strip_html(posting.get("descriptionPlain") or posting.get("description"))
            apply_url = posting.get("applyUrl") or posting.get("hostedUrl") or ""
            external_id = str(posting.get("id") or apply_url)
            posted_at = _parse_epoch_ms(posting.get("createdAt"))

            results.append(
                JobListing(
                    platform="lever",
                    external_id=external_id,
                    title=title,
                    company=company_slug,
                    location=location if isinstance(location, str) else None,
                    remote=bool(remote),
                    description=description,
                    application_url=apply_url,
                    posted_at=posted_at,
                )
            )

        print(f"[lever:{company_slug}] parsed {len(results)} listings (filtered by {q or None!r})")
        logger.info(
            "lever: parsed %d listings (filtered by %r) — team/commit hints retained: %s",
            len(results),
            q or None,
            bool(team or commitment),
        )
        return results
    except Exception as e:
        print(f"ERROR: lever scraper failed for slug={company_slug!r}: {type(e).__name__}: {e}")
        logger.exception("lever: unexpected failure for slug=%s", company_slug)
        return []
