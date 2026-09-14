# SoundGround

**A living atlas of underground music scenes.**

SoundGround crawls the SoundCloud follow/repost graph, clusters artists into
real communities, names those communities from the vocabulary their members
actually use, and lets you listen to any of them. No generated content, no
recommendations from a black box: every connection on the map exists because
the API returned it.

Home: [soundground.net](https://soundground.net) (deployed from `main`; the atlas branch is not deployed yet).

## The map

The scene is the whole underground. The atlas slices it four ways:

- **Circles** — communities detected in the social graph (Louvain over
  weighted follow + repost edges). Each circle gets a stable ID, a name derived
  from the tags its members own, a ranked roster, and a play button.
- **Sounds** — tag genres, from the tags artists declare on their tracks.
  `/sound/[slug]/in/[place]` shows a sound inside a city.
- **Places** — cities, from self-declared locations, folded through a
  hand-curated canon of aliases and non-places.
- **Hubs** — labels, radios, magazines, and promo channels, split from the
  artist roster on every surface so institutions don't masquerade as people.

Every artist page shows which circles they appear in and their strongest
connections. Every circle, sound, and place is playable end to end via the
built-in HLS player.

## How the data flows

```
data/seeds.json ──▶ npm run crawl ──▶ data/graph.db (artists, edges, tracks)
                                          │
                                          ├─▶ npm run aggregate ──▶ browse tables (sounds, places)
                                          │
                                          └─▶ npm run scenes ──────▶ circles (detection, naming, ranking)
                                                                          │
                                                                          ▼
                                                                    Next.js app
```

1. **Crawl** — a resumable, priority-ordered BFS from a handful of seed
   accounts, using the official SoundCloud API at about one request per
   second. Ctrl-C stops after the current visit; the next run continues.
2. **Aggregate** — pure SQL over the graph: genre and city rollups, with
   thresholds so thin categories stay hidden.
3. **Scenes** — pure computation, zero API calls: edge weighting with
   promo-hub discounting, community detection, sub-clustering, naming via
   class-based TF-IDF, artist/hub classification, within-circle ranking.

The app reads the resulting SQLite databases directly.

## Stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- better-sqlite3 for both the API cache and the graph
- graphology + graphology-communities-louvain for community detection
- zod at every external boundary
- hls.js for streaming
- Jest + Testing Library

## Running it

### 1. Install

```bash
npm install
```

### 2. Credentials

Register an app at
[developers.soundcloud.com](https://developers.soundcloud.com/docs/api/register-app)
(requires an Artist Pro account), then copy `.env.example` to `.env`:

```bash
SOUNDCLOUD_CLIENT_ID=your_client_id
SOUNDCLOUD_CLIENT_SECRET=your_client_secret
```

There are no built-in fallback credentials. Without configuration, every
SoundCloud call fails loudly by design. See `.env.example` for the optional
variables (`GRAPH_DB_PATH`, `CACHE_DB_PATH`, the opt-in unofficial api-v2
fallback, and the parked `JWT_SECRET`).

### 3. Build the atlas

```bash
cp data/seeds.example.json data/seeds.json   # then edit: permalinks, URLs, or URNs
npm run crawl                                # resumable; Ctrl-C to pause
npm run aggregate
npm run scenes
```

Options are documented in each script's header comment. Useful knobs:

```bash
npm run crawl -- --seeds my.json --max-depth 1
npm run aggregate -- --min-genre-artists 12 --min-city-artists 3
npm run scenes -- --min-scene-members 75
```

Don't run `npm run build` while a crawl is writing to the graph.

### 4. Run the app

```bash
npm run dev
```

## Curation canon

Two small hand-maintained JSON files under `data/canon/` are the only
non-mechanical inputs to the pipeline:

- `cities.json` — city aliases and a list of non-places ("worldwide",
  "internet") to drop.
- `accounts.json` — accounts that are labels, radios, or promo channels
  despite small catalogs, plus extra hub vocabulary to exclude from circle
  naming.

The pipeline stays deterministic; these files carry the judgment calls.

## Development

```bash
npm run lint          # eslint
npm run type-check    # tsc --noEmit
npm test              # jest with coverage
npm run build         # next build
```

Husky runs lint-staged and a type-check on every commit. CI runs the full
gate on push and pull request.

Design and decision records live in the repo:

- `REBIRTH.md` — what the project is, why, feasibility research, roadmap.
- `ideas/` — numbered design notes with status blocks, from the original
  social-graph spec to the current circles-vs-places investigation.
- `attic/` — parked code (user OAuth, admin dashboard) with a README
  explaining how to restore it.

## Deployment

The app runs on Fly.io with a persistent volume mounted at `/app/data` for
the SQLite databases.

```bash
flyctl secrets set SOUNDCLOUD_CLIENT_ID=xxx SOUNDCLOUD_CLIENT_SECRET=xxx -a soundground
npm run deploy
```

## Compliance posture

The graph stores artist IDs, edge weights, and derived aggregates. API
responses live in a TTL cache, not a mirror. The atlas never republishes raw
follower lists, and every surface deep-links back to SoundCloud. Crawling uses
the official API with registered credentials.

## License

MIT
