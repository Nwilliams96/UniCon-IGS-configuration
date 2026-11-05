# AMT29 ten-sample test dataset

This is metadata and a download manifest, not a copy of the sequencing data.
The raw paired FASTQs remain in the public ENA/SRA archive under
[BioProject PRJNA1226253](https://www.ebi.ac.uk/ena/browser/view/PRJNA1226253).
The associated study is [Bei et al. (2025)](https://doi.org/10.1093/ismeco/ycaf131).

- Samples: AMT29_02 through AMT29_11, corresponding to archive aliases
  DNA_tag_2 through DNA_tag_11.
- Runs: the explicit `sra_run` column records each mapping. Run numbers are not
  assumed to be consecutive.
- Files: 20 gzipped FASTQs, one R1 and one R2 per sample.
- Total compressed size: 536,608,221 bytes, about 537 MB (512 MiB).
- Source: ENA `filereport` metadata, checked on 2026-11-05; supplied sample
  metadata was cross-checked against the archived collection date and location.
- Sample identifiers remain text. Unknown values are blank.
- BP, DR and TT amounts are recorded separately for each sample in ng.
- The normalization is 1 L per sample, matching the recorded filtered volume.

`AMT29-test-samples.tsv` is the editable sample-sheet download.
`AMT29-test-downloads.tsv` binds each local filename to its archive URL,
MD5 checksum, compressed byte count and SRA run.
`../js/amt29-test-data.js` supplies the same sample records to the browser
without requiring `fetch`, so local `file://` previews also work.

The downloader verifies existing files, resumes partial downloads, and saves a
new FASTQ under its final name only after checksum verification. It refuses to
replace an existing final file with a different checksum.

The page leaves internal-standard correction opt-in. These particular samples
contain BP/DR/TT, so their recorded amounts are preloaded and can be used when
that option is enabled. The page's amplicon-molarity examples are not measured
pool concentrations; supply the appropriate measurements before interpreting
16S/18S-corrected abundances quantitatively.
