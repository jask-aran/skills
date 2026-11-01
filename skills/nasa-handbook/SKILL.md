---
name: nasa-handbook
description: Make printable technical documents in the style of Apollo-era NASA paperwork. The model is an Apollo Operations Handbook "Systems Data" page with a running head, numbered paragraphs, Leroy-lettered line drawings and schematics, a performance data table, NOTE/CAUTION/WARNING notices, a Flight Data File checklist card, a black thumb tab and a footer, rendered to an A4 or US Letter PDF of one or more pages and opened in the browser, set in the 1975 NASA Graphics Standards look (Nimbus Sans, a Helvetica clone). Use this whenever someone asks for NASA-style, Apollo-style, retro aerospace or "mission manual" documentation. Also use it for a technical explainer, spec sheet or one-pager that should look like vintage engineering paperwork, for a handbook page explaining a product, codebase, system or fictional gadget, or for "another one of those NASA pages", even if they never say Apollo or handbook.
compatibility: opencode
metadata:
  opencode/slash: "true"
---

# NASA handbook page

This skill makes one-page or multi-page technical documents that read like an
Apollo Operations Handbook page, set in the 1975 NASA Graphics Standards look
the style guide describes (Nimbus Sans, flush left, boxed diagrams). A running
head sits over numbered
paragraphs, followed by a hero line drawing, a second figure, a data table, a
caution and a crew checklist. The thumb tab and the footer (last page
only) finish it. It suits real subjects (a codebase, a product, a protocol) and fictional
ones (a portal gun). For real subjects, the page should leave the reader
understanding the technical idea. For fiction, it should be convincing.

Finished pages ship with the skill. Look at the PNGs before you start;
they are the bar:
- `assets/examples/portal-gun-device.png` (+ `.html`): a fictional device. It
  has a general arrangement drawing with callouts, dimensions and a section
  view, an electrical schematic, and a deadpan WARNING.
- `assets/examples/espresso-fluid-system.png` (+ `.html`): a fictional machine
  built on real physics (brewing at lunar-habitat cabin pressure). It has a
  general arrangement with a section view, a fluid and electrical schematic
  with station tags, and a computed chart. A fresh agent made it from this
  skill alone in six render passes.

## Resource paths

Paths here are relative to this skill's directory (the base directory reported
when the skill loads):

- `assets/template.html`: the page with all CSS, shared SVG markers and
  patterns, a skeleton of every block and a fit check. Start every page from it.
- `assets/fonts/`: Nimbus Sans (Helvetica clone), Routed Gothic (Leroy
  lettering), Letter Gothic and their licences. Copy the folder next to the page.
- `scripts/render.sh`: renders a PDF (print) and a 2x PNG (preview) with
  headless Chrome. It prints the room left above the footer and exits 3 when
  the page overflows.
- `scripts/check.py`: checks the page count (`--pages N`), the page size,
  ink and paper colours only, and the fonts. It also cuts 300 dpi half-width tiles for the visual
  review (`--out DIR` to choose where). It can't see overflow; `render.sh`
  catches that.
- `scripts/open.py`: writes `<name>.view.html` with the fonts embedded
  (Chrome won't load fonts from a local folder, so the plain HTML would fall
  back to system fonts). It then publishes the view HTML and the PDF to the
  local Artifact Server as one artifact, and opens its review link in the
  default browser. `<name>.artifact.json` remembers the artifact, so
  re-renders become new versions of it.
- `scripts/artifact-watch.py`: connects the agent to Artifact Server, so the
  review page's "Send all open" button delivers the user's comments to it as
  one JSON line.
- `scripts/fast-build.sh`, `fast/` and `references/fast-flow.md`: the fast
  flow (see below). `assets/examples/fast/codex-delegation.md` is a complete
  Markdown source.
- `references/style-guide.md`: anatomy, space budget, typography, writing
  voice, which figures to draw, drawing taste, pitfalls and variants. Read it
  in full for your first page in a session.
