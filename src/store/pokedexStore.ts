import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  syncRecord,
  deleteRecord,
  syncAvailableGames,
  syncGameDexProgress,
  syncShinyGameDexProgress,
} from "@/lib/sync";
import type {
  OwnedRecord,
  OwnershipMethod,
  ShinyHuntMethod,
  ProgressSnapshot,
} from "@/types/pokemon";

export function ownedKey(speciesId: number, formName?: string | null): string {
  return `${speciesId}-${formName ?? "base"}`;
}


type PokedexState = {
  owned: Record<string, OwnedRecord>;
  gameDexProgress: Record<string, number[]>;
  shinyGameDexProgress: Record<string, number[]>;
  availableGames: Record<string, boolean>;
  showCosmeticForms: boolean;
  setShowCosmeticForms: (value: boolean) => void;
  setProgressSnapshot: (snapshot: ProgressSnapshot) => void;
  getProgressSnapshot: () => ProgressSnapshot;
  clearAll: () => void;
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
  setGameAvailable: (gameId: string, available: boolean) => void;
  isGameAvailable: (gameId: string) => boolean;
  getAvailableGameIds: () => string[];
  markOwnedInGame: (speciesId: number, gameId: string) => void;
  clearOwnedInGame: (speciesId: number, gameId: string) => void;
  isOwnedInGame: (speciesId: number, gameId: string) => boolean;
  markShinyOwnedInGame: (speciesId: number, gameId: string) => void;
  clearShinyOwnedInGame: (speciesId: number, gameId: string) => void;
  isShinyOwnedInGame: (speciesId: number, gameId: string) => boolean;
  isOwned: (speciesId: number, formName?: string | null) => boolean;
  getOwnedCount: () => number;
  getTotalOwned: () => number;
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

export const usePokedexStore = create<PokedexState>()(
  persist(
    (set, get) => ({
      owned: {},
      gameDexProgress: {},
      shinyGameDexProgress: {},
      availableGames: {},
      showCosmeticForms: false,
      setShowCosmeticForms: (value) => set({ showCosmeticForms: value }),

      setProgressSnapshot: (snapshot) => {
        set({
          owned: snapshot.owned,
          gameDexProgress: snapshot.gameDexProgress,
          shinyGameDexProgress: snapshot.shinyGameDexProgress,
          availableGames: snapshot.availableGames,
        });
      },

      getProgressSnapshot: () => ({
        owned: get().owned,
        gameDexProgress: get().gameDexProgress,
        shinyGameDexProgress: get().shinyGameDexProgress,
        availableGames: get().availableGames,
      }),

      clearAll: () =>
        set({ owned: {}, gameDexProgress: {}, shinyGameDexProgress: {}, availableGames: {} }),

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

      markOwnedInGame: (speciesId, gameId) =>
        set((state) => {
          const newProgress = {
            ...state.gameDexProgress,
            [gameId]: Array.from(
              new Set([...(state.gameDexProgress[gameId] ?? []), speciesId]),
            ),
          };
          void syncGameDexProgress(newProgress);
          return { gameDexProgress: newProgress };
        }),

      clearOwnedInGame: (speciesId, gameId) =>
        set((state) => {
          const newProgress = {
            ...state.gameDexProgress,
            [gameId]: (state.gameDexProgress[gameId] ?? []).filter(
              (id) => id !== speciesId,
            ),
          };
          void syncGameDexProgress(newProgress);
          return { gameDexProgress: newProgress };
        }),

      isOwnedInGame: (speciesId, gameId) =>
        (get().gameDexProgress[gameId] ?? []).includes(speciesId),

      markShinyOwnedInGame: (speciesId, gameId) =>
        set((state) => {
          const newProgress = {
            ...state.shinyGameDexProgress,
            [gameId]: Array.from(
              new Set([...(state.shinyGameDexProgress[gameId] ?? []), speciesId]),
            ),
          };
          void syncShinyGameDexProgress(newProgress);
          return { shinyGameDexProgress: newProgress };
        }),

      clearShinyOwnedInGame: (speciesId, gameId) =>
        set((state) => {
          const newProgress = {
            ...state.shinyGameDexProgress,
            [gameId]: (state.shinyGameDexProgress[gameId] ?? []).filter(
              (id) => id !== speciesId,
            ),
          };
          void syncShinyGameDexProgress(newProgress);
          return { shinyGameDexProgress: newProgress };
        }),

      isShinyOwnedInGame: (speciesId, gameId) =>
        (get().shinyGameDexProgress[gameId] ?? []).includes(speciesId),

      isOwned: (speciesId, formName) =>
        !!get().owned[ownedKey(speciesId, formName)]?.owned,

      getOwnedCount: () =>
        Object.values(get().owned).filter((r) => r.owned).length,
      getTotalOwned: () =>
        Object.values(get().owned).filter((r) => r.owned).length,

      getGameProgress: (gameId) => ({
        owned: new Set(get().gameDexProgress[gameId] ?? []).size,
      }),
    }),
    {
      name: "living-pokedex-v1",
      version: 6,
      migrate: (persistedState, version) => {
        if (!isRecord(persistedState)) return persistedState;
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
        return persistedState;
      },
      merge: (persistedState, currentState) => {
        if (!isRecord(persistedState)) return currentState;
        return {
          ...currentState,
          ...persistedState,
          availableGames: normalizeBooleanRecord(persistedState.availableGames),
          setProgressSnapshot: currentState.setProgressSnapshot,
          getProgressSnapshot: currentState.getProgressSnapshot,
        };
      },
    },
  ),
);
