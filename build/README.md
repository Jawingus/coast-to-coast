# How the game is built

`index.html` in the repo root is the whole game, and it is generated. Don't edit it by hand: change the files in this folder and rebuild.

```
bash build/refresh.sh
```

That one command downloads the latest stats, rebuilds every prompt, runs the checks and rewrites `index.html`. It needs Node 20 or newer and git, nothing else. A GitHub Action (`.github/workflows/refresh.yml`) runs the same command every Monday morning and publishes the result.

## What each file does

| File | What it is |
|---|---|
| `template.html` | The game itself: layout, styles, the rink, scoring, sharing. Edit this to change how the game looks or plays. |
| `build.js` | Writes every prompt and ranks its answers from most to least obvious. Edit this to add or change prompts. |
| `lib.js` | Loads the raw stats and works out each player's "fame" score, which drives the rankings. |
| `site.js` | Drops the prompts into the template and writes `index.html`. |
| `config.json` | The game's name, its web address and the leaderboard database settings. |
| `hand-lists.json` | Lists ranked by hand: Conn Smythe, Calder, Norris, first-overall picks, Leafs captains. |
| `awards-recent.json` | Award winners and Hall of Fame classes since 2018-19, kept by hand. |
| `splits.txt` | Per-team numbers for players traded mid-season. Filled in automatically. |
| `fetch-data.sh` | Downloads the three open datasets into `build/data/`. |
| `fetch-splits.js` | Looks up missing trade splits on the NHL's player pages. |
| `refresh.sh` | Runs all of the above in order. |

## Once a year, by hand

The weekly job keeps stats, rosters and career totals current on its own. Three things it can't know:

1. **Awards (late June).** Add the new season's winners to `awards-recent.json`, and add the new Conn Smythe, Calder and Norris winners and the first-overall pick to `hand-lists.json`. Those lists run from the most obvious answer to the most obscure, so put each new name where it belongs in that order. Until you do, the build prints a reminder and the new winner is rejected as an answer.
2. **Hall of Fame (late June).** Add the new class to `awards-recent.json`.
3. **Draft.** Full draft records stop at 2022 because that is where the open dataset stops. First rounds from 2023 on are built from the NHL's own records and only include players who have reached the NHL.

## Changing the name or address

Edit `name` and `site` in `config.json` and rebuild. Two things are not automatic: `og.jpg` (the link-preview picture, which has the name drawn into it) and the repository's own name.

## Checking your work

`node build/build.js "leafs"` rebuilds and prints every prompt whose name contains "leafs", with the top, middle and bottom of its answer list, so you can see how the ranking came out.

The build stops without touching `index.html` if something looks wrong: too few players or prompts, a team pack that is too thin, a broken number. If a traded player's season has no per-team split yet, the prompts that depend on it sit out until the split is found, so a right answer is never rejected.

## Where the numbers come from

- Season, career and playoff stats: the NHL's public stats feed, by way of the [NHL Stats Comparison](https://github.com/NickGrichine/NHL-Stats-Comparison) dataset.
- Trade splits and awards through 2017-18: the [Hockey Databank](https://github.com/rippinrobr/hockey-databank). Its licence requires the attribution line shown in the game's "Data and credits".
- Draft picks 1963 to 2022: the [NHL Draft Explorer](https://github.com/abearman1373/NHL-Draft-Explorer) dataset.
- Trade splits since 2018-19: the NHL's player pages.
