# UniCon-IGS Configuration

This repository contains the configuration builder for the
[UniCon-IGS 515Y–926R Snakemake pipeline](https://github.com/Nwilliams96/UniCon-IGS).

The published configuration page is available at
[www.nathanlrwilliams.com/UniCon-IGS](https://www.nathanlrwilliams.com/UniCon-IGS/).

## Files
- `index.html`
- `css/style.css`
- `js/script.js`
- `js/jszip.min.js`
- `js/amt29-test-data.js`
- `js/canonical-route.js`
- `data/AMT29-test-samples.tsv`
- `data/AMT29-test-downloads.tsv`
- `downloads/download-AMT29-test.sh`

## Public test dataset

The Sample File table starts with AMT29_02–AMT29_11: ten surface-seawater DNA
samples from BioProject PRJNA1226253. Their archive accessions, collection
metadata, recorded BP/DR/TT masses and 1 L normalization are included in the
editable TSV download. Internal-standard correction remains opt-in.

The Test Dataset section supplies a Bash downloader for the 20 paired FASTQs
(approximately 537 MB). It verifies archive checksums, resumes partial files,
reuses verified downloads, and refuses to overwrite conflicting final files.
No raw FASTQs are stored in either Git repository. See [data/README.md](data/README.md)
for sources and the distinction between measured sample metadata and the
illustrative amplicon-molarity fields.

## Publishing and redirects

The source repository is
[UniCon-IGS-configuration](https://github.com/Nwilliams96/UniCon-IGS-configuration).
The preferred public path is `/UniCon-IGS/` on Nathan's personal domain. Its
static files are published in the `UniCon-IGS/` directory of
[Nwilliams96.github.io](https://github.com/Nwilliams96/Nwilliams96.github.io).
When releasing configuration changes, synchronize the tested, committed
`index.html`, `css/`, `js/`, `images/`, `data/` and `downloads/` assets to that
directory; do not copy local uncommitted changes or raw data. This deployment
copy is not a separate development source.

The personal site keeps `/eASV-Pipeline-Tutorial/` as a browser redirect to the
preferred path. `js/canonical-route.js` also redirects the former and renamed
configuration-repository Pages paths, preserving query strings and section
links. Local `file://` previews are not redirected. GitHub redirects old Git
repository URLs after a rename, but does not provide the equivalent redirect
for project Pages URLs; the explicit website redirects are therefore retained.

## Notes
- Prefilled fields are styled in light grey.
- Copy buttons should work in modern browsers and also have a fallback.
- The download button creates a ZIP file in the browser.
- The project name is entered once and is reused for the cloned directory,
  `projectName`, configuration ZIP, Results-Export folder, and
  report filename.
- Internal standards can be added or removed; the generated config, sample
  columns, and internal-standard table stay synchronized.
- Renaming a preset internal standard clears its preset definition to prevent a
  BP, DR, or TT sequence from being assigned to a different name accidentally.
- Internal-standard correction is off by default, with a prominent warning that
  it must only be enabled when genomic standards were physically added to samples.
- Users can add arbitrary sample metadata columns. They are exported to
  `samples.tsv` and become filters in the pipeline's HTML taxonomy report.
- TSV uploads require only the exact `sample` header and the configured
  `<standard-name>_ng` headers when internal standards are enabled. Other
  columns may be omitted, reordered, renamed, or replaced; omitted optional
  fields are imported as blank cells.
- The generated molarity file is named
  `prok_and_euk_SSU_amplicon_molarities.tsv`.
- Generated configs include a shared `conda_envs_dir` outside the analysis
  clone, allowing Snakemake to reuse unchanged rule environments across projects.
- Primer sequences and the QIIME 2 environment are presented as their own
  labelled configuration sections so these required settings are easy to find.
- The QIIME 2 section warns that existing/downloaded SILVA and PR2 classifiers
  must both be compatible with the selected QIIME 2 and scikit-learn environment.
  `qiime2version` accepts a YAML definition path or an already installed Conda
  environment name. YAML uses Snakemake's hash-managed reuse in `conda_envs_dir`;
  a name selects an existing environment and does not create or validate it
  against a YAML. Named environments are fingerprinted by installed packages
  for classifier-cache tracking. Multi-user sharing should use the same pinned
  YAML, shared environment directory, and suitable permissions. An environment's
  name alone does not verify classifier compatibility.
- The QIIME 2 guidance explains that missing YAML-managed environments are
  created automatically by the supplied launch scripts, while the YAML file,
  Conda, and Snakemake must already be available. Newer definitions will be
  bundled through maintenance patches. Users can add older or other unbundled
  Linux definitions to `workflow/envs/` and select `../envs/<filename>.yml`
  (or an absolute YAML path). Explicit choices are not automatically upgraded;
  users must check pipeline/plugin and classifier compatibility.
- SILVA and PR2 independently offer three methods: use an existing classifier,
  download a pre-trained classifier, or train from a selected reference release
  with RESCRIPt. Only the chosen method's fields are shown and serialized;
  switching methods preserves the entered values for later use.
- Defaults reuse Nathan's existing SILVA 144 and PR2 5.1.1 classifiers on CARC,
  with their paths pre-filled under the shared database root. Other users must
  replace these paths or select download/training for their system. The bundled
  environment is QIIME 2 2026.7. Reference releases remain editable and
  visible for all methods so reports can record the declared version. Native
  SILVA 144 acquisition is not yet supported by the supplied RESCRIPt environment;
  its training option displays a warning but still permits configuration export.
- Download and training destinations can be selected separately for SILVA and
  PR2. The shared `database_dir` stores BBsplit and supporting files such as the
  SILVA 144 exact-species reference. Existing classifiers are read from the exact
  supplied path without requiring write access beside that file.
- The official SILVA 144 preset follows the primers: 515Y/926R uses its
  region-specific classifier; other primers select its full-length classifier.
  The preset URL and checksum stay synchronized. Custom URLs are never rewritten
  and do not inherit an unrelated preset checksum. Supplied classifiers must be
  compatible with the selected environment and intended analysis.
- Local training extracts the configured primer region by default. Advanced
  users can add `silva_reference_mode: "full_length"` or
  `pr2_reference_mode: "full_length"` to config.yml to skip extraction for that
  database. These settings do not change a downloaded classifier.
- For SILVA 144 the pipeline adds provisional Species labels only for
  unambiguous exact matches to the matching species reference when the matched
  genus agrees with the classifier result. Other SILVA releases skip this step.
- BBsplit retains its separate availability checkbox. It can be built or reused
  independently of either taxonomy classifier.
