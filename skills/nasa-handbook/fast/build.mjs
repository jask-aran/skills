// Build a NASA-handbook report from one Markdown file into one self-contained HTML file.
//
//   sh <skill>/scripts/fast-build.sh report.md [--watch]   -> report.html next to it
//   (the wrapper installs the npm packages into ~/.cache/nasa-handbook-fast, copies this file
//   there and runs it from there, so Node resolves the packages; fonts come from NASA_FONTS)
//
// Source format (see README.md): YAML-ish front matter for the running head,
// ## / ### headings (auto-numbered from `section`), paragraphs, pipe tables with a
// "Table: caption" line above, and these blocks:
//   ```dot {caption="..." code="CDX-501A"}        Graphviz, rendered to SVG at build time
//   ```vega-lite {caption="..." code="..."}       Vega-Lite JSON, rendered to SVG at build time
//   ```mermaid {caption="..."}                    Mermaid, rendered in the browser
//   ```svg {caption="..."}                        hand-drawn SVG, passed through
//   ```checklist TITLE | STATION                  Flight Data File card, one step per line
//   ::: figure Caption {code=...}  ... :::        several blocks in one numbered figure
//   ::: detail DETAIL A: TITLE ... :::            lettered inset inside a figure
//   :::: cols 1fr 64mm / ::: col ... ::::        side-by-side columns
//   ::: note | caution | warning ... :::          notices
// Raw HTML is not passed through, so <placeholders> print as written.
import fs from "node:fs";
import path from "node:path";
import MarkdownIt from "markdown-it";
import container from "markdown-it-container";
import { instance as vizInstance } from "@viz-js/viz";
import * as vega from "vega";
import * as vl from "vega-lite";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const FONTS = process.env.NASA_FONTS ?? path.join(HERE, "../assets/fonts");
const LEROY = "Routed Gothic Narrow";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---------- small parsers ----------
function frontMatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return [{}, src];
  const meta = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].replace(/^["']|["']$/g, "");
  }
  return [meta, src.slice(m[0].length)];
}

// `name rest {key="v" key2=v2}` -> { name, rest, attrs }
function info(str) {
  const attrs = {};
  const braced = str.match(/\{([^}]*)\}\s*$/);
  if (braced) {
    for (const m of braced[1].matchAll(/(\w+)=("([^"]*)"|'([^']*)'|(\S+))/g)) attrs[m[1]] = m[3] ?? m[4] ?? m[5];
    str = str.slice(0, braced.index);
  }
  const [name = "", ...rest] = str.trim().split(/\s+/);
  return { name, rest: rest.join(" "), attrs };
}

// markdown-it-container closes an outer ::: at the first inner :::. Authors nest with
// plain ::: everywhere, so rewrite each pair to 3 + (depth of nesting below it) colons.
function nestFences(src) {
  const lines = src.split("\n"), stack = [], pairs = [];
  let inCode = false;
  lines.forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) inCode = !inCode;
    if (inCode) return;
    if (/^\s*:{3,}\s*[\w-]/.test(line)) stack.push({ open: i, height: 0 });
    else if (/^\s*:{3,}\s*$/.test(line) && stack.length) {
      const node = stack.pop();
      pairs.push({ ...node, close: i });
      if (stack.length) stack[stack.length - 1].height = Math.max(stack[stack.length - 1].height, node.height + 1);
    }
  });
  for (const { open, close, height } of pairs) {
    const marks = ":".repeat(3 + height);
    lines[open] = lines[open].replace(/^(\s*):{3,}/, `$1${marks}`);
    lines[close] = lines[close].replace(/^(\s*):{3,}/, `$1${marks}`);
  }
  return lines.join("\n");
}

// ---------- renderers for diagram blocks ----------
const viz = await vizInstance();
function renderDot(src) {
  return viz.renderString(src, {
    format: "svg",
    graphAttributes: { fontname: LEROY, fontsize: 9, bgcolor: "transparent", pad: 0.15, nodesep: 0.3, ranksep: 0.4 },
    nodeAttributes: { fontname: LEROY, fontsize: 9, shape: "box", penwidth: 0.9, margin: "0.12,0.06" },
    edgeAttributes: { fontname: LEROY, fontsize: 8, penwidth: 0.7, arrowsize: 0.55 },
  });
}

