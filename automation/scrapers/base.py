"""Shared JobListing model used by every scraper.

Keep this in sync with the Drizzle `jobListings` table in
`src/lib/db/schema.ts` so the Next.js API can persist returned rows
directly without a translation layer.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, HttpUrl


class JobListing(BaseModel):
    """A single scraped job posting."""

    platform: str = Field(..., description="linkedin|indeed|greenhouse|lever|workday")
    external_id: str = Field(..., description="Platform-native job ID")
    title: str
    company: str
    location: Optional[str] = None
    remote: bool = False
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    description: Optional[str] = None
    application_url: str
    posted_at: Optional[datetime] = None
    applicant_count: Optional[int] = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "platform": "greenhouse",
                "external_id": "4567890",
                "title": "Senior Backend Engineer",
                "company": "Acme",
                "location": "Remote — EU",
                "remote": True,
                "salary_min": 90000,
                "salary_max": 130000,
                "description": "...",
                "application_url": "https://boards.greenhouse.io/acme/jobs/4567890",
                "posted_at": "2026-05-01T00:00:00Z",
                "applicant_count": None,
            }
        }
    }
