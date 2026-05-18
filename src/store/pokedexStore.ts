import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  syncRecord,
  deleteRecord,
  syncAvailableGames,
  syncGameDex,
  syncPinnedGameId,
} from "@/lib/sync";
import type {
  OwnedRecord,
  OwnershipMethod,
  ShinyHuntMethod,
  GameDexFlags,
  ProgressSnapshot,
} from "@/types/pokemon";

export function ownedKey(speciesId: number, formName?: string | null): string {
  return `${speciesId}-${formName ?? "base"}`;
}

// Games where alpha/shiny-alpha tracking applies.
export const ALPHA_GAMES = new Set(["pla", "legends-za"]);

export type HomeBoxMode = "normal" | "shiny" | "paired";

type PokedexState = {
  owned: Record<string, OwnedRecord>;
  // gameDex[gameId][speciesKey] = { owned, shiny, alpha?, shiny_alpha? }
  gameDex: Record<string, Record<string, GameDexFlags>>;
  availableGames: Record<string, boolean>;
  pinnedGameId: string | null;
  setPinnedGameId: (gameId: string | null) => void;
  showCosmeticForms: boolean;
  setShowCosmeticForms: (value: boolean) => void;
  showGenderForms: boolean;
  setShowGenderForms: (value: boolean) => void;
  showShinyDex: boolean;
  setShowShinyDex: (value: boolean) => void;
  homeBoxMode: HomeBoxMode;
  setHomeBoxMode: (value: HomeBoxMode) => void;
  setProgressSnapshot: (snapshot: ProgressSnapshot) => void;
  mergeProgressSnapshot: (snapshot: ProgressSnapshot) => ProgressSnapshot;
  getProgressSnapshot: () => ProgressSnapshot;
  clearAll: () => void;

  // Living Dex (HOME) ownership
  markOwned: (
    speciesId: number,
    formName?: string | null,
    method?: OwnershipMethod,
  ) => void;
  markShinyOwned: (
    speciesId: number,
    formName?: string | null,
    huntMethod?: ShinyHuntMethod,
    game?: string,
  ) => void;
  clearShinyOwned: (speciesId: number, formName?: string | null) => void;
  clearOwnership: (speciesId: number, formName?: string | null) => void;
  isOwned: (speciesId: number, formName?: string | null) => boolean;
  getOwnedCount: () => number;
  getTotalOwned: () => number;

  // Per-game dex registration
  markOwnedInGame: (
    speciesId: number,
    gameId: string,
    formName?: string | null,
  ) => void;
  clearOwnedInGame: (
    speciesId: number,
    gameId: string,
    formName?: string | null,
  ) => void;
  isOwnedInGame: (
    speciesId: number,
    gameId: string,
    formName?: string | null,
  ) => boolean;
  markShinyOwnedInGame: (
    speciesId: number,
    gameId: string,
    formName?: string | null,
  ) => void;
  clearShinyOwnedInGame: (
    speciesId: number,
    gameId: string,
    formName?: string | null,
  ) => void;
  isShinyOwnedInGame: (
    speciesId: number,
    gameId: string,
    formName?: string | null,
  ) => boolean;
  // Alpha — only meaningful for ALPHA_GAMES
  markAlphaInGame: (
    speciesId: number,
    gameId: string,
    formName?: string | null,
  ) => void;
  clearAlphaInGame: (
    speciesId: number,
    gameId: string,
    formName?: string | null,
  ) => void;
  isAlphaInGame: (
    speciesId: number,
    gameId: string,
    formName?: string | null,
  ) => boolean;
  markShinyAlphaInGame: (
    speciesId: number,
    gameId: string,
    formName?: string | null,
  ) => void;
  clearShinyAlphaInGame: (
    speciesId: number,
    gameId: string,
    formName?: string | null,
  ) => void;
  isShinyAlphaInGame: (
    speciesId: number,
    gameId: string,
    formName?: string | null,
  ) => boolean;
  getGameDexFlags: (
    speciesId: number,
    gameId: string,
    formName?: string | null,
  ) => GameDexFlags;

  setGameAvailable: (gameId: string, available: boolean) => void;
  isGameAvailable: (gameId: string) => boolean;
  getAvailableGameIds: () => string[];
  getGameProgress: (gameId: string) => { owned: number };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeBooleanRecord(value: unknown): Record<string, boolean> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, boolean] => typeof entry[1] === "boolean",
    ),
  );
}