- `references/svg-parts.md`: copy-paste drawing parts (boxes, drums, wires,
  breakers, switches, talkbacks, callouts, dimensions, section views,
  timelines, sequence and parts strips, valves, pumps, gauges, sensors,
  station tags, charts).
- `references/sources.md`: the scanned originals and what each taught.

## Fast flow (only on request)

When the user asks for a fast report, or says they expect to revise it
repeatedly, follow `references/fast-flow.md` instead of the workflow below.
The report is written as one Markdown file and built in about 0.1 s with
`scripts/fast-build.sh`. Diagrams and charts are laid out automatically, and
there is no fit or visual check loop. Its figures are plainer than
hand-drawn ones, so never choose it on your own.

## Workflow

1. **Understand the subject and find its one idea.** This is the sentence the
   reader must leave with ("the coffee brews at sea-level pressure in a sealed circuit"). For a real
   system, read its spec or README and the code. Grep every number you intend
   to print (limits, sizes, intervals, retries, key bindings, UI strings) and
   prefer the code when docs disagree. For fiction, invent a consistent
   specification first: name, what it does, five to eight numbers with units,
   its controls and its one dangerous failure mode.

2. **Plan the page on paper before drawing.** Decide the blocks in the order
   they appear: intro (3 lines), hero figure, functional description
   (4 lines), one underlined mechanism (2 lines), secondary figure (with
   optional DETAIL insets), data table (6–8 rows), one notice, a checklist
   (6–7 steps). Pick figure types from the table in style guide §5. Write the
   text now; it is short, and writing it shows what the figures must explain.

3. **Set up the folder.** Use the folder the user names. Otherwise use a new
   folder in the current project or working directory.
   ```sh
   mkdir -p <out> && cp <skill>/assets/template.html <out>/<name>.html && cp -R <skill>/assets/fonts <out>/fonts
   ```

4. **Fill the template.** Replace every `[BRACKETED]` placeholder. Draw the
   figures from `svg-parts.md` parts in millimetre coordinates. Keep the shared
   `nh-*` defs. Don't add colours, logos or texture.

5. **Render and fit.** Run `sh <skill>/scripts/render.sh <out>/<name>.html`.
   The `fit:` line reports the space left above the footer (or the bottom
   margin on pages without one), per page; aim for 4–10 mm.
   It exits 3 on overflow. Then cut words or a table row, not type size. In
   the lower band, trim whichever column is taller (style guide §2).

6. **Check and look.** Run
   `uv run --no-project --with pymupdf python <skill>/scripts/check.py <out>/<name>.pdf`.
   Add `--pages N` for a multi-page report. It must report the expected page
   count and ink and paper only. Then open every tile it
   lists and look for:
   - a line or leader crossing or touching text (keep 0.6 mm clear)
   - labels touching each other or a box edge
   - a dimension value sitting on its line
   - a clipped word
   - a pattern used with two meanings
   - an arrow pointing at the wrong thing

   Fix them, then repeat steps 5 and 6. Most of the quality comes from this
   loop; expect three to six passes.

7. **Deliver.** Always open the finished report through Artifact Server, in
   the user's default browser (not a specific browser), with
   `python3 <skill>/scripts/open.py <out>/<name>.html`. It publishes the view
   HTML (with the PDF alongside, in the Files tab) and opens the review page,
   where the user can pin comments on the report. Give the review link it
   prints, then the paths of the view HTML and the PDF (the print file, on
   white paper). If it prints that it fell back to opening the local file,
   say so. Say what the page explains. For real
   subjects, list the files you checked the numbers against. Mention anything
   deliberately simplified.

