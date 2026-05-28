import { supabase } from "./supabase";
import type {
  OwnedRecord,
  OwnershipMethod,
  ProgressSnapshot,
  ShinyHunt,
  CatchEvent,
  ShinyHuntMethod,
  GameDexFlags,
  HuntCounterMode,
} from "@/types/pokemon";
import { reportAuthError } from "@/lib/authErrors";

const BASE_FORM_NAME = "";
const MAX_RECENT_CATCHES = 50;

function ownedKey(speciesId: number, formName: string | null): string {
  return `${speciesId}-${formName ?? "base"}`;
}

function parseOwnedKey(
  key: string,
): { speciesId: number; formName: string | null } | null {
  const match = /^(\d+)-(.+)$/.exec(key);
  if (!match) return null;
  const speciesId = Number(match[1]);
  if (!Number.isInteger(speciesId)) return null;
  return {
    speciesId,
    formName: match[2] === "base" ? null : match[2],
  };
}

function toDbFormName(formName: string | null | undefined): string {
  return formName ?? BASE_FORM_NAME;
}

function fromDbFormName(formName: string | null): string | null {
  return formName ? formName : null;
}

function hasGameDexData(flags: GameDexFlags): boolean {
  return !!(flags.owned || flags.shiny || flags.alpha || flags.shiny_alpha);
}

type SupabaseRow = {
  species_id: number;
  form_name: string | null;
  owned: boolean;
  shiny_owned: boolean;
  updated_at: string | null;
  method: string | null;
  shiny_method: string | null;
  shiny_game: string | null;
  date_obtained: string | null;
  game: string | null;
  in_home?: boolean;
};

type SettingsRow = {
  pinned_game_id?: string | null;
};

type UserGameRow = {
  game_id: string;
  available: boolean;
};

type UserGameDexRow = {
  game_id: string;
  species_id: number;
  form_name: string;
  owned: boolean;
  shiny: boolean;
  alpha: boolean;
  shiny_alpha: boolean;
};

type UserGameHomeBoxRow = {
  game_id: string;
  species_id: number;
  form_name: string;
};

type UserShinyHuntRow = {
  id: string;
  species_id: number;
  form_name: string;
  game_id: string;
  method: string;
  counter_mode: string;
  count: number;
  started_at: string;
  completed_at: string | null;
};

type UserRecentCatchRow = {
  species_id: number;
  form_name: string;
  game_id: string;
  caught_at: string;
  is_shiny: boolean;
  is_alpha: boolean;
};

type SupabaseMutationResult = {
  error: unknown;
};

function reportMutationError(result: SupabaseMutationResult): void {
  if (result.error) reportAuthError(result.error);
}

function gameDexFromRows(
  rows: UserGameDexRow[],
): Record<string, Record<string, GameDexFlags>> {
  const gameDex: Record<string, Record<string, GameDexFlags>> = {};
  for (const row of rows) {
    if (!gameDex[row.game_id]) gameDex[row.game_id] = {};
    gameDex[row.game_id][
      ownedKey(row.species_id, fromDbFormName(row.form_name))
    ] = {
      owned: row.owned,
      shiny: row.shiny,
      alpha: row.alpha || undefined,
      shiny_alpha: row.shiny_alpha || undefined,
    };
  }
  return gameDex;
}

function gameHomeBoxesFromRows(
  rows: UserGameHomeBoxRow[],
): Record<string, Record<string, boolean>> {
  const gameHomeBoxes: Record<string, Record<string, boolean>> = {};
  for (const row of rows) {
    if (!gameHomeBoxes[row.game_id]) gameHomeBoxes[row.game_id] = {};
    gameHomeBoxes[row.game_id][
      ownedKey(row.species_id, fromDbFormName(row.form_name))
    ] = true;
  }
  return gameHomeBoxes;
}

function availableGamesFromRows(rows: UserGameRow[]): Record<string, boolean> {
  return Object.fromEntries(rows.map((row) => [row.game_id, row.available]));
}

