#!/bin/bash
set -euo pipefail

if [[ "$#" -ne 1 ]]; then
  echo "Usage: $0 <input-sarif>"
  exit 1
fi

INPUT_FILE=$1
OUTPUT_DIR=sarif-parts
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# Common properties for all SARIF files
VERSION=$(jq -r '.version' "$INPUT_FILE")
SCHEMA=$(jq -r '.["$schema"]' "$INPUT_FILE")

# Process each run
jq -c '.runs[]' "$INPUT_FILE" |
nl -v0 | # add line numbers (0-indexed)
while read -r i run; do
    # Rename tool
    run=$(echo "$run" | jq ".tool.driver.name += \"-$i\"")

    # Determine which part file it goes to
    part=$((i / 20))
    PART_FILE="$OUTPUT_DIR/results.part-$part.sarif"
    
    # Initialize part file if it's new
    if [ ! -f "$PART_FILE" ]; then
        jq -n --arg version "$VERSION" --arg schema "$SCHEMA" \
            '{version: $version, "$schema": $schema, runs: []}' > "$PART_FILE"
    fi

    # Add run to part file
    jq ".runs += [${run}]" "$PART_FILE" > "$PART_FILE.tmp" && mv "$PART_FILE.tmp" "$PART_FILE"
done