const VL_CONFIG = {
  font: LEROY, background: null,
  view: { stroke: "#000", strokeWidth: 0.8 },
  axis: { domainColor: "#000", tickColor: "#000", labelColor: "#000", titleColor: "#000",
          gridColor: "#000", gridDash: [1, 2], gridWidth: 0.3, domainWidth: 0.8, tickWidth: 0.6,
          labelFontSize: 9, titleFontSize: 9, titleFontWeight: "normal", labelFont: LEROY, titleFont: LEROY },
  legend: { labelFont: LEROY, titleFont: LEROY, labelColor: "#000", titleColor: "#000", titleFontWeight: "normal" },
  title: { font: LEROY, fontWeight: "normal", color: "#000", fontSize: 10 },
  text: { font: LEROY, color: "#000", fontSize: 9 },
  mark: { color: "#000" },
  range: { category: ["#000"] },
};
const merge = (a, b) => {
  const out = { ...a };
  for (const [k, v] of Object.entries(b ?? {})) out[k] = v && typeof v === "object" && !Array.isArray(v) ? merge(a[k] ?? {}, v) : v;
  return out;
};
async function renderVegaLite(src) {
  const spec = JSON.parse(src);
  spec.config = merge(VL_CONFIG, spec.config);
  const view = new vega.View(vega.parse(vl.compile(spec).spec), { renderer: "none" });
  return view.toSVG();
}

// ---------- markdown ----------
function makeMd(meta) {
  const md = new MarkdownIt({ html: false, typographer: false });
  const section = meta.section ?? "1";
  const figStack = [];

  // Numbered headings, table captions, figure numbers: one pass over the tokens.
  md.core.ruler.push("handbook_numbers", (state) => {
    const n = [0, 0, 0];
    let fig = 0, tab = 0, inFigure = 0;
    const t = state.tokens;
    for (let i = 0; i < t.length; i++) {
      const tok = t[i];
      if (tok.type === "heading_open" && tok.tag !== "h1") {
        const level = Number(tok.tag[1]) - 2; // h2 -> 0
        n[level]++;
        for (let j = level + 1; j < n.length; j++) n[j] = 0;
        tok.attrSet("data-num", [section, ...n.slice(0, level + 1)].join("."));
      }
      if (tok.type === "container_figure_open") { inFigure++; tok.meta = { num: `${section}-${++fig}` }; }
      if (tok.type === "container_figure_close") inFigure--;
      if (tok.type === "fence") {
        const { name, attrs } = info(tok.info);
        if (["dot", "vega-lite", "mermaid", "svg"].includes(name) && !inFigure && attrs.caption) tok.meta = { num: `${section}-${++fig}` };
      }
      if (tok.type === "paragraph_open" && t[i + 1]?.type === "inline" && /^Table:\s*/.test(t[i + 1].content)) {
        tok.attrJoin("class", "tcap");
        const first = t[i + 1].children[0];
        first.content = `Table ${section}-${++tab}. ` + first.content.replace(/^Table:\s*/, "");
      }
    }
  });

  const figureHtml = (inner, num, caption, code) =>
    `<figure class="fig"><div class="art">${inner}${code ? `<span class="code">${esc(code)}</span>` : ""}</div>` +
    (caption ? `<figcaption>${num ? `<span class="n">Figure ${num}.</span>` : ""}${esc(caption)}</figcaption>` : "") + `</figure>\n`;

  md.renderer.rules.fence = (tokens, idx) => {
    const tok = tokens[idx];
    const { name, rest, attrs } = info(tok.info);
    let inner;
    if (name === "checklist") {
      const [title, station = ""] = rest.split("|").map((s) => s.trim());
      const rows = tok.content.replace(/\n$/, "").split("\n").map((line) => {
        const m = line.match(/^(\d+)\s+(.*)$/);
        return m ? `<li><span>${m[1]}</span><span>${esc(m[2])}</span></li>` : `<li><span></span><span>${esc(line.trim())}</span></li>`;
      });
      return `<div class="card"><div class="bar"><span>${esc(title)}</span><span>${esc(station)}</span></div><ol>${rows.join("")}</ol></div>\n`;
    }
    if (name === "dot" || name === "vega-lite") inner = tok.meta?.svg ?? `<pre>${esc(tok.content)}</pre>`;
    else if (name === "mermaid") inner = `<pre class="mermaid">${esc(tok.content)}</pre>`;
    else if (name === "svg") inner = tok.content;
    else return `<pre><code>${esc(tok.content)}</code></pre>\n`;
    if (!tok.meta?.num && !attrs.caption) return `<div class="part">${inner}</div>`; // inside a ::: figure
    return figureHtml(inner, tok.meta?.num, attrs.caption, attrs.code);
  };

  const block = (name, open, close) =>
    md.use(container, name, { validate: (p) => p.trim().split(/\s+/)[0] === name, render: (t, i) => (t[i].nesting === 1 ? open(t[i], info(t[i].info)) : close(t[i])) });

  block("figure",
    (tok, { rest, attrs }) => { figStack.push({ num: tok.meta?.num, caption: rest, code: attrs.code }); return `<figure class="fig"><div class="art">`; },
    () => { const f = figStack.pop(); return `${f.code ? `<span class="code">${esc(f.code)}</span>` : ""}</div><figcaption><span class="n">Figure ${f.num}.</span>${esc(f.caption)}</figcaption></figure>\n`; });
  block("detail", (tok, { rest }) => `<div class="detail"><div class="dtitle">${esc(rest)}</div>`, () => `</div>`);
  block("cols", (tok, { rest }) => `<div class="cols" style="grid-template-columns:${esc(rest || "1fr 1fr")}">`, () => `</div>`);
  block("col", () => `<div class="col">`, () => `</div>`);
  for (const kind of ["note", "caution", "warning"])
    block(kind, () => `<div class="notice ${kind}"><span class="tag">${kind.toUpperCase()}</span>`, () => `</div>`);
  return md;
}

