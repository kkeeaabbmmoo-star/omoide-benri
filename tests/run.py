#!/usr/bin/env python3
"""Layout + monthly-fetch checks for 思い出ノート.

Usage (from repo root or this file's parent repo):
  python3 tests/run.py
  python3 tests/run.py --root /path/to/omoide-benri

Uses Playwright + system Chrome (channel=chrome). No network except localhost.
"""
from __future__ import annotations

import argparse
import http.server
import os
import re
import sys
import threading
from pathlib import Path

WIDTHS = (320, 375, 430, 800, 1280)
HEIGHT = 900


def repo_root(arg: str | None) -> Path:
    if arg:
        return Path(arg).resolve()
    return Path(__file__).resolve().parents[1]


def check_monthly(root: Path) -> tuple[int, int, list[str]]:
    """Assert loadData() months have both rewards and monthly JSON; date math is not 2027-11 in 2026."""
    passed = failed = 0
    logs: list[str] = []

    def ok(cond: bool, name: str) -> None:
        nonlocal passed, failed
        if cond:
            passed += 1
            logs.append(f"  PASS  {name}")
        else:
            failed += 1
            logs.append(f"  FAIL  {name}")

    js = (root / "monthly.js").read_text(encoding="utf-8")
    m = re.search(r"var months=\[([^\]]+)\]", js)
    ok(bool(m), "monthly.js has a months list in loadData")
    months: list[str] = []
    if m:
        months = re.findall(r"'(\d{4}-\d{2})'", m.group(1))
        ok(len(months) >= 1, f"parsed months {months}")
    for ym in months:
        rew = root / "data" / "rewards" / f"{ym}.json"
        snap = root / "data" / "monthly" / f"{ym}.json"
        ok(rew.is_file(), f"data/rewards/{ym}.json exists (avoids rewards 404)")
        ok(snap.is_file(), f"data/monthly/{ym}.json exists (avoids monthly 404)")

    # Root-cause guard: jstNow+toISOString month helper must not jump to 2027-11 in Nov 2026.
    def jst_ym(ms: float) -> str:
        import datetime
        # mirrors monthly.js: new Date(Date.now()+9*3600e3).toISOString().slice(0,7)
        return datetime.datetime.fromtimestamp(ms / 1000 + 9 * 3600, datetime.UTC).strftime("%Y-%m")

    import calendar
    # 2026-11-12 13:27 JST = 2026-11-12 04:27 UTC
    nov12 = calendar.timegm((2026, 11, 12, 4, 27, 0)) * 1000
    ok(jst_ym(nov12) == "2026-11", "jst ym for 2026-11-12 13:27 JST is 2026-11 (not 2027-11)")
    # month end / UTC rollover near JST midnight
    nov1_0000_jst = calendar.timegm((2026, 10, 31, 15, 0, 0)) * 1000  # 2026-11-01 00:00 JST
    ok(jst_ym(nov1_0000_jst) == "2026-11", "jst ym at 2026-11-01 00:00 JST is 2026-11")
    oct31_2359_jst = calendar.timegm((2026, 10, 31, 14, 59, 0)) * 1000
    ok(jst_ym(oct31_2359_jst) == "2026-10", "jst ym at 2026-10-31 23:59 JST is 2026-10")
    return passed, failed, logs


def _css_justify(css: str, selector: str = "#mbar") -> str | None:
    # index.html style is not always pretty-printed; match #mbar{...}
    m = re.search(rf"{re.escape(selector)}\s*\{{([^}}]*)\}}", css)
    if not m:
        return None
    jm = re.search(r"justify-content\s*:\s*([^;]+)", m.group(1))
    return jm.group(1).strip() if jm else None


def check_mbar_css(root: Path) -> tuple[int, int, list[str]]:
    passed = failed = 0
    logs: list[str] = []

    def ok(cond: bool, name: str) -> None:
        nonlocal passed, failed
        if cond:
            passed += 1
            logs.append(f"  PASS  {name}")
        else:
            failed += 1
            logs.append(f"  FAIL  {name}")

    src = (root / "build.py").read_text(encoding="utf-8")
    # f-string doubles braces in the template
    src_css = src.replace("{{", "{").replace("}}", "}")
    html = (root / "index.html").read_text(encoding="utf-8")
    for label, text in (("build.py", src_css), ("index.html", html)):
        just = _css_justify(text)
        ok(just is not None, f"{label} has #mbar justify-content")
        if just is not None:
            ok(
                just in ("flex-start", "start") or "wrap" in (re.search(r"flex-wrap\s*:\s*([^;]+)", text[text.find("#mbar"):text.find("#mbar")+200] or "") or [""])[0],
                f"{label} #mbar justify-content is {just!r} (must not be flex-end)",
            )
            ok(just != "flex-end", f"{label} #mbar is not justify-content:flex-end")
    return passed, failed, logs


def start_server(root: Path) -> tuple[object, int]:
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(root), **kwargs)
        def log_message(self, fmt, *args):
            pass

    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Quiet)
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    return httpd, httpd.server_address[1]


