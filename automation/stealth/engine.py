"""Stealth Engine — hardcoded rate limits + human behaviour config.

Platform limits are NOT user-configurable. They protect users from themselves.
State is a flat JSON file per user under ``STEALTH_STATE_DIR``.
"""

from __future__ import annotations

import json
import logging
import os
import random
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import TYPE_CHECKING, Any, Dict, List, Optional, Tuple

if TYPE_CHECKING:  # pragma: no cover — type-only import
    from selenium.webdriver.remote.webdriver import WebDriver
    from selenium.webdriver.remote.webelement import WebElement

logger = logging.getLogger("hireloop.stealth.engine")


@dataclass(frozen=True)
class PlatformLimit:
    platform: str
    max_per_day: int
    min_gap_seconds: int
    allowed_hours: Optional[Tuple[int, int]]  # (start, end) in 24h; None = anytime


# Hardcoded per CLAUDE.md "Stealth Engine" section. DO NOT expose to users.
PLATFORM_LIMITS: Dict[str, PlatformLimit] = {
    "linkedin": PlatformLimit("linkedin", max_per_day=3, min_gap_seconds=60 * 60, allowed_hours=(8, 19)),
    "indeed": PlatformLimit("indeed", max_per_day=5, min_gap_seconds=25 * 60, allowed_hours=(8, 20)),
    "greenhouse": PlatformLimit("greenhouse", max_per_day=8, min_gap_seconds=10 * 60, allowed_hours=None),
    "lever": PlatformLimit("lever", max_per_day=8, min_gap_seconds=10 * 60, allowed_hours=None),
    "workday": PlatformLimit("workday", max_per_day=6, min_gap_seconds=15 * 60, allowed_hours=None),
}


# Human behaviour config — all values used by the filler to randomise actions.
HUMAN_BEHAVIOUR = {
    "min_wpm": 120,
    "max_wpm": 180,
    "pre_apply_read_min_seconds": 30,
    "pre_apply_read_max_seconds": 90,
    "between_field_min_seconds": 0.4,
    "between_field_max_seconds": 1.8,
    "gap_jitter_pct": 0.30,  # ±30% on min gap
    "preferred_weekdays": [1, 2, 3],  # Tue, Wed, Thu (0 = Monday)
}


_STATE_DIR = Path(os.environ.get("STEALTH_STATE_DIR", "./.stealth_state"))
_LOCK = Lock()


def _ensure_state_dir() -> Path:
    _STATE_DIR.mkdir(parents=True, exist_ok=True)
    return _STATE_DIR


def _state_path(user_id: str) -> Path:
    safe = user_id.replace("/", "_").replace("..", "_")
    return _ensure_state_dir() / f"{safe}.json"


def _load_state(user_id: str) -> Dict[str, List[float]]:
    path = _state_path(user_id)
    if not path.exists():
        return {}
    try:
        with path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
        if not isinstance(data, dict):
            return {}
        return {k: list(v) for k, v in data.items() if isinstance(v, list)}
    except (OSError, json.JSONDecodeError):
        logger.warning("stealth: corrupted state for user=%s — resetting", user_id)
        return {}


def _save_state(user_id: str, state: Dict[str, List[float]]) -> None:
    path = _state_path(user_id)
    tmp = path.with_suffix(".json.tmp")
    with tmp.open("w", encoding="utf-8") as fh:
        json.dump(state, fh)
    tmp.replace(path)


def _now_ts() -> float:
    return time.time()


def _seconds_in_last_24h(timestamps: List[float], now: float) -> List[float]:
    cutoff = now - 24 * 3600
    return [t for t in timestamps if t >= cutoff]


def can_apply(platform: str, user_id: str) -> Tuple[bool, Optional[str]]:
    """Return (allowed, reason). reason is None when allowed."""
    platform_key = platform.lower()
    limit = PLATFORM_LIMITS.get(platform_key)
    if not limit:
        return False, f"unknown_platform:{platform}"

    now = _now_ts()
    now_dt = datetime.fromtimestamp(now, tz=timezone.utc)

    if limit.allowed_hours is not None:
        start, end = limit.allowed_hours
        hour = now_dt.hour
        if not (start <= hour < end):
            return False, f"outside_hours:{start:02d}-{end:02d}"

    with _LOCK:
        state = _load_state(user_id)
        timestamps = state.get(platform_key, [])
        recent = _seconds_in_last_24h(timestamps, now)

        if len(recent) >= limit.max_per_day:
            return False, f"daily_limit:{limit.max_per_day}"

        if recent:
            last = max(recent)
            jitter = 1.0 + random.uniform(-HUMAN_BEHAVIOUR["gap_jitter_pct"], HUMAN_BEHAVIOUR["gap_jitter_pct"])
            required_gap = limit.min_gap_seconds * jitter
            elapsed = now - last
            if elapsed < required_gap:
                remaining = int(required_gap - elapsed)
                return False, f"min_gap:{remaining}s"

        return True, None


