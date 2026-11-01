"""Connect an agent to the local Artifact Server so the reviewer's "Send" reaches it.

    python3 artifact-watch.py --once [--timeout 0] [--name AGENT]       # wait for one Send
    python3 artifact-watch.py [--comments] [--artifact ID] [--name AGENT]  # stream events

Keeps one `artifactserver mcp` process open and checks in every --interval
seconds through dispatch_inbox, so the review page shows AGENT as connected and
its "Send all open" button delivers to it. Each bundle the reviewer sends is
claimed, printed as one "dispatch" JSON line and marked delivered. The bundle
carries the rendered comments; the agent then answers them, replies in each
thread and resolves it.

--comments also prints a "comment" line for every human comment, reply or
resolve as it happens (on --artifact only, when given); the agent's own replies
are skipped. Off by default: the reviewer batching comments and pressing Send
is the normal pattern.

--once exits 0 after the first poll that printed something, or 2 after
--timeout seconds (0 = never) with nothing; run it as a background command
whose exit notifies the agent. Without --once it streams until killed, for a
harness that turns each stdout line into a notification. Standard library only;
needs `artifactserver` on the PATH.
"""

import argparse
import itertools
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone

ap = argparse.ArgumentParser()
ap.add_argument("--name", default="claude-code")
ap.add_argument("--interval", type=float, default=2)
ap.add_argument("--comments", action="store_true", help="also report each comment as it is made")
ap.add_argument("--artifact", help="with --comments: only this artifact ID")
ap.add_argument("--once", action="store_true", help="exit after the first poll with events")
ap.add_argument("--timeout", type=float, default=0, help="with --once: give up after N seconds, 0 = never (exit 2)")
opts = ap.parse_args()

proc = subprocess.Popen(
    ["artifactserver", "mcp", "--data", os.environ.get("ARTIFACT_SERVER_DATA", os.path.expanduser("~/.artifact-server"))],
    stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
ids = itertools.count(1)


def rpc(method, params=None):
    i = next(ids)
    proc.stdin.write(json.dumps({"jsonrpc": "2.0", "id": i, "method": method, "params": params or {}}) + "\n")
    proc.stdin.flush()
    while True:
        line = proc.stdout.readline()
        if not line:
            raise SystemExit("artifact-watch: MCP server exited")
        msg = json.loads(line)
        if msg.get("id") == i:
            if "error" in msg:
                raise RuntimeError(msg["error"])
            return msg["result"]


def tool(name, args):
    r = rpc("tools/call", {"name": name, "arguments": args})
    if r.get("isError"):
        raise RuntimeError(r["content"][0]["text"][:300])
    return r["structuredContent"]


def emit(event):
    print(json.dumps(event, ensure_ascii=False), flush=True)


def now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


rpc("initialize", {"protocolVersion": "2025-06-18", "capabilities": {},
                   "clientInfo": {"name": "artifact-watch", "version": "1"}})
proc.stdin.write(json.dumps({"jsonrpc": "2.0", "method": "notifications/initialized"}) + "\n")
proc.stdin.flush()

since = now()
seen = set()  # (thread id, updatedAt) already reported
deadline = time.monotonic() + opts.timeout
if not opts.once:
    emit({"event": "watching", "agent": opts.name, "since": since})

while True:
    reported = False
    try:
        # Presence + dispatch: the review page's "Send" lands here.
        tool("dispatch_inbox", {"operation": "list", "agentName": opts.name})
        claimed = tool("dispatch_inbox", {"operation": "claim", "agentName": opts.name}).get("claimed")
        if claimed:
            emit({"event": "dispatch", "bundle": claimed})
            reported = True
            tool("dispatch_inbox", {"operation": "delivered", "dispatchId": claimed["dispatchId"]})

        poll_start = now()
        cursor = None
        while opts.comments:
            page = tool("artifact_list", {"cursor": cursor} if cursor else {})
            for a in page["artifacts"]:
                if opts.artifact and a["id"] != opts.artifact:
                    continue
                threads = tool("comment_list", {"artifactId": a["id"], "since": since,
                                                "dispatched": "include"})["items"]
                for t in threads:
                    key = (t["id"], t["updatedAt"])
                    if key in seen:
                        continue
                    seen.add(key)
                    detail = tool("comment_get", {"artifactId": a["id"], "threadId": t["id"]})
                    thread = detail.get("thread", detail)
                    replies = detail.get("replies", thread.get("replies", []))
                    last = replies[-1] if replies else thread
                    if last.get("author", {}).get("principalKind") != "human":
                        continue  # our own replies and resolves
                    emit({"event": "comment", "artifact": a["id"], "artifactName": a["name"],
                          "version": t["versionId"], "thread": t["id"], "state": t["state"],
                          "path": t["path"], "anchor": t["anchor"],
                          "body": last.get("body"), "isReply": bool(replies)})
                    reported = True
            cursor = page.get("nextCursor")
            if not cursor:
                break
        since = poll_start
    except RuntimeError as e:
        emit({"event": "error", "detail": str(e)})
    if opts.once and reported:
        proc.terminate()
        sys.exit(0)
    if opts.once and opts.timeout and time.monotonic() > deadline:
        proc.terminate()
        sys.exit(2)
    time.sleep(opts.interval)