function normalizeHomeBoxMode(
  value: unknown,
  oldShowShinyDex: unknown,
): HomeBoxMode {
  if (value === "normal" || value === "shiny" || value === "paired") {
    return value;
  }
  return oldShowShinyDex === true ? "paired" : "normal";
}

function remapLegacyLegendsZaProgress(
  progress: Record<string, number[]>,
): Record<string, number[]> {
  const legendsZaProgress = progress["legends-za"];
  if (!legendsZaProgress) return progress;
  const remap = new Map([
    [377, 716],
    [378, 717],
    [379, 718],
  ]);
  return {
    ...progress,
    "legends-za": Array.from(
      new Set(legendsZaProgress.map((id) => remap.get(id) ?? id)),
    ),
  };
}

// Convert old flat number[] game dex + shiny arrays into the new GameDexFlags map.
// Also pulls alpha_owned / shiny_alpha_owned from OwnedRecords into PLA entries.
function migrateToGameDex(
  gameDexProgress: Record<string, number[]>,
  shinyGameDexProgress: Record<string, number[]>,
  ownedRecords: Record<
    string,
    OwnedRecord & { alpha_owned?: boolean; shiny_alpha_owned?: boolean }
  >,
): Record<string, Record<string, GameDexFlags>> {
  const allGameIds = new Set([
    ...Object.keys(gameDexProgress),
    ...Object.keys(shinyGameDexProgress),
  ]);
  const gameDex: Record<string, Record<string, GameDexFlags>> = {};

  for (const gameId of allGameIds) {
    const ownedIds = new Set(gameDexProgress[gameId] ?? []);
    const shinyIds = new Set(shinyGameDexProgress[gameId] ?? []);
    const allIds = new Set([...ownedIds, ...shinyIds]);
    gameDex[gameId] = {};
    for (const speciesId of allIds) {
      const key = ownedKey(speciesId);
      gameDex[gameId][key] = {
        owned: ownedIds.has(speciesId),
        shiny: shinyIds.has(speciesId),
      };
    }
  }

  // Pull PLA alpha data from owned records
  for (const [key, record] of Object.entries(ownedRecords)) {
    const alphaOwned = record.alpha_owned;
    const shinyAlphaOwned = record.shiny_alpha_owned;
    if (!alphaOwned && !shinyAlphaOwned) continue;
    if (!gameDex["pla"]) gameDex["pla"] = {};
    const existing = gameDex["pla"][key] ?? { owned: false, shiny: false };
    gameDex["pla"][key] = {
      ...existing,
      alpha: alphaOwned ?? existing.alpha,
      shiny_alpha: shinyAlphaOwned ?? existing.shiny_alpha,
    };
  }

  return gameDex;
}

function mergeGameDexRecords(
  local: Record<string, Record<string, GameDexFlags>>,
  remote: Record<string, Record<string, GameDexFlags>>,
): Record<string, Record<string, GameDexFlags>> {
  const gameIds = new Set([...Object.keys(local), ...Object.keys(remote)]);
  const result: Record<string, Record<string, GameDexFlags>> = {};
  for (const gameId of gameIds) {
    const localGame = local[gameId] ?? {};
    const remoteGame = remote[gameId] ?? {};
    const keys = new Set([
      ...Object.keys(localGame),
      ...Object.keys(remoteGame),
    ]);
    result[gameId] = {};
    for (const key of keys) {
      const l = localGame[key];
      const r = remoteGame[key];
      result[gameId][key] = {
        owned: !!(l?.owned || r?.owned),
        shiny: !!(l?.shiny || r?.shiny),
        alpha: !!(l?.alpha || r?.alpha) || undefined,
        shiny_alpha: !!(l?.shiny_alpha || r?.shiny_alpha) || undefined,
      };
    }
  }
  return result;
}

