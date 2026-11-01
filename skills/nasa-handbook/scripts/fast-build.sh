#!/bin/sh
# Fast flow: build a NASA handbook report from one Markdown file (see references/fast-flow.md).
#   sh fast-build.sh report.md [--watch]   -> report.html next to it, self-contained, ~0.1 s
# Needs Node 18+ with npm. The npm packages (about 180 MB) are installed on first use into
# ~/.cache/nasa-handbook-fast from the skill's lockfile, never into the skill folder, and are
# reinstalled whenever the lockfile changes. The converter runs from that folder so Node finds them.
set -e
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
FAST="$SKILL/fast"
CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/nasa-handbook-fast"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "fast-build: needs Node 18+ and npm on the PATH (https://nodejs.org)" >&2; exit 1
fi
major=$(node -p 'process.versions.node.split(".")[0]')
if [ "$major" -lt 18 ]; then echo "fast-build: needs Node 18+, found $(node -v)" >&2; exit 1; fi

mkdir -p "$CACHE"
if [ ! -d "$CACHE/node_modules/mermaid" ] || ! cmp -s "$FAST/package-lock.json" "$CACHE/package-lock.json"; then
  cp "$FAST/package.json" "$FAST/package-lock.json" "$CACHE/"
  echo "fast-build: installing packages into $CACHE (first run only)" >&2
  (cd "$CACHE" && npm ci --silent --no-audit --no-fund)
fi
cp "$FAST/build.mjs" "$FAST/style.css" "$CACHE/"
NASA_FONTS="${NASA_FONTS:-$SKILL/assets/fonts}" exec node "$CACHE/build.mjs" "$@"
