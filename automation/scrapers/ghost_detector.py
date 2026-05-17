"""Ghost-job detection — heuristic, runs BEFORE any AI generation.

A job is flagged when 2+ signals match. Per CLAUDE.md:

1. Posted > 60 days ago
2. Same title+company seen 3+ times in last 30 days (duplicate post)
3. >85% description similarity to another active listing
4. Company on a hiring-freeze list (sourced externally)
5. LinkedIn "Easy Apply" w/ 500+ applicants AND posted > 30 days ago

This module deliberately keeps state in memory — caller can persist if needed.
The heavier duplicate-description check (#3) uses a cheap shingle Jaccard.
The hiring-freeze list (#4) is loaded from ``HIRING_FREEZE_COMPANIES`` env
(comma-separated) so it can be refreshed without code changes.
"""

from __future__ import annotations

import logging
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Dict, Iterable, List, Optional, Set, Tuple

from scrapers.base import JobListing

logger = logging.getLogger("hireloop.scrapers.ghost")


GHOST_AGE_DAYS = 60
DUPLICATE_WINDOW_DAYS = 30
DUPLICATE_THRESHOLD = 3
DESC_SIMILARITY_THRESHOLD = 0.85
HIGH_APPLICANT_THRESHOLD = 500
HIGH_APPLICANT_AGE_DAYS = 30
SHINGLE_SIZE = 5
SIGNALS_REQUIRED = 2


def _hiring_freeze_companies() -> Set[str]:
    raw = os.environ.get("HIRING_FREEZE_COMPANIES", "")
    return {c.strip().lower() for c in raw.split(",") if c.strip()}


def _shingles(text: str) -> Set[str]:
    tokens = re.findall(r"\w+", (text or "").lower())
    if len(tokens) < SHINGLE_SIZE:
        return {" ".join(tokens)} if tokens else set()
    return {" ".join(tokens[i : i + SHINGLE_SIZE]) for i in range(len(tokens) - SHINGLE_SIZE + 1)}


def _jaccard(a: Set[str], b: Set[str]) -> float:
    if not a or not b:
        return 0.0
    inter = len(a & b)
    union = len(a | b)
    return inter / union if union else 0.0


def detect_ghost_signals(
    job: JobListing,
    *,
    same_title_company_count_last_30d: int = 0,
    nearest_description_similarity: float = 0.0,
) -> List[str]:
    """Return list of matched signal names (for logging/auditing)."""
    matched: List[str] = []
    now = datetime.now(timezone.utc)

    if job.posted_at:
        age = now - job.posted_at
        if age > timedelta(days=GHOST_AGE_DAYS):
            matched.append(f"stale_post:{age.days}d")

    if same_title_company_count_last_30d >= DUPLICATE_THRESHOLD:
        matched.append(f"duplicate_post:{same_title_company_count_last_30d}x_30d")

    if nearest_description_similarity >= DESC_SIMILARITY_THRESHOLD:
        matched.append(f"duplicate_desc:{nearest_description_similarity:.2f}")

    if job.company and job.company.lower() in _hiring_freeze_companies():
        matched.append("hiring_freeze")

    if (
        job.platform == "linkedin"
        and job.applicant_count is not None
        and job.applicant_count >= HIGH_APPLICANT_THRESHOLD
        and job.posted_at is not None
        and (now - job.posted_at) > timedelta(days=HIGH_APPLICANT_AGE_DAYS)
    ):
        matched.append(f"linkedin_easy_apply_overflow:{job.applicant_count}")

    return matched


def is_ghost_job(
    job: JobListing,
    *,
    same_title_company_count_last_30d: int = 0,
    nearest_description_similarity: float = 0.0,
) -> Tuple[bool, Optional[str]]:
    """Return (is_ghost, reason). Reason joins all matched signals."""
    signals = detect_ghost_signals(
        job,
        same_title_company_count_last_30d=same_title_company_count_last_30d,
        nearest_description_similarity=nearest_description_similarity,
    )
    if len(signals) >= SIGNALS_REQUIRED:
        reason = "; ".join(signals)
        logger.info(
            "ghost: flagged platform=%s title=%r company=%r reason=%s",
            job.platform,
            job.title,
            job.company,
            reason,
        )
        return True, reason
    return False, None


def filter_ghost_jobs(jobs: Iterable[JobListing]) -> Tuple[List[JobListing], List[Tuple[JobListing, str]]]:
    """Run ghost detection across a batch.

    Computes duplicate counts and pairwise description similarity within the batch.
    Returns (kept_jobs, [(ghost_job, reason), ...]).
    """
    jobs_list = list(jobs)
    if not jobs_list:
        return [], []

    title_company_counts: Dict[str, int] = {}
    for job in jobs_list:
        key = f"{(job.title or '').lower().strip()}|{(job.company or '').lower().strip()}"
        title_company_counts[key] = title_company_counts.get(key, 0) + 1

    shingle_cache: Dict[int, Set[str]] = {}
    for idx, job in enumerate(jobs_list):
        shingle_cache[idx] = _shingles(job.description or "")

    kept: List[JobListing] = []
    ghosts: List[Tuple[JobListing, str]] = []

    for idx, job in enumerate(jobs_list):
        key = f"{(job.title or '').lower().strip()}|{(job.company or '').lower().strip()}"
        dup_count = title_company_counts.get(key, 1)

        best_sim = 0.0
        my_shingles = shingle_cache[idx]
        if my_shingles:
            for other_idx, other_job in enumerate(jobs_list):
                if other_idx == idx or other_job.company != job.company:
                    continue
                sim = _jaccard(my_shingles, shingle_cache[other_idx])
                if sim > best_sim:
                    best_sim = sim

        is_ghost, reason = is_ghost_job(
            job,
            same_title_company_count_last_30d=dup_count,
            nearest_description_similarity=best_sim,
        )
        if is_ghost and reason:
            ghosts.append((job, reason))
        else:
            kept.append(job)

    logger.info("ghost: kept=%d ghost=%d", len(kept), len(ghosts))
    return kept, ghosts
