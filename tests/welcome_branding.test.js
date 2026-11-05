const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "css", "style.css"), "utf8");

test("UniCon-IGS welcome uses the combined transparent artwork beside the text", () => {
  assert.match(html, /<div class="welcome-layout">\s*<div class="welcome-copy">\s*<h2>Welcome to UniCon-IGS<\/h2>/);
  assert.match(html, /<div class="welcome-artwork">\s*<img class="welcome-logo" src="images\/unicon-combined-transparent.png" alt="UniCon unicorn and graffiti-style wordmark" width="1504" height="1046"\s*\/>\s*<\/div>/);
  assert.equal((html.match(/class="welcome-logo"/g) || []).length, 1);
  const png = fs.readFileSync(path.join(root, "images", "unicon-combined-transparent.png"));
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(png.readUInt32BE(16), 1504);
  assert.equal(png.readUInt32BE(20), 1046);
  assert.equal(png[25], 6, "combined artwork should retain its RGBA transparency channel");
});

test("combined artwork preserves proportions and scales down on narrow screens", () => {
  const rule = css.match(/\.welcome-logo\s*\{([^}]+)\}/)?.[1];
  assert.ok(rule);
  assert.match(rule, /width:\s*204\.904632%/);
  assert.match(rule, /height:\s*auto/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\) minmax\(0,\s*400px\)/);
  assert.match(css, /@media \(max-width: 760px\)\s*\{\s*\.welcome-layout\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});

test("visible artwork is enlarged, vertically centred and closer to the welcome text", () => {
  const layout = css.match(/\.welcome-layout\s*\{([^}]+)\}/)?.[1];
  const frame = css.match(/\.welcome-artwork\s*\{([^}]+)\}/)?.[1];
  assert.match(layout, /align-items:\s*center/);
  assert.match(layout, /gap:\s*12px/);
  assert.match(frame, /aspect-ratio:\s*734 \/ 763/);
  assert.match(frame, /overflow:\s*hidden/);
  const rule = css.match(/\.welcome-logo\s*\{([^}]+)\}/)?.[1];
  assert.match(rule, /left:\s*-65\.122616%/);
  assert.match(rule, /top:\s*-15\.989515%/);
  const enlargement = (400 * (1504 / 734)) / 320;
  assert.ok(enlargement > 2.5 && enlargement < 2.6);
});

test("no separate wordmark positioning or stroke-thinning effects remain", () => {
  assert.doesNotMatch(html, /welcome-tag|welcome-brand|tag-thin-ink|feMorphology/);
  assert.doesNotMatch(css, /welcome-tag|welcome-brand|tag-thin-ink/);
});
