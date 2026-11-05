const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const script = fs.readFileSync(path.join(__dirname, "..", "js", "script.js"), "utf8");

test("project name is entered once and reused as the directory and output prefixes", () => {
  assert.equal((html.match(/id="projectName"/g) || []).length, 1);
  assert.doesNotMatch(html, /id="studyName"/);
  assert.match(script, /`git clone \$\{PIPELINE_REPOSITORY\} \$\{projectName\}`/);
  assert.match(script, /`cd \$\{projectName\}`/);
  assert.match(script, /`projectName: "\$\{projectName\}"`/);
  assert.doesNotMatch(script, /studyName:/);
  assert.match(
    script,
    /`\$\{projectName\}-Results-Export\/\$\{projectName\}\.pipeline-report\.html`/
  );
});
