const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const source = fs.readFileSync(path.join(__dirname, "..", "js", "script.js"), "utf8")
  .replace(/\ninit\(\);\s*$/, "\n");

// Load actual control defaults from HTML, then execute the real controller.
// This small DOM fixture avoids adding a browser dependency to these tests.
function fixture() {
  const nodes = new Map();
  for (const match of html.matchAll(/<([a-z][a-z0-9]*)\b([^>]*\bid="([^"]+)"[^>]*)>/gi)) {
    const [, tag, attributes, id] = match;
    const classes = new Set((attributes.match(/class="([^"]*)"/)?.[1] || "").split(/\s+/));
    let value = attributes.match(/\bvalue="([^"]*)"/)?.[1] || "";
    if (tag === "select") {
      const contents = html.slice(match.index + match[0].length).split("</select>")[0];
      const options = Array.from(contents.matchAll(/<option\b([^>]*)>/g));
      value = (options.find(item => /\bselected\b/.test(item[1])) || options[0])?.[1]
        .match(/value="([^"]*)"/)?.[1] || "";
    }
    nodes.set(id, {
      value,
      checked: /\bchecked\b/.test(attributes),
      textContent: "",
      classList: {
        toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); },
        contains(name) { return classes.has(name); }
      }
    });
  }
  const document = {
    getElementById(id) { return nodes.get(id); },
    querySelector(selector) { return nodes.get(selector.replace(/^#/, "")); },
    querySelectorAll() { return []; }
  };
  const context = vm.createContext({ document, URL, console });
  vm.runInContext(source, context);
  return {
    nodes,
    run(code) { return vm.runInContext(code, context); },
    set(id, value) { nodes.get(id).value = value; },
    visible(id) { return !nodes.get(id).classList.contains("hidden"); }
  };
}

test("default database choices reuse Nathan's existing CARC classifiers", () => {
  const f = fixture();
  assert.equal(f.nodes.get("silvaDatabaseMode").value, "existing");
  assert.equal(f.nodes.get("pr2DatabaseMode").value, "existing");
  const root = "/project2/fuhrman_1138/databases/eASV-Snakemake/databases/classification";
  assert.equal(f.nodes.get("silvaClassifier").value,
    `${root}/SILVA/SILVA_144_SSURef_NR99_uniform_classifier_V4V5-515f-926r.qza`);
  assert.equal(f.nodes.get("pr2Classifier").value,
    `${root}/PR2/pr2_version_5.1.1_SSU_dada2.clean.culled.derep-sliced_GTGYCAGCMGCCGCGGTAA_CCGYCAATTYMTTTRAGTTT_dereplicated_final_classifier_qiime2-2026.7.qza`);
  f.run("updateDatabaseSetupText()");
  const yaml = f.run("databaseConfigLines().join('\\n')");
  for (const database of ["silva", "pr2"]) {
    assert.equal(f.visible(`${database}ExistingFields`), true);
    assert.equal(f.visible(`${database}DestinationFields`), false);
    assert.equal(f.run(`validDatabaseSettings('${database}')`), true);
    assert.match(yaml, new RegExp(`use_preexisting_${database}_database: true`));
    assert.ok(yaml.includes(`${database}_classifier: ${JSON.stringify(f.nodes.get(`${database}Classifier`).value)}`));
  }
  assert.doesNotMatch(yaml, /download_link:|download_md5:|silva_database_dir:|pr2_database_dir:/);
  assert.equal(f.nodes.get("silvaVersion").value, "144");
  assert.equal(f.nodes.get("pr2Version").value, "5.1.1");
  assert.equal(f.nodes.get("haveBbsplitDatabase").checked, false);
  assert.doesNotMatch(html, /id="haveSilvaDatabase"|id="havePr2Database"/);
});

for (const silvaMode of ["existing", "download", "train"]) {
  for (const pr2Mode of ["existing", "download", "train"]) {
    test(`SILVA ${silvaMode} / PR2 ${pr2Mode}: visible fields and active YAML agree`, () => {
      const f = fixture();
      for (const [database, mode] of [["silva", silvaMode], ["pr2", pr2Mode]]) {
        f.set(`${database}DatabaseMode`, mode);
        f.set(`${database}Classifier`, `/references/${database}.qza`);
        f.set(`${database}DownloadLink`, `https://example.org/${database}.qza`);
      }
      f.run("updateDatabaseSetupText()");
      const yaml = f.run("databaseConfigLines().join('\\n')");
      for (const [database, mode] of [["silva", silvaMode], ["pr2", pr2Mode]]) {
        const prefix = database === "silva" ? "SILVA" : "PR2";
        assert.equal(f.visible(`${database}ExistingFields`), mode === "existing");
        assert.equal(f.visible(`${database}DownloadFields`), mode === "download");
        assert.equal(f.visible(`${database}TrainingFields`), mode === "train");
        assert.equal(f.visible(`${database}DestinationFields`), mode !== "existing");
        assert.equal(f.visible(`${database}Version`), true);
        assert.equal(f.run(`validDatabaseSettings('${database}')`), true);
        assert.match(yaml, new RegExp(`use_preexisting_${database}_database: ${mode === "existing"}`));
        assert.equal(yaml.includes(`${database}_classifier:`), mode === "existing");
        assert.equal(yaml.includes(`${prefix}_download_link:`), mode === "download");
        assert.equal(yaml.includes(`${database}_database_dir:`), mode !== "existing");
      }
      assert.doesNotMatch(yaml, /DatabaseMode|database_mode|reference_mode/);
      // Preview and download use the same serializer, including active fields.
      f.run("buildConfigPreview()");
      assert.equal(f.nodes.get("configPreview").textContent, f.run("configToYAML()"));
      assert.ok(f.nodes.get("configPreview").textContent.includes(yaml));
    });
  }
}

test("mode switching retains input values but validates only active fields", () => {
  const f = fixture();
  for (const database of ["silva", "pr2"]) {
    f.set(`${database}Classifier`, "");
    f.set(`${database}DownloadLink`, "invalid URL");
    f.set(`${database}DatabaseDir`, "/shared/references");
    f.set(`${database}DatabaseMode`, "train");
    assert.equal(f.run(`validDatabaseSettings('${database}')`), true);
    f.set(`${database}DatabaseMode`, "download");
    assert.equal(f.run(`validDatabaseSettings('${database}')`), false);
    f.set(`${database}DownloadLink`, "https://example.org/my-classifier.qza");
    assert.equal(f.run(`validDatabaseSettings('${database}')`), true);
    f.set(`${database}DatabaseMode`, "existing");
    assert.equal(f.run(`validDatabaseSettings('${database}')`), false);
    f.set(`${database}Classifier`, "/read-only/my-classifier.qza");
    f.set(`${database}DatabaseDir`, "");
    f.run("updateDatabaseSetupText()");
    assert.equal(f.run(`validDatabaseSettings('${database}')`), true);
    f.set(`${database}DatabaseMode`, "download");
    f.run("updateDatabaseSetupText()");
    assert.equal(f.nodes.get(`${database}DownloadLink`).value, "https://example.org/my-classifier.qza");
    assert.equal(f.nodes.get(`${database}Classifier`).value, "/read-only/my-classifier.qza");
    assert.equal(f.run(`validDatabaseSettings('${database}')`), false);
    f.set(`${database}Version`, "");
    f.set(`${database}DatabaseMode`, "existing");
    assert.equal(f.run(`validDatabaseSettings('${database}')`), false);
  }
});

test("SILVA presets follow primers and custom URLs never inherit preset checksums", () => {
  const f = fixture();
  f.set("silvaDatabaseMode", "download");
  f.run("syncSilvaDownloadPreset()");
  let yaml = f.run("databaseConfigLines().join('\\n')");
  assert.match(yaml, /SILVA_download_md5: "f7757b01eb82e0ac78bf06427e410095"/);
  f.set("fwdPrimer", "ACGT");
  f.run("syncSilvaDownloadPreset()");
  yaml = f.run("databaseConfigLines().join('\\n')");
  assert.equal(
    new URL(f.nodes.get("silvaDownloadLink").value).pathname.split("/").pop(),
    "SILVA_144_SSURef_NR99_full-length_prokaryotes_rank-propagation_uniq_genus_uniform_classifier.qza"
  );
  assert.match(yaml, /SILVA_download_md5: "e16b9bc78dafa2f344563e570bbf25ba"/);
  f.set("fwdPrimer", "GTGYCAGCMGCCGCGGTAA");
  f.run("syncSilvaDownloadPreset()");
  assert.match(f.nodes.get("silvaDownloadLink").value, /V4V5-515f-926r/);
  f.set("silvaDownloadLink", "https://example.org/custom.qza?x=1&y=2");
  f.set("fwdPrimer", "ACGT");
  f.run("syncSilvaDownloadPreset()");
  assert.equal(f.nodes.get("silvaDownloadLink").value, "https://example.org/custom.qza?x=1&y=2");
  assert.doesNotMatch(f.run("databaseConfigLines().join('\\n')"), /download_md5/);
  f.set("silvaDownloadLink", "");
  f.run("syncSilvaDownloadPreset()");
  assert.equal(f.nodes.get("silvaDownloadLink").value, "");
});

test("SILVA 144 training warning is advisory and other releases remain editable", () => {
  const f = fixture();
  f.set("silvaDatabaseMode", "train");
  f.run("updateDatabaseSetupText()");
  assert.equal(f.visible("silvaTrainingWarning"), true);
  assert.equal(f.run("validDatabaseSettings('silva')"), true);
  f.set("silvaVersion", "138.2");
  f.run("updateDatabaseSetupText()");
  assert.equal(f.visible("silvaTrainingWarning"), false);
  assert.equal(f.run("validDatabaseSettings('silva')"), true);
  assert.match(f.run("databaseConfigLines().join('\\n')"), /SILVAversion: "138.2"/);
});

test("reference releases match the pipeline's dotted numeric version format", () => {
  const f = fixture();
  for (const database of ["silva", "pr2"]) {
    f.set(`${database}DatabaseMode`, "train");
    for (const version of ["banana", "v144", "5..1", "144/../other", ""]) {
      f.set(`${database}Version`, version);
      assert.equal(f.run(`validDatabaseSettings('${database}')`), false, version);
    }
    for (const version of ["144", "138.2", "5.1.1"]) {
      f.set(`${database}Version`, version);
      assert.equal(f.run(`validDatabaseSettings('${database}')`), true, version);
    }
  }
});

test("YAML quoting preserves paths and URLs containing special characters", () => {
  const f = fixture();
  f.set("pr2DatabaseDir", '/shared/a "quoted" folder');
  f.set("pr2DatabaseMode", "download");
  f.set("pr2DownloadLink", "https://example.org/classifier.qza?value=a&x=2");
  const yaml = f.run("databaseConfigLines().join('\\n')");
  const directory = yaml.split("\n").find(line => line.startsWith("pr2_database_dir:")).split(": ")[1];
  assert.equal(JSON.parse(directory), '/shared/a "quoted" folder');
  assert.match(yaml, /classifier\.qza\?value=a&x=2/);
});

test("one project name supplies the generated YAML, clone directory and report", () => {
  const f = fixture();
  f.set("projectName", "001-My_Project");
  const yaml = f.run("configToYAML()");
  assert.equal(yaml.split("\n").filter(row => row.startsWith("projectName:")).length, 1);
  assert.match(yaml, /^projectName: "001-My_Project"$/m);
  assert.doesNotMatch(yaml, /studyName/);
});

test("QIIME YAML paths and installed names serialize and validate consistently", () => {
  const f = fixture();
  for (const value of ["qiime2-2026.7", "base", "../envs/qiime.yml", '/shared/a "quoted" environment.yaml']) {
    assert.equal(f.run(`validQiimeEnvironment(${JSON.stringify(value)})`), true);
    f.set("qiime2version", value);
    const line = f.run("configToYAML()").split("\n").find(row => row.startsWith("qiime2version:"));
    assert.equal(JSON.parse(line.slice("qiime2version: ".length)), value);
  }
  for (const value of ["", "qiime;echo bad", "../not-a-yaml", "qiime\nother"]) {
    assert.equal(f.run(`validQiimeEnvironment(${JSON.stringify(value)})`), false);
  }
});

test("all generated database combinations validate against the downloaded schema", t => {
  // The runtime-only UI tests above need only Node. When the pipeline's Python
  // validator is available, also check the actual YAML/schema package contract.
  const python = process.env.EASV_SCHEMA_PYTHON || "python3";
  const probe = spawnSync(python, ["-c", "import yaml, jsonschema"], { encoding: "utf8" });
  if (probe.error || probe.status !== 0) {
    t.skip("Set EASV_SCHEMA_PYTHON to a Python with PyYAML and jsonschema for package validation.");
    return;
  }
  const schema = html.match(/<script id="package-config-schema"[^>]*>([\s\S]*?)<\/script>/)[1];
  const configs = [];
  for (const silvaMode of ["existing", "download", "train"]) {
    for (const pr2Mode of ["existing", "download", "train"]) {
      const f = fixture();
      for (const [database, mode] of [["silva", silvaMode], ["pr2", pr2Mode]]) {
        f.set(`${database}DatabaseMode`, mode);
        f.set(`${database}Classifier`, `/references/${database}.qza`);
        f.set(`${database}DownloadLink`, `https://example.org/${database}.qza`);
      }
      configs.push(f.run("configToYAML()"));
    }
  }
  const check = spawnSync(python, ["-c", [
    "import json, sys, yaml, jsonschema",
    "payload = json.load(sys.stdin)",
    "schema = yaml.safe_load(payload['schema'])",
    "jsonschema.Draft202012Validator.check_schema(schema)",
    "validator = jsonschema.Draft202012Validator(schema)",
    "for config in payload['configs']:",
    "    parsed = yaml.safe_load(config)",
    "    validator.validate(parsed)",
    "    assert parsed['projectName'] == 'AMT29-analysis'",
    "    assert 'studyName' not in parsed",
    "invalid = yaml.safe_load(payload['configs'][0])",
    "del invalid['projectName']",
    "assert list(validator.iter_errors(invalid)), 'projectName must be required'",
    "for environment in ('qiime2-2026.7', '../envs/qiime.yaml'):",
    "    config = yaml.safe_load(payload['configs'][0])",
    "    config['qiime2version'] = environment",
    "    validator.validate(config)",
    "for key in ('SILVAversion', 'PR2version'):",
    "    invalid = yaml.safe_load(payload['configs'][0])",
    "    invalid[key] = 'banana'",
    "    assert list(validator.iter_errors(invalid)), key",
    "print('Validated 9 generated configurations and rejected invalid releases.')"
  ].join("\n")], {
    encoding: "utf8",
    input: JSON.stringify({ schema, configs })
  });
  assert.equal(check.status, 0, check.stderr || check.error?.message);
});
