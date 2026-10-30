const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const script = fs.readFileSync(path.join(__dirname, "..", "js", "script.js"), "utf8");

test("internal-standard correction is opt-in and carries a clear stopping warning", () => {
  const toggle = html.match(/<input id="intstdToggle"[^>]*>/)?.[0] || "";
  assert.ok(toggle, "internal-standard checkbox should exist");
  assert.doesNotMatch(toggle, /\schecked(?:\s|\/?>)/);
  assert.match(html, /Only check this box if genomic internal standards were physically added/);
  assert.match(html, /the pipeline will not finish/);
});

test("primer and QIIME 2 controls have clearly labelled sections", () => {
  assert.match(html, /<h3>Primer sequences<\/h3>/);
  assert.match(html, /<h3>QIIME 2 environment<\/h3>/);
  assert.ok(html.indexOf("Primer sequences") < html.indexOf('id="fwdPrimer"'));
  assert.ok(html.indexOf("QIIME 2 environment") < html.indexOf('id="qiime2version"'));
});

test("environment directory, raw data and file endings have their own section headings", () => {
  for (const [heading, field] of [
    ["Shared Conda environment directory", "conda_envs_dir"],
    ["Raw data location", "rawdatadir"],
    ["FASTQ file endings", "R1file_ending"],
  ]) {
    const headingPosition = html.indexOf(`<h3>${heading}</h3>`);
    assert.ok(headingPosition >= 0, `${heading} should have a section heading`);
    assert.ok(headingPosition < html.indexOf(`id="${field}"`));
  }
});

test("internal-standard template accepts 16S and 18S SSU references", () => {
  assert.match(html, /complete 16S or 18S SSU rRNA gene sequence/);
  assert.match(script, /full_SSU_sequence/);
  assert.doesNotMatch(script, /full_16S_sequence/);
});

test("each internal-standard name has its own remove control", () => {
  assert.match(script, /data-remove-standard-at="\$\{index\}"/);
  assert.match(script, /function removeInternalStandardAt\(index\)/);
  assert.match(script, /standards\.splice\(index, 1\)/);
  assert.match(script, /record\.standards\.splice\(index, 1\)/);
  assert.doesNotMatch(html, /Remove last standard/);
  assert.match(html, /Remove<\/strong> beside any unused preset/);
});
