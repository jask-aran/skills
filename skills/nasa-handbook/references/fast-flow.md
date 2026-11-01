# Fast flow: the report from one Markdown file

Use this only when the user asks for a fast report or expects to revise it
repeatedly. Everything else gets the standard flow in SKILL.md, whose
hand-drawn figures are much better (hatching, dimensioned callouts, labels
placed by hand).

What changes:
- The source is one Markdown file, about a third the size of the hand-built page.
- Diagrams and charts are laid out by Graphviz, Vega-Lite and Mermaid, not
  drawn by coordinates.
- The page is one continuous sheet, so there's no fit check, no tiles and no
  visual check loop.
- `fast-build.sh` builds it in about 0.1 s into one self-contained HTML file.

The cost is figure quality. Automatic layout gives a correct diagram, not a
handsome one: wide block diagrams shrink until their labels are small.

## Workflow

1. Find the one idea and write the text first, as in steps 1–2 of SKILL.md.
2. Write `<out>/<name>.md` in the format below.
   `assets/examples/fast/codex-delegation.md` is a complete example: copy its
   front matter and block shapes.
3. Build: `sh <skill>/scripts/fast-build.sh <out>/<name>.md`, which writes
   `<out>/<name>.html`. The first run installs the npm packages into
   `~/.cache/nasa-handbook-fast`. Fix any `... block failed` error it prints.
   Skip the visual check loop.
4. Deliver with `python3 <skill>/scripts/open.py <out>/<name>.html`, as in
   step 7 of SKILL.md. To revise, edit the Markdown, rebuild and run
   `open.py` again; each run publishes a new version. `--watch` rebuilds on
   every save.

## Format

```markdown
---
doc: AW2A-03-BLOCK I-(1)
title: AGENT WORKBENCH OPERATIONS HANDBOOK
part: SYSTEMS DATA
section: 2.3
subject: CODEX DELEGATION SUBSYSTEM
opener: SECTION 2 · SUBSECTION 2.3
tab: CDX
---

## Introduction            -> 2.3.1 INTRODUCTION.   (numbered from `section`)
### Quota Gate             -> 2.3.1.1 Quota Gate.    (underlined)

Table: CDS Design Data     -> Table 2.3-1. CDS Design Data  (line right above a pipe table)
```

Figures and tables number themselves in order. Refer to them by those numbers
in the text ("figure 2.3-2").

| Block | Use |
| --- | --- |
| ```` ```dot {caption="..." code="CDX-501A"} ```` | Graphviz block diagram, rendered to SVG at build time. Nodes default to boxes. Write labels in caps; use `\n` for line breaks. |
| ```` ```vega-lite {caption="..."} ```` | Vega-Lite JSON chart, rendered to SVG at build time. Give `width` and `height` in px. Black only. Put text alignment on the mark (`"align": "left"`); `align` is not an encoding channel. |
| ```` ```mermaid {caption="..."} ```` | Mermaid (sequence, state, timeline, flowchart), drawn in the browser. Write `<` and `>` as `#lt;` and `#gt;`. |
| ```` ```svg {caption="..."} ```` | Hand-drawn SVG, passed through, for the one figure that deserves it. |
| ```` ```checklist TITLE \| STATION ```` | Checklist card. One step per line: `1 ITEM - action`. A line without a number (`  √ CHECK - ok`) is a check. |
| `::: figure Caption {code=CDX-502A}` | Several blocks side by side in one numbered figure; diagram blocks inside take no caption. |
| `::: detail DETAIL A: TITLE` | Lettered inset inside a figure: a list, a table or short lines. |
| `::: cols 1fr 64mm` + `::: col` | Columns, e.g. the lower band: table left, notice and checklist right. |
| `::: note`, `::: caution`, `::: warning` | Notices. |

Nest `:::` blocks freely and close each with a bare `:::`. Raw HTML is not
passed through, so `<placeholders>` in text and tables print as written.

## Keeping figures readable

- **Block diagrams:** keep them to about eight boxes in one direction. Split a
  wider system into two figures, or use `rankdir=TB` for a tall one.
- **Long sequences:** use Mermaid `sequenceDiagram` with `autonumber`.
- **Charts:** annotate with text and `rule` layers rather than a legend.
