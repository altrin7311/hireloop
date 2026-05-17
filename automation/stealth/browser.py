"""undetected-chromedriver setup with UA rotation + window/wait defaults."""

from __future__ import annotations

import logging
import os
import random
from typing import Optional

import undetected_chromedriver as uc
from selenium.webdriver.chrome.options import Options

logger = logging.getLogger("hireloop.stealth.browser")


USER_AGENTS = [
    # Realistic Chrome desktop UAs — keep current within ~6 months.
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
]


IMPLICIT_WAIT_SECONDS = 10
WINDOW_WIDTH = 1920
WINDOW_HEIGHT = 1080


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def get_driver(user_agent: Optional[str] = None) -> uc.Chrome:
    """Return a configured undetected-chromedriver instance.

    Caller is responsible for ``driver.quit()`` — wrap in try/finally.
    """
    headless = _env_bool("HEADLESS", default=True)
    ua = user_agent or random.choice(USER_AGENTS)

    options = Options()
    if headless:
        options.add_argument("--headless=new")
    options.add_argument(f"--window-size={WINDOW_WIDTH},{WINDOW_HEIGHT}")
    options.add_argument(f"--user-agent={ua}")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--lang=en-US,en;q=0.9")

    logger.info("browser: starting headless=%s ua=%s", headless, ua.split(")")[0] + ")")
    driver = uc.Chrome(options=options, headless=headless, use_subprocess=True)
    driver.implicitly_wait(IMPLICIT_WAIT_SECONDS)
    driver.set_window_size(WINDOW_WIDTH, WINDOW_HEIGHT)
    return driver


def quit_driver(driver: Optional[uc.Chrome]) -> None:
    """Best-effort cleanup. Never raises."""
    if driver is None:
        return
    try:
        driver.quit()
    except Exception as exc:  # noqa: BLE001 — best-effort cleanup
        logger.warning("browser: quit failed: %s", exc)
