import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  syncRecord,
  syncAvailableGame,
  syncGameDexEntry,
  syncGameHomeBoxEntry,
  syncPinnedGameId,
  syncHomeBoxLayouts,
  syncSingleHomeBoxLayout,
  syncActiveHomeBoxLayoutId,
  syncShinyHunt,
  deleteShinyHunt,
  syncRecentCatch,
  deleteRecentCatch,
  deleteAvailableGame,
} from "@/lib/sync";
import { mergeOwnedRecords } from "@/lib/progressMerge";
import type {
  OwnedRecord,
  HomeBoxLayoutProfile,
  HomeBoxMode,
  OwnershipMethod,
  ShinyHuntMethod,
  HuntCounterMode,
  ShinyHunt,
  CatchEvent,
  GameDexFlags,
  ProgressSnapshot,
} from "@/types/pokemon";

export type { CatchEvent, ShinyHunt, HuntCounterMode, HomeBoxMode };

let pendingWriteCount = 0;
export function hasPendingWrites(): boolean {
  return pendingWriteCount > 0;
}

export function ownedKey(speciesId: number, formName?: string | null): string {
  return `${speciesId}-${formName ?? "base"}`;
}

// Games where alpha/shiny-alpha tracking applies.
export const ALPHA_GAMES = new Set([
  "pla",
  "legends-za",
  "legends-za-hyperspace",
]);

const MAX_CATCH_LOG = 50;
const DEFAULT_HOME_BOX_LAYOUT_ID = "national-dex";
const LEGACY_DEFAULT_HOME_BOX_LAYOUT: HomeBoxLayoutProfile = {
  id: DEFAULT_HOME_BOX_LAYOUT_ID,
  name: "National Dex",
  mode: "normal",
  showCosmeticForms: false,
  showGenderForms: false,
};

type PokedexState = {
  owned: Record<string, OwnedRecord>;
  recentCatches: CatchEvent[];
  shinyHunts: ShinyHunt[];
  // gameDex[gameId][speciesKey] = { owned, shiny, alpha?, shiny_alpha? }
  gameDex: Record<string, Record<string, GameDexFlags>>;
  // gameHomeBoxes[gameId][speciesKey] tracks game-origin Pokemon transferred
  // into HOME boxes, independent from game dex registration.
  gameHomeBoxes: Record<string, Record<string, boolean>>;
  availableGames: Record<string, boolean>;
  pinnedGameId: string | null;
  setPinnedGameId: (gameId: string | null) => void;
  showCosmeticForms: boolean;
  setShowCosmeticForms: (value: boolean) => void;
  showGenderForms: boolean;
  setShowGenderForms: (value: boolean) => void;
  showGigantamaxForms: boolean;
  setShowGigantamaxForms: (value: boolean) => void;
  showShinyDex: boolean;
  setShowShinyDex: (value: boolean) => void;
  homeBoxMode: HomeBoxMode;
  setHomeBoxMode: (value: HomeBoxMode) => void;
  homeBoxLayouts: HomeBoxLayoutProfile[];
  activeHomeBoxLayoutId: string;
  setActiveHomeBoxLayout: (id: string) => void;
  saveCurrentHomeBoxLayout: (name?: string) => void;
  createHomeBoxLayout: (
    name: string,
    mode: HomeBoxMode,
    showCosmeticForms: boolean,
    showGenderForms: boolean,
  ) => void;
  updateHomeBoxLayout: (
    id: string,
    patch: Partial<Omit<HomeBoxLayoutProfile, "id">>,
  ) => void;
  removeHomeBoxLayout: (id: string) => void;
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

  markInGameHomeBox: (
    speciesId: number,
    gameId: string,
    formName?: string | null,
  ) => void;
  clearFromGameHomeBox: (
    speciesId: number,
    gameId: string,
    formName?: string | null,
  ) => void;
  isInGameHomeBox: (
    speciesId: number,
    gameId: string,
    formName?: string | null,
  ) => boolean;

  setGameAvailable: (gameId: string, available: boolean) => void;
  removeGameAvailable: (gameId: string) => void;
  isGameAvailable: (gameId: string) => boolean;
  getAvailableGameIds: () => string[];
  getGameProgress: (gameId: string) => { owned: number };

  // Shiny hunt tracking
  addShinyHunt: (
    speciesId: number,
    formName: string | null,
    gameId: string,
    method: ShinyHuntMethod,
    counterMode: HuntCounterMode,
  ) => void;
  updateShinyHunt: (
    id: string,
    patch: Pick<
      ShinyHunt,
      "speciesId" | "formName" | "gameId" | "method" | "counterMode"
    >,
  ) => void;
  incrementShinyHunt: (id: string) => void;
  decrementShinyHunt: (id: string) => void;
  setShinyHuntCount: (id: string, count: number) => void;
  setShinyHuntCounterMode: (id: string, counterMode: HuntCounterMode) => void;
  removeShinyHunt: (id: string) => void;
  completeShinyHunt: (id: string) => void;
  removeRecentCatch: (event: CatchEvent) => void;
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

function normalizeNestedBooleanRecord(
  value: unknown,
): Record<string, Record<string, boolean>> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, Record<string, unknown>] =>
        isRecord(entry[1]),
      )
      .map(([gameId, records]) => [
        gameId,
        Object.fromEntries(
          Object.entries(records).filter(
            (entry): entry is [string, boolean] =>
              typeof entry[1] === "boolean",
          ),
        ),
      ]),
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