8. **Answer review comments (optional).** The report is for reading, not
   for iterating on. The user batches comments on the review page and sends
   them all at once with "Send all open", which only works while an agent is
   connected. To connect, run
   `python3 <skill>/scripts/artifact-watch.py --once --name <agent>` as a
   background command whose exit notifies you (Claude Code: Bash with
   `run_in_background`), where `<agent>` names you (for example
   `claude-code`). It stays silent until the user presses Send, then prints
   the bundle as one `dispatch` JSON line and exits. If your harness can't
   notify you when a background command ends, skip this; the user will tell
   you when they've commented, and you read the open threads with
   `comment_list` (the `artifact-server` skill covers the MCP tools).
   - Action each comment in the terminal, as if the user had typed it there:
     "explain X" gets an explanation in your reply, a question gets an
     answer. Don't edit or republish the report unless a comment asks for a
     change to it; the user will ask for a new report when they want one.
   - Then reply to each thread in a sentence (`comment_reply`, for example
     "Answered in the terminal: the gate opens below 85 % of the 5-hour
     window.") and resolve it (`comment_resolve`), as the bundle asks.
   - Start the watcher again to stay connected for the next Send.
   - `--comments` streams every comment the moment it's made instead
     (Claude Code: the Monitor tool, re-armed when it expires). Use it only
     when the user asks for that.

## What makes it look right

These are the calls that separate a convincing page from a costume.
`style-guide.md` has the full reasoning.

- **Structure over texture.** The genre is carried by the running head,
  numbered paragraphs, figure codes, change bar, thumb tab and dated footer.
  Leave out coffee stains, noise, rotated stamps and NASA insignia.
- **Three typefaces, three jobs.** Nimbus Sans (the bundled Helvetica clone)
  for prose, Bold for headings. Leroy caps for everything inside a drawing. Letter Gothic only on the
  checklist card. All caps is the genre here, not a style mistake.
- **One idea, two figures.** The hero figure draws the one idea; the secondary
  shows how it behaves over time or in detail. Everything else supports them.
- **Flat, exact voice.** Third person, present tense, numbers with units,
  controls in caps as placarded, UI strings quoted exactly.
- **Text is never crossed by a line.** Leaders start just outside their label
  and end on the part. Move a label rather than shrink it.
- **Drafting-sized details.** Line weights from 0.16 to 0.5 mm, arrowheads
  about 2 mm long, labels 2.05 to 2.5 mm. The template's classes and markers
  already encode this; use them instead of ad-hoc strokes.
- **Pure black on pure white.** Differentiate with hatching and dotted
  outlines. Printers turn any tint or grey into dots.
- **Truth first on real subjects.** A precise-looking page with a wrong number
  is worse than one row fewer.

## Variants

US Letter, multi-page sections, controls-and-displays pages, engineering
drawing sheets, Technical Note covers and the 1969 typewriter look are all
covered in style guide §9. The page structure, the drawing rules and the check
loop stay the same.

## Requirements

- Google Chrome or Chromium, for `render.sh` (set `CHROME=/path` if it isn't
  found).
- `uv` (or a Python with `pymupdf`), for `check.py`.
- Node 18+ with npm, for the fast flow only. On first use `fast-build.sh`
  downloads its packages (about 180 MB, pinned by `fast/package-lock.json`)
  into `~/.cache/nasa-handbook-fast`; nothing is installed in the skill.
- `artifactserver` on the PATH, for review in `open.py`. Without it the
  script opens the local view HTML instead (`--local` forces that).
- No system fonts: every face is bundled in `assets/fonts/` as TrueType,
  including Nimbus Sans, which also supplies the flagged "1" in drawing labels.

## Upstream

This is a heavily modified fork of
https://github.com/R44VC0RP/skills/tree/main/skills/nasa-handbook, forked from
commit `e6f8682` (26 Oct 2026). To check upstream for changes worth taking:

```sh
git clone --depth 50 https://github.com/R44VC0RP/skills /tmp/nh-upstream
git -C /tmp/nh-upstream log --oneline e6f8682..HEAD -- skills/nasa-handbook
git -C /tmp/nh-upstream diff e6f8682..HEAD -- skills/nasa-handbook
```

Merge changes by hand. Local changes include:
- Nimbus Sans in place of Aileron.
- White paper in the PDF; the browser view is off-white.
- No footer on every page.
- Delivery through `open.py` and Artifact Server, plus the review-comment step.
- The fast flow.