def record_application(platform: str, user_id: str) -> None:
    """Append now-timestamp for (user, platform). Trims entries older than 7 days."""
    platform_key = platform.lower()
    if platform_key not in PLATFORM_LIMITS:
        raise ValueError(f"unknown platform: {platform}")

    now = _now_ts()
    cutoff = now - 7 * 24 * 3600

    with _LOCK:
        state = _load_state(user_id)
        timestamps = [t for t in state.get(platform_key, []) if t >= cutoff]
        timestamps.append(now)
        state[platform_key] = timestamps
        _save_state(user_id, state)
        logger.info(
            "stealth: recorded user=%s platform=%s today_count=%d",
            user_id,
            platform_key,
            len(_seconds_in_last_24h(timestamps, now)),
        )


def randomise_delay(min_seconds: float, max_seconds: float) -> float:
    """Sleep for a random duration in the given range. Returns slept seconds."""
    if min_seconds < 0 or max_seconds < min_seconds:
        raise ValueError("invalid delay range")
    duration = random.uniform(min_seconds, max_seconds)
    time.sleep(duration)
    return duration


def typing_delay_for_char() -> float:
    """Approximate per-character delay derived from a randomly chosen WPM."""
    wpm = random.uniform(HUMAN_BEHAVIOUR["min_wpm"], HUMAN_BEHAVIOUR["max_wpm"])
    chars_per_second = (wpm * 5) / 60
    base = 1.0 / max(chars_per_second, 1.0)
    return base * random.uniform(0.6, 1.4)


def _fast_mode() -> bool:
    raw = os.environ.get("FAST_MODE", "")
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def pre_apply_read_delay() -> float:
    if _fast_mode():
        return 0.0
    return randomise_delay(
        HUMAN_BEHAVIOUR["pre_apply_read_min_seconds"],
        HUMAN_BEHAVIOUR["pre_apply_read_max_seconds"],
    )


def read_page_delay() -> float:
    """Alias matching Phase 6 spec — sleeps 30-90s; FAST_MODE skips it."""
    return pre_apply_read_delay()


def pre_submit_pause() -> float:
    """Short 2-5s pause before clicking the final submit button."""
    if _fast_mode():
        return 0.0
    return randomise_delay(2.0, 5.0)


def type_like_human(driver: Any, element: "WebElement", text: str) -> None:
    """Type ``text`` into ``element`` one character at a time with WPM-paced jitter.

    ``driver`` is accepted for API symmetry / future use (e.g., scroll into view)
    but the body only needs the element. FAST_MODE collapses to a single send_keys.
    """
    if not text:
        return

    if _fast_mode():
        try:
            element.send_keys(text)
        except Exception as exc:  # noqa: BLE001 — caller handles broader errors
            logger.warning("type_like_human[fast]: %s", exc)
        return

    for ch in text:
        try:
            element.send_keys(ch)
        except Exception as exc:  # noqa: BLE001 — best-effort; abort if element dies
            logger.warning("type_like_human: send_keys failed at char=%r: %s", ch, exc)
            return
        # Per-character delay is roughly 50-150ms once WPM jitter applies.
        time.sleep(max(0.04, min(0.20, typing_delay_for_char())))
    # Occasional micro-pause between fields.
    time.sleep(
        random.uniform(
            HUMAN_BEHAVIOUR["between_field_min_seconds"],
            HUMAN_BEHAVIOUR["between_field_max_seconds"],
        )
        / 4.0
    )


def is_preferred_weekday(now: Optional[datetime] = None) -> bool:
    """Tue/Wed/Thu = best days. Caller may choose to defer otherwise."""
    when = now or datetime.now(timezone.utc)
    return when.weekday() in HUMAN_BEHAVIOUR["preferred_weekdays"]
