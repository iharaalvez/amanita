# Amanita

Amanita is a Living Pokedex tracker for Pokemon collectors. It helps you organize HOME-style boxes, track progress per saved HOME layout, follow per-game National Dex progress for Shiny Charm goals, and keep shiny hunts and recent catches synced across devices.

## Features

- HOME layout progress for base species and supported forms
- HOME box view with 30-slot grids inspired by Pokemon HOME
- Missing Pokemon silhouettes instead of empty slots
- Shiny Living Dex tracking and shiny hunt counters
- Per-game National Dex views for Shiny Charm progress
- Game-origin HOME box tracking, separate from in-game dex registration
- Box Guide Mode ordering assist bridge for local OCR/mouse-button workflows
- Recent catches, pinned games, and available-game preferences
- Supabase auth and cloud sync with localStorage persistence
- JSON export/import for backups
- Sandwich and donut helper tools

## Stack

- Next.js App Router
- React and TypeScript
- Tailwind CSS
- Zustand for user state
- TanStack Query for cached API/reference data
- Supabase for auth, Postgres, RLS, and sync
- PokeAPI v2 for external Pokemon data patterns

## Domain Notes

- HOME progress is scoped to the selected saved layout, so each HOME account or box strategy has independent marks.
- A Living Dex means one of each species.
- HOME boxes are 30-slot grids matching Pokemon HOME's layout.
- National Dex progress is tracked per game for Shiny Charm eligibility.
- PokeAPI data is cached through TanStack Query and should not be stored in Zustand.
- User progress lives in Zustand and syncs to Supabase when authenticated.

When adding data-fetching work, check the PokeAPI documentation first. For "which games" availability, use `/pokemon/{id}/encounters` and its version-specific encounter data.

## Getting Started

Install dependencies:

```bash
npm install
```

Create `.env.local`:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Run the dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Ordering Assist Bridge

Box Guide Mode exposes a local-only HTTP bridge at
`/api/ordering-assist`. A companion desktop tool can post detected Pokemon
names and deliberate confirm/mark/clear events to that route; Amanita remains
the source of truth for box layouts, target slots, and ordered progress.

The intended flow is to run Amanita locally, open Box Guide Mode, then run the
desktop assistant separately. The bridge stores only short-lived in-memory
events, so restarting the Next.js dev server clears pending assist events.

## Scripts

```bash
npm run dev          # Start local Next.js dev server
npm run build        # Production build
npm run lint         # ESLint
npm test             # Node test suite
npm run seed         # Run the Python Supabase reference-data seeder
npm run seed:forms   # Seed cosmetic form rules
npm run import:pokedb # Import PokeDB JSON exports
```

## Project Layout

```txt
src/app/              App Router pages and layouts
src/components/       UI, dashboard, and Pokemon feature components
src/hooks/            TanStack Query and app hooks
src/store/            Zustand stores
src/lib/              API, sync, merge, and domain helpers
src/config/           Game and form configuration
src/data/             Curated app data
public/               App icons, game icons, maps, and tool assets
supabase/migrations/  Database schema and data migrations
seeder/               Python reference-data seeder
scripts/              Maintenance/import scripts
docs/                 Data and seeding notes
```

## Sync Model

Reference data and Pokemon metadata are fetched/cached as server state. User progress is local-first in Zustand and persisted in localStorage. When a user is signed in, changes sync to Supabase:

- `user_games` stores available game selections
- `user_game_dex` stores per-game National Dex flags and saved HOME layout progress
- `user_game_home_boxes` stores per-game HOME transfer box progress
- `user_shiny_hunts` stores shiny hunt counters and completion state
- `user_recent_catches` stores the recent catch log
- `user_settings` stores small preferences such as the pinned game

On sign-in, local and remote progress are merged, then the merged snapshot is written back to Supabase. Realtime updates and polling keep active sessions current.

## Testing

Before pushing app changes, run:

```bash
npm test
npm run lint
npm run build
```
