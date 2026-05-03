# Gotta Catch 'Em All — Living Pokédex Tracker

A personal tracker for building a Living Pokédex: one of every Pokémon species, personally caught or bred, all the way from Gen I to Gen IX.

Built with Next.js, Tailwind CSS, and PokéAPI. Progress is saved locally in your browser — no account required.

---

## Features

### Pokédex View
- Full grid of all 1025 Pokémon — base forms and regional variants
- Filter by generation, ownership status (owned, missing, planned, shiny, pending transfer), and type
- Sort by Pokédex order, name A–Z, or missing-first
- Search by name or Pokédex number
- Per-generation progress bars and overall completion percentage

### HOME Box View
- 30-slot box layout matching the Pokémon HOME grid
- Color-coded slots: in HOME (green), pending transfer (blue), shiny (gold), planned (violet)
- Search to highlight specific Pokémon across all boxes
- Summary bar with in HOME, owned, and pending transfer counts

### Game Dex Tracker
- Per-game Pokédex completion across all 20 mainline titles (Gen I–IX)
- Shiny Charm eligibility — highlighted games award the Shiny Charm on completion
- Catch location data sourced from PokéAPI per game
- Ready banner when a game's Pokédex is complete

### Pokémon Detail Modal
- Sprite, types, and ownership status panel
- Status toggles: Owned, Shiny Owned, In HOME, Planned, and per-game registrations
- Catch locations per game with area and encounter method
- Context-aware empty state for Mythicals, trade evolutions, and event-only Pokémon

### Stats Dashboard
- Totals for owned, shiny, in HOME, planned, and pending transfer
- Breakdown by generation and how you caught them
- Shiny Living Dex progress tracker

### Milestone Toasts
- Celebratory notifications at key milestones: first catch, 50, 100, 250, 500, 750, and a complete Living Dex

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| State | Zustand + localStorage |
| Server state | TanStack Query (React Query) |
| Pokémon data | [PokéAPI v2](https://pokeapi.co) |

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

No environment variables needed — all Pokémon data is fetched from the public PokéAPI at runtime and cached in the browser.

---

## Ownership States

| Color | State | Meaning |
|---|---|---|
| 🟢 Green | In HOME | Transferred to Pokémon HOME |
| 🔵 Blue | Pending | Owned but not yet in HOME |
| 🟡 Gold | Shiny | Shiny variant owned |
| 🟣 Violet | Planned | Marked as a target to catch |
| ⬜ Gray | Missing | Not yet obtained |

---

## Supported Games

All mainline titles from Generation I through IX:

| Gen | Games |
|---|---|
| I | Red / Blue, Yellow |
| II | Gold / Silver, Crystal |
| III | Ruby / Sapphire, Emerald, FireRed / LeafGreen |
| IV | Diamond / Pearl, Platinum, HeartGold / SoulSilver |
| V | Black / White, Black 2 / White 2 ✦ |
| VI | X / Y ✦, Omega Ruby / Alpha Sapphire ✦ |
| VII | Sun / Moon ✦, Ultra Sun / Ultra Moon ✦ |
| VIII | Sword / Shield ✦, Brilliant Diamond / Shining Pearl ✦, Legends: Arceus ✦ |
| IX | Scarlet / Violet ✦, Legends: Z-A ✦ |

✦ Completing the Pokédex in these games unlocks the **Shiny Charm**.