def check_mbar_scroll(root: Path) -> tuple[int, int, list[str]]:
    from playwright.sync_api import sync_playwright

    passed = failed = 0
    logs: list[str] = []

    def ok(cond: bool, name: str) -> None:
        nonlocal passed, failed
        if cond:
            passed += 1
            logs.append(f"  PASS  {name}")
        else:
            failed += 1
            logs.append(f"  FAIL  {name}")

    httpd, port = start_server(root)
    url = f"http://127.0.0.1:{port}/index.html"
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                channel="chrome",
                headless=True,
                args=["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
            )
            try:
                for w in WIDTHS:
                    page = browser.new_page(viewport={"width": w, "height": HEIGHT})
                    page.goto(url, wait_until="domcontentloaded")
                    page.locator("#mbar").wait_for()
                    data = page.evaluate(
                        """() => {
                          const mbar = document.getElementById('mbar');
                          const style = getComputedStyle(mbar);
                          const items = [...mbar.querySelectorAll('a')];
                          const csW = mbar.clientWidth;
                          const maxScroll = Math.max(0, mbar.scrollWidth - csW);
                          const rel = (el) => {
                            const br = mbar.getBoundingClientRect();
                            const r = el.getBoundingClientRect();
                            const left = r.left - br.left + mbar.scrollLeft;
                            return {left, width: r.width, right: left + r.width};
                          };
                          // At scrollLeft=0 the first item must not be clipped to the left
                          // (the flex-end bug put leading items at negative offsets).
                          mbar.scrollLeft = 0;
                          const first = items[0] ? rel(items[0]) : null;
                          const firstVisibleAtStart = first ? first.left >= -1.5 : false;
                          const out = [];
                          for (const a of items) {
                            const pos = rel(a);
                            const noNeg = pos.left >= -1.5;
                            const inScrollRange = pos.right <= mbar.scrollWidth + 1.5;
                            const target = Math.max(0, Math.min(maxScroll, pos.right - csW, pos.left));
                            // Prefer a scroll that shows the whole item when it fits.
                            let s;
                            if (pos.width <= csW + 1.5) {
                              s = Math.max(0, Math.min(maxScroll, pos.right - csW));
                              if (pos.left - s < 0) s = Math.max(0, Math.min(maxScroll, pos.left));
                            } else {
                              s = Math.max(0, Math.min(maxScroll, pos.left));
                            }
                            mbar.scrollLeft = s;
                            const br = mbar.getBoundingClientRect();
                            const r = a.getBoundingClientRect();
                            const visible = r.left >= br.left - 1.5 && r.right <= br.right + 1.5;
                            out.push({
                              href: a.getAttribute('href') || '',
                              title: a.getAttribute('aria-label') || a.getAttribute('title') || '',
                              left: pos.left, right: pos.right, width: pos.width,
                              noNeg, inScrollRange, visible,
                              scrollLeft: mbar.scrollLeft, maxScroll, clientWidth: csW,
                              scrollWidth: mbar.scrollWidth,
                            });
                          }
                          return {
                            count: items.length,
                            justify: style.justifyContent,
                            wrap: style.flexWrap,
                            overflowX: style.overflowX,
                            firstVisibleAtStart,
                            firstLeft: first ? first.left : null,
                            maxScroll,
                            items: out,
                          };
                        }"""
                    )
                    ok(data["count"] >= 17, f"width={w}: #mbar has {data['count']} items (need 17+)")
                    ok(
                        data["justify"] in ("flex-start", "start") or data["wrap"] in ("wrap", "wrap-reverse"),
                        f"width={w}: justify-content={data['justify']!r} flex-wrap={data['wrap']!r} (not flex-end without wrap)",
                    )
                    ok(
                        data["firstVisibleAtStart"],
                        f"width={w}: first #mbar item is visible at scrollLeft=0 (left={data['firstLeft']!r}; no negative-offset clip)",
                    )
                    missing = []
                    for it in data["items"]:
                        reachable = it["visible"] and it["noNeg"] and it["inScrollRange"]
                        name = it["title"] or it["href"]
                        if not reachable:
                            missing.append(
                                f"{name} left={it['left']:.1f} visible={it['visible']} noNeg={it['noNeg']} inRange={it['inScrollRange']} maxScroll={it['maxScroll']}"
                            )
                    ok(
                        not missing,
                        f"width={w}: all {data['count']} #mbar items reachable via scrollLeft 0..{data['maxScroll']}"
                        + ("" if not missing else " — " + "; ".join(missing[:8])),
                    )
                    page.close()
            finally:
                browser.close()
    finally:
        httpd.shutdown()
        httpd.server_close()
    return passed, failed, logs


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", help="repo or dist root that contains index.html and monthly.js")
    args = ap.parse_args()
    root = repo_root(args.root)
    if not (root / "index.html").is_file():
        print(f"index.html not found under {root}", file=sys.stderr)
        return 2
    print(f"root: {root}")
    total_p = total_f = 0
    for title, fn in (
        ("monthly fetch + date math", check_monthly),
        ("#mbar CSS", check_mbar_css),
        ("#mbar scroll (Playwright)", check_mbar_scroll),
    ):
        print(f"\n== {title} ==")
        p, f, logs = fn(root)
        for line in logs:
            print(line)
        print(f"  ({p} passed, {f} failed)")
        total_p += p
        total_f += f
    print(f"\npassed {total_p}, failed {total_f}")
    return 1 if total_f else 0


if __name__ == "__main__":
    sys.exit(main())
