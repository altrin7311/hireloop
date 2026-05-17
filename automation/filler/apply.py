"""Form-filling — Selenium-driven submission.

Phase 3 ships a STUB. Real Selenium flow lands in Phase 6.

The stub:
- Honours the Stealth Engine (caller must check ``can_apply`` first;
  this module also re-checks defensively).
- Simulates a pre-apply read delay so end-to-end timing is realistic.
- Returns ``(success, screenshot_b64, message)`` matching the live shape.
- Records the submission against the Stealth Engine on success.
"""

from __future__ import annotations

import base64
import logging
from dataclasses import dataclass
from typing import Any, Dict, Optional

from stealth.engine import (
    can_apply,
    pre_apply_read_delay,
    record_application,
)

logger = logging.getLogger("hireloop.filler")


# 1x1 transparent PNG — stand-in screenshot until Selenium is wired.
_PLACEHOLDER_PNG_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
)


@dataclass
class ApplyResult:
    success: bool
    message: str
    screenshot_b64: str
    reason: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "message": self.message,
            "screenshot_b64": self.screenshot_b64,
            "reason": self.reason,
        }


def submit_application(
    *,
    application_url: str,
    platform: str,
    tailored_cv: str,
    cover_letter: str,
    user_preferences: Dict[str, Any],
    user_id: str,
    skip_delay: bool = False,
) -> ApplyResult:
    """Stub submission. Returns mock success or rate_limit failure.

    Caller should still pre-check with ``can_apply`` to fail fast.
    """
    allowed, reason = can_apply(platform, user_id)
    if not allowed:
        logger.info(
            "filler: blocked by stealth engine user=%s platform=%s reason=%s",
            user_id,
            platform,
            reason,
        )
        return ApplyResult(
            success=False,
            message="rate limit / window guard",
            screenshot_b64="",
            reason=reason,
        )

    logger.info(
        "filler[stub]: user=%s platform=%s url=%s cv_len=%d cl_len=%d prefs_keys=%s",
        user_id,
        platform,
        application_url,
        len(tailored_cv or ""),
        len(cover_letter or ""),
        sorted((user_preferences or {}).keys()),
    )

    if not skip_delay:
        # Real engine would scroll/read the page. Stub still respects the human-read window
        # so upstream timing feels realistic in dev.
        pre_apply_read_delay()

    record_application(platform, user_id)

    return ApplyResult(
        success=True,
        message=f"stub submission OK on {platform}",
        screenshot_b64=_PLACEHOLDER_PNG_B64,
    )


def decode_placeholder_screenshot() -> bytes:
    return base64.b64decode(_PLACEHOLDER_PNG_B64)
