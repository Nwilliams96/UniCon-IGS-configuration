const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const dataSource = fs.readFileSync(path.join(root, "js", "amt29-test-data.js"), "utf8");
const source = fs.readFileSync(path.join(root, "js", "script.js"), "utf8").replace(/\ninit\(\);\s*$/, "\n");
const context = vm.createContext({ console });
vm.runInContext(dataSource + "\n" + source, context);
const data = JSON.parse(vm.runInContext("JSON.stringify(AMT29_TEST_DATA)", context));

function readTSV(filename) {
  const rows = fs.readFileSync(path.join(root, "data", filename), "utf8").trimEnd().split(/\r?\n/).map(row => row.split("\t"));
  const header = rows.shift();
  return rows.map(row => Object.fromEntries(header.map((key, i) => [key, row[i]])));
}

test("the browser preload and downloadable sample sheet contain the same ten complete records", () => {
  assert.equal(data.bioproject, "PRJNA1226253");
  assert.deepEqual(data.samples.map(row => row.sample), Array.from({ length: 10 }, (_, i) => `AMT29_${String(i + 2).padStart(2, "0")}`));
  assert.deepEqual(readTSV("AMT29-test-samples.tsv"), data.samples);
  assert.equal(data.samples[0]["Latitude [degrees_north]"], "48.6");
  assert.equal(data.samples[0]["Longitude [degrees_east]"], "-6.74");
  assert.equal(data.samples[0].sra_run, "SRR32418739");
  assert.equal(data.samples[4].sra_run, "SRR32418744");
  assert.equal(data.samples[9].sra_run, "SRR32418749");
  for (const sample of data.samples) {
    assert.equal(sample.internal_std_normalization_factor, "1");
    assert.equal(sample.units, "L");
    for (const key of ["BP_ng", "DR_ng", "TT_ng"]) assert.ok(Number(sample[key]) > 0);
    assert.ok(Object.values(sample).every(value => !/^(?:NA|N\/A|null)$/i.test(value)));
  }
});

test("each sample has exactly one R1/R2 download, with explicit archive checksums and size", () => {
  const files = readTSV("AMT29-test-downloads.tsv");
  assert.equal(files.length, 20);
  assert.equal(new Set(files.map(row => row.filename)).size, 20);
  assert.equal(files.reduce((sum, row) => sum + Number(row.bytes), 0), data.compressed_bytes);
  assert.equal(data.compressed_bytes, 536608221);
  for (const sample of data.samples) {
    for (const mate of [1, 2]) {
      const row = files.find(file => file.filename === `${sample.sample}.R${mate}.fastq.gz`);
      assert.ok(row);
      assert.equal(row.sra_run, sample.sra_run);
      assert.match(row.url, new RegExp(`^https://ftp\\.sra\\.ebi\\.ac\\.uk/.*${row.sra_run}_${mate}\\.fastq\\.gz$`));
      assert.match(row.md5, /^[a-f0-9]{32}$/);
    }
  }
});

test("initialization loads all ten rows and maps each standard's recorded amount by its ID", () => {
  vm.runInContext("getInternalStandardIds = () => ['TT', 'BP', 'Custom'];", context);
  const records = JSON.parse(vm.runInContext("JSON.stringify(defaultTestSampleRecords())", context));
  assert.equal(records.length, 10);
  assert.deepEqual(records[1].standards, ["17.7", "17.7", ""]);
  assert.deepEqual(records[0].tail, ["1", "L"]);
  assert.deepEqual(records[0].prefix, ["AMT29_02"]);
  assert.match(source, /renderSampleRecords\(defaultTestSampleRecords\(\)\)/);
  const blank = vm.runInContext("sampleRowHTML()", context);
  assert.doesNotMatch(blank, /AMT29_|value="52"/);
  assert.ok(html.indexOf('src="js/amt29-test-data.js') < html.indexOf('src="js/script.js'));
});

test("test-dataset guidance appears after the pipeline explanation and matches the download layout", () => {
  assert.ok(html.indexOf('id="test-dataset"') > html.indexOf("Why this pipeline is needed"));
  assert.match(html, /id="rawdatadir"[^>]*value="\.\.\/AMT29-test-data"/);
  assert.match(html, /id="sampleCount"[^>]*value="10"/);
  assert.match(html, /downloads\/download-AMT29-test\.sh/);
  assert.match(html, /not\s+measured AMT29 pool concentrations/);
  assert.match(source, /https:\/\/github\.com\/Nwilliams96\/UniCon-IGS\.git/);
});
