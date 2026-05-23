"""Selenium-driven application submitter.

Live in Phase 6 (was a stub in Phase 3). Flow:

1. Open the application URL in undetected-chromedriver.
2. Detect the ATS platform from URL / page markers.
3. Read-page delay (skippable with FAST_MODE=true).
4. Fill common fields (name/email/phone/cover-letter/CV upload + the
   most common open-text "why" question).
5. Take a base64 screenshot.
6. If DRY_RUN=true (default in dev), STOP before clicking submit —
   still record success so we exercise the credit-debit path.
7. Otherwise: pre-submit pause, then click the submit button.

Field selectors are intentionally broad — every ATS has a quirky DOM, so we
combine label-based discovery, common name/id heuristics, and per-platform
overrides. A field that is genuinely missing is silently skipped (not all
forms ask for phone, etc.); the count of filled fields is returned for QA.
"""

from __future__ import annotations

import base64
import logging
import os
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, Dict, List, Optional, Sequence

from selenium.common.exceptions import (
    ElementNotInteractableException,
    NoSuchElementException,
    StaleElementReferenceException,
    TimeoutException,
    WebDriverException,
)
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from filler.cv_pdf import write_cv_pdf
from stealth.browser import get_driver, quit_driver
from stealth.engine import (
    can_apply,
    pre_submit_pause,
    read_page_delay,
    record_application,
    type_like_human,
)

if TYPE_CHECKING:  # pragma: no cover — type-only import
    from selenium.webdriver.remote.webdriver import WebDriver
    from selenium.webdriver.remote.webelement import WebElement


logger = logging.getLogger("hireloop.filler")


PLACEHOLDER_PNG_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
)


@dataclass
class ApplyResult:
    success: bool
    message: str
    screenshot_b64: str
    reason: Optional[str] = None
    fields_filled: int = 0
    dry_run: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "message": self.message,
            "screenshot_b64": self.screenshot_b64,
            "reason": self.reason,
            "fields_filled": self.fields_filled,
            "dry_run": self.dry_run,
            "metadata": self.metadata,
        }


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _detect_platform(application_url: str, fallback: str) -> str:
    url = (application_url or "").lower()
    if "linkedin.com" in url:
        return "linkedin"
    if "indeed.com" in url:
        return "indeed"
    if "greenhouse.io" in url or "boards.greenhouse" in url:
        return "greenhouse"
    if "lever.co" in url:
        return "lever"
    if "myworkdayjobs.com" in url or "workday" in url:
        return "workday"
    return fallback.lower()


# --- field-finding helpers ----------------------------------------------------


def _query_first(driver: "WebDriver", selectors: Sequence[str]) -> Optional["WebElement"]:
    for sel in selectors:
        try:
            elements = driver.find_elements(By.CSS_SELECTOR, sel)
        except WebDriverException:
            continue
        for el in elements:
            try:
                if el.is_displayed() and el.is_enabled():
                    return el
            except StaleElementReferenceException:
                continue
    return None


def _find_by_label(driver: "WebDriver", keywords: Sequence[str]) -> Optional["WebElement"]:
    """Heuristic — locate input/textarea whose nearby label text matches a keyword.

    Tries <label for="..."> -> input lookup; falls back to placeholder/aria-label.
    Case-insensitive substring match.
    """
    kw_lower = [k.lower() for k in keywords]

    # 1. Label-for association.
    try:
        labels = driver.find_elements(By.TAG_NAME, "label")
    except WebDriverException:
        labels = []
    for label in labels:
        try:
            text = (label.text or "").strip().lower()
        except StaleElementReferenceException:
            continue
        if not text or not any(kw in text for kw in kw_lower):
            continue
        target_id = label.get_attribute("for")
        if target_id:
            try:
                target = driver.find_element(By.ID, target_id)
                if target.is_displayed() and target.is_enabled():
                    return target
            except (NoSuchElementException, StaleElementReferenceException):
                pass
        # Fallback: input nested inside the label.
        try:
            nested = label.find_element(By.CSS_SELECTOR, "input, textarea")
            if nested.is_displayed() and nested.is_enabled():
                return nested
        except (NoSuchElementException, StaleElementReferenceException):
            continue

    # 2. Placeholder / aria-label substring.
    try:
        candidates = driver.find_elements(By.CSS_SELECTOR, "input, textarea")
    except WebDriverException:
        candidates = []
    for el in candidates:
        try:
            if not (el.is_displayed() and el.is_enabled()):
                continue
            placeholder = (el.get_attribute("placeholder") or "").lower()
            aria = (el.get_attribute("aria-label") or "").lower()
            name = (el.get_attribute("name") or "").lower()
            haystack = " ".join([placeholder, aria, name])
            if any(kw in haystack for kw in kw_lower):
                return el
        except StaleElementReferenceException:
            continue

    return None


