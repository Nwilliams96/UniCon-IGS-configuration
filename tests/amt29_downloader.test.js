const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const script = path.join(__dirname, "..", "downloads", "download-AMT29-test.sh");
const filename = "AMT29_02.R1.fastq.gz";
const payload = Buffer.from("Small deterministic download fixture\n");
const md5 = crypto.createHash("md5").update(payload).digest("hex");

function fixture(t, contents = payload) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "unicon-download-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const bin = path.join(root, "bin");
  const output = path.join(root, "raw data");
  fs.mkdirSync(bin);
  fs.mkdirSync(output);
  const manifest = path.join(root, "manifest.tsv");
  const data = path.join(root, "payload");
  const log = path.join(root, "curl.log");
  fs.writeFileSync(data, contents);
  fs.writeFileSync(manifest, `filename\turl\tmd5\tbytes\tsra_run\n${filename}\thttps://example.test/read.fastq.gz\t${md5}\t${payload.length}\tSRR32418739\n`);
  fs.writeFileSync(path.join(bin, "curl"), [
    "#!/bin/bash", "set -eu", 'echo called >> "$FAKE_CURL_LOG"',
    'while [[ $# -gt 0 ]]; do', '  if [[ "$1" == "--output" ]]; then cp "$FAKE_CURL_PAYLOAD" "$2"; exit 0; fi',
    "  shift", "done", "exit 2", ""
  ].join("\n"), { mode: 0o755 });
  return {
    output, log, manifest,
    run() { return spawnSync("bash", [script, output, manifest], { encoding: "utf8", env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, FAKE_CURL_LOG: log, FAKE_CURL_PAYLOAD: data } }); }
  };
}

test("downloader verifies a new file, reuses it, and handles paths containing spaces", t => {
  const f = fixture(t);
  let result = f.run();
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(fs.readFileSync(path.join(f.output, filename)), payload);
  assert.equal(fs.existsSync(path.join(f.output, filename + ".part")), false);
  result = f.run();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Reusing verified file/);
  assert.equal(fs.readFileSync(f.log, "utf8").trim().split("\n").length, 1);
});

test("downloader refuses to overwrite a conflicting final file", t => {
  const f = fixture(t);
  const output = path.join(f.output, filename);
  fs.writeFileSync(output, "User's existing data");
  const result = f.run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /refusing to overwrite/);
  assert.equal(fs.readFileSync(output, "utf8"), "User's existing data");
  assert.equal(fs.existsSync(f.log), false);
});

test("failed checksum never exposes an unverified final file", t => {
  const f = fixture(t, Buffer.from("corrupt response"));
  const result = f.run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Checksum failed/);
  assert.equal(fs.existsSync(path.join(f.output, filename)), false);
  assert.equal(fs.existsSync(path.join(f.output, filename + ".part")), true);
});

test("a complete verified partial is saved without repeating the download", t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.output, filename + ".part"), payload);
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(fs.readFileSync(path.join(f.output, filename)), payload);
  assert.equal(fs.existsSync(f.log), false);
});

test("manifest traversal attempts are rejected before accessing destinations", t => {
  const f = fixture(t);
  fs.writeFileSync(f.manifest, `filename\turl\tmd5\tbytes\tsra_run\n../outside\thttps://example.test/reads\t${md5}\t1\tSRR32418739\n`);
  const result = f.run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Invalid manifest record/);
  assert.equal(fs.existsSync(f.log), false);
});
