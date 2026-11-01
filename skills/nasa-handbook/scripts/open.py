"""Publish a finished handbook page to Artifact Server and open it for review.

    python3 open.py path/to/page.html [--local] [--no-open]

Chrome blocks @font-face files loaded from a local folder, so page.html opened
from disk falls back to system fonts. This writes page.view.html next to it with
every local url(...) in the stylesheet inlined as a data URI.

It then publishes the view HTML, plus page.pdf when it exists, as one artifact
on the local Artifact Server (starting the server if it isn't running), and
opens the review link in the system's default browser (wslview or explorer.exe
under WSL, `open` on macOS, xdg-open elsewhere). Comments left there reach the
agent through the Artifact Server MCP tools.

page.artifact.json beside the page remembers the artifact, so a re-render is
published as a new version of the same artifact and keeps its comment history.

--local skips Artifact Server and opens page.view.html directly; the script also
falls back to that when `artifactserver` is missing or publishing fails.
Standard library only.
"""

import base64
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

MIME = {".ttf": "font/ttf", ".otf": "font/otf", ".woff": "font/woff", ".woff2": "font/woff2",
        ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml"}
DATA = Path(os.environ.get("ARTIFACT_SERVER_DATA", Path.home() / ".artifact-server"))


def inline(html: Path) -> Path:
    src = html.read_text()

    def data_uri(m: re.Match) -> str:
        ref = m.group(1)
        if re.match(r"^(data:|https?:|file:)", ref):
            return m.group(0)
        f = (html.parent / ref).resolve()
        if not f.is_file():
            sys.exit(f"open.py: {ref} not found next to {html.name}")
        b64 = base64.b64encode(f.read_bytes()).decode()
        return f'url("data:{MIME.get(f.suffix.lower(), "application/octet-stream")};base64,{b64}")'

    out = html.with_name(html.stem + ".view.html")
    out.write_text(re.sub(r'url\("([^"]+)"\)', data_uri, src))
    return out


def healthy_origin() -> str | None:
    try:
        origin = json.loads((DATA / "local-service.json").read_text())["origin"]
        with urllib.request.urlopen(origin + "/health", timeout=2) as r:
            return origin if json.load(r).get("status") == "ok" else None
    except Exception:
        return None


def ensure_server(cli: str) -> None:
    """Start the managed local server the same way `artifactserver open` does, without opening its app."""
    if healthy_origin():
        return
    DATA.mkdir(mode=0o700, parents=True, exist_ok=True)
    with open(DATA / "local-service.log", "a") as log:
        subprocess.Popen([cli, "start", "--data", str(DATA), "--port", "0", "--managed"],
                         stdin=subprocess.DEVNULL, stdout=log, stderr=log, start_new_session=True)
    for _ in range(60):
        time.sleep(0.5)
        if healthy_origin():
            return
    raise RuntimeError(f"Artifact Server did not become healthy; see {DATA / 'local-service.log'}")


def publish(cli: str, html: Path, view: Path) -> str:
    """Publish view HTML (+ PDF) and return the review link."""
    ensure_server(cli)
    state_file = html.with_name(html.stem + ".artifact.json")
    state = json.loads(state_file.read_text()) if state_file.is_file() else None
    title = re.search(r"<title>(.*?)</title>", view.read_text(), re.S)
    name = re.sub(r"\s+", " ", title.group(1)).strip() if title else html.stem

    with tempfile.TemporaryDirectory() as tmp:
        shutil.copy(view, tmp)
        pdf = html.with_suffix(".pdf")
        if pdf.is_file():
            shutil.copy(pdf, tmp)
        base = [cli, "publish", tmp, "--data", str(DATA), "--entry", view.name]
        attempts = []
        if state:
            attempts.append(base + ["--artifact", state["artifact"], "--expected-version", state["version"]])
        attempts.append(base + ["--name", name, "--tag", "nasa-handbook"])
        for cmd in attempts:
            r = subprocess.run(cmd, capture_output=True, text=True)
            if r.returncode == 0:
                break
            print(f"open.py: publish failed: {(r.stderr or r.stdout).strip()}", file=sys.stderr)
        else:
            raise RuntimeError("could not publish to Artifact Server")

    out = json.loads(r.stdout)
    state_file.write_text(json.dumps({"artifact": out["artifact"]["id"],
                                      "version": out["version"]["id"]}, indent=2) + "\n")
    print(f"artifact: {out['artifact']['id']} version {out['version']['number']}")
    return out["links"]["review"]


def open_default(target: str) -> None:
    if platform.system() == "Darwin":
        cmd = ["open", target]
    elif "microsoft" in platform.uname().release.lower():
        if shutil.which("wslview"):
            cmd = ["wslview", target]
        elif target.startswith("http"):
            cmd = ["explorer.exe", target]
        else:
            win = subprocess.run(["wslpath", "-w", target], capture_output=True, text=True, check=True).stdout.strip()
            cmd = ["explorer.exe", win]
    else:
        cmd = ["xdg-open", target]
    subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 1:
        sys.exit("usage: open.py page.html [--local] [--no-open]")
    html = Path(args[0]).resolve()
    view = inline(html)
    print(f"view: {view}")

    target = str(view)
    cli = shutil.which("artifactserver")
    if "--local" not in sys.argv and cli:
        try:
            target = publish(cli, html, view)
            print(f"review: {target}")
        except Exception as e:
            print(f"open.py: {e}; opening the local file instead", file=sys.stderr)
    elif "--local" not in sys.argv:
        print("open.py: artifactserver not on PATH; opening the local file instead", file=sys.stderr)

    if "--no-open" not in sys.argv:
        open_default(target)


if __name__ == "__main__":
    main()
