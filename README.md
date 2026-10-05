# Coast to Coast

An NHL trivia game where the rarest answer wins. Seven prompts, a clock on each, and the more obscure your answer, the further you carry the puck up the ice.

Play it: https://jawingus.github.io/coast-to-coast/

## What's in here

- `index.html` is the whole game: prompts, answers, graphics and sound in one file. It is generated, so don't edit it directly.
- `build/` is everything that generates it. See [build/README.md](build/README.md).
- `.github/workflows/refresh.yml` rebuilds the game from the latest NHL stats every Monday.
- `og.jpg` is the picture shown when the link is shared.
- `database-setup.sql` is the one-time setup script for the online database (Supabase) that stores guess counts and the daily leaderboard.

An unofficial fan project. Not affiliated with or endorsed by the NHL or its teams. Data credits are inside the game under "Data and credits".
