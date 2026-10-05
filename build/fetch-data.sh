#!/usr/bin/env bash
# Downloads (or updates) the three open datasets the game is built from into build/data/.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p data
get() {  # get <folder> <repo url> [branch]
  if [ -d "data/$1/.git" ]; then
    git -C "data/$1" fetch --quiet --depth 1 origin "${3:-HEAD}" && git -C "data/$1" reset --quiet --hard FETCH_HEAD
  else
    rm -rf "data/$1"
    git clone --quiet --depth 1 ${3:+--branch "$3"} "$2" "data/$1"
  fi
  echo "data/$1 ready ($(git -C "data/$1" log -1 --format=%cd --date=short))"
}
get nhl-stats       https://github.com/NickGrichine/NHL-Stats-Comparison data   # the NHL's public stats feed, every season, refreshed daily
get hockey-databank https://github.com/rippinrobr/hockey-databank             # trade splits and awards through 2017-18
get draft-explorer  https://github.com/abearman1373/NHL-Draft-Explorer        # every draft pick, 1963 to 2022
