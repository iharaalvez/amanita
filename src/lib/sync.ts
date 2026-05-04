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
  in_home: boolean;
  method: string | null;
  game_caught: string | null;
  shiny_method: string | null;
  shiny_game: string | null;
  game_dex: Record<string, boolean>;
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
      .select("available_games")
      .eq("user_id", resolvedUserId)
      .maybeSingle(),
  ]);

  if (pokemonResult.error) throw pokemonResult.error;

  const rows = (pokemonResult.data ?? []) as SupabaseRow[];
  const owned: Record<string, OwnedRecord> = {};
  const gameDexProgress: Record<string, number[]> = {};

  for (const row of rows) {
    const key = ownedKey(row.species_id, row.form_name);
    owned[key] = {
      pokedex_number: row.species_id,
      form_name: row.form_name,
      owned: row.owned,
      shiny_owned: row.shiny_owned,
      in_home: row.in_home,
      method: (row.method as OwnershipMethod) ?? undefined,
      game_caught: row.game_caught ?? undefined,
      shiny_method: (row.shiny_method as ShinyHuntMethod) ?? undefined,
      shiny_game: row.shiny_game ?? undefined,
      game_dex: row.game_dex ?? {},
    };

    for (const [gameId, registered] of Object.entries(owned[key].game_dex)) {
      if (!registered) continue;
      if (!gameDexProgress[gameId]) gameDexProgress[gameId] = [];
      gameDexProgress[gameId].push(row.species_id);
    }
  }

  return {
    owned,
    gameDexProgress,
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
      in_home: record.in_home ?? false,
      method: record.method ?? null,
      game_caught: record.game_caught ?? null,
      shiny_method: record.shiny_method ?? null,
      shiny_game: record.shiny_game ?? null,
      game_dex: record.game_dex,
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
    in_home: record.in_home ?? false,
    method: record.method ?? null,
    game_caught: record.game_caught ?? null,
    shiny_method: record.shiny_method ?? null,
    shiny_game: record.shiny_game ?? null,
    game_dex: record.game_dex,
    updated_at: new Date().toISOString(),
  }));

  if (rows.length > 0) {
    await supabase
      .from("pokedex")
      .upsert(rows, { onConflict: "user_id,species_id,form_name" });
  }
  await syncAvailableGames(snapshot.availableGames);
}
