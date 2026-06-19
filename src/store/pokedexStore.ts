import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  syncAvailableGame,
  syncGameDex,
  syncGameDexEntry,
  syncGameHomeBoxEntry,
  syncPinnedGameId,
  syncHomeBoxLayouts,
  syncSingleHomeBoxLayout,
  syncActiveHomeBoxLayoutId,
  syncShinyHunt,
  deleteGameDexScope,
  deleteShinyHunt,
  syncRecentCatch,
  deleteRecentCatch,
  deleteAvailableGame,
} from "@/lib/sync";
import type {
  HomeBoxLayoutProfile,
  HomeBoxMode,
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

const DEFAULT_HOME_BOX_LAYOUT_ID = "national-dex";
const LEGACY_DEFAULT_HOME_BOX_LAYOUT: HomeBoxLayoutProfile = {
  id: DEFAULT_HOME_BOX_LAYOUT_ID,
  name: "National Dex",
  mode: "normal",
  showCosmeticForms: false,
  showGenderForms: false,
};

type PokedexState = {
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
  clearHomeBoxLayoutProgress: (id: string) => void;
  markHomeBoxLayoutSlot: (
    layoutId: string,
    speciesId: number,
    formName: string | null,
    shiny: boolean,
  ) => void;
  clearHomeBoxLayoutSlot: (
    layoutId: string,
    speciesId: number,
    formName: string | null,
    shiny: boolean,
  ) => void;
  setProgressSnapshot: (snapshot: ProgressSnapshot) => void;
  mergeProgressSnapshot: (snapshot: ProgressSnapshot) => ProgressSnapshot;
  getProgressSnapshot: () => ProgressSnapshot;
  clearAll: () => void;

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
    count?: number | null,
  ) => string;
  updateShinyHunt: (
    id: string,
    patch: Partial<
      Pick<
        ShinyHunt,
        "speciesId" | "formName" | "gameId" | "method" | "counterMode" | "count"
      >
    >,
  ) => void;
  incrementShinyHunt: (id: string) => void;
  decrementShinyHunt: (id: string) => void;
  setShinyHuntCount: (id: string, count: number | null) => void;
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

function isHomeLayoutProgressScope(gameId: string): boolean {
  return (
    gameId.startsWith("home-layout-") || gameId === DEFAULT_HOME_BOX_LAYOUT_ID
  );
}

function pruneGameDexToHomeLayouts(
  gameDex: Record<string, Record<string, GameDexFlags>>,
  homeBoxLayouts: HomeBoxLayoutProfile[],
): Record<string, Record<string, GameDexFlags>> {
  const homeLayoutIds = new Set(homeBoxLayouts.map((layout) => layout.id));
  return Object.fromEntries(
    Object.entries(gameDex).filter(
      ([gameId]) =>
        !isHomeLayoutProgressScope(gameId) || homeLayoutIds.has(gameId),
    ),
  );
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

// Convert old flat number[] game dex + shiny arrays into the GameDexFlags map.
function migrateToGameDex(
  gameDexProgress: Record<string, number[]>,
  shinyGameDexProgress: Record<string, number[]>,
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
  return all.sort((a, b) => b.date.localeCompare(a.date));
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
          const gameDex = pruneGameDexToHomeLayouts(
            { ...state.gameDex, [id]: {} },
            homeBoxLayouts,
          );
          void syncHomeBoxLayouts(homeBoxLayouts, id);
          return {
            homeBoxLayouts,
            activeHomeBoxLayoutId: id,
            gameDex,
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
        set((state) => {
          const homeBoxLayouts = [...state.homeBoxLayouts, layout];
          const gameDex = pruneGameDexToHomeLayouts(
            { ...state.gameDex, [id]: {} },
            homeBoxLayouts,
          );
          return {
            homeBoxLayouts,
            activeHomeBoxLayoutId: id,
            gameDex,
            homeBoxMode: mode,
            showShinyDex: mode === "paired",
            showCosmeticForms,
            showGenderForms,
          };
        });
        pendingWriteCount++;
        void Promise.all([
          syncSingleHomeBoxLayout(layout),
          syncActiveHomeBoxLayoutId(id),
        ]).finally(() => {
          pendingWriteCount--;
        });
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
              ? {
                  homeBoxMode: patch.mode,
                  showShinyDex: patch.mode === "paired",
                }
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
          const gameDex = { ...state.gameDex };
          delete gameDex[id];
          if (state.activeHomeBoxLayoutId !== id) {
            void syncHomeBoxLayouts(layouts, state.activeHomeBoxLayoutId);
            void syncGameDex(gameDex);
            return { homeBoxLayouts: layouts, gameDex };
          }
          const nextLayout = layouts[0];
          if (!nextLayout) {
            void syncHomeBoxLayouts([], null);
            void syncGameDex(gameDex);
            return {
              homeBoxLayouts: [],
              activeHomeBoxLayoutId: "",
              gameDex,
            };
          }
          void syncHomeBoxLayouts(layouts, nextLayout.id);
          void syncGameDex(gameDex);
          return {
            homeBoxLayouts: layouts,
            activeHomeBoxLayoutId: nextLayout.id,
            gameDex,
            homeBoxMode: nextLayout.mode,
            showShinyDex: nextLayout.mode === "paired",
            showCosmeticForms: nextLayout.showCosmeticForms,
            showGenderForms: nextLayout.showGenderForms,
          };
        }),
      clearHomeBoxLayoutProgress: (id) =>
        set((state) => {
          const gameDex = { ...state.gameDex };
          delete gameDex[id];
          void deleteGameDexScope(id);
          return { gameDex };
        }),
      markHomeBoxLayoutSlot: (layoutId, speciesId, formName, shiny) => {
        const key = ownedKey(speciesId, formName);
        set((state) => {
          const newGameDex = patchGameEntry(state, layoutId, key, shiny
            ? { shiny: true }
            : { owned: true });
          void syncGameDexEntry(
            layoutId,
            speciesId,
            formName ?? null,
            newGameDex[layoutId][key],
          );
          return { gameDex: newGameDex };
        });
      },
      clearHomeBoxLayoutSlot: (layoutId, speciesId, formName, shiny) => {
        const key = ownedKey(speciesId, formName);
        set((state) => {
          const existing = state.gameDex[layoutId]?.[key];
          if (!existing) return {};
          const updated: GameDexFlags = shiny
            ? { ...existing, shiny: false }
            : { ...existing, owned: false };
          const hasData =
            updated.owned ||
            updated.shiny ||
            updated.alpha ||
            updated.shiny_alpha;
          const newGame = { ...state.gameDex[layoutId] };
          if (hasData) {
            newGame[key] = updated;
          } else {
            delete newGame[key];
          }
          const newGameDex = { ...state.gameDex, [layoutId]: newGame };
          void syncGameDexEntry(layoutId, speciesId, formName ?? null, updated);
          return { gameDex: newGameDex };
        });
      },

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
        const gameDex = pruneGameDexToHomeLayouts(
          snapshot.gameDex,
          homeBoxLayouts,
        );
        set({
          gameDex,
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
        const homeBoxLayouts = mergeHomeBoxLayouts(
          current.homeBoxLayouts,
          normalizeHomeBoxLayouts(snapshot.homeBoxLayouts),
        );
        const merged: ProgressSnapshot = {
          gameDex: pruneGameDexToHomeLayouts(
            mergeGameDexRecords(current.gameDex, snapshot.gameDex),
            homeBoxLayouts,
          ),
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
          homeBoxLayouts,
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
        gameDex: pruneGameDexToHomeLayouts(
          get().gameDex,
          get().homeBoxLayouts,
        ),
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
          recentCatches: [],
          shinyHunts: [],
          gameDex: {},
          gameHomeBoxes: {},
          availableGames: {},
          pinnedGameId: null,
          homeBoxLayouts: [],
          activeHomeBoxLayoutId: "",
        }),

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
            recentCatches: [event, ...state.recentCatches],
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
            recentCatches: [event, ...state.recentCatches],
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
            recentCatches: [event, ...state.recentCatches],
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
            recentCatches: [event, ...state.recentCatches],
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

      addShinyHunt: (
        speciesId,
        formName,
        gameId,
        method,
        counterMode,
        count = 0,
      ) => {
        const id = crypto.randomUUID();
        const hunt: ShinyHunt = {
          id,
          speciesId,
          formName,
          gameId,
          method,
          counterMode,
          count,
          startedAt: new Date().toISOString(),
        };
        set((state) => ({
          shinyHunts: [...state.shinyHunts, hunt],
        }));
        void syncShinyHunt(hunt);
        return id;
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
            h.id === id ? { ...h, count: (h.count ?? 0) + 1 } : h,
          ),
        }));
        const hunt = get().shinyHunts.find((h) => h.id === id);
        if (hunt) void syncShinyHunt(hunt);
      },

      decrementShinyHunt: (id) => {
        set((state) => ({
          shinyHunts: state.shinyHunts.map((h) =>
            h.id === id
              ? { ...h, count: h.count === null ? null : Math.max(0, h.count - 1) }
              : h,
          ),
        }));
        const hunt = get().shinyHunts.find((h) => h.id === id);
        if (hunt) void syncShinyHunt(hunt);
      },

      setShinyHuntCount: (id, count) => {
        const safeCount =
          count === null ? null : Math.max(0, Math.floor(count));
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
      version: 15,
      migrate: (persistedState, version) => {
        if (!isRecord(persistedState)) return persistedState;

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
          persistedState.gameDex = migrateToGameDex(
            remappedProgress,
            remappedShiny,
          );
          delete persistedState.gameDexProgress;
          delete persistedState.shinyGameDexProgress;
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

        if (version < 14) {
          delete persistedState.owned;
        }

        if (version < 15) {
          const layouts = normalizeHomeBoxLayouts(
            persistedState.homeBoxLayouts,
          );
          if (isRecord(persistedState.gameDex)) {
            persistedState.gameDex = pruneGameDexToHomeLayouts(
              persistedState.gameDex as Record<
                string,
                Record<string, GameDexFlags>
              >,
              layouts,
            );
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
          gameDex = migrateToGameDex(
            remapLegacyLegendsZaProgress(
              isRecord(rawProgress) ? rawProgress : {},
            ),
            remapLegacyLegendsZaProgress(isRecord(rawShiny) ? rawShiny : {}),
          );
        }
        gameDex = pruneGameDexToHomeLayouts(gameDex, homeBoxLayouts);
        delete persistedState.owned;
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
          clearHomeBoxLayoutProgress: currentState.clearHomeBoxLayoutProgress,
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