function normalizeHomeBoxLayouts(value: unknown): HomeBoxLayoutProfile[] {
  if (!Array.isArray(value)) return [];
  const layouts = value
    .filter(isRecord)
    .map((layout): HomeBoxLayoutProfile | null => {
      const mode = normalizeHomeBoxMode(layout.mode, false);
      const id = typeof layout.id === "string" ? layout.id.trim() : "";
      const name = typeof layout.name === "string" ? layout.name.trim() : "";
      if (!id || !name) return null;
      return {
        id,
        name,
        mode,
        showCosmeticForms: layout.showCosmeticForms === true,
        showGenderForms: layout.showGenderForms === true,
      };
    })
    .filter((layout): layout is HomeBoxLayoutProfile => layout !== null);
  return layouts;
}

function updateActiveHomeBoxLayout(
  state: PokedexState,
  patch: Partial<Omit<HomeBoxLayoutProfile, "id" | "name">>,
): HomeBoxLayoutProfile[] {
  if (!state.activeHomeBoxLayoutId) return state.homeBoxLayouts;
  return state.homeBoxLayouts.map((layout) =>
    layout.id === state.activeHomeBoxLayoutId
      ? { ...layout, ...patch }
      : layout,
  );
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

function mergeHomeBoxLayouts(
  local: HomeBoxLayoutProfile[],
  remote: HomeBoxLayoutProfile[],
): HomeBoxLayoutProfile[] {
  const byId = new Map<string, HomeBoxLayoutProfile>();
  for (const layout of remote) byId.set(layout.id, layout);
  for (const layout of local) byId.set(layout.id, layout);
  return Array.from(byId.values());
}

function mergeGameHomeBoxRecords(
  local: Record<string, Record<string, boolean>>,
  remote: Record<string, Record<string, boolean>> | undefined,
): Record<string, Record<string, boolean>> {
  const gameIds = new Set([
    ...Object.keys(local),
    ...Object.keys(remote ?? {}),
  ]);
  const result: Record<string, Record<string, boolean>> = {};
  for (const gameId of gameIds) {
    result[gameId] = {
      ...(remote?.[gameId] ?? {}),
      ...(local[gameId] ?? {}),
    };
  }
  return result;
}

function mergeShinyHunts(local: ShinyHunt[], remote: ShinyHunt[]): ShinyHunt[] {
  const byId = new Map<string, ShinyHunt>();
  for (const hunt of remote) byId.set(hunt.id, hunt);
  for (const hunt of local) {
    const existing = byId.get(hunt.id);
    if (!existing) {
      byId.set(hunt.id, hunt);
      continue;
    }
    byId.set(hunt.id, {
      ...existing,
      ...hunt,
      count: hunt.count,
      startedAt:
        existing.startedAt.localeCompare(hunt.startedAt) <= 0
          ? existing.startedAt
          : hunt.startedAt,
      completedAt:
        existing.completedAt && hunt.completedAt
          ? existing.completedAt.localeCompare(hunt.completedAt) >= 0
            ? existing.completedAt
            : hunt.completedAt
          : (existing.completedAt ?? hunt.completedAt),
    });
  }
  return Array.from(byId.values()).sort((a, b) => {
    if (!!a.completedAt !== !!b.completedAt) return a.completedAt ? 1 : -1;
    return (b.completedAt ?? b.startedAt).localeCompare(
      a.completedAt ?? a.startedAt,
    );
  });
}

function mergeRecentCatches(
  local: CatchEvent[],
  remote: CatchEvent[],
): CatchEvent[] {
  const seen = new Set<string>();
  const all: CatchEvent[] = [];
  for (const c of [...local, ...remote]) {
    const key = `${c.speciesId}-${c.formName ?? ""}-${c.gameId}-${c.date}`;
    if (!seen.has(key)) {
      seen.add(key);
      all.push(c);
    }
  }
  return all
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_CATCH_LOG);
}