function shinyHuntsFromRows(rows: UserShinyHuntRow[]): ShinyHunt[] {
  return rows.map((row) => ({
    id: row.id,
    speciesId: row.species_id,
    formName: fromDbFormName(row.form_name),
    gameId: row.game_id,
    method: row.method as ShinyHuntMethod,
    counterMode: row.counter_mode as HuntCounterMode,
    count: row.count,
    startedAt: row.started_at,
    completedAt: row.completed_at ?? undefined,
  }));
}

function recentCatchesFromRows(rows: UserRecentCatchRow[]): CatchEvent[] {
  return rows.map((row) => ({
    speciesId: row.species_id,
    formName: fromDbFormName(row.form_name),
    gameId: row.game_id,
    date: row.caught_at,
    isShiny: row.is_shiny,
    isAlpha: row.is_alpha,
  }));
}

function flattenGameDex(
  userId: string,
  gameDex: Record<string, Record<string, GameDexFlags>>,
) {
  return Object.entries(gameDex).flatMap(([gameId, gameRows]) =>
    Object.entries(gameRows).flatMap(([key, flags]) => {
      const parsed = parseOwnedKey(key);
      if (!parsed || !hasGameDexData(flags)) return [];
      return {
        user_id: userId,
        game_id: gameId,
        species_id: parsed.speciesId,
        form_name: toDbFormName(parsed.formName),
        owned: flags.owned,
        shiny: flags.shiny,
        alpha: !!flags.alpha,
        shiny_alpha: !!flags.shiny_alpha,
      };
    }),
  );
}

function flattenGameHomeBoxes(
  userId: string,
  gameHomeBoxes: Record<string, Record<string, boolean>>,
) {
  return Object.entries(gameHomeBoxes).flatMap(([gameId, gameRows]) =>
    Object.entries(gameRows).flatMap(([key, boxed]) => {
      const parsed = parseOwnedKey(key);
      if (!parsed || !boxed) return [];
      return {
        user_id: userId,
        game_id: gameId,
        species_id: parsed.speciesId,
        form_name: toDbFormName(parsed.formName),
      };
    }),
  );
}

