import { supabase } from "./supabase";
import type {
  OwnedRecord,
  OwnershipMethod,
  ProgressSnapshot,
  ShinyHuntMethod,
  GameDexFlags,
} from "@/types/pokemon";

function ownedKey(speciesId: number, formName: string | null): string {
  return `${speciesId}-${formName ?? "base"}`;
}

type SupabaseRow = {
  species_id: number;
  form_name: string | null;
  owned: boolean;
  shiny_owned: boolean;
  method: string | null;
  shiny_method: string | null;
  shiny_game: string | null;
  // Legacy columns — read-only for one-time migration
  in_home?: boolean;
  alpha_owned?: boolean;
  shiny_alpha_owned?: boolean;
  game_dex?: Record<string, boolean>;
};

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
        "available_games, game_dex, game_dex_progress, shiny_game_dex_progress, pinned_game_id",
      )
      .eq("user_id", resolvedUserId)
      .maybeSingle(),
  ]);

  if (pokemonResult.error) throw pokemonResult.error;

  const rows = (pokemonResult.data ?? []) as SupabaseRow[];
  const owned: Record<string, OwnedRecord> = {};

  for (const row of rows) {
    const key = ownedKey(row.species_id, row.form_name);
    owned[key] = {
      pokedex_number: row.species_id,
      form_name: row.form_name,
      owned: row.owned,
      shiny_owned: row.shiny_owned,
      method: (row.method as OwnershipMethod) ?? undefined,
      shiny_method: (row.shiny_method as ShinyHuntMethod) ?? undefined,
      shiny_game: row.shiny_game ?? undefined,
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
    availableGames: (settingsResult.data?.available_games ?? {}) as Record<
      string,
      boolean
    >,
    pinnedGameId:
      typeof settingsResult.data?.pinned_game_id === "string"
        ? settingsResult.data.pinned_game_id
        : null,
  };
}

export async function syncRecord(record: OwnedRecord): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("pokedex").upsert(
    {
      user_id: user.id,
      species_id: record.pokedex_number,
      form_name: record.form_name,
      owned: record.owned,
      shiny_owned: record.shiny_owned,
      method: record.method ?? null,
      shiny_method: record.shiny_method ?? null,
      shiny_game: record.shiny_game ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,species_id,form_name" },
  );
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
  if (formName === null) {
    await query.is("form_name", null);
  } else {
    await query.eq("form_name", formName);
  }
}

export async function syncGameDex(
  gameDex: Record<string, Record<string, GameDexFlags>>,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("user_settings")
    .upsert({ user_id: user.id, game_dex: gameDex }, { onConflict: "user_id" });
}

export async function syncAvailableGames(
  games: Record<string, boolean>,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("user_settings")
    .upsert(
      { user_id: user.id, available_games: games },
      { onConflict: "user_id" },
    );
}

export async function syncPinnedGameId(gameId: string | null): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("user_settings")
    .upsert(
      { user_id: user.id, pinned_game_id: gameId },
      { onConflict: "user_id" },
    );
}

export async function syncAllRecords(
  snapshot: ProgressSnapshot,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const rows = Object.values(snapshot.owned).map((record) => ({
    user_id: user.id,
    species_id: record.pokedex_number,
    form_name: record.form_name,
    owned: record.owned,
    shiny_owned: record.shiny_owned,
    method: record.method ?? null,
    shiny_method: record.shiny_method ?? null,
    shiny_game: record.shiny_game ?? null,
    updated_at: new Date().toISOString(),
  }));

  if (rows.length > 0) {
    await supabase
      .from("pokedex")
      .upsert(rows, { onConflict: "user_id,species_id,form_name" });
  }
  await Promise.all([
    syncAvailableGames(snapshot.availableGames),
    syncGameDex(snapshot.gameDex),
    syncPinnedGameId(snapshot.pinnedGameId ?? null),
  ]);
}