def _fill_text(
    driver: "WebDriver",
    element: Optional["WebElement"],
    value: str,
    *,
    field_name: str,
) -> bool:
    if element is None or not value:
        return False
    try:
        element.clear()
    except (WebDriverException, ElementNotInteractableException):
        pass
    try:
        type_like_human(driver, element, value)
        logger.info("filler: filled %s (len=%d)", field_name, len(value))
        return True
    except (WebDriverException, ElementNotInteractableException) as exc:
        logger.warning("filler: failed to fill %s: %s", field_name, exc)
        return False


def _upload_file(driver: "WebDriver", file_path: str) -> bool:
    selectors = [
        'input[type="file"][name*="resume" i]',
        'input[type="file"][name*="cv" i]',
        'input[type="file"][id*="resume" i]',
        'input[type="file"][id*="cv" i]',
        'input[type="file"]',
    ]
    try:
        for sel in selectors:
            elements = driver.find_elements(By.CSS_SELECTOR, sel)
            for el in elements:
                try:
                    el.send_keys(file_path)
                    logger.info("filler: uploaded CV via selector=%s", sel)
                    return True
                except (WebDriverException, ElementNotInteractableException):
                    continue
    except WebDriverException as exc:
        logger.warning("filler: file upload search failed: %s", exc)
    logger.info("filler: no file input found — skipping CV upload")
    return False


def _click_submit_or_log(driver: "WebDriver", dry_run: bool) -> bool:
    button_texts = ["submit application", "submit", "apply now", "send application", "apply"]
    candidates: List["WebElement"] = []
    try:
        candidates.extend(driver.find_elements(By.CSS_SELECTOR, 'button[type="submit"]'))
        candidates.extend(driver.find_elements(By.CSS_SELECTOR, 'input[type="submit"]'))
    except WebDriverException:
        pass

    target: Optional["WebElement"] = None
    for btn in candidates:
        try:
            label = ((btn.text or "") + " " + (btn.get_attribute("value") or "")).strip().lower()
        except StaleElementReferenceException:
            continue
        if not label:
            target = btn if target is None else target
            continue
        if any(t in label for t in button_texts):
            target = btn
            break

    if target is None:
        # Last-ditch — generic button whose text matches.
        try:
            for btn in driver.find_elements(By.TAG_NAME, "button"):
                try:
                    label = (btn.text or "").strip().lower()
                except StaleElementReferenceException:
                    continue
                if label and any(t in label for t in button_texts):
                    target = btn
                    break
        except WebDriverException:
            pass

    if target is None:
        logger.warning("filler: no submit button located")
        return False

    if dry_run:
        logger.info("filler[DRY_RUN]: skipping submit click — button located OK")
        return True

    pre_submit_pause()
    try:
        target.click()
        logger.info("filler: submit clicked")
        return True
    except (WebDriverException, ElementNotInteractableException) as exc:
        logger.warning("filler: submit click failed: %s", exc)
        return False


# --- main entrypoint ----------------------------------------------------------


