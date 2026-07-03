# Amanita — Living Pokédex Tracker

A Next.js web app to track progress toward a Living Pokédex, National Dex completions per game (for Shiny Charm eligibility), and a Shiny Living Dex.

## Stack

| Layer | Tool |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict, no `any`) |
| Styling | Tailwind CSS 3 |
| Client state | Zustand 5 + localStorage middleware |
| Server state | TanStack Query 5 |
| Database / Auth | Supabase (Postgres) |
| Maps | Leaflet + react-leaflet |
| OCR | Tesseract.js (Box Guide Mode) |
| External API | PokéAPI v2 — <https://pokeapi.co/api/v2/> |

## How to run

```bash
npm run dev       # local dev server
npm run build     # production build
npm run lint      # eslint
npm run test      # node test runner (tsx)
npm run format    # prettier
```

## How to run migrations

```bash
npx supabase db push --db-url 'postgresql://postgres.PROJECT_REF:PASSWORD@aws-REGION.pooler.supabase.com:5432/postgres?sslmode=require'
```

URL-encode special characters in the password (e.g. `#` → `%23`). The DB URL is in `.env.local` as `SUPABASE_DATABASE_URL`.

## Domain glossary

| Term | Meaning |
| --- | --- |
| Living Dex | One of every species (1025 as of Gen IX), personally caught or bred |
| Owned | Personally caught or bred — not traded for |
| HOME box | 30-slot grid matching Pokémon HOME layout |
| National Dex | Per-game completion tracker for Shiny Charm eligibility |
| Shiny Charm | In-game item unlocked by completing a game's National Dex |
| Shiny Living Dex | One shiny of every species |
| Box Guide Mode | OCR-assisted overlay that helps order a HOME box |
| DLC sub-dex | A DLC Pokédex (`dlcOf` set in `games.ts`) surfaced as tabs inside its parent game page, hidden from the main game catalog |

## Data architecture

- **PokéAPI data** → fetched in custom hooks (`usePokemon`, `useGeneration`, `useEncounters`), cached by TanStack Query, never stored in Zustand.
- **User data** → Zustand store (`pokedexStore`), synced to Supabase when logged in, localStorage fallback when not.

Core ownership record shape (per species per game):

```ts
type GameDexEntry = {
  owned: boolean;
  shiny: boolean;
  alpha: boolean;
  shiny_alpha: boolean;
};

// pokedexStore.gameDex: Record<gameKey, Record<pokedexNumber, GameDexEntry>>
```

## Source layout

```text
src/
  app/          Next.js App Router pages, layouts, API routes, stream overlay routes
    (main)/
      tools/    Game-grouped utility tools; each tool gets its own subfolder
  components/   React components grouped by domain:
    auth/         AuthModal
    pokemon/      PokemonCard, PokemonGrid, PokemonDetailModal, HomeBoxView, GameDexView, GameMapView, ...
    stream/       GameStreamOverlay, HomeOrganizerStream, AssistCalibration
    dashboard/    DashboardView
    history/      HistoryView
    layout/       Sidebar
    ui/           Icons, Tooltip
  hooks/        Custom data hooks (useAuth, usePokemon, useGamePokedex, useGameLocations, ...)
  store/        Zustand stores: pokedexStore.ts (main), uiStore.ts (selected pokemon modal)
  lib/          Pure logic: sync.ts, livingDex.ts, progressSnapshot.ts, orderingAssist.ts, api.ts, typeChart.ts
  config/       Game definitions, form variants, version exclusives, dynamax-adventures.ts
  types/        Shared TypeScript types (pokemon.ts)
supabase/
  migrations/   42 migrations; add new ones here for schema changes
seeder/         Python seeder for bulk data
scripts/        One-off import/seed scripts (tsx)
```

## Games config (`src/config/games.ts`)

- Every game has an `id`, `name`, `generation`, and `hasShinyCharm`.
- DLC dexes set `dlcOf: "<parentId>"` — they are hidden from the main catalog but appear as tabs inside the parent game page.
- Current DLC dexes: `scarlet-violet-teal-mask`, `scarlet-violet-indigo-disk`, `swsh-isle-of-armor`, `swsh-crown-tundra`, `legends-za-hyperspace`.
- Adding a new DLC: add the entry to `GAME_LIST` with `dlcOf` set, then write a SQL migration inserting rows into `game_dex_entries` with the new `game_id`.

## Tools page (`src/app/(main)/tools/page.tsx`)

Tools are organised into `GAME_SECTIONS` — each section has a `game` label and optional `gameId` (used to show the game logo). Sections in order: Sword/Shield → Scarlet/Violet → Legends: Z-A → All Games. Add new tools to the appropriate section; add a new section if a new game is needed.

## Conventions

- Pokémon names in Title Case; dex numbers zero-padded to 4 digits (`#0025`)
- API calls in custom hooks only — never fetch PokéAPI directly in components
- Forms validated with Zod
- No `any` types
- Never add `Co-Authored-By` or self-attribution to commit messages

## Design principles

- Sprites are the hero element — large and crisp
- Missing Pokémon: `filter: grayscale(1) opacity(0.35)` silhouette
- Use official Pokémon type colors for badges
- HOME box view should feel like opening the real app
- Shiny variant toggled via ✦ button on cards
- Dark theme: bg `#151421`, borders `#302a43`, accent `#8b5cf6`/`#c4b5fd`, body text `#f8f0df`/`#aaa2ba`

## Asset conventions

- Raw/downloaded archives live under `public/icons/gallery-dl/` (reference only)
- Assets used by the app go in `public/icons/pokemon/` with short kebab-case names (e.g., `shiny-symbol-home.png`)
- Game logos at `public/icons/games/{gameId}.png`; paired-version alt logo at `public/icons/games/{gameId}-alt.png`
- Never import from archive paths like `deviantart_1011676462_TM Machine Logo.jpg`
