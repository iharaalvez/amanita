import { supabase } from "./supabase";
import type {
  OwnedRecord,
  OwnershipMethod,
  ProgressSnapshot,
  ShinyHuntMethod,
} from "@/types/pokemon";

function ownedKey(speciesId: number, formName: string | null): string {
  return `${speciesId}-${formName ?? "base"}`;
}

type SupabaseRow = {
  species_id: number;
  form_name: string | null;
  owned: boolean;
  shiny_owned: boolean;
  in_home?: boolean;
  method: string | null;
  shiny_method: string | null;
  shiny_game: string | null;
  // Legacy column kept for one-time migration only — no longer written
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
      .select("available_games, game_dex_progress, shiny_game_dex_progress")
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

  // One-time cleanup: clear in_home column from all rows that still have it set
  const dirtyIds = rows
    .filter((r) => r.in_home)
    .map((r) => r.species_id);
  if (dirtyIds.length > 0) {
    void supabase
      .from("pokedex")
      .update({ in_home: false })
      .eq("user_id", resolvedUserId)
      .eq("in_home", true);
  }

  // Load game dex progress from user_settings, migrating legacy per-row data if needed
  const storedProgress = settingsResult.data?.game_dex_progress as Record<
    string,
    number[]
  > | null;
  let gameDexProgress: Record<string, number[]>;

  if (storedProgress && Object.keys(storedProgress).length > 0) {
    gameDexProgress = storedProgress;
  } else {
    // One-time migration: rebuild from legacy game_dex column on pokedex rows
    gameDexProgress = {};
    for (const row of rows) {
      if (!row.game_dex) continue;
      for (const [gameId, registered] of Object.entries(row.game_dex)) {
        if (!registered) continue;
        if (!gameDexProgress[gameId]) gameDexProgress[gameId] = [];
        gameDexProgress[gameId].push(row.species_id);
      }
    }
    if (Object.keys(gameDexProgress).length > 0) {
      void syncGameDexProgress(gameDexProgress);
    }
  }

  return {
    owned,
    gameDexProgress,
    shinyGameDexProgress: (settingsResult.data?.shiny_game_dex_progress ?? {}) as Record<string, number[]>,
    availableGames: (settingsResult.data?.available_games ?? {}) as Record<
      string,
      boolean
    >,
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

export async function syncGameDexProgress(
  progress: Record<string, number[]>,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("user_settings")
    .upsert(
      { user_id: user.id, game_dex_progress: progress },
      { onConflict: "user_id" },
    );
}

export async function syncShinyGameDexProgress(
  progress: Record<string, number[]>,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("user_settings")
    .upsert(
      { user_id: user.id, shiny_game_dex_progress: progress },
      { onConflict: "user_id" },
    );
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
    syncGameDexProgress(snapshot.gameDexProgress),
    syncShinyGameDexProgress(snapshot.shinyGameDexProgress),
  ]);
}