def submit_application(
    *,
    application_url: str,
    platform: str,
    tailored_cv: Dict[str, Any],
    cover_letter: str,
    user_preferences: Dict[str, Any],
    user_id: str,
    skip_delay: bool = False,
) -> ApplyResult:
    """Submit an application end-to-end. Returns a structured result."""
    detected = _detect_platform(application_url, fallback=platform)
    allowed, reason = can_apply(detected, user_id)
    if not allowed:
        logger.info(
            "filler: blocked by stealth engine user=%s platform=%s reason=%s",
            user_id,
            detected,
            reason,
        )
        return ApplyResult(
            success=False,
            message="rate limit / window guard",
            screenshot_b64="",
            reason=reason,
        )

    dry_run = _env_bool("DRY_RUN", default=True)

    # Build the CV PDF once — even if upload fails we still have it cached.
    try:
        display_name = (
            (user_preferences or {}).get("preferred_name")
            or (user_preferences or {}).get("name")
            or "HireLoop applicant"
        )
        pdf_path = write_cv_pdf(tailored_cv or {}, user_id=user_id, display_name=display_name)
    except Exception as exc:  # noqa: BLE001 — never let PDF failure crash the apply.
        logger.exception("filler: CV PDF generation failed: %s", exc)
        return ApplyResult(
            success=False,
            message=f"CV PDF generation failed: {exc}",
            screenshot_b64="",
            reason="cv_pdf_error",
        )

    driver: Optional["WebDriver"] = None
    fields_filled = 0
    screenshot_b64 = ""

    try:
        driver = get_driver()
        logger.info("filler: opening %s (platform=%s dry_run=%s)", application_url, detected, dry_run)
        driver.get(application_url)

        # Wait for body to render before we start poking the DOM.
        try:
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
        except TimeoutException:
            logger.warning("filler: page body did not load within 15s — continuing anyway")

        if not skip_delay:
            read_page_delay()

        prefs = user_preferences or {}
        cl_text = (cover_letter or "").strip()
        first_para = cl_text.split("\n\n", 1)[0] if cl_text else ""

        preferred_name = (prefs.get("preferred_name") or prefs.get("name") or "").strip()
        email = (prefs.get("email") or "").strip()
        phone = (prefs.get("phone") or "").strip()

        # Name — try a single full-name field first, then first/last.
        name_el = _find_by_label(driver, ["full name", "your name", "applicant name"]) or _query_first(
            driver,
            [
                'input[name="full_name"]',
                'input[name="name"]',
                'input[name*="full_name" i]',
                'input[id*="full_name" i]',
            ],
        )
        if name_el is not None:
            if _fill_text(driver, name_el, preferred_name, field_name="full_name"):
                fields_filled += 1
        else:
            first_name = preferred_name.split(" ", 1)[0] if preferred_name else ""
            last_name = preferred_name.split(" ", 1)[1] if " " in preferred_name else ""
            first_el = _find_by_label(driver, ["first name"]) or _query_first(
                driver,
                [
                    'input[name="first_name"]',
                    'input[name="job_application[first_name]"]',
                    'input[id*="first_name" i]',
                ],
            )
            if _fill_text(driver, first_el, first_name, field_name="first_name"):
                fields_filled += 1
            last_el = _find_by_label(driver, ["last name", "surname"]) or _query_first(
                driver,
                [
                    'input[name="last_name"]',
                    'input[name="job_application[last_name]"]',
                    'input[id*="last_name" i]',
                ],
            )
            if _fill_text(driver, last_el, last_name, field_name="last_name"):
                fields_filled += 1

        # Email.
        email_el = _find_by_label(driver, ["email"]) or _query_first(
            driver,
            [
                'input[type="email"]',
                'input[name*="email" i]',
                'input[id*="email" i]',
            ],
        )
        if _fill_text(driver, email_el, email, field_name="email"):
            fields_filled += 1

        # Phone.
        phone_el = _find_by_label(driver, ["phone", "mobile", "telephone"]) or _query_first(
            driver,
            [
                'input[type="tel"]',
                'input[name*="phone" i]',
                'input[id*="phone" i]',
            ],
        )
        if _fill_text(driver, phone_el, phone, field_name="phone"):
            fields_filled += 1

        # CV upload.
        if _upload_file(driver, str(pdf_path)):
            fields_filled += 1

        # Cover letter textarea.
        cover_el = _find_by_label(
            driver,
            ["cover letter", "cover note", "tell us about yourself", "additional information"],
        ) or _query_first(
            driver,
            [
                'textarea[name*="cover" i]',
                'textarea[id*="cover" i]',
                'textarea[name="job_application[cover_letter_text]"]',
                "textarea",
            ],
        )
        if _fill_text(driver, cover_el, cl_text, field_name="cover_letter"):
            fields_filled += 1

        # "Why us" / open question — only fill if the cover textarea didn't already
        # claim every visible textarea. Use the first paragraph of the cover letter
        # as a reasonable default answer.
        if first_para:
            why_el = _find_by_label(
                driver,
                ["why do you", "why are you", "why this company", "what excites", "motivation"],
            )
            if why_el is not None and why_el != cover_el:
                if _fill_text(driver, why_el, first_para, field_name="why_company"):
                    fields_filled += 1

        # Screenshot — even on failure, helps debugging.
        try:
            screenshot_b64 = driver.get_screenshot_as_base64()
        except WebDriverException as exc:
            logger.warning("filler: screenshot capture failed: %s", exc)
            screenshot_b64 = PLACEHOLDER_PNG_B64

        submit_ok = _click_submit_or_log(driver, dry_run=dry_run)
        if not submit_ok:
            return ApplyResult(
                success=False,
                message="submit button not located/clickable",
                screenshot_b64=screenshot_b64 or PLACEHOLDER_PNG_B64,
                reason="submit_not_found",
                fields_filled=fields_filled,
                dry_run=dry_run,
                metadata={"detected_platform": detected, "pdf_path": str(pdf_path)},
            )

        record_application(detected, user_id)

        message = (
            f"dry-run submission OK on {detected} ({fields_filled} fields filled)"
            if dry_run
            else f"submitted on {detected} ({fields_filled} fields filled)"
        )
        return ApplyResult(
            success=True,
            message=message,
            screenshot_b64=screenshot_b64 or PLACEHOLDER_PNG_B64,
            fields_filled=fields_filled,
            dry_run=dry_run,
            metadata={"detected_platform": detected, "pdf_path": str(pdf_path)},
        )
    except WebDriverException as exc:
        logger.exception("filler: WebDriver failure")
        return ApplyResult(
            success=False,
            message=f"webdriver error: {exc.msg or str(exc)}",
            screenshot_b64=screenshot_b64 or PLACEHOLDER_PNG_B64,
            reason="webdriver_error",
            fields_filled=fields_filled,
            dry_run=dry_run,
        )
    except Exception as exc:  # noqa: BLE001 — last-resort guard, surface to API.
        logger.exception("filler: unexpected failure")
        return ApplyResult(
            success=False,
            message=f"unexpected error: {exc}",
            screenshot_b64=screenshot_b64 or PLACEHOLDER_PNG_B64,
            reason="unexpected_error",
            fields_filled=fields_filled,
            dry_run=dry_run,
        )
    finally:
        quit_driver(driver)


def decode_placeholder_screenshot() -> bytes:
    return base64.b64decode(PLACEHOLDER_PNG_B64)
