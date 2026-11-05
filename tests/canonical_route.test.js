const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "js", "canonical-route.js"), "utf8");
function target(hostname, pathname) {
  let redirected;
  const location = { hostname, pathname, search: "?example=1", hash: "#samples", replace(value) { redirected = value; } };
  vm.runInNewContext(source, { window: { location } });
  return redirected;
}

test("old and renamed project-site aliases redirect while preserving query and section", () => {
  for (const host of ["www.nathanlrwilliams.com", "nwilliams96.github.io"]) {
    for (const route of ["/eASV-Pipeline-Tutorial/", "/UniCon-IGS-configuration/", "/UniCon-IGS-configuration/index.html"]) {
      assert.equal(target(host, route), "https://www.nathanlrwilliams.com/UniCon-IGS/?example=1#samples");
    }
  }
});

test("the preferred URL, local file previews and unrelated pages never redirect", () => {
  assert.equal(target("www.nathanlrwilliams.com", "/UniCon-IGS/"), undefined);
  assert.equal(target("", "/Users/nathan/08-Website/index.html"), undefined);
  assert.equal(target("example.org", "/eASV-Pipeline-Tutorial/"), undefined);
  assert.equal(target("www.nathanlrwilliams.com", "/research/"), undefined);
});