export async function loadFromSupabase(
  userId?: string,
): Promise<ProgressSnapshot | null> {
  let resolvedUserId = userId;
  if (!resolvedUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    resolvedUserId = user?.id;
  }
  if (!resolvedUserId) return null;

  const [
    pokemonResult,
    settingsResult,
    userGamesResult,
    gameDexResult,
    gameHomeBoxesResult,
    shinyHuntsResult,
    recentCatchesResult,
  ] = await Promise.all([
    supabase.from("pokedex").select("*").eq("user_id", resolvedUserId),
    supabase
      .from("user_settings")
      .select("pinned_game_id")
      .eq("user_id", resolvedUserId)
      .maybeSingle(),
    supabase
      .from("user_games")
      .select("game_id, available")
      .eq("user_id", resolvedUserId),
    supabase
      .from("user_game_dex")
      .select(
        "game_id, species_id, form_name, owned, shiny, alpha, shiny_alpha",
      )
      .eq("user_id", resolvedUserId),
    supabase
      .from("user_game_home_boxes")
      .select("game_id, species_id, form_name")
      .eq("user_id", resolvedUserId),
    supabase
      .from("user_shiny_hunts")
      .select(
        "id, species_id, form_name, game_id, method, counter_mode, count, started_at, completed_at",
      )
      .eq("user_id", resolvedUserId)
      .order("started_at", { ascending: false }),
    supabase
      .from("user_recent_catches")
      .select("species_id, form_name, game_id, caught_at, is_shiny, is_alpha")
      .eq("user_id", resolvedUserId)
      .order("caught_at", { ascending: false })
      .limit(MAX_RECENT_CATCHES),
  ]);

  if (pokemonResult.error) throw pokemonResult.error;
  if (settingsResult.error) throw settingsResult.error;
  if (userGamesResult.error) throw userGamesResult.error;
  if (gameDexResult.error) throw gameDexResult.error;
  if (gameHomeBoxesResult.error) throw gameHomeBoxesResult.error;
  if (shinyHuntsResult.error) throw shinyHuntsResult.error;
  if (recentCatchesResult.error) throw recentCatchesResult.error;

  const rows = (pokemonResult.data ?? []) as SupabaseRow[];
  const settings = (settingsResult.data ?? null) as SettingsRow | null;
  const owned: Record<string, OwnedRecord> = {};

  for (const row of rows) {
    const key = ownedKey(row.species_id, row.form_name);
    owned[key] = {
      pokedex_number: row.species_id,
      form_name: row.form_name,
      owned: row.owned,
      shiny_owned: row.shiny_owned,
      updated_at: row.updated_at ?? undefined,
      method: (row.method as OwnershipMethod) ?? undefined,
      shiny_method: (row.shiny_method as ShinyHuntMethod) ?? undefined,
      shiny_game: row.shiny_game ?? undefined,
      date_obtained: row.date_obtained ?? undefined,
      game: row.game ?? undefined,
    };
  }

  const dirtyInHome = rows.filter((r) => r.in_home).map((r) => r.species_id);
  if (dirtyInHome.length > 0) {
    void supabase
      .from("pokedex")
      .update({ in_home: false })
      .eq("user_id", resolvedUserId)
      .eq("in_home", true);
  }

  const gameDex = gameDexFromRows(
    (gameDexResult.data ?? []) as UserGameDexRow[],
  );
  const gameHomeBoxes = gameHomeBoxesFromRows(
    (gameHomeBoxesResult.data ?? []) as UserGameHomeBoxRow[],
  );
  const availableGames = availableGamesFromRows(
    (userGamesResult.data ?? []) as UserGameRow[],
  );
  const shinyHunts = shinyHuntsFromRows(
    (shinyHuntsResult.data ?? []) as UserShinyHuntRow[],
  );
  const recentCatches = recentCatchesFromRows(
    (recentCatchesResult.data ?? []) as UserRecentCatchRow[],
  );

  return {
    owned,
    gameDex,
    gameHomeBoxes,
    availableGames,
    pinnedGameId:
      typeof settings?.pinned_game_id === "string"
        ? settings.pinned_game_id
        : null,
    shinyHunts,
    recentCatches,
  };
}

export async function syncRecord(record: OwnedRecord): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const updatedAt = record.updated_at ?? new Date().toISOString();

  const result = await supabase.from("pokedex").upsert(
    {
      user_id: user.id,
      species_id: record.pokedex_number,
      form_name: record.form_name,
      owned: record.owned,
      shiny_owned: record.shiny_owned,
      method: record.method ?? null,
      shiny_method: record.shiny_method ?? null,
      shiny_game: record.shiny_game ?? null,
      date_obtained: record.date_obtained ?? null,
      game: record.game ?? null,
      updated_at: updatedAt,
    },
    { onConflict: "user_id,species_id,form_name" },
  );
  reportMutationError(result);
}

export async function deleteRecord(
  speciesId: number,
  formName: string | null,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const query = supabase
    .from("pokedex")
    .delete()
    .eq("user_id", user.id)
    .eq("species_id", speciesId);
  const result =
    formName === null
      ? await query.is("form_name", null)
      : await query.eq("form_name", formName);
  reportMutationError(result);
}

export async function syncGameDex(
  gameDex: Record<string, Record<string, GameDexFlags>>,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const deleteResult = await supabase
    .from("user_game_dex")
    .delete()
    .eq("user_id", user.id);
  reportMutationError(deleteResult);
  if (deleteResult.error) return;

  const rows = flattenGameDex(user.id, gameDex);
  if (rows.length === 0) return;

  const result = await supabase.from("user_game_dex").upsert(rows, {
    onConflict: "user_id,game_id,species_id,form_name",
  });
  reportMutationError(result);
}

