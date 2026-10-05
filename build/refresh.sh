#!/usr/bin/env bash
# One command to rebuild the game from the latest stats:  bash build/refresh.sh
# Downloads the data, fills in any new trade splits, checks the result, and rewrites index.html.
set -euo pipefail
cd "$(dirname "$0")"
./fetch-data.sh
mkdir -p out
node build.js > out/first-pass.log 2>&1 || true          # first pass only to learn which trade splits are missing
node fetch-splits.js || echo "Could not reach the NHL player pages; carrying on with the splits on file."
node build.js                                            # the real build: stops here, and leaves the site untouched, if a check fails
node site.js