// Helper to update a single entry in gameDex.
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
      recentCatches: [],
      shinyHunts: [],
      gameDex: {},
      gameHomeBoxes: {},
      availableGames: {},
      pinnedGameId: null,

      setPinnedGameId: (gameId) => {
        set({ pinnedGameId: gameId });
        void syncPinnedGameId(gameId);
      },

      showCosmeticForms: false,
      setShowCosmeticForms: (value) =>
        set((state) => {
          const homeBoxLayouts = updateActiveHomeBoxLayout(state, {
            showCosmeticForms: value,
          });
          void syncHomeBoxLayouts(homeBoxLayouts, state.activeHomeBoxLayoutId);
          return {
            showCosmeticForms: value,
            homeBoxLayouts,
          };
        }),
      showGenderForms: false,
      setShowGenderForms: (value) =>
        set((state) => {
          const homeBoxLayouts = updateActiveHomeBoxLayout(state, {
            showGenderForms: value,
          });
          void syncHomeBoxLayouts(homeBoxLayouts, state.activeHomeBoxLayoutId);
          return {
            showGenderForms: value,
            homeBoxLayouts,
          };
        }),
      showGigantamaxForms: false,
      setShowGigantamaxForms: (value) => set({ showGigantamaxForms: value }),
      showShinyDex: false,
      setShowShinyDex: (value) =>
        set((state) => {
          const mode = value ? "paired" : "normal";
          const homeBoxLayouts = updateActiveHomeBoxLayout(state, { mode });
          void syncHomeBoxLayouts(homeBoxLayouts, state.activeHomeBoxLayoutId);
          return {
            showShinyDex: value,
            homeBoxMode: mode,
            homeBoxLayouts,
          };
        }),
      homeBoxMode: "normal",
      setHomeBoxMode: (value) =>
        set((state) => {
          const homeBoxLayouts = updateActiveHomeBoxLayout(state, {
            mode: value,
          });
          void syncHomeBoxLayouts(homeBoxLayouts, state.activeHomeBoxLayoutId);
          return {
            homeBoxMode: value,
            showShinyDex: value === "paired",
            homeBoxLayouts,
          };
        }),
      homeBoxLayouts: [],
      activeHomeBoxLayoutId: "",
      setActiveHomeBoxLayout: (id) =>
        set((state) => {
          const layout =
            state.homeBoxLayouts.find((candidate) => candidate.id === id) ??
            state.homeBoxLayouts[0];
          if (!layout) return { activeHomeBoxLayoutId: "" };
          void syncHomeBoxLayouts(state.homeBoxLayouts, layout.id);
          return {
            activeHomeBoxLayoutId: layout.id,
            homeBoxMode: layout.mode,
            showShinyDex: layout.mode === "paired",
            showCosmeticForms: layout.showCosmeticForms,
            showGenderForms: layout.showGenderForms,
          };
        }),
      saveCurrentHomeBoxLayout: (name) =>
        set((state) => {
          const trimmed = name?.trim();
          const layoutName =
            trimmed && trimmed.length > 0
              ? trimmed.slice(0, 40)
              : `HOME Layout ${state.homeBoxLayouts.length + 1}`;
          const id = `home-layout-${Date.now()}`;
          const layout: HomeBoxLayoutProfile = {
            id,
            name: layoutName,
            mode: state.homeBoxMode,
            showCosmeticForms: state.showCosmeticForms,
            showGenderForms: state.showGenderForms,
          };
          const homeBoxLayouts = [...state.homeBoxLayouts, layout];
          void syncHomeBoxLayouts(homeBoxLayouts, id);
          return {
            homeBoxLayouts,
            activeHomeBoxLayoutId: id,
          };
        }),
      createHomeBoxLayout: (name, mode, showCosmeticForms, showGenderForms) => {
        const id = `home-layout-${Date.now()}`;
        const layout: HomeBoxLayoutProfile = {
          id,
          name: name.trim().slice(0, 40) || "HOME Layout",
          mode,
          showCosmeticForms,
          showGenderForms,
        };
        set((state) => ({
          homeBoxLayouts: [...state.homeBoxLayouts, layout],
          activeHomeBoxLayoutId: id,
          homeBoxMode: mode,
          showShinyDex: mode === "paired",
          showCosmeticForms,
          showGenderForms,
        }));
        pendingWriteCount++;
        void Promise.all([
          syncSingleHomeBoxLayout(layout),
          syncActiveHomeBoxLayoutId(id),
        ]).finally(() => { pendingWriteCount--; });
      },

      updateHomeBoxLayout: (id, patch) =>
        set((state) => {
          const homeBoxLayouts = state.homeBoxLayouts.map((l) =>
            l.id === id ? { ...l, ...patch } : l,
          );
          const updated = homeBoxLayouts.find((l) => l.id === id);
          if (updated) void syncSingleHomeBoxLayout(updated);
          const isActive = state.activeHomeBoxLayoutId === id;
          return {
            homeBoxLayouts,
            ...(isActive && patch.mode !== undefined
              ? { homeBoxMode: patch.mode, showShinyDex: patch.mode === "paired" }
              : {}),
            ...(isActive && patch.showCosmeticForms !== undefined
              ? { showCosmeticForms: patch.showCosmeticForms }
              : {}),
            ...(isActive && patch.showGenderForms !== undefined
              ? { showGenderForms: patch.showGenderForms }
              : {}),
          };
        }),

      removeHomeBoxLayout: (id) =>
        set((state) => {
          const layouts = state.homeBoxLayouts.filter(
            (layout) => layout.id !== id,
          );
          if (state.activeHomeBoxLayoutId !== id) {
            void syncHomeBoxLayouts(layouts, state.activeHomeBoxLayoutId);
            return { homeBoxLayouts: layouts };
          }
          const nextLayout = layouts[0];
          if (!nextLayout) {
            void syncHomeBoxLayouts([], null);
            return {
              homeBoxLayouts: [],
              activeHomeBoxLayoutId: "",
            };
          }
          void syncHomeBoxLayouts(layouts, nextLayout.id);
          return {
            homeBoxLayouts: layouts,
            activeHomeBoxLayoutId: nextLayout.id,
            homeBoxMode: nextLayout.mode,
            showShinyDex: nextLayout.mode === "paired",
            showCosmeticForms: nextLayout.showCosmeticForms,
            showGenderForms: nextLayout.showGenderForms,
          };
        }),

      setProgressSnapshot: (snapshot) => {
        const homeBoxLayouts = normalizeHomeBoxLayouts(snapshot.homeBoxLayouts);
        const activeHomeBoxLayoutId =
          snapshot.activeHomeBoxLayoutId &&
          homeBoxLayouts.some(
            (layout) => layout.id === snapshot.activeHomeBoxLayoutId,
          )
            ? snapshot.activeHomeBoxLayoutId
            : (homeBoxLayouts[0]?.id ?? "");
        const activeHomeBoxLayout =
          homeBoxLayouts.find(
            (layout) => layout.id === activeHomeBoxLayoutId,
          ) ?? null;
        set({
          owned: snapshot.owned,
          gameDex: snapshot.gameDex,
          gameHomeBoxes: snapshot.gameHomeBoxes ?? {},
          availableGames: snapshot.availableGames,
          pinnedGameId: snapshot.pinnedGameId ?? null,
          shinyHunts: snapshot.shinyHunts ?? [],
          recentCatches: snapshot.recentCatches ?? [],
          homeBoxLayouts,
          activeHomeBoxLayoutId,
          homeBoxMode: activeHomeBoxLayout?.mode ?? "normal",
          showShinyDex: activeHomeBoxLayout?.mode === "paired",
          showCosmeticForms: activeHomeBoxLayout?.showCosmeticForms ?? false,
          showGenderForms: activeHomeBoxLayout?.showGenderForms ?? false,
        });
      },

      mergeProgressSnapshot: (snapshot) => {
        const current = get();
        const merged: ProgressSnapshot = {
          owned: mergeOwnedRecords(current.owned, snapshot.owned),
          gameDex: mergeGameDexRecords(current.gameDex, snapshot.gameDex),
          gameHomeBoxes: mergeGameHomeBoxRecords(
            current.gameHomeBoxes,
            snapshot.gameHomeBoxes,
          ),
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
          homeBoxLayouts: mergeHomeBoxLayouts(
            current.homeBoxLayouts,
            normalizeHomeBoxLayouts(snapshot.homeBoxLayouts),
          ),
          activeHomeBoxLayoutId:
            current.activeHomeBoxLayoutId ||
            snapshot.activeHomeBoxLayoutId ||
            null,
          shinyHunts: mergeShinyHunts(
            current.shinyHunts,
            snapshot.shinyHunts ?? [],
          ),
          recentCatches: mergeRecentCatches(
            current.recentCatches,
            snapshot.recentCatches ?? [],
          ),
        };
        const activeHomeBoxLayoutId = merged.activeHomeBoxLayoutId ?? "";
        const activeHomeBoxLayout =
          (merged.homeBoxLayouts ?? []).find(
            (layout) => layout.id === activeHomeBoxLayoutId,
          ) ?? null;
        set({
          owned: merged.owned,
          gameDex: merged.gameDex,
          gameHomeBoxes: merged.gameHomeBoxes ?? {},
          availableGames: merged.availableGames,
          pinnedGameId: merged.pinnedGameId ?? null,
          shinyHunts: merged.shinyHunts ?? [],
          recentCatches: merged.recentCatches ?? [],
          homeBoxLayouts: merged.homeBoxLayouts ?? [],
          activeHomeBoxLayoutId,
          homeBoxMode: activeHomeBoxLayout?.mode ?? current.homeBoxMode,
          showShinyDex:
            (activeHomeBoxLayout?.mode ?? current.homeBoxMode) === "paired",
          showCosmeticForms:
            activeHomeBoxLayout?.showCosmeticForms ?? current.showCosmeticForms,
          showGenderForms:
            activeHomeBoxLayout?.showGenderForms ?? current.showGenderForms,
        });
        return merged;
      },

      getProgressSnapshot: () => ({
        owned: get().owned,
        gameDex: get().gameDex,
        gameHomeBoxes: get().gameHomeBoxes,
        availableGames: get().availableGames,
        pinnedGameId: get().pinnedGameId,
        shinyHunts: get().shinyHunts,
        recentCatches: get().recentCatches,
        homeBoxLayouts: get().homeBoxLayouts,
        activeHomeBoxLayoutId: get().activeHomeBoxLayoutId,
      }),

      clearAll: () =>
        set({
          owned: {},
          recentCatches: [],
          shinyHunts: [],
          gameDex: {},
          gameHomeBoxes: {},
          availableGames: {},
          pinnedGameId: null,
          homeBoxLayouts: [],
          activeHomeBoxLayoutId: "",
        }),

      // --- Living Dex (HOME) ---

      markOwned: (speciesId, formName, method) => {
        const key = ownedKey(speciesId, formName);
        const updatedAt = new Date().toISOString();
        set((state) => {
          const existing = state.owned[key];
          return {
            owned: {
              ...state.owned,
              [key]: {
                pokedex_number: speciesId,
                form_name: formName ?? null,
                owned: true,
                shiny_owned: existing?.shiny_owned ?? false,
                updated_at: updatedAt,
                notes: existing?.notes,
                method,
                date_obtained:
                  existing?.date_obtained ?? new Date().toISOString(),
                game: existing?.game,
              },
            },
          };
        });
        void syncRecord(get().owned[key]!);
      },

      markShinyOwned: (speciesId, formName, huntMethod, game) => {
        const key = ownedKey(speciesId, formName);
        const updatedAt = new Date().toISOString();
        set((state) => ({
          owned: {
            ...state.owned,
            [key]: {
              pokedex_number: speciesId,
              form_name: formName ?? null,
              owned: state.owned[key]?.owned ?? false,
              shiny_owned: true,
              updated_at: updatedAt,
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
        const updatedAt = new Date().toISOString();
        set((state) => {
          const existing = state.owned[key];
          if (!existing) return {};
          return {
            owned: {
              ...state.owned,
              [key]: {
                ...existing,
                shiny_owned: false,
                updated_at: updatedAt,
                shiny_method: undefined,
                shiny_game: undefined,
              },
            },
          };
        });
        // Always sync the updated record rather than deleting it, so the clear
        // has its own timestamp and can win against older remote data.
        const record = get().owned[key];
        if (record) void syncRecord(record);
      },

      clearOwnership: (speciesId, formName) => {
        const key = ownedKey(speciesId, formName);
        const updatedAt = new Date().toISOString();
        set((state) => {
          const existing = state.owned[key];
          if (!existing) return {};
          return {
            owned: {
              ...state.owned,
              [key]: {
                ...existing,
                owned: false,
                updated_at: updatedAt,
                method: undefined,
              },
            },
          };
        });
        const record = get().owned[key];
        if (record) void syncRecord(record);
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
        const event: CatchEvent = {
          speciesId,
          formName: formName ?? null,
          gameId,
          date: new Date().toISOString(),
          isShiny: false,
          isAlpha: false,
        };
        set((state) => {
          const newGameDex = patchGameEntry(state, gameId, key, {
            owned: true,
          });
          void syncGameDexEntry(
            gameId,
            speciesId,
            formName ?? null,
            newGameDex[gameId][key],
          );
          return {
            gameDex: newGameDex,
            recentCatches: [event, ...state.recentCatches].slice(
              0,
              MAX_CATCH_LOG,
            ),
          };
        });
        void syncRecentCatch(event);
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
          void syncGameDexEntry(gameId, speciesId, formName ?? null, updated);
          return { gameDex: newGameDex };
        });
      },

      isOwnedInGame: (speciesId, gameId, formName) =>
        !!get().gameDex[gameId]?.[ownedKey(speciesId, formName)]?.owned,

      markShinyOwnedInGame: (speciesId, gameId, formName) => {
        const key = ownedKey(speciesId, formName);
        const event: CatchEvent = {
          speciesId,
          formName: formName ?? null,
          gameId,
          date: new Date().toISOString(),
          isShiny: true,
          isAlpha: false,
        };
        set((state) => {
          const newGameDex = patchGameEntry(state, gameId, key, {
            owned: true,
            shiny: true,
          });
          void syncGameDexEntry(
            gameId,
            speciesId,
            formName ?? null,
            newGameDex[gameId][key],
          );
          return {
            gameDex: newGameDex,
            recentCatches: [event, ...state.recentCatches].slice(
              0,
              MAX_CATCH_LOG,
            ),
          };
        });
        void syncRecentCatch(event);
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
          void syncGameDexEntry(gameId, speciesId, formName ?? null, updated);
          return { gameDex: newGameDex };
        });
      },

      isShinyOwnedInGame: (speciesId, gameId, formName) =>
        !!get().gameDex[gameId]?.[ownedKey(speciesId, formName)]?.shiny,

      markAlphaInGame: (speciesId, gameId, formName) => {
        const key = ownedKey(speciesId, formName);
        const event: CatchEvent = {
          speciesId,
          formName: formName ?? null,
          gameId,
          date: new Date().toISOString(),
          isShiny: false,
          isAlpha: true,
        };
        set((state) => {
          const newGameDex = patchGameEntry(state, gameId, key, {
            owned: true,
            alpha: true,
          });
          void syncGameDexEntry(
            gameId,
            speciesId,
            formName ?? null,
            newGameDex[gameId][key],
          );
          return {
            gameDex: newGameDex,
            recentCatches: [event, ...state.recentCatches].slice(
              0,
              MAX_CATCH_LOG,
            ),
          };
        });
        void syncRecentCatch(event);
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
          void syncGameDexEntry(gameId, speciesId, formName ?? null, updated);
          return { gameDex: newGameDex };
        });
      },

      isAlphaInGame: (speciesId, gameId, formName) =>
        !!get().gameDex[gameId]?.[ownedKey(speciesId, formName)]?.alpha,

      markShinyAlphaInGame: (speciesId, gameId, formName) => {
        const key = ownedKey(speciesId, formName);
        const event: CatchEvent = {
          speciesId,
          formName: formName ?? null,
          gameId,
          date: new Date().toISOString(),
          isShiny: true,
          isAlpha: true,
        };
        set((state) => {
          const newGameDex = patchGameEntry(state, gameId, key, {
            owned: true,
            shiny: true,
            alpha: true,
            shiny_alpha: true,
          });
          void syncGameDexEntry(
            gameId,
            speciesId,
            formName ?? null,
            newGameDex[gameId][key],
          );
          return {
            gameDex: newGameDex,
            recentCatches: [event, ...state.recentCatches].slice(
              0,
              MAX_CATCH_LOG,
            ),
          };
        });
        void syncRecentCatch(event);
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
          void syncGameDexEntry(gameId, speciesId, formName ?? null, updated);
          return { gameDex: newGameDex };
        });
      },

      isShinyAlphaInGame: (speciesId, gameId, formName) =>
        !!get().gameDex[gameId]?.[ownedKey(speciesId, formName)]?.shiny_alpha,

      markInGameHomeBox: (speciesId, gameId, formName) => {
        const key = ownedKey(speciesId, formName);
        set((state) => {
          const newGameHomeBoxes = {
            ...state.gameHomeBoxes,
            [gameId]: { ...state.gameHomeBoxes[gameId], [key]: true },
          };
          void syncGameHomeBoxEntry(gameId, speciesId, formName ?? null, true);
          return { gameHomeBoxes: newGameHomeBoxes };
        });
      },

      clearFromGameHomeBox: (speciesId, gameId, formName) => {
        const key = ownedKey(speciesId, formName);
        set((state) => {
          const existing = state.gameHomeBoxes[gameId]?.[key];
          if (!existing) return {};
          const newGame = { ...state.gameHomeBoxes[gameId] };
          delete newGame[key];
          const newGameHomeBoxes = {
            ...state.gameHomeBoxes,
            [gameId]: newGame,
          };
          void syncGameHomeBoxEntry(gameId, speciesId, formName ?? null, false);
          return { gameHomeBoxes: newGameHomeBoxes };
        });
      },

      isInGameHomeBox: (speciesId, gameId, formName) =>
        !!get().gameHomeBoxes[gameId]?.[ownedKey(speciesId, formName)],

      addShinyHunt: (speciesId, formName, gameId, method, counterMode) => {
        const hunt: ShinyHunt = {
          id: crypto.randomUUID(),
          speciesId,
          formName,
          gameId,
          method,
          counterMode,
          count: 0,
          startedAt: new Date().toISOString(),
        };
        set((state) => ({
          shinyHunts: [...state.shinyHunts, hunt],
        }));
        void syncShinyHunt(hunt);
      },

      updateShinyHunt: (id, patch) => {
        set((state) => ({
          shinyHunts: state.shinyHunts.map((h) =>
            h.id === id ? { ...h, ...patch } : h,
          ),
        }));
        const hunt = get().shinyHunts.find((h) => h.id === id);
        if (hunt) void syncShinyHunt(hunt);
      },

      incrementShinyHunt: (id) => {
        set((state) => ({
          shinyHunts: state.shinyHunts.map((h) =>
            h.id === id ? { ...h, count: h.count + 1 } : h,
          ),
        }));
        const hunt = get().shinyHunts.find((h) => h.id === id);
        if (hunt) void syncShinyHunt(hunt);
      },

      decrementShinyHunt: (id) => {
        set((state) => ({
          shinyHunts: state.shinyHunts.map((h) =>
            h.id === id ? { ...h, count: Math.max(0, h.count - 1) } : h,
          ),
        }));
        const hunt = get().shinyHunts.find((h) => h.id === id);
        if (hunt) void syncShinyHunt(hunt);
      },

      setShinyHuntCount: (id, count) => {
        const safeCount = Math.max(0, Math.floor(count));
        set((state) => ({
          shinyHunts: state.shinyHunts.map((h) =>
            h.id === id ? { ...h, count: safeCount } : h,
          ),
        }));
        const hunt = get().shinyHunts.find((h) => h.id === id);
        if (hunt) void syncShinyHunt(hunt);
      },

      setShinyHuntCounterMode: (id, counterMode) => {
        set((state) => ({
          shinyHunts: state.shinyHunts.map((h) =>
            h.id === id ? { ...h, counterMode } : h,
          ),
        }));
        const hunt = get().shinyHunts.find((h) => h.id === id);
        if (hunt) void syncShinyHunt(hunt);
      },

      removeShinyHunt: (id) => {
        set((state) => ({
          shinyHunts: state.shinyHunts.filter((h) => h.id !== id),
        }));
        void deleteShinyHunt(id);
      },

      completeShinyHunt: (id) => {
        const hunt = get().shinyHunts.find((h) => h.id === id);
        if (!hunt) return;
        set((state) => ({
          shinyHunts: state.shinyHunts.map((h) =>
            h.id === id
              ? { ...h, completedAt: h.completedAt ?? new Date().toISOString() }
              : h,
          ),
        }));
        const updatedHunt = get().shinyHunts.find((h) => h.id === id);
        if (updatedHunt) void syncShinyHunt(updatedHunt);
        get().markShinyOwnedInGame(hunt.speciesId, hunt.gameId, hunt.formName);
      },

      removeRecentCatch: (event) => {
        set((state) => ({
          recentCatches: state.recentCatches.filter(
            (catchEvent) =>
              !(
                catchEvent.speciesId === event.speciesId &&
                catchEvent.formName === event.formName &&
                catchEvent.gameId === event.gameId &&
                catchEvent.date === event.date
              ),
          ),
        }));
        void deleteRecentCatch(event);
      },

      setGameAvailable: (gameId, available) => {
        set((state) => ({
          availableGames: { ...state.availableGames, [gameId]: available },
        }));
        void syncAvailableGame(gameId, available);
      },

      removeGameAvailable: (gameId) => {
        set((state) => {
          const availableGames = { ...state.availableGames };
          delete availableGames[gameId];
          return {
            availableGames,
            pinnedGameId:
              state.pinnedGameId === gameId ? null : state.pinnedGameId,
          };
        });
        void deleteAvailableGame(gameId);
        if (get().pinnedGameId === null) void syncPinnedGameId(null);
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
      version: 13,
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

        if (version < 8) {
          persistedState.gameHomeBoxes = {};
        }

        if (version < 9) {
          persistedState.recentCatches = [];
        }

        if (version < 10) {
          persistedState.shinyHunts = [];
        }

        if (version < 11 && Array.isArray(persistedState.shinyHunts)) {
          persistedState.shinyHunts = persistedState.shinyHunts.map((hunt) =>
            isRecord(hunt) ? { ...hunt } : hunt,
          );
        }

        if (version < 12) {
          const mode = normalizeHomeBoxMode(
            persistedState.homeBoxMode,
            persistedState.showShinyDex,
          );
          persistedState.homeBoxLayouts = [
            {
              ...LEGACY_DEFAULT_HOME_BOX_LAYOUT,
              mode,
              showCosmeticForms: persistedState.showCosmeticForms === true,
              showGenderForms: persistedState.showGenderForms === true,
            },
          ];
          persistedState.activeHomeBoxLayoutId = DEFAULT_HOME_BOX_LAYOUT_ID;
        }

        if (version < 13) {
          const layouts = normalizeHomeBoxLayouts(
            persistedState.homeBoxLayouts,
          );
          const onlyLegacyDefault =
            layouts.length === 1 &&
            layouts[0].id === DEFAULT_HOME_BOX_LAYOUT_ID &&
            layouts[0].name === LEGACY_DEFAULT_HOME_BOX_LAYOUT.name &&
            layouts[0].mode === LEGACY_DEFAULT_HOME_BOX_LAYOUT.mode &&
            layouts[0].showCosmeticForms ===
              LEGACY_DEFAULT_HOME_BOX_LAYOUT.showCosmeticForms &&
            layouts[0].showGenderForms ===
              LEGACY_DEFAULT_HOME_BOX_LAYOUT.showGenderForms;
          if (onlyLegacyDefault) {
            persistedState.homeBoxLayouts = [];
            persistedState.activeHomeBoxLayoutId = "";
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
        const homeBoxLayouts = normalizeHomeBoxLayouts(
          persistedState.homeBoxLayouts,
        );
        const activeHomeBoxLayoutId =
          typeof persistedState.activeHomeBoxLayoutId === "string" &&
          homeBoxLayouts.some(
            (layout) => layout.id === persistedState.activeHomeBoxLayoutId,
          )
            ? persistedState.activeHomeBoxLayoutId
            : (homeBoxLayouts[0]?.id ?? "");
        const activeHomeBoxLayout =
          homeBoxLayouts.find(
            (layout) => layout.id === activeHomeBoxLayoutId,
          ) ?? null;
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
          recentCatches: Array.isArray(persistedState.recentCatches)
            ? (persistedState.recentCatches as CatchEvent[])
            : [],
          shinyHunts: Array.isArray(persistedState.shinyHunts)
            ? (persistedState.shinyHunts as ShinyHunt[])
            : [],
          gameDex,
          gameHomeBoxes: normalizeNestedBooleanRecord(
            persistedState.gameHomeBoxes,
          ),
          availableGames: normalizeBooleanRecord(persistedState.availableGames),
          pinnedGameId:
            typeof persistedState.pinnedGameId === "string"
              ? persistedState.pinnedGameId
              : null,
          showCosmeticForms:
            activeHomeBoxLayout?.showCosmeticForms ??
            persistedState.showCosmeticForms === true,
          showGenderForms:
            activeHomeBoxLayout?.showGenderForms ??
            persistedState.showGenderForms === true,
          homeBoxLayouts,
          activeHomeBoxLayoutId,
          showShinyDex: (activeHomeBoxLayout?.mode ?? homeBoxMode) === "paired",
          homeBoxMode: activeHomeBoxLayout?.mode ?? homeBoxMode,
          setProgressSnapshot: currentState.setProgressSnapshot,
          mergeProgressSnapshot: currentState.mergeProgressSnapshot,
          getProgressSnapshot: currentState.getProgressSnapshot,
          setShowCosmeticForms: currentState.setShowCosmeticForms,
          setShowGenderForms: currentState.setShowGenderForms,
          setShowGigantamaxForms: currentState.setShowGigantamaxForms,
          setShowShinyDex: currentState.setShowShinyDex,
          setHomeBoxMode: currentState.setHomeBoxMode,
          setActiveHomeBoxLayout: currentState.setActiveHomeBoxLayout,
          saveCurrentHomeBoxLayout: currentState.saveCurrentHomeBoxLayout,
          removeHomeBoxLayout: currentState.removeHomeBoxLayout,
          setPinnedGameId: currentState.setPinnedGameId,
          removeRecentCatch: currentState.removeRecentCatch,
          removeGameAvailable: currentState.removeGameAvailable,
          markInGameHomeBox: currentState.markInGameHomeBox,
          clearFromGameHomeBox: currentState.clearFromGameHomeBox,
          isInGameHomeBox: currentState.isInGameHomeBox,
        };
      },
    },
  ),
);