// Helper to update a single entry in gameDex and sync the whole game's data.
function patchGameEntry(
  state: PokedexState,
  gameId: string,
  key: string,
  patch: Partial<GameDexFlags>,
): Record<string, Record<string, GameDexFlags>> {
  const existing = state.gameDex[gameId]?.[key] ?? {
    owned: false,
    shiny: false,
  };
  const updated = { ...existing, ...patch };
  const newGameDex = {
    ...state.gameDex,
    [gameId]: { ...state.gameDex[gameId], [key]: updated },
  };
  return newGameDex;
}

export const usePokedexStore = create<PokedexState>()(
  persist(
    (set, get) => ({
      owned: {},
      gameDex: {},
      availableGames: {},
      pinnedGameId: null,

      setPinnedGameId: (gameId) => {
        set({ pinnedGameId: gameId });
        void syncPinnedGameId(gameId);
      },

      showCosmeticForms: false,
      setShowCosmeticForms: (value) => set({ showCosmeticForms: value }),
      showGenderForms: false,
      setShowGenderForms: (value) => set({ showGenderForms: value }),
      showShinyDex: false,
      setShowShinyDex: (value) =>
        set({ showShinyDex: value, homeBoxMode: value ? "paired" : "normal" }),
      homeBoxMode: "normal",
      setHomeBoxMode: (value) =>
        set({ homeBoxMode: value, showShinyDex: value === "paired" }),

      setProgressSnapshot: (snapshot) => {
        set({
          owned: snapshot.owned,
          gameDex: snapshot.gameDex,
          availableGames: snapshot.availableGames,
          pinnedGameId: snapshot.pinnedGameId ?? null,
        });
      },

      mergeProgressSnapshot: (snapshot) => {
        const current = get();
        const merged: ProgressSnapshot = {
          owned: { ...snapshot.owned, ...current.owned },
          gameDex: mergeGameDexRecords(current.gameDex, snapshot.gameDex),
          availableGames: {
            ...Object.fromEntries(
              Object.keys({
                ...current.availableGames,
                ...snapshot.availableGames,
              }).map((k) => [
                k,
                !!(current.availableGames[k] || snapshot.availableGames[k]),
              ]),
            ),
          },
          pinnedGameId: current.pinnedGameId ?? snapshot.pinnedGameId ?? null,
        };
        set({
          owned: merged.owned,
          gameDex: merged.gameDex,
          availableGames: merged.availableGames,
          pinnedGameId: merged.pinnedGameId ?? null,
        });
        return merged;
      },

      getProgressSnapshot: () => ({
        owned: get().owned,
        gameDex: get().gameDex,
        availableGames: get().availableGames,
        pinnedGameId: get().pinnedGameId,
      }),

      clearAll: () =>
        set({ owned: {}, gameDex: {}, availableGames: {}, pinnedGameId: null }),

      // --- Living Dex (HOME) ---

      markOwned: (speciesId, formName, method) => {
        const key = ownedKey(speciesId, formName);
        set((state) => ({
          owned: {
            ...state.owned,
            [key]: {
              pokedex_number: speciesId,
              form_name: formName ?? null,
              owned: true,
              shiny_owned: state.owned[key]?.shiny_owned ?? false,
              notes: state.owned[key]?.notes,
              method,
            },
          },
        }));
        void syncRecord(get().owned[key]!);
      },

      markShinyOwned: (speciesId, formName, huntMethod, game) => {
        const key = ownedKey(speciesId, formName);
        set((state) => ({
          owned: {
            ...state.owned,
            [key]: {
              pokedex_number: speciesId,
              form_name: formName ?? null,
              owned: state.owned[key]?.owned ?? false,
              shiny_owned: true,
              notes: state.owned[key]?.notes,
              method: state.owned[key]?.method,
              shiny_method: huntMethod,
              shiny_game: game,
            },
          },
        }));
        void syncRecord(get().owned[key]!);
      },

      clearShinyOwned: (speciesId, formName) => {
        const key = ownedKey(speciesId, formName);
        set((state) => {
          const existing = state.owned[key];
          if (!existing) return {};
          const next = { ...state.owned };
          const updated: OwnedRecord = {
            ...existing,
            shiny_owned: false,
            shiny_method: undefined,
            shiny_game: undefined,
          };
          if (updated.owned || updated.notes) {
            next[key] = updated;
          } else {
            delete next[key];
          }
          return { owned: next };
        });
        const record = get().owned[key];
        if (record) void syncRecord(record);
        else void deleteRecord(speciesId, formName ?? null);
      },

      clearOwnership: (speciesId, formName) => {
        const key = ownedKey(speciesId, formName);
        set((state) => {
          const existing = state.owned[key];
          if (!existing) return {};
          const next = { ...state.owned };
          const updated: OwnedRecord = {
            ...existing,
            owned: false,
            method: undefined,
          };
          if (updated.shiny_owned || updated.notes) {
            next[key] = updated;
          } else {
            delete next[key];
          }
          return { owned: next };
        });
        const record = get().owned[key];
        if (record) void syncRecord(record);
        else void deleteRecord(speciesId, formName ?? null);
      },

      isOwned: (speciesId, formName) =>
        !!get().owned[ownedKey(speciesId, formName)]?.owned,
      getOwnedCount: () =>
        Object.values(get().owned).filter((r) => r.owned).length,
      getTotalOwned: () =>
        Object.values(get().owned).filter((r) => r.owned).length,

      // --- Per-game dex ---

      getGameDexFlags: (speciesId, gameId, formName) =>
        get().gameDex[gameId]?.[ownedKey(speciesId, formName)] ?? {
          owned: false,
          shiny: false,
        },

      markOwnedInGame: (speciesId, gameId, formName) => {
        const key = ownedKey(speciesId, formName);
        set((state) => {
          const newGameDex = patchGameEntry(state, gameId, key, {
            owned: true,
          });
          void syncGameDex(newGameDex);
          return { gameDex: newGameDex };
        });
      },

      clearOwnedInGame: (speciesId, gameId, formName) => {
        const key = ownedKey(speciesId, formName);
        set((state) => {
          const existing = state.gameDex[gameId]?.[key];
          if (!existing) return {};
          const updated: GameDexFlags = { ...existing, owned: false };
          // If nothing left, drop the entry
          const hasData =
            updated.owned ||
            updated.shiny ||
            updated.alpha ||
            updated.shiny_alpha;
          const newGame = { ...state.gameDex[gameId] };
          if (hasData) {
            newGame[key] = updated;
          } else {
            delete newGame[key];
          }
          const newGameDex = { ...state.gameDex, [gameId]: newGame };
          void syncGameDex(newGameDex);
          return { gameDex: newGameDex };
        });
      },

      isOwnedInGame: (speciesId, gameId, formName) =>
        !!get().gameDex[gameId]?.[ownedKey(speciesId, formName)]?.owned,

      markShinyOwnedInGame: (speciesId, gameId, formName) => {
        const key = ownedKey(speciesId, formName);
        set((state) => {
          const newGameDex = patchGameEntry(state, gameId, key, {
            owned: true,
            shiny: true,
          });
          void syncGameDex(newGameDex);
          return { gameDex: newGameDex };
        });
      },

      clearShinyOwnedInGame: (speciesId, gameId, formName) => {
        const key = ownedKey(speciesId, formName);
        set((state) => {
          const existing = state.gameDex[gameId]?.[key];
          if (!existing) return {};
          const updated: GameDexFlags = { ...existing, shiny: false };
          const hasData =
            updated.owned ||
            updated.shiny ||
            updated.alpha ||
            updated.shiny_alpha;
          const newGame = { ...state.gameDex[gameId] };
          if (hasData) {
            newGame[key] = updated;
          } else {
            delete newGame[key];
          }
          const newGameDex = { ...state.gameDex, [gameId]: newGame };
          void syncGameDex(newGameDex);
          return { gameDex: newGameDex };
        });
      },

      isShinyOwnedInGame: (speciesId, gameId, formName) =>
        !!get().gameDex[gameId]?.[ownedKey(speciesId, formName)]?.shiny,

      markAlphaInGame: (speciesId, gameId, formName) => {
        const key = ownedKey(speciesId, formName);
        set((state) => {
          const newGameDex = patchGameEntry(state, gameId, key, {
            owned: true,
            alpha: true,
          });
          void syncGameDex(newGameDex);
          return { gameDex: newGameDex };
        });
      },

      clearAlphaInGame: (speciesId, gameId, formName) => {
        const key = ownedKey(speciesId, formName);
        set((state) => {
          const existing = state.gameDex[gameId]?.[key];
          if (!existing) return {};
          const updated: GameDexFlags = { ...existing, alpha: false };
          const hasData =
            updated.owned ||
            updated.shiny ||
            updated.alpha ||
            updated.shiny_alpha;
          const newGame = { ...state.gameDex[gameId] };
          if (hasData) {
            newGame[key] = updated;
          } else {
            delete newGame[key];
          }
          const newGameDex = { ...state.gameDex, [gameId]: newGame };
          void syncGameDex(newGameDex);
          return { gameDex: newGameDex };
        });
      },

      isAlphaInGame: (speciesId, gameId, formName) =>
        !!get().gameDex[gameId]?.[ownedKey(speciesId, formName)]?.alpha,

      markShinyAlphaInGame: (speciesId, gameId, formName) => {
        const key = ownedKey(speciesId, formName);
        set((state) => {
          const newGameDex = patchGameEntry(state, gameId, key, {
            owned: true,
            shiny: true,
            alpha: true,
            shiny_alpha: true,
          });
          void syncGameDex(newGameDex);
          return { gameDex: newGameDex };
        });
      },

      clearShinyAlphaInGame: (speciesId, gameId, formName) => {
        const key = ownedKey(speciesId, formName);
        set((state) => {
          const existing = state.gameDex[gameId]?.[key];
          if (!existing) return {};
          const updated: GameDexFlags = { ...existing, shiny_alpha: false };
          const hasData =
            updated.owned ||
            updated.shiny ||
            updated.alpha ||
            updated.shiny_alpha;
          const newGame = { ...state.gameDex[gameId] };
          if (hasData) {
            newGame[key] = updated;
          } else {
            delete newGame[key];
          }
          const newGameDex = { ...state.gameDex, [gameId]: newGame };
          void syncGameDex(newGameDex);
          return { gameDex: newGameDex };
        });
      },

      isShinyAlphaInGame: (speciesId, gameId, formName) =>
        !!get().gameDex[gameId]?.[ownedKey(speciesId, formName)]?.shiny_alpha,

      setGameAvailable: (gameId, available) => {
        set((state) => ({
          availableGames: { ...state.availableGames, [gameId]: available },
        }));
        void syncAvailableGames(get().availableGames);
      },

      isGameAvailable: (gameId) => !!get().availableGames[gameId],
      getAvailableGameIds: () =>
        Object.entries(get().availableGames)
          .filter(([, available]) => available)
          .map(([gameId]) => gameId),

      getGameProgress: (gameId) => ({
        owned: Object.values(get().gameDex[gameId] ?? {}).filter((f) => f.owned)
          .length,
      }),
    }),
    {
      name: "living-pokedex-v1",
      version: 7,
      migrate: (persistedState, version) => {
        if (!isRecord(persistedState)) return persistedState;

        // v3: normalize owned record keys
        if (version < 3) {
          const oldOwned = persistedState.owned as
            | Record<string, unknown>
            | undefined;
          if (isRecord(oldOwned)) {
            const newOwned: Record<string, OwnedRecord> = {};
            for (const [key, record] of Object.entries(oldOwned)) {
              if (!isRecord(record)) continue;
              const newKey = /^\d+$/.test(key) ? `${key}-base` : key;
              newOwned[newKey] = {
                ...(record as OwnedRecord),
                form_name: (record as OwnedRecord).form_name ?? null,
              };
            }
            persistedState.owned = newOwned;
          }
        }

        // v4: remove legacy game_dex / game_caught columns
        if (version < 4) {
          const owned = persistedState.owned as
            | Record<string, unknown>
            | undefined;
          if (isRecord(owned)) {
            for (const record of Object.values(owned)) {
              if (isRecord(record)) {
                delete (record as Record<string, unknown>).game_dex;
                delete (record as Record<string, unknown>).game_caught;
              }
            }
          }
        }

        // v6: remove in_home flag
        if (version < 6) {
          const owned = persistedState.owned as
            | Record<string, unknown>
            | undefined;
          if (isRecord(owned)) {
            for (const record of Object.values(owned)) {
              if (isRecord(record)) {
                delete (record as Record<string, unknown>).in_home;
              }
            }
          }
        }

        // v7: merge gameDexProgress + shinyGameDexProgress + alpha into gameDex
        if (version < 7) {
          const rawProgress = persistedState.gameDexProgress as
            | Record<string, number[]>
            | undefined;
          const rawShiny = persistedState.shinyGameDexProgress as
            | Record<string, number[]>
            | undefined;
          const remappedProgress = remapLegacyLegendsZaProgress(
            isRecord(rawProgress)
              ? (rawProgress as Record<string, number[]>)
              : {},
          );
          const remappedShiny = remapLegacyLegendsZaProgress(
            isRecord(rawShiny) ? (rawShiny as Record<string, number[]>) : {},
          );
          const owned = persistedState.owned as
            | Record<
                string,
                OwnedRecord & {
                  alpha_owned?: boolean;
                  shiny_alpha_owned?: boolean;
                }
              >
            | undefined;
          persistedState.gameDex = migrateToGameDex(
            remappedProgress,
            remappedShiny,
            isRecord(owned) ? owned : {},
          );
          delete persistedState.gameDexProgress;
          delete persistedState.shinyGameDexProgress;
          // Strip alpha fields from owned records
          if (isRecord(persistedState.owned)) {
            for (const record of Object.values(persistedState.owned)) {
              if (isRecord(record)) {
                delete (record as Record<string, unknown>).alpha_owned;
                delete (record as Record<string, unknown>).shiny_alpha_owned;
              }
            }
          }
        }

        return persistedState;
      },
      merge: (persistedState, currentState) => {
        if (!isRecord(persistedState)) return currentState;
        const homeBoxMode = normalizeHomeBoxMode(
          persistedState.homeBoxMode,
          persistedState.showShinyDex,
        );
        // Handle both old format (gameDexProgress arrays) and new (gameDex object)
        let gameDex: Record<string, Record<string, GameDexFlags>> = {};
        if (isRecord(persistedState.gameDex)) {
          gameDex = persistedState.gameDex as Record<
            string,
            Record<string, GameDexFlags>
          >;
        } else if (
          isRecord(persistedState.gameDexProgress) ||
          isRecord(persistedState.shinyGameDexProgress)
        ) {
          const rawProgress = persistedState.gameDexProgress as
            | Record<string, number[]>
            | undefined;
          const rawShiny = persistedState.shinyGameDexProgress as
            | Record<string, number[]>
            | undefined;
          const ownedRecords = persistedState.owned as
            | Record<
                string,
                OwnedRecord & {
                  alpha_owned?: boolean;
                  shiny_alpha_owned?: boolean;
                }
              >
            | undefined;
          gameDex = migrateToGameDex(
            remapLegacyLegendsZaProgress(
              isRecord(rawProgress) ? rawProgress : {},
            ),
            remapLegacyLegendsZaProgress(isRecord(rawShiny) ? rawShiny : {}),
            isRecord(ownedRecords) ? ownedRecords : {},
          );
        }
        return {
          ...currentState,
          ...persistedState,
          gameDex,
          availableGames: normalizeBooleanRecord(persistedState.availableGames),
          pinnedGameId:
            typeof persistedState.pinnedGameId === "string"
              ? persistedState.pinnedGameId
              : null,
          homeBoxMode,
          showShinyDex: homeBoxMode === "paired",
          setProgressSnapshot: currentState.setProgressSnapshot,
          mergeProgressSnapshot: currentState.mergeProgressSnapshot,
          getProgressSnapshot: currentState.getProgressSnapshot,
          setShowCosmeticForms: currentState.setShowCosmeticForms,
          setShowGenderForms: currentState.setShowGenderForms,
          setShowShinyDex: currentState.setShowShinyDex,
          setHomeBoxMode: currentState.setHomeBoxMode,
          setPinnedGameId: currentState.setPinnedGameId,
        };
      },
    },
  ),
);
