#!/usr/bin/env python3
"""Open a real browser, let you log into ESPN normally (2FA works), then save
the session cookies the ffdraft ESPN import needs.

Usage:
    python3 tools/espn_login.py

Writes tools/.espn-cookies.json containing espn_s2 + SWID. The Vite dev
proxy reads this file automatically, so the ESPN wizard in the app needs
no cookie pasting - just run this once per season (or again whenever the
wizard reports an auth error).

Requires: pip install playwright && python3 -m playwright install chromium
"""

import json
import sys
import time
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sys.exit("Playwright not installed. Run:\n  pip install playwright\n  python3 -m playwright install chromium")

COOKIE_FILE = Path(__file__).resolve().parent / ".espn-cookies.json"
LOGIN_URL = "https://www.espn.com/"
FANTASY_URL = "https://fantasy.espn.com/football"


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()

        print("Opening ESPN. Log in (top-right profile icon -> Log In), then")
        print("wait for this script to detect the session. No need to close")
        print("the browser yourself.\n")

        page.goto(LOGIN_URL)

        # Poll every second for up to 5 minutes for a valid espn_s2 cookie.
        # espn_s2 only appears after a real login; SWID exists immediately
        # (anonymous visitor id), so espn_s2 is the "logged in" signal.
        deadline = time.time() + 300
        cookies = {}
        while time.time() < deadline:
            cookies = {c["name"]: c["value"] for c in context.cookies() if c["name"] in ("espn_s2", "SWID")}
            if cookies.get("espn_s2"):
                break
            time.sleep(1)

        if not cookies.get("espn_s2"):
            browser.close()
            sys.exit("Timed out (5 min) without detecting a login. Try again.")

        # Visit the fantasy page so the .espn.com session is exercised on the
        # exact subdomain the API cookies apply to.
        try:
            page.goto(FANTASY_URL, wait_until="domcontentloaded", timeout=30000)
        except Exception:
            pass  # navigation issues are fine; cookies are already captured

        payload = {
            "espn_s2": cookies["espn_s2"],
            "swid": cookies.get("SWID", ""),
            "savedAt": time.strftime("%Y-%m-%d %H:%M:%S"),
        }
        COOKIE_FILE.write_text(json.dumps(payload, indent=2) + "\n")

        browser.close()

    print(f"Saved ESPN session cookies to {COOKIE_FILE}")
    print("The ffdraft ESPN wizard will pick them up automatically - no pasting needed.")
    print("(Run this script again whenever the wizard says cookies are invalid.)")


if __name__ == "__main__":
    main()
