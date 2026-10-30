const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const script = fs.readFileSync(path.join(__dirname, "..", "js", "script.js"), "utf8");

test("QIIME compatibility warning and environment field remain visible without a toggle", () => {
  const notice = html.match(/<aside class="note" id="qiimeCompatibilityNotice">([\s\S]*?)<\/aside>/)?.[1];
  assert.ok(notice, "compatibility warning should exist");
  assert.match(notice, /SILVA and PR2 classifiers/);
  assert.match(notice, /compatible QIIME 2 release/);
  assert.match(notice, /same scikit-learn version used to train each classifier/);
  assert.match(notice, /support both classifiers/);
  assert.match(notice, /matching Conda environment name alone does not guarantee compatibility/);
  assert.match(notice, /https:\/\/library\.qiime2\.org\/data-resources/);
  assert.doesNotMatch(html, /qiimeToggle/);
  assert.doesNotMatch(script, /qiimeToggle|setVisible\("qiimeBlock"/);
  assert.match(html, /<div id="qiimeBlock" class="field-group">/);
  assert.ok(html.indexOf('id="qiimeCompatibilityNotice"') < html.indexOf('id="qiimeBlock"'));
});

test("QIIME setting distinguishes YAML reuse, installed names and multi-user sharing", () => {
  assert.match(html, /QIIME 2 environment: YAML path or installed name/);
  assert.match(html, /id="qiime2version"[^>]*aria-describedby="qiimeCompatibilityNotice"/);
  assert.match(html, /hash of the definition/);
  assert.match(html, /is reused, not recreated/);
  assert.match(html, /does not scan arbitrary/);
  assert.match(html, /does not create the named/);
  assert.match(html, /fingerprints its installed packages/);
  assert.match(html, /Sharing between multiple users/);
  assert.match(html, /same pinned YAML definition/);
  assert.match(html, /appropriate filesystem permissions/);
  assert.match(script, /`qiime2version: \$\{JSON.stringify\(\$\("#qiime2version"\)\.value\.trim\(\)\)\}`/);
});

test("QIIME guidance explains creation and adding older or unbundled definitions", () => {
  const notice = html.match(/<aside class="note" id="qiimeCompatibilityNotice">([\s\S]*?)<\/aside>/)?.[1];
  assert.ok(notice);
  const text = notice.replace(/\s+/g, " ");
  assert.match(text, /YAML file is an installation recipe, not an installed environment/);
  assert.match(text, /file must exist, but Snakemake creates the matching environment/);
  assert.match(text, /Conda and Snakemake must already be installed/);
  assert.match(text, /added to the pipeline bundle through maintenance patches/);
  assert.match(text, /older or other unbundled release/);
  assert.match(text, /appropriate Linux environment YAML definition from QIIME 2/);
  assert.match(text, /<code>workflow\/envs\/<\/code>/);
  assert.match(text, /<code>\.\.\/envs\/my-qiime-environment\.yml<\/code>/);
  assert.match(text, /absolute YAML path/);
  assert.match(text, /does not automatically upgrade older filenames/);
  assert.match(text, /commands, required plugins, or your classifiers/);
});