// ---------- page ----------
function fontCss() {
  const uri = (f) => `url("data:font/ttf;base64,${fs.readFileSync(path.join(FONTS, f)).toString("base64")}")`;
  const nimbus = uri("NimbusSans-Regular.ttf");
  return `
  @font-face { font-family: "Routed Gothic"; src: ${uri("routed-gothic.ttf")}; unicode-range: U+0000-0030, U+0032-FFFF; }
  @font-face { font-family: "Routed Gothic Narrow"; src: ${uri("routed-gothic-narrow.ttf")}; unicode-range: U+0000-0030, U+0032-FFFF; }
  @font-face { font-family: "Routed Gothic"; src: ${nimbus}; unicode-range: U+0031; }
  @font-face { font-family: "Routed Gothic Narrow"; src: ${nimbus}; unicode-range: U+0031; }
  @font-face { font-family: "Nimbus Sans"; src: ${nimbus}; font-weight: 400; }
  @font-face { font-family: "Nimbus Sans"; src: ${uri("NimbusSans-Italic.ttf")}; font-weight: 400; font-style: italic; }
  @font-face { font-family: "Nimbus Sans"; src: ${uri("NimbusSans-Bold.ttf")}; font-weight: 700; }
  @font-face { font-family: "Nimbus Sans"; src: ${uri("NimbusSans-BoldItalic.ttf")}; font-weight: 700; font-style: italic; }
  @font-face { font-family: "Letter Gothic"; src: ${uri("LetterGothicCode-R.ttf")}; font-weight: 400; }
  @font-face { font-family: "Letter Gothic"; src: ${uri("LetterGothicCode-B.ttf")}; font-weight: 700; }`;
}
const FONT_CSS = fontCss();
const PAGE_CSS = fs.readFileSync(path.join(HERE, "style.css"), "utf8");
const MERMAID_JS = fs.readFileSync(path.join(HERE, "node_modules/mermaid/dist/mermaid.min.js"), "utf8");
const MERMAID_INIT = `
mermaid.initialize({ startOnLoad: false, theme: "base", fontFamily: "${LEROY}", securityLevel: "strict",
  themeVariables: { fontFamily: "${LEROY}", fontSize: "10px", background: "transparent",
    primaryColor: "transparent", primaryBorderColor: "#000", primaryTextColor: "#000", lineColor: "#000",
    secondaryColor: "transparent", tertiaryColor: "transparent", clusterBkg: "transparent", clusterBorder: "#000",
    actorBkg: "transparent", actorBorder: "#000", actorTextColor: "#000", actorLineColor: "#000",
    signalColor: "#000", signalTextColor: "#000", labelBoxBkgColor: "transparent", labelBoxBorderColor: "#000",
    noteBkgColor: "transparent", noteBorderColor: "#000", noteTextColor: "#000",
    activationBkgColor: "transparent", activationBorderColor: "#000",
    sequenceNumberColor: "#fff", edgeLabelBackground: "transparent" },
  sequence: { useMaxWidth: false, mirrorActors: false, width: 120, height: 30, actorMargin: 30, boxMargin: 6, messageMargin: 26,
    actorFontSize: 10, messageFontSize: 9.5, noteFontSize: 9.5, actorFontFamily: "${LEROY}", messageFontFamily: "${LEROY}", noteFontFamily: "${LEROY}" },
  flowchart: { useMaxWidth: false, htmlLabels: false, curve: "linear" } });
document.fonts.ready.then(() => mermaid.run());`;

