#!/bin/bash
# .github/reformat-sarif.sh
set -euo pipefail

if [[ "$#" -ne 2 ]]; then
  echo "Usage: $0 <input-sarif> <output-sarif>"
  exit 1
fi

INPUT_FILE="$1"
OUTPUT_FILE="$2"

# This jq command iterates through the 'runs' array.
# For each run, it appends the index of the run in the array to the tool driver name.
# This creates a unique name for each tool run, e.g., "codacy-0", "codacy-1".
jq '.runs = (.runs | to_entries | map(.value.tool.driver.name = "\(.value.tool.driver.name)-\(.key)" | .value))' "$INPUT_FILE" > "$OUTPUT_FILE"
