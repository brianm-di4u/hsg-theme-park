#!/bin/sh
# Builds a review copy into a scratch folder (so a running test suite keeps its index.html):
#   sh tools/scratch-build.sh <scratch-dir>
D="$1"; G="$(dirname "$0")/.."
mkdir -p "$D/tp"; rm -rf "$D/tp/src"; cp -r "$G/src" "$D/tp/src"; cp -r "$G/vendor" "$G/assets" "$D/tp/" 2>/dev/null
node "$G/shared/tools/inline.mjs" "$D/tp" | tail -1