export async function syncGameDexEntry(
  gameId: string,
  speciesId: number,
  formName: string | null,
  flags: GameDexFlags,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  if (!hasGameDexData(flags)) {
    const result = await supabase
      .from("user_game_dex")
      .delete()
      .eq("user_id", user.id)
      .eq("game_id", gameId)
      .eq("species_id", speciesId)
      .eq("form_name", toDbFormName(formName));
    reportMutationError(result);
    return;
  }

  const result = await supabase.from("user_game_dex").upsert(
    {
      user_id: user.id,
      game_id: gameId,
      species_id: speciesId,
      form_name: toDbFormName(formName),
      owned: flags.owned,
      shiny: flags.shiny,
      alpha: !!flags.alpha,
      shiny_alpha: !!flags.shiny_alpha,
    },
    { onConflict: "user_id,game_id,species_id,form_name" },
  );
  reportMutationError(result);
}

export async function syncGameHomeBoxes(
  gameHomeBoxes: Record<string, Record<string, boolean>>,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const deleteResult = await supabase
    .from("user_game_home_boxes")
    .delete()
    .eq("user_id", user.id);
  reportMutationError(deleteResult);
  if (deleteResult.error) return;

  const rows = flattenGameHomeBoxes(user.id, gameHomeBoxes);
  if (rows.length === 0) return;

  const result = await supabase.from("user_game_home_boxes").upsert(rows, {
    onConflict: "user_id,game_id,species_id,form_name",
  });
  reportMutationError(result);
}

export async function syncGameHomeBoxEntry(
  gameId: string,
  speciesId: number,
  formName: string | null,
  boxed: boolean,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  if (!boxed) {
    const result = await supabase
      .from("user_game_home_boxes")
      .delete()
      .eq("user_id", user.id)
      .eq("game_id", gameId)
      .eq("species_id", speciesId)
      .eq("form_name", toDbFormName(formName));
    reportMutationError(result);
    return;
  }

  const result = await supabase.from("user_game_home_boxes").upsert(
    {
      user_id: user.id,
      game_id: gameId,
      species_id: speciesId,
      form_name: toDbFormName(formName),
    },
    { onConflict: "user_id,game_id,species_id,form_name" },
  );
  reportMutationError(result);
}

export async function syncAvailableGames(
  games: Record<string, boolean>,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const deleteResult = await supabase
    .from("user_games")
    .delete()
    .eq("user_id", user.id);
  reportMutationError(deleteResult);
  if (deleteResult.error) return;

  const rows = Object.entries(games).map(([gameId, available]) => ({
    user_id: user.id,
    game_id: gameId,
    available,
  }));
  if (rows.length === 0) return;

  const result = await supabase.from("user_games").upsert(rows, {
    onConflict: "user_id,game_id",
  });
  reportMutationError(result);
}

export async function syncAvailableGame(
  gameId: string,
  available: boolean,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const result = await supabase.from("user_games").upsert(
    {
      user_id: user.id,
      game_id: gameId,
      available,
    },
    { onConflict: "user_id,game_id" },
  );
  reportMutationError(result);
}

export async function deleteAvailableGame(gameId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const result = await supabase
    .from("user_games")
    .delete()
    .eq("user_id", user.id)
    .eq("game_id", gameId);
  reportMutationError(result);
}

export async function syncPinnedGameId(gameId: string | null): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const result = await supabase
    .from("user_settings")
    .upsert(
      { user_id: user.id, pinned_game_id: gameId },
      { onConflict: "user_id" },
    );
  reportMutationError(result);
}

export async function syncShinyHunts(hunts: ShinyHunt[]): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const deleteResult = await supabase
    .from("user_shiny_hunts")
    .delete()
    .eq("user_id", user.id);
  reportMutationError(deleteResult);
  if (deleteResult.error) return;

  if (hunts.length === 0) return;
  const result = await supabase.from("user_shiny_hunts").upsert(
    hunts.map((hunt) => ({
      id: hunt.id,
      user_id: user.id,
      species_id: hunt.speciesId,
      form_name: toDbFormName(hunt.formName),
      game_id: hunt.gameId,
      method: hunt.method,
      counter_mode: hunt.counterMode,
      count: hunt.count,
      started_at: hunt.startedAt,
      completed_at: hunt.completedAt ?? null,
    })),
    { onConflict: "id" },
  );
  reportMutationError(result);
}