async function build(file) {
  const t0 = performance.now();
  const [meta, body] = frontMatter(fs.readFileSync(file, "utf8"));
  const md = makeMd(meta);
  const tokens = md.parse(nestFences(body), {});
  for (const tok of tokens) {
    if (tok.type !== "fence") continue;
    const { name } = info(tok.info);
    try {
      if (name === "dot") (tok.meta ??= {}).svg = renderDot(tok.content);
      if (name === "vega-lite") (tok.meta ??= {}).svg = await renderVegaLite(tok.content);
    } catch (e) {
      (tok.meta ??= {}).svg = `<pre class="error">${esc(name)} error: ${esc(e.message)}</pre>`;
      console.error(`${name} block failed: ${e.message}`);
    }
  }
  const html = md.renderer.render(tokens, md.options, {});
  const usesMermaid = tokens.some((t) => t.type === "fence" && info(t.info).name === "mermaid");
  const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(meta.doc ?? "")} ${esc(meta.title ?? "")}, ${esc(meta.section ?? "")} ${esc(meta.subject ?? "")}</title>
<style>${FONT_CSS}\n${PAGE_CSS}</style></head>
<body><div class="sheet">
<header class="head"><div class="doc">${esc(meta.doc ?? "")}</div><div class="title">${esc(meta.title ?? "")}</div><div class="part">${esc(meta.part ?? "")}</div><div class="rule"></div></header>
${meta.tab ? `<div class="tab">${esc(meta.tab)}</div>` : ""}
<div class="opener">${esc(meta.opener ?? "")}<br>${esc(meta.subject ?? "")}</div>
<main class="body">
${html}</main>
<footer class="foot"><div class="rule"></div><div class="sub">${esc(meta.subject ?? "")}</div><div class="line">Section&nbsp;<span class="fill">${esc(meta.section ?? "")}</span></div></footer>
</div>
${usesMermaid ? `<script>${MERMAID_JS}</script><script>${MERMAID_INIT}</script>` : ""}
</body></html>`;
  const out = file.replace(/\.md$/, "") + ".html";
  fs.writeFileSync(out, page);
  console.log(`built ${out} in ${(performance.now() - t0).toFixed(0)} ms (${(page.length / 1024).toFixed(0)} KB)`);
}

const [file] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!file) { console.error("usage: node build.mjs report.md [--watch]"); process.exit(1); }
await build(file);
if (process.argv.includes("--watch")) {
  let timer;
  fs.watch(file, () => { clearTimeout(timer); timer = setTimeout(() => build(file).catch((e) => console.error(e.message)), 30); });
  console.log(`watching ${file}`);
}
