import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OwnedRecord, OwnershipMethod, ProgressSnapshot } from '@/types/pokemon';

export function ownedKey(speciesId: number, formName?: string | null): string {
  return `${speciesId}-${formName ?? 'base'}`;
}

// Game dex tracking always uses the base species record
function baseKey(speciesId: number): string {
  return `${speciesId}-base`;
}

type PokedexState = {
  owned: Record<string, OwnedRecord>;
  gameDexProgress: Record<string, number[]>;
  availableGames: Record<string, boolean>;
  setProgressSnapshot: (snapshot: ProgressSnapshot) => void;
  getProgressSnapshot: () => ProgressSnapshot;
  markOwned: (speciesId: number, formName?: string | null, method?: OwnershipMethod) => void;
  markPlanned: (speciesId: number, formName?: string | null) => void;
  clearOwnership: (speciesId: number, formName?: string | null) => void;
  setGameAvailable: (gameId: string, available: boolean) => void;
  isGameAvailable: (gameId: string) => boolean;
  getAvailableGameIds: () => string[];
  markOwnedInGame: (speciesId: number, gameId: string) => void;
  clearOwnedInGame: (speciesId: number, gameId: string) => void;
  isOwnedInGame: (speciesId: number, gameId: string) => boolean;
  isOwned: (speciesId: number, formName?: string | null) => boolean;
  isPlanned: (speciesId: number, formName?: string | null) => boolean;
  getOwnedCount: () => number;
  getTotalOwned: () => number;
  getGameProgress: (gameId: string) => { owned: number };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeBooleanRecord(value: unknown): Record<string, boolean> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean')
  );
}

export const usePokedexStore = create<PokedexState>()(
  persist(
    (set, get) => ({
      owned: {},
      gameDexProgress: {},
      availableGames: {},

      setProgressSnapshot: (snapshot) =>
        set({
          owned: snapshot.owned,
          gameDexProgress: snapshot.gameDexProgress,
          availableGames: snapshot.availableGames,
        }),

      getProgressSnapshot: () => ({
        owned: get().owned,
        gameDexProgress: get().gameDexProgress,
        availableGames: get().availableGames,
      }),

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
              game_dex: state.owned[key]?.game_dex ?? {},
              planned: state.owned[key]?.planned,
              notes: state.owned[key]?.notes,
              game_caught: state.owned[key]?.game_caught,
              method,
            },
          },
        }));
      },

      markPlanned: (speciesId, formName) => {
        const key = ownedKey(speciesId, formName);
        set((state) => ({
          owned: {
            ...state.owned,
            [key]: {
              pokedex_number: speciesId,
              form_name: formName ?? null,
              owned: state.owned[key]?.owned ?? false,
              shiny_owned: state.owned[key]?.shiny_owned ?? false,
              game_dex: state.owned[key]?.game_dex ?? {},
              planned: true,
              notes: state.owned[key]?.notes,
            },
          },
        }));
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
            game_caught: undefined,
          };

          if (
            updated.shiny_owned ||
            updated.planned ||
            updated.notes ||
            Object.values(updated.game_dex).some(Boolean)
          ) {
            next[key] = updated;
          } else {
            delete next[key];
          }

          return { owned: next };
        });
      },

      setGameAvailable: (gameId, available) =>
        set((state) => ({
          availableGames: { ...state.availableGames, [gameId]: available },
        })),

      isGameAvailable: (gameId) => !!get().availableGames[gameId],
      getAvailableGameIds: () =>
        Object.entries(get().availableGames)
          .filter(([, available]) => available)
          .map(([gameId]) => gameId),

      // Game dex tracking is per-species (not per-form), stored on the base record
      markOwnedInGame: (speciesId, gameId) =>
        set((state) => {
          const key = baseKey(speciesId);
          const existing = state.owned[key];
          const gameDex = { ...(existing?.game_dex ?? {}), [gameId]: true };
          return {
            gameDexProgress: {
              ...state.gameDexProgress,
              [gameId]: Array.from(new Set([...(state.gameDexProgress[gameId] ?? []), speciesId])),
            },
            owned: {
              ...state.owned,
              [key]: {
                pokedex_number: speciesId,
                form_name: null,
                owned: existing?.owned ?? false,
                shiny_owned: existing?.shiny_owned ?? false,
                game_dex: gameDex,
                planned: existing?.planned,
                notes: existing?.notes,
                method: existing?.method,
                game_caught: existing?.owned ? gameId : existing?.game_caught,
              },
            },
          };
        }),

      clearOwnedInGame: (speciesId, gameId) =>
        set((state) => {
          const key = baseKey(speciesId);
          const existing = state.owned[key];
          const nextProgress = {
            ...state.gameDexProgress,
            [gameId]: (state.gameDexProgress[gameId] ?? []).filter((id) => id !== speciesId),
          };

          if (!existing) return { gameDexProgress: nextProgress };

          const gameDex = { ...existing.game_dex };
          delete gameDex[gameId];

          const nextOwned = { ...state.owned };
          const updated: OwnedRecord = {
            ...existing,
            game_dex: gameDex,
            game_caught: existing.game_caught === gameId ? undefined : existing.game_caught,
          };

          if (
            updated.owned ||
            updated.shiny_owned ||
            updated.planned ||
            updated.notes ||
            Object.values(gameDex).some(Boolean)
          ) {
            nextOwned[key] = updated;
          } else {
            delete nextOwned[key];
          }

          return { gameDexProgress: nextProgress, owned: nextOwned };
        }),

      isOwned: (speciesId, formName) => !!get().owned[ownedKey(speciesId, formName)]?.owned,
      isPlanned: (speciesId, formName) => !!get().owned[ownedKey(speciesId, formName)]?.planned,

      isOwnedInGame: (speciesId, gameId) => {
        const key = baseKey(speciesId);
        return (
          !!get().owned[key]?.game_dex[gameId] ||
          (get().gameDexProgress[gameId] ?? []).includes(speciesId)
        );
      },

      getOwnedCount: () => Object.values(get().owned).filter((r) => r.owned).length,
      getTotalOwned: () => Object.values(get().owned).filter((r) => r.owned).length,

      getGameProgress: (gameId) => ({
        owned: new Set([
          ...(get().gameDexProgress[gameId] ?? []),
          ...Object.values(get().owned)
            .filter((record) => record.game_dex[gameId])
            .map((record) => record.pokedex_number),
        ]).size,
      }),
    }),
    {
      name: 'living-pokedex-v1',
      version: 3,
      migrate: (persistedState, version) => {
        if (!isRecord(persistedState)) return persistedState;

        if (version < 3) {
          // Migrate plain number keys (e.g. "37") → string keys ("37-base")
          const oldOwned = persistedState.owned as Record<string, unknown> | undefined;
          if (isRecord(oldOwned)) {
            const newOwned: Record<string, OwnedRecord> = {};
            for (const [key, record] of Object.entries(oldOwned)) {
              if (!isRecord(record)) continue;
              // Old keys were plain numbers; new format includes a suffix
              const newKey = /^\d+$/.test(key) ? `${key}-base` : key;
              newOwned[newKey] = {
                ...(record as OwnedRecord),
                form_name: (record as OwnedRecord).form_name ?? null,
              };
            }
            persistedState.owned = newOwned;
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
    }
  )
);
