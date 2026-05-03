# Living Pokedex Tracker

A personal tracker for building a Living Pokedex: one of every Pokemon species, personally caught or bred, from Gen I to Gen IX.

Built with Next.js, TypeScript, Tailwind CSS, Zustand, TanStack Query, and Supabase.

---

## Features

### Pokedex View

- Full grid of all Pokemon species, base forms, and regional variants
- Filter by generation, ownership status, shiny status, pending transfer, planned status, and type
- Sort by Pokedex order, name A-Z, or missing-first
- Search by name or Pokedex number
- Per-generation progress and overall completion percentage

### HOME Box View

- 30-slot box layout inspired by Pokemon HOME
- Color-coded slots: in HOME, pending transfer, shiny, planned, and missing
- Search across HOME boxes
- Header summary for stored in HOME, owned, and pending transfer counts

### Game Dex Tracker

- Per-game Pokedex completion across mainline titles
- Shiny Charm progress surfaced prominently
- Missing / registered segmented view
- Catch-location guidance from seeded PokeAPI encounter data

### Pokemon Detail Modal

- Sprite, types, stats, and ownership status
- Status toggles for owned, shiny, in HOME, planned, and game registrations
- Catch locations per game where seeded encounter data exists
- Data-quality note for incomplete PokeAPI encounter coverage

### Stats Dashboard

- Living Dex and Shiny Living Dex progress
- Per-generation breakdowns
- Acquisition and shiny hunt method summaries
- JSON export/import for backup and restore

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 14+ App Router |
| Language | TypeScript strict |
| Styling | Tailwind CSS |
| State | Zustand + localStorage |
| Server state | TanStack Query |
| Auth and database | Supabase |
| External source | PokeAPI v2 |

---

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Required environment variables:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

During the transition away from the local FastAPI backend, older code paths may also use:

```txt
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

The target production architecture is Vercel + Supabase only. The Python backend should be treated as a local seeding/data maintenance tool.

---

## Data Seeding

Reference Pokemon data is stored in Supabase and refreshed with the Python seeder in `backend/seeder`.

See [docs/seed-data.md](docs/seed-data.md).

---

## Ownership States

| Color | State | Meaning |
|---|---|---|
| Green | In HOME | Transferred to Pokemon HOME |
| Blue | Pending | Owned but not yet in HOME |
| Gold | Shiny | Shiny variant owned |
| Violet | Planned | Marked as a target to catch |
| Gray | Missing | Not yet obtained |

---

## Supported Games

All mainline titles from Generation I through IX:

| Gen | Games |
|---|---|
| I | Red / Blue, Yellow |
| II | Gold / Silver, Crystal |
| III | Ruby / Sapphire, Emerald, FireRed / LeafGreen |
| IV | Diamond / Pearl, Platinum, HeartGold / SoulSilver |
| V | Black / White, Black 2 / White 2* |
| VI | X / Y*, Omega Ruby / Alpha Sapphire* |
| VII | Sun / Moon*, Ultra Sun / Ultra Moon* |
| VIII | Sword / Shield*, Brilliant Diamond / Shining Pearl*, Legends: Arceus* |
| IX | Scarlet / Violet*, Legends: Z-A* |

`*` Completing the Pokedex in these games unlocks the Shiny Charm.
