# Living Pokédex Tracker

## Project overview

A web app to track progress toward a Living Pokédex (one of every species, personally caught or bred) and National Dex completions per game for Shiny Charm eligibility. Future scope includes a Shiny Living Dex.

## Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS
- **State:** Zustand with localStorage middleware
- **Server state / caching:** TanStack Query (react-query)
- **Database:** Supabase (Postgres + Auth)
- **External API:** PokéAPI v2 — <https://pokeapi.co/api/v2/>

## Domain glossary

| Term | Meaning |
| Living Dex | One of every species (1025 as of Gen IX) |
| Owned | Personally caught or bred — not traded for |
| HOME box | 30-slot grid, matching Pokémon HOME layout |
| National Dex (per game) | Completion tracker per title for Shiny Charm |
| Shiny Charm | In-game item unlocked by completing National Dex |
| Shiny Living Dex | One shiny of every species |

## Key PokéAPI endpoints

- `GET /pokemon?limit=1025&offset=0` — full species list
- `GET /pokemon/{id}` — stats, types, sprites (normal + shiny)
- `GET /pokemon-species/{id}` — flavor text, generation, evolution chain link
- `GET /pokemon/{id}/encounters` — location areas + version encounter data
- `GET /generation/{id}` — Pokémon introduced per generation

## Data architecture

- **PokéAPI data** → cached by TanStack Query, never in Zustand
- **User data** → Zustand store, synced to Supabase when logged in
- **User data shape:**

```ts
type OwnedRecord = {
  pokedex_number: number;
  owned: boolean;           // Living Dex
  shiny_owned: boolean;     // Shiny Living Dex
  game_dex: Record; // e.g. { "scarlet": true }
  notes?: string;
}
```

## Component map

PokemonGrid          — filterable grid (by gen, type, owned status)
PokemonCard        — sprite, name, owned badge
HomeBoxView          — 30-slot boxes, paginated
BoxSlot            — single slot: sprite or gray silhouette
PokemonDetailModal   — stats, type, catch locations per game
GameDexView          — per-game National Dex progress
ProgressBar          — X/total with per-gen breakdown

## Design principles

- Pokémon sprites are the hero element — make them large and crisp
- Missing Pokémon: grayscale desaturated silhouette (CSS `filter: grayscale(1) opacity(0.35)`)
- Use official Pokémon type colors for badges
- HOME box view should feel like opening the real app
- Shiny variants toggle via a ✦ button on cards

## Phases

1. **MVP** — grid, ownership toggle, progress stats, local persistence
2. **HOME view** — box layout, detail modal
3. **Game intelligence** — catch locations, per-game dex, Shiny Charm tracker
4. **Shiny Living Dex** — dual tracking, hunt method tags, stats dashboard

## Conventions

- API calls in custom hooks: `usePokemon(id)`, `useGeneration(genId)`, `useEncounters(id)`
- All Pokémon names displayed in Title Case, numbers zero-padded to 4 digits (#0025)
- Forms in TypeScript with zod validation
- No `any` types
