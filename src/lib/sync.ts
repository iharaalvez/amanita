import { supabase } from "./supabase";
import type {
  OwnedRecord,
  OwnershipMethod,
  ProgressSnapshot,
  ShinyHunt,
  CatchEvent,
  ShinyHuntMethod,
  GameDexFlags,
} from "@/types/pokemon";
import { reportAuthError } from "@/lib/authErrors";

function ownedKey(speciesId: number, formName: string | null): string {
  return `${speciesId}-${formName ?? "base"}`;
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
  // Legacy columns — read-only for one-time migration
  in_home?: boolean;
  alpha_owned?: boolean;
  shiny_alpha_owned?: boolean;
  game_dex?: Record<string, boolean>;
};

type SupabaseMutationResult = {
  error: unknown;
};

function reportMutationError(result: SupabaseMutationResult): void {
  if (result.error) reportAuthError(result.error);
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

  const [pokemonResult, settingsResult] = await Promise.all([
    supabase.from("pokedex").select("*").eq("user_id", resolvedUserId),
    supabase
      .from("user_settings")
      .select(
        "available_games, game_dex, game_home_boxes, game_dex_progress, shiny_game_dex_progress, pinned_game_id, shiny_hunts, recent_catches",
      )
      .eq("user_id", resolvedUserId)
      .maybeSingle(),
  ]);

  if (pokemonResult.error) throw pokemonResult.error;
  if (settingsResult.error) throw settingsResult.error;

  const rows = (pokemonResult.data ?? []) as SupabaseRow[];
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

  // One-time cleanup: clear in_home column
  const dirtyInHome = rows.filter((r) => r.in_home).map((r) => r.species_id);
  if (dirtyInHome.length > 0) {
    void supabase
      .from("pokedex")
      .update({ in_home: false })
      .eq("user_id", resolvedUserId)
      .eq("in_home", true);
  }

  // Load gameDex — prefer new unified column, fall back to legacy arrays + alpha
  let gameDex: Record<string, Record<string, GameDexFlags>>;

  const storedGameDex = settingsResult.data?.game_dex as Record<
    string,
    Record<string, GameDexFlags>
  > | null;

  if (storedGameDex && Object.keys(storedGameDex).length > 0) {
    gameDex = storedGameDex;
  } else {
    // One-time migration from legacy user_settings arrays and per-row
    // pokedex.game_dex boolean maps.
    const legacyProgress = {
      ...((settingsResult.data?.game_dex_progress ?? {}) as Record<
        string,
        number[]
      >),
    };
    const legacyShinyProgress = {
      ...((settingsResult.data?.shiny_game_dex_progress ?? {}) as Record<
        string,
        number[]
      >),
    };
    for (const row of rows) {
      if (!row.game_dex) continue;
      for (const [gameId, registered] of Object.entries(
        row.game_dex as Record<string, boolean>,
      )) {
        if (!registered) continue;
        if (!legacyProgress[gameId]) legacyProgress[gameId] = [];
        legacyProgress[gameId].push(row.species_id);
      }
    }

    gameDex = {};
    const legacyGameIds = new Set([
      ...Object.keys(legacyProgress),
      ...Object.keys(legacyShinyProgress),
    ]);
    for (const gameId of legacyGameIds) {
      const ownedIds = new Set(legacyProgress[gameId] ?? []);
      const shinyIds = new Set(legacyShinyProgress[gameId] ?? []);
      const speciesIds = new Set([...ownedIds, ...shinyIds]);
      gameDex[gameId] = {};
      for (const speciesId of speciesIds) {
        gameDex[gameId][ownedKey(speciesId, null)] = {
          owned: ownedIds.has(speciesId) || shinyIds.has(speciesId),
          shiny: shinyIds.has(speciesId),
        };
      }
    }

    if (Object.keys(gameDex).length > 0) {
      void syncGameDex(gameDex);
    }
  }

  return {
    owned,
    gameDex,
    gameHomeBoxes: (settingsResult.data?.game_home_boxes ?? {}) as Record<
      string,
      Record<string, boolean>
    >,
    availableGames: (settingsResult.data?.available_games ?? {}) as Record<
      string,
      boolean
    >,
    pinnedGameId:
      typeof settingsResult.data?.pinned_game_id === "string"
        ? settingsResult.data.pinned_game_id
        : null,
    shinyHunts: Array.isArray(settingsResult.data?.shiny_hunts)
      ? (settingsResult.data.shiny_hunts as ShinyHunt[])
      : [],
    recentCatches: Array.isArray(settingsResult.data?.recent_catches)
      ? (settingsResult.data.recent_catches as CatchEvent[])
      : [],
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

  const result = await supabase
    .from("user_settings")
    .upsert({ user_id: user.id, game_dex: gameDex }, { onConflict: "user_id" });
  reportMutationError(result);
}

export async function syncGameHomeBoxes(
  gameHomeBoxes: Record<string, Record<string, boolean>>,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const result = await supabase
    .from("user_settings")
    .upsert(
      { user_id: user.id, game_home_boxes: gameHomeBoxes },
      { onConflict: "user_id" },
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

  const result = await supabase
    .from("user_settings")
    .upsert(
      { user_id: user.id, available_games: games },
      { onConflict: "user_id" },
    );
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

  const result = await supabase
    .from("user_settings")
    .upsert(
      { user_id: user.id, shiny_hunts: hunts },
      { onConflict: "user_id" },
    );
  reportMutationError(result);
}

export async function syncRecentCatches(catches: CatchEvent[]): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const result = await supabase
    .from("user_settings")
    .upsert(
      { user_id: user.id, recent_catches: catches },
      { onConflict: "user_id" },
    );
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
