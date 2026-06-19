import { supabase } from "./supabase";
import type {
  ProgressSnapshot,
  ShinyHunt,
  CatchEvent,
  ShinyHuntMethod,
  GameDexFlags,
  HuntCounterMode,
  HomeBoxLayoutProfile,
  HomeBoxMode,
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

type SettingsRow = {
  pinned_game_id?: string | null;
  active_home_box_layout_id?: string | null;
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

type UserHomeBoxLayoutRow = {
  id: string;
  name: string;
  mode: string;
  show_cosmetic_forms: boolean;
  show_gender_forms: boolean;
};

type UserShinyHuntRow = {
  id: string;
  species_id: number;
  form_name: string;
  game_id: string;
  method: string;
  counter_mode: string;
  count: number | null;
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

function shinyHuntRow(
  hunt: ShinyHunt,
  userId: string,
  options: { nullableCount: boolean },
) {
  return {
    id: hunt.id,
    user_id: userId,
    species_id: hunt.speciesId,
    form_name: toDbFormName(hunt.formName),
    game_id: hunt.gameId,
    method: hunt.method,
    counter_mode: hunt.counterMode,
    count: options.nullableCount ? hunt.count : (hunt.count ?? 0),
    started_at: hunt.startedAt,
    completed_at: hunt.completedAt ?? null,
  };
}

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

function isHomeBoxMode(value: unknown): value is HomeBoxMode {
  return value === "normal" || value === "shiny" || value === "paired";
}

function homeBoxLayoutsFromRows(
  rows: UserHomeBoxLayoutRow[],
): HomeBoxLayoutProfile[] {
  return rows.flatMap((row) => {
    if (!isHomeBoxMode(row.mode)) return [];
    return {
      id: row.id,
      name: row.name,
      mode: row.mode,
      showCosmeticForms: row.show_cosmetic_forms,
      showGenderForms: row.show_gender_forms,
    };
  });
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
    settingsResult,
    userGamesResult,
    gameDexResult,
    gameHomeBoxesResult,
    homeBoxLayoutsResult,
    shinyHuntsResult,
    recentCatchesResult,
  ] = await Promise.all([
    supabase
      .from("user_settings")
      .select("pinned_game_id, active_home_box_layout_id")
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
      .from("user_home_box_layouts")
      .select("id, name, mode, show_cosmetic_forms, show_gender_forms")
      .eq("user_id", resolvedUserId)
      .order("created_at", { ascending: true }),
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

  if (settingsResult.error) throw settingsResult.error;
  if (userGamesResult.error) throw userGamesResult.error;
  if (gameDexResult.error) throw gameDexResult.error;
  if (gameHomeBoxesResult.error) throw gameHomeBoxesResult.error;
  if (homeBoxLayoutsResult.error) throw homeBoxLayoutsResult.error;
  if (shinyHuntsResult.error) throw shinyHuntsResult.error;
  if (recentCatchesResult.error) throw recentCatchesResult.error;

  const settings = (settingsResult.data ?? null) as SettingsRow | null;

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
  const homeBoxLayouts = homeBoxLayoutsFromRows(
    (homeBoxLayoutsResult.data ?? []) as UserHomeBoxLayoutRow[],
  );
  const activeHomeBoxLayoutId =
    typeof settings?.active_home_box_layout_id === "string" &&
    homeBoxLayouts.some(
      (layout) => layout.id === settings.active_home_box_layout_id,
    )
      ? settings.active_home_box_layout_id
      : null;

  return {
    gameDex,
    gameHomeBoxes,
    availableGames,
    pinnedGameId:
      typeof settings?.pinned_game_id === "string"
        ? settings.pinned_game_id
        : null,
    shinyHunts,
    recentCatches,
    homeBoxLayouts,
    activeHomeBoxLayoutId,
  };
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

export async function deleteGameDexScope(gameId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const result = await supabase
    .from("user_game_dex")
    .delete()
    .eq("user_id", user.id)
    .eq("game_id", gameId);
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

export async function syncSingleHomeBoxLayout(
  layout: HomeBoxLayoutProfile,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const result = await supabase.from("user_home_box_layouts").upsert(
    {
      user_id: user.id,
      id: layout.id,
      name: layout.name,
      mode: layout.mode,
      show_cosmetic_forms: layout.showCosmeticForms,
      show_gender_forms: layout.showGenderForms,
    },
    { onConflict: "user_id,id" },
  );
  reportMutationError(result);
}

export async function syncActiveHomeBoxLayoutId(
  id: string | null,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const result = await supabase.from("user_settings").upsert(
    { user_id: user.id, active_home_box_layout_id: id },
    { onConflict: "user_id" },
  );
  reportMutationError(result);
}

export async function syncHomeBoxLayouts(
  layouts: HomeBoxLayoutProfile[],
  activeLayoutId: string | null,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const normalizedActiveId =
    activeLayoutId && layouts.some((layout) => layout.id === activeLayoutId)
      ? activeLayoutId
      : null;

  const deleteResult = await supabase
    .from("user_home_box_layouts")
    .delete()
    .eq("user_id", user.id);
  reportMutationError(deleteResult);
  if (deleteResult.error) return;

  if (layouts.length > 0) {
    const layoutResult = await supabase.from("user_home_box_layouts").upsert(
      layouts.map((layout) => ({
        user_id: user.id,
        id: layout.id,
        name: layout.name,
        mode: layout.mode,
        show_cosmetic_forms: layout.showCosmeticForms,
        show_gender_forms: layout.showGenderForms,
      })),
      { onConflict: "user_id,id" },
    );
    reportMutationError(layoutResult);
    if (layoutResult.error) return;
  }

  const settingsResult = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      active_home_box_layout_id: normalizedActiveId,
    },
    { onConflict: "user_id" },
  );
  reportMutationError(settingsResult);
}

export async function syncShinyHunts(hunts: ShinyHunt[]): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  if (hunts.length === 0) return;
  const hasUncountedHunts = hunts.some((hunt) => hunt.count === null);
  let result = await supabase.from("user_shiny_hunts").upsert(
    hunts.map((hunt) => shinyHuntRow(hunt, user.id, { nullableCount: true })),
    { onConflict: "id" },
  );
  if (result.error && hasUncountedHunts) {
    result = await supabase.from("user_shiny_hunts").upsert(
      hunts.map((hunt) =>
        shinyHuntRow(hunt, user.id, { nullableCount: false }),
      ),
      { onConflict: "id" },
    );
  }
  reportMutationError(result);
}

export async function syncShinyHunt(hunt: ShinyHunt): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  let result = await supabase.from("user_shiny_hunts").upsert(
    shinyHuntRow(hunt, user.id, { nullableCount: true }),
    { onConflict: "id" },
  );
  if (result.error && hunt.count === null) {
    result = await supabase.from("user_shiny_hunts").upsert(
      shinyHuntRow(hunt, user.id, { nullableCount: false }),
      { onConflict: "id" },
    );
  }
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

  await Promise.all([
    syncAvailableGames(snapshot.availableGames),
    syncGameDex(snapshot.gameDex),
    syncGameHomeBoxes(snapshot.gameHomeBoxes ?? {}),
    syncPinnedGameId(snapshot.pinnedGameId ?? null),
    syncHomeBoxLayouts(
      snapshot.homeBoxLayouts ?? [],
      snapshot.activeHomeBoxLayoutId ?? null,
    ),
    syncShinyHunts(snapshot.shinyHunts ?? []),
    syncRecentCatches(snapshot.recentCatches ?? []),
  ]);
}
