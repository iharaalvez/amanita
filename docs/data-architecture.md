# Data Architecture

## Current Boundary

Static game metadata lives in `src/config/games.ts`. Components, hooks, and dropdowns should import game options from that module instead of duplicating game lists or reading them from PokéAPI helpers.

PokéAPI helpers in `src/lib/pokeapi.ts` are responsible only for external API fetching and response parsing.

User-specific state currently lives in Zustand with localStorage persistence:

- HOME Living Dex ownership
- per-game National Dex registration
- available/owned game selection
- notes and capture metadata

## Future Supabase Tables

When account sync is added, keep Supabase focused on user data and continue to keep static game metadata in app config.

### `user_games`

Tracks which games a user has available.

```ts
type UserGame = {
  user_id: string;
  game_id: string;
  available: boolean;
  created_at: string;
  updated_at: string;
};
```

### `user_pokemon`

Tracks HOME Living Dex ownership and Pokemon-level notes.

```ts
type UserPokemon = {
  user_id: string;
  pokedex_number: number;
  owned: boolean;
  shiny_owned: boolean;
  method?: string;
  game_caught?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};
```

### `user_game_dex`

Tracks per-game National Dex registration separately from HOME ownership.

```ts
type UserGameDex = {
  user_id: string;
  game_id: string;
  pokedex_number: number;
  registered: boolean;
  created_at: string;
  updated_at: string;
};
```
