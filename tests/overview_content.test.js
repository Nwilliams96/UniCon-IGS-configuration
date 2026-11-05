const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "..", "css", "style.css"), "utf8");

test("welcome section no longer displays the Step 0 overview label", () => {
  assert.doesNotMatch(html, /Step 0\s*•\s*Overview/);
  assert.match(html, /<h2>Welcome to UniCon-IGS<\/h2>/);
});

test("welcome description spells out UniCon-IGS with the requested acronym emphasis", () => {
  assert.match(html, /Welcome to UniCon-IGS: A Reproducible Snakemake Workflow for\s*<strong>Uni<\/strong>versal \(3-domain\) Ampli<strong>con<\/strong> Analysis with\s*<strong>I<\/strong>nternal <strong>G<\/strong>enomic <strong>S<\/strong>tandards\./);
  assert.doesNotMatch(html, /Welcome to the universal amplicon pipeline configuration and setup workflow/);
});

test("Bioanalyzer figures are narrower on large screens but responsive on small screens", () => {
  assert.match(css, /\.preamble-figure\s*\{\s*width:\s*min\(100%,\s*1000px\);\s*margin:\s*30px auto/);
  assert.equal((html.match(/<figure class="preamble-figure">/g) || []).length, 2);
});

test("the test-dataset anchor leaves room for the sticky navigation", () => {
  assert.match(css, /#test-dataset\s*\{[^}]*scroll-margin-top:\s*10rem;/);
});
