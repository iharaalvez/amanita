# Data Architecture

## Current Boundary

Static game metadata lives in `src/config/games.ts`. Components, hooks, and dropdowns should import game options from that module instead of duplicating game lists or reading them from PokeAPI helpers.

PokeAPI helpers in `src/lib/pokeapi.ts` are responsible only for external API fetching and response parsing.

User-specific state is local-first in Zustand with localStorage persistence. When a user is authenticated, the same progress syncs to Supabase row tables.

## Supabase User Tables

Keep Supabase focused on user data and continue to keep static game metadata in app config.

### `pokedex`

Tracks HOME Living Dex ownership and Pokemon-level capture metadata.

```ts
type UserPokemon = {
  user_id: string;
  species_id: number;
  form_name: string | null;
  owned: boolean;
  shiny_owned: boolean;
  method?: string;
  shiny_method?: string;
  shiny_game?: string;
  date_obtained?: string;
  game?: string;
  updated_at: string;
};
```

### `user_games`

Tracks which games a user has available.

```ts
type UserGame = {
  user_id: string;
  game_id: string;
  available: boolean;
  updated_at: string;
};
```

### `user_game_dex`

Tracks per-game National Dex registration separately from HOME ownership.

```ts
type UserGameDex = {
  user_id: string;
  game_id: string;
  species_id: number;
  form_name: string; // empty string = base form
  owned: boolean;
  shiny: boolean;
  alpha: boolean;
  shiny_alpha: boolean;
  updated_at: string;
};
```

### `user_game_home_boxes`

Tracks game-origin Pokemon placed into that game's HOME transfer boxes. This is separate from `user_game_dex`, because a Pokemon can be registered in a game's dex without being present in the HOME boxes transferred from that game.

```ts
type UserGameHomeBox = {
  user_id: string;
  game_id: string;
  species_id: number;
  form_name: string; // empty string = base form
  updated_at: string;
};
```

### `user_shiny_hunts`

Tracks active and completed shiny hunts with a row per hunt.

```ts
type UserShinyHunt = {
  id: string;
  user_id: string;
  species_id: number;
  form_name: string; // empty string = base form
  game_id: string;
  method: string;
  counter_mode: string;
  count: number;
  started_at: string;
  completed_at?: string;
  updated_at: string;
};
```

### `user_recent_catches`

Stores the recent catch activity log. The app loads the latest 50 rows.

```ts
type UserRecentCatch = {
  user_id: string;
  species_id: number;
  form_name: string; // empty string = base form
  game_id: string;
  caught_at: string;
  is_shiny: boolean;
  is_alpha: boolean;
  created_at: string;
};
```

### `user_settings`

Stores small profile-level preferences such as `pinned_game_id`. User progress lives in the normalized tables above.
