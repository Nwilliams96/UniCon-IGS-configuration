#!/usr/bin/env bash
# Download ten public AMT29 DNA samples without overwriting existing data.
# Each filename matches the preloaded sample sheet and the pipeline's R1/R2 suffixes.
set -euo pipefail

destination="${1:-AMT29-test-data}"
manifest_source="${2:-https://www.nathanlrwilliams.com/UniCon-IGS/data/AMT29-test-downloads.tsv}"

command -v curl >/dev/null || { echo "curl is required." >&2; exit 1; }
if command -v md5sum >/dev/null; then
    checksum() { md5sum "$1" | awk '{print $1}'; }
elif command -v md5 >/dev/null; then
    # macOS supplies md5 rather than the Linux md5sum command.
    checksum() { md5 -q "$1"; }
else
    echo "Install md5sum (Linux) or use the built-in md5 command (macOS)." >&2
    exit 1
fi

mkdir -p "$destination"
manifest="$(mktemp "${TMPDIR:-/tmp}/unicon-amt29-manifest.XXXXXX")"
# Remove only this script's temporary manifest, never the downloaded data.
trap 'rm -f "$manifest"' EXIT
if [[ -f "$manifest_source" ]]; then
    cp "$manifest_source" "$manifest"
else
    curl --fail --location --proto '=https' --proto-redir '=https' \
        --retry 5 --retry-delay 2 "$manifest_source" --output "$manifest"
fi

completed=0
while IFS=$'\t' read -r filename url expected_md5 bytes run || [[ -n "$filename" ]]; do
    [[ "$filename" == "filename" || -z "$filename" ]] && continue
    # Restrict manifest destinations to the expected sample filenames.
    if [[ ! "$filename" =~ ^AMT29_[0-9][0-9]\.R[12]\.fastq\.gz$ ]] \
        || [[ ! "$expected_md5" =~ ^[a-f0-9]{32}$ ]]; then
        echo "Invalid manifest record: $filename" >&2
        exit 1
    fi
    output="$destination/$filename"
    partial="$output.part"
    if [[ -e "$output" ]]; then
        if [[ "$(checksum "$output")" != "$expected_md5" ]]; then
            echo "Existing file has the wrong checksum; refusing to overwrite: $output" >&2
            exit 1
        fi
        echo "Reusing verified file: $output"
    else
        # A verified partial may already be complete after an interrupted rename.
        if [[ ! -f "$partial" ]] || [[ "$(checksum "$partial")" != "$expected_md5" ]]; then
            echo "Downloading $filename ($run; $bytes compressed bytes)"
            curl --fail --location --proto '=https' --proto-redir '=https' \
                --retry 5 --retry-delay 2 --continue-at - \
                "$url" --output "$partial"
        fi
        if [[ "$(checksum "$partial")" != "$expected_md5" ]]; then
            echo "Checksum failed: $partial. The partial file was kept for inspection." >&2
            exit 1
        fi
        mv "$partial" "$output"
    fi
    completed=$((completed + 1))
done < "$manifest"

if [[ "$completed" -eq 0 ]]; then
    echo "The manifest did not contain any FASTQ files." >&2
    exit 1
fi
echo "Verified $completed FASTQ files in: $(cd "$destination" && pwd)"
echo "Use that directory as rawdatadir; keep .R1.fastq.gz and .R2.fastq.gz as the suffixes."
