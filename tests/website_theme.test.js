const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const css = fs.readFileSync(path.join(__dirname, "..", "css", "style.css"), "utf8");
const theme = [...css.matchAll(/:root\s*\{([^}]+)\}/g)].at(-1)[1];
const colors = Object.fromEntries([...theme.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/g)].map(match => [match[1], match[2]]));

function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map(channel => parseInt(channel, 16) / 255);
  const linear = rgb.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

test("parchment page and sticky header use matching warm colors", () => {
  assert.equal(colors.bg, "#f3ead7");
  assert.equal(colors.panel, colors.bg);
  assert.equal(colors["panel-soft"], "#fcf8ef");
  assert.match(css, /background:\s*rgba\(243, 234, 215, 0\.96\)/);
});

test("main and secondary text retain readable contrast on parchment", () => {
  for (const key of ["text", "muted"]) {
    const ratio = (luminance(colors.bg) + 0.05) / (luminance(colors[key]) + 0.05);
    assert.ok(ratio >= 4.5, `${key} should meet 4.5:1 contrast, got ${ratio}`);
  }
});