export async function syncShinyHunt(hunt: ShinyHunt): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const result = await supabase.from("user_shiny_hunts").upsert(
    {
      id: hunt.id,
      user_id: user.id,
      species_id: hunt.speciesId,
      form_name: toDbFormName(hunt.formName),
      game_id: hunt.gameId,
      method: hunt.method,
      counter_mode: hunt.counterMode,
      count: hunt.count,
      started_at: hunt.startedAt,
      completed_at: hunt.completedAt ?? null,
    },
    { onConflict: "id" },
  );
  reportMutationError(result);
}

export async function deleteShinyHunt(id: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const result = await supabase
    .from("user_shiny_hunts")
    .delete()
    .eq("user_id", user.id)
    .eq("id", id);
  reportMutationError(result);
}

export async function syncRecentCatches(catches: CatchEvent[]): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const deleteResult = await supabase
    .from("user_recent_catches")
    .delete()
    .eq("user_id", user.id);
  reportMutationError(deleteResult);
  if (deleteResult.error) return;

  if (catches.length === 0) return;
  const result = await supabase.from("user_recent_catches").upsert(
    catches.map((event) => ({
      user_id: user.id,
      species_id: event.speciesId,
      form_name: toDbFormName(event.formName),
      game_id: event.gameId,
      caught_at: event.date,
      is_shiny: event.isShiny,
      is_alpha: event.isAlpha,
    })),
    {
      onConflict: "user_id,species_id,form_name,game_id,caught_at",
    },
  );
  reportMutationError(result);
}

export async function syncRecentCatch(event: CatchEvent): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const result = await supabase.from("user_recent_catches").upsert(
    {
      user_id: user.id,
      species_id: event.speciesId,
      form_name: toDbFormName(event.formName),
      game_id: event.gameId,
      caught_at: event.date,
      is_shiny: event.isShiny,
      is_alpha: event.isAlpha,
    },
    {
      onConflict: "user_id,species_id,form_name,game_id,caught_at",
    },
  );
  reportMutationError(result);
}

export async function deleteRecentCatch(event: CatchEvent): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const result = await supabase
    .from("user_recent_catches")
    .delete()
    .eq("user_id", user.id)
    .eq("species_id", event.speciesId)
    .eq("form_name", toDbFormName(event.formName))
    .eq("game_id", event.gameId)
    .eq("caught_at", event.date);
  reportMutationError(result);
}

export async function syncAllRecords(
  snapshot: ProgressSnapshot,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const syncStartedAt = new Date().toISOString();
  const rows = Object.values(snapshot.owned).map((record) => ({
    user_id: user.id,
    species_id: record.pokedex_number,
    form_name: record.form_name,
    owned: record.owned,
    shiny_owned: record.shiny_owned,
    method: record.method ?? null,
    shiny_method: record.shiny_method ?? null,
    shiny_game: record.shiny_game ?? null,
    date_obtained: record.date_obtained ?? null,
    game: record.game ?? null,
    updated_at: record.updated_at ?? syncStartedAt,
  }));

  if (rows.length > 0) {
    const result = await supabase
      .from("pokedex")
      .upsert(rows, { onConflict: "user_id,species_id,form_name" });
    reportMutationError(result);
  }
  await Promise.all([
    syncAvailableGames(snapshot.availableGames),
    syncGameDex(snapshot.gameDex),
    syncGameHomeBoxes(snapshot.gameHomeBoxes ?? {}),
    syncPinnedGameId(snapshot.pinnedGameId ?? null),
    syncShinyHunts(snapshot.shinyHunts ?? []),
    syncRecentCatches(snapshot.recentCatches ?? []),
  ]);
}
