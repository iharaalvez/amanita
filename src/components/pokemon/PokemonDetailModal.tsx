"use client";

import { useEffect, useRef, useState } from "react";
import type { SetStateAction } from "react";
import { PokemonSprite } from "@/components/pokemon/PokemonSprite";
import { usePokedexStore, ownedKey } from "@/store/pokedexStore";
import {
  useLivingDexEntries,
  usePokemonEvolution,
  usePokemonSpecies,
} from "@/hooks/usePokemon";
import { useEncounters } from "@/hooks/useEncounters";
import {
  GAME_POKEMON_LOCATION_OVERRIDES,
  getGamePokemonLocationOverride,
} from "@/config/game-pokemon-location-overrides";
import { GAME_LIST } from "@/config/games";
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  SparkleIcon,
  XIcon,
} from "@/components/ui";
import {
  isMythical,
  isShinyLocked,
  requiresTrade,
} from "@/config/pokemon-flags";
import { isBattleOnlyForm } from "@/lib/livingDex";

const GAME_COLORS: Record<string, string> = {
  "red-blue": "#dc2626",
  yellow: "#ca8a04",
  "gold-silver": "#d97706",
  crystal: "#0284c7",
  "ruby-sapphire": "#be123c",
  emerald: "#16a34a",
  "firered-leafgreen": "#ea580c",
  "diamond-pearl": "#7c3aed",
  platinum: "#6b7280",
  "heartgold-soulsilver": "#b45309",
  "black-white": "#374151",
  "black2-white2": "#1f2937",
  "x-y": "#2563eb",
  oras: "#b91c1c",
  "sun-moon": "#f97316",
  usum: "#c2410c",
  swsh: "#4f46e5",
  bdsp: "#7c3aed",
  pla: "#15803d",
  "scarlet-violet": "#9f1239",
  "legends-za": "#16a34a",
};

const GAME_GRADIENT: Record<string, [string, string]> = {
  "red-blue": ["#dc2626", "#2563eb"],
  yellow: ["#ca8a04", "#f59e0b"],
  "gold-silver": ["#d97706", "#9ca3af"],
  crystal: ["#0284c7", "#a78bfa"],
  "ruby-sapphire": ["#be123c", "#1d4ed8"],
  emerald: ["#15803d", "#34d399"],
  "firered-leafgreen": ["#dc2626", "#16a34a"],
  "diamond-pearl": ["#818cf8", "#ec4899"],
  platinum: ["#6b7280", "#d1d5db"],
  "heartgold-soulsilver": ["#d97706", "#9ca3af"],
  "black-white": ["#1f2937", "#9ca3af"],
  "black2-white2": ["#1f2937", "#9ca3af"],
  "x-y": ["#2563eb", "#7c3aed"],
  oras: ["#dc2626", "#1d4ed8"],
  "sun-moon": ["#f97316", "#6366f1"],
  usum: ["#c2410c", "#4f46e5"],
  swsh: ["#1d4ed8", "#dc2626"],
  bdsp: ["#818cf8", "#f472b6"],
  pla: ["#15803d", "#1e3a5f"],
  "scarlet-violet": ["#be123c", "#7c3aed"],
  "legends-za": ["#16a34a", "#0f172a"],
};

const TYPE_COLORS: Record<string, string> = {
  normal: "#A8A878",
  fire: "#F08030",
  water: "#6890F0",
  electric: "#F8D030",
  grass: "#78C850",
  ice: "#98D8D8",
  fighting: "#C03028",
  poison: "#A040A0",
  ground: "#E0C068",
  flying: "#A890F0",
  psychic: "#F85888",
  bug: "#A8B820",
  rock: "#B8A038",
  ghost: "#705898",
  dragon: "#7038F8",
  dark: "#705848",
  steel: "#B8B8D0",
  fairy: "#EE99AC",
};

// attacker -> defender -> multiplier (omits 1×)
const TYPE_CHART: Record<string, Record<string, number>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: {
    fire: 0.5,
    water: 0.5,
    rock: 0.5,
    dragon: 0.5,
    grass: 2,
    ice: 2,
    bug: 2,
    steel: 2,
  },
  water: { water: 0.5, grass: 0.5, dragon: 0.5, fire: 2, ground: 2, rock: 2 },
  electric: {
    electric: 0.5,
    grass: 0.5,
    dragon: 0.5,
    ground: 0,
    water: 2,
    flying: 2,
  },
  grass: {
    fire: 0.5,
    grass: 0.5,
    poison: 0.5,
    flying: 0.5,
    bug: 0.5,
    dragon: 0.5,
    steel: 0.5,
    water: 2,
    ground: 2,
    rock: 2,
  },
  ice: {
    fire: 0.5,
    water: 0.5,
    ice: 0.5,
    steel: 0.5,
    grass: 2,
    ground: 2,
    flying: 2,
    dragon: 2,
  },
  fighting: {
    poison: 0.5,
    bug: 0.5,
    psychic: 0.5,
    flying: 0.5,
    fairy: 0.5,
    ghost: 0,
    normal: 2,
    ice: 2,
    rock: 2,
    dark: 2,
    steel: 2,
  },
  poison: {
    poison: 0.5,
    ground: 0.5,
    rock: 0.5,
    ghost: 0.5,
    steel: 0,
    grass: 2,
    fairy: 2,
  },
  ground: {
    grass: 0.5,
    bug: 0.5,
    flying: 0,
    fire: 2,
    electric: 2,
    poison: 2,
    rock: 2,
    steel: 2,
  },
  flying: {
    electric: 0.5,
    rock: 0.5,
    steel: 0.5,
    grass: 2,
    fighting: 2,
    bug: 2,
  },
  psychic: { psychic: 0.5, steel: 0.5, dark: 0, fighting: 2, poison: 2 },
  bug: {
    fire: 0.5,
    fighting: 0.5,
    flying: 0.5,
    ghost: 0.5,
    steel: 0.5,
    fairy: 0.5,
    grass: 2,
    psychic: 2,
    dark: 2,
  },
  rock: {
    fighting: 0.5,
    ground: 0.5,
    steel: 0.5,
    fire: 2,
    ice: 2,
    flying: 2,
    bug: 2,
  },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { steel: 0.5, fairy: 0, dragon: 2 },
  dark: { fighting: 0.5, dark: 0.5, fairy: 0.5, psychic: 2, ghost: 2 },
  steel: {
    fire: 0.5,
    water: 0.5,
    electric: 0.5,
    steel: 0.5,
    ice: 2,
    rock: 2,
    fairy: 2,
  },
  fairy: {
    fire: 0.5,
    poison: 0.5,
    steel: 0.5,
    fighting: 2,
    dragon: 2,
    dark: 2,
  },
};

function computeTypeEffectiveness(types: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const attacker of Object.keys(TYPE_CHART)) {
    let multiplier = 1;
    for (const defender of types) {
      multiplier *= TYPE_CHART[attacker]?.[defender] ?? 1;
    }
    if (multiplier !== 1) result[attacker] = multiplier;
  }
  return result;
}

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Atk",
  defense: "Def",
  "special-attack": "SpA",
  "special-defense": "SpD",
  speed: "Spe",
};

type EncounterLocationGroup = {
  games: string[];
  locations: string[];
};

function buildEncounterLocationGroups(
  encountersByGame: Map<string, string[]>,
): EncounterLocationGroup[] {
  const groupsByLocations = new Map<string, EncounterLocationGroup>();

  for (const [game, locations] of Array.from(encountersByGame.entries())) {
    const uniqueLocations = Array.from(new Set<string>(locations)).sort(
      (a, b) => a.localeCompare(b),
    );
    const key = uniqueLocations.join("|");
    const existing = groupsByLocations.get(key);
    if (existing) {
      existing.games.push(game);
    } else {
      groupsByLocations.set(key, { games: [game], locations: uniqueLocations });
    }
  }

  return Array.from(groupsByLocations.values());
}

function gameNameMatchesAvailableGame(
  gameName: string,
  availableGameNames: Set<string>,
): boolean {
  return gameName.split(" / ").some((name) => availableGameNames.has(name));
}

function titleCasePokemonName(name: string): string {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getEvolutionStageLabel(index: number, totalStages: number): string {
  if (index === 0) return "Unevolved";
  if (totalStages === 2) return "Evolution";
  if (index === 1) return "First Evolution";
  if (index === 2) return "Second Evolution";
  return `Stage ${index + 1}`;
}

type Props = {
  pokemonId: number;
  speciesId: number;
  formName: string | null;
  contextGameId?: string;
  onClose: () => void;
  onNavigate: (
    pokemonId: number,
    speciesId: number,
    formName: string | null,
  ) => void;
};

export function PokemonDetailModal({
  pokemonId,
  speciesId,
  formName,
  onClose,
  onNavigate,
}: Props) {
  const [collapsedEncounterState, setCollapsedEncounterState] = useState<{
    pokemonId: number;
    groups: Record<string, boolean>;
  }>({ pokemonId, groups: {} });
  const [showShinyState, setShowShinyState] = useState({
    pokemonId,
    value: false,
  });
  const collapsedEncounterGroups =
    collapsedEncounterState.pokemonId === pokemonId
      ? collapsedEncounterState.groups
      : {};
  const showShiny =
    showShinyState.pokemonId === pokemonId ? showShinyState.value : false;
  const setCollapsedEncounterGroups = (
    nextGroups: SetStateAction<Record<string, boolean>>,
  ) => {
    setCollapsedEncounterState((state) => {
      const currentGroups = state.pokemonId === pokemonId ? state.groups : {};
      return {
        pokemonId,
        groups:
          typeof nextGroups === "function"
            ? nextGroups(currentGroups)
            : nextGroups,
      };
    });
  };
  const setShowShiny = (nextValue: SetStateAction<boolean>) => {
    setShowShinyState((state) => {
      const currentValue = state.pokemonId === pokemonId ? state.value : false;
      return {
        pokemonId,
        value:
          typeof nextValue === "function" ? nextValue(currentValue) : nextValue,
      };
    });
  };
  const modalRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const { data: speciesForms, isLoading } = usePokemonSpecies(speciesId);
  const { data: livingDexEntries } = useLivingDexEntries();
  const { data: evolutionLines, isLoading: evolutionLoading } =
    usePokemonEvolution(speciesId);
  const { data: encounters, isLoading: encLoading } = useEncounters(speciesId);
  const selectedEntry =
    speciesForms?.find((entry) => entry.formName === formName) ??
    speciesForms?.find((entry) => entry.formName === null);

  const storeKey = ownedKey(speciesId, formName);
  const owned = usePokedexStore((s) => !!s.owned[storeKey]?.owned);
  const shinyOwned = usePokedexStore((s) => !!s.owned[storeKey]?.shiny_owned);
  const ownedRecord = usePokedexStore((s) => s.owned[storeKey]);
  const availableGames = usePokedexStore((s) => s.availableGames);
  const gameDex = usePokedexStore((s) => s.gameDex);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    const panel = modalRef.current;
    if (!panel) return;

    let startY: number | null = null;
    let dragOffset = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (panel.scrollTop > 0) return;
      startY = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY === null) return;
      const delta = e.touches[0].clientY - startY;
      if (delta > 0) {
        dragOffset = delta;
        panel.style.transform = `translateY(${delta}px)`;
        panel.style.transition = "none";
        e.preventDefault();
      }
    };

    const onTouchEnd = () => {
      if (startY === null) return;
      if (dragOffset > 120) {
        onCloseRef.current();
      } else {
        panel.style.transition = "transform 0.25s ease";
        panel.style.transform = "";
        panel.addEventListener(
          "transitionend",
          () => {
            panel.style.transition = "";
          },
          { once: true },
        );
      }
      startY = null;
      dragOffset = 0;
    };

    panel.addEventListener("touchstart", onTouchStart, { passive: true });
    panel.addEventListener("touchmove", onTouchMove, { passive: false });
    panel.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      panel.removeEventListener("touchstart", onTouchStart);
      panel.removeEventListener("touchmove", onTouchMove);
      panel.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, []);

  const displayName = selectedEntry?.displayName ?? "";
  const paddedNumber = `#${String(speciesId).padStart(4, "0")}`;
  const spriteUrl = selectedEntry?.spriteUrl ?? "";
  const livingDexForms = (speciesForms ?? []).filter(
    (entry) => entry.formName !== null && !isBattleOnlyForm(entry),
  );
  const shinyLocked = isShinyLocked(speciesId, formName);
  const selectedEvolutionLines = (evolutionLines ?? []).filter((line) =>
    line.some((stage) => stage.id === speciesId),
  );
  const livingDexEntryBySpeciesId = new Map(
    (livingDexEntries ?? [])
      .filter((entry) => entry.formName === null)
      .map((entry) => [entry.speciesId, entry]),
  );
  const stats = selectedEntry?.stats ?? {};
  const totalStats = Object.values(stats).reduce(
    (sum, stat) => sum + (stat ?? 0),
    0,
  );

  const availableGameOptions = GAME_LIST.filter(
    (game) => availableGames[game.id],
  );
  const isOwnedInGame = (gameId: string) =>
    !!gameDex[gameId]?.[ownedKey(speciesId, formName)]?.owned;
  const isShinyOwnedInGame = (gameId: string) =>
    !!gameDex[gameId]?.[ownedKey(speciesId, formName)]?.shiny;
  const availableGameNames = new Set(
    availableGameOptions.map((game) => game.name),
  );

  const encountersByGame = new Map<string, string[]>();
  for (const enc of encounters ?? []) {
    for (const game of enc.games) {
      if (!encountersByGame.has(game)) encountersByGame.set(game, []);
      encountersByGame.get(game)!.push(enc.location);
    }
  }
  for (const game of GAME_LIST) {
    if (!(game.id in GAME_POKEMON_LOCATION_OVERRIDES)) continue;
    const locationOverride = getGamePokemonLocationOverride(game.id, speciesId);
    if (locationOverride.length > 0) {
      encountersByGame.set(game.name, locationOverride);
    }
  }

  const encounterLocationGroups =
    buildEncounterLocationGroups(encountersByGame);
  const hasWildEncounters = encounterLocationGroups.length > 0;
  const availableWildGames = availableGameOptions.filter((game) =>
    encounterLocationGroups.some((group) =>
      group.games.some((name) =>
        gameNameMatchesAvailableGame(name, new Set([game.name])),
      ),
    ),
  );
  const unavailableWildGames = availableGameOptions.filter(
    (game) => !availableWildGames.some((wildGame) => wildGame.id === game.id),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/40 sm:justify-end"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={
          selectedEntry ? `${displayName} details` : "Pokemon details"
        }
        className="relative max-h-[92vh] w-full overflow-y-auto overscroll-contain rounded-t-2xl border-gray-100 bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl dark:border-gray-700 dark:bg-gray-800 sm:h-full sm:max-h-none sm:max-w-[540px] sm:rounded-none sm:border-l sm:pb-0"
        onClick={(event) => event.stopPropagation()}
      >
        {selectedEntry?.types?.[0] && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-96"
            style={{
              background: `radial-gradient(ellipse 100% 55% at 50% 0%, ${TYPE_COLORS[selectedEntry.types[0]]}45, transparent)`,
            }}
          />
        )}
        <div
          aria-hidden
          className="mx-auto mb-1 mt-3 h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600 sm:hidden"
        />
        <button
          type="button"
          onClick={onClose}
          className="sticky top-4 z-10 ml-auto mr-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:bg-gray-800/90 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          aria-label="Close modal"
        >
          <XIcon className="h-4 w-4" />
        </button>

        {isLoading ? (
          <div className="flex flex-col items-center gap-4 p-8">
            <div className="h-24 w-24 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
            <div className="h-5 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ) : selectedEntry ? (
          <>
            <div className="px-6 pb-5">
              <div className="mb-5 flex items-start gap-5">
                <div className="relative shrink-0">
                  <PokemonSprite
                    src={
                      showShiny && selectedEntry.shinySpriteUrl
                        ? selectedEntry.shinySpriteUrl
                        : spriteUrl
                    }
                    alt={displayName}
                    width={112}
                    height={112}
                    style={{ imageRendering: "pixelated" }}
                    className="h-28 w-28 object-contain"
                  />
                  {selectedEntry.shinySpriteUrl && (
                    <button
                      type="button"
                      onClick={() => setShowShiny((value) => !value)}
                      title={
                        showShiny ? "Show normal sprite" : "Show shiny sprite"
                      }
                      aria-pressed={showShiny}
                      className={`absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                        showShiny
                          ? "border-yellow-500 bg-yellow-400 text-white"
                          : "border-gray-200 bg-white text-gray-400 hover:text-yellow-400 dark:border-gray-600 dark:bg-gray-700"
                      }`}
                    >
                      <SparkleIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="min-w-0 flex-1 pt-2">
                  <p className="mb-0.5 text-xs tabular-nums text-gray-400">
                    {paddedNumber}
                  </p>
                  <h2 className="mb-2 text-2xl font-bold leading-tight dark:text-white">
                    {displayName}
                  </h2>
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {(selectedEntry.types ?? []).map((type) => (
                      <span
                        key={type}
                        className="rounded px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-white"
                        style={{ backgroundColor: TYPE_COLORS[type] ?? "#888" }}
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                  {(selectedEntry.height || selectedEntry.weight) && (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      {selectedEntry.height ? (
                        <span>{(selectedEntry.height / 10).toFixed(1)} m</span>
                      ) : null}
                      {selectedEntry.weight ? (
                        <span>{(selectedEntry.weight / 10).toFixed(1)} kg</span>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {owned ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700 dark:bg-green-950/40 dark:text-green-300">
                    <CheckIcon className="h-3.5 w-3.5" />
                    Owned
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-400 dark:bg-gray-800 dark:text-gray-500">
                    <XIcon className="h-3.5 w-3.5" />
                    Not owned
                  </span>
                )}
                {shinyOwned && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300">
                    <SparkleIcon className="h-3.5 w-3.5" />
                    Shiny owned
                  </span>
                )}
                {shinyLocked && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                    <XIcon className="h-3.5 w-3.5" />
                    Shiny locked
                  </span>
                )}
                {ownedRecord?.method && (
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold capitalize text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">
                    {ownedRecord.method}
                  </span>
                )}
              </div>
            </div>

            {livingDexForms.length > 0 && (
              <section className="px-6 pb-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                  Forms
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => onNavigate(speciesId, speciesId, null)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                      formName === null
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    }`}
                  >
                    Base
                  </button>
                  {livingDexForms.map((entry) => (
                    <button
                      key={entry.formName}
                      type="button"
                      onClick={() =>
                        onNavigate(entry.id, speciesId, entry.formName)
                      }
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                        formName === entry.formName
                          ? "bg-teal-500 text-white"
                          : "bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-950 dark:text-teal-300 dark:hover:bg-teal-900"
                      }`}
                    >
                      {entry.regionLabel ?? entry.displayName.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="px-6 pb-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Evolution line
                </h3>
                {selectedEvolutionLines.length > 1 && (
                  <span className="text-[11px] tabular-nums text-gray-400">
                    {selectedEvolutionLines.length} paths
                  </span>
                )}
              </div>

              {evolutionLoading ? (
                <div className="flex flex-col gap-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-32 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700"
                    />
                  ))}
                </div>
              ) : selectedEvolutionLines.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-200 px-4 py-4 text-sm text-gray-400 dark:border-gray-700">
                  No evolution data found
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {selectedEvolutionLines.map((line) => (
                    <div
                      key={line.map((stage) => stage.id).join("-")}
                      className="rounded-2xl border border-emerald-900/20 bg-gradient-to-br from-emerald-100 to-lime-100 p-2.5 shadow-inner dark:border-emerald-400/20 dark:from-emerald-950/50 dark:to-lime-950/30"
                    >
                      <div className="flex w-full items-stretch gap-1.5">
                        {line.map((stage, index) => {
                          const stageEntry = livingDexEntryBySpeciesId.get(
                            stage.id,
                          );
                          const isCurrentStage = stage.id === speciesId;
                          const stageType = stageEntry?.types?.[0];
                          const typeColor = stageType
                            ? TYPE_COLORS[stageType]
                            : "#6b7280";
                          return (
                            <div key={stage.id} className="contents">
                              <div className="min-w-0 flex-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    onNavigate(stage.id, stage.id, null)
                                  }
                                  className={`group flex h-full min-h-[128px] w-full flex-col items-center rounded-xl border px-1.5 py-2 text-center shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                                    isCurrentStage
                                      ? "border-blue-400 bg-white text-blue-700 ring-2 ring-blue-300 dark:bg-gray-900 dark:text-blue-300"
                                      : "border-white/70 bg-white/90 text-gray-700 dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-200"
                                  }`}
                                >
                                  <span
                                    className="mb-1 flex h-12 w-12 items-center justify-center rounded-full border-2 bg-white/70 shadow-inner dark:bg-gray-800/70 sm:h-16 sm:w-16"
                                    style={{ borderColor: `${typeColor}80` }}
                                  >
                                    <PokemonSprite
                                      src={stageEntry?.spriteUrl}
                                      alt={
                                        stageEntry?.displayName ??
                                        titleCasePokemonName(stage.name)
                                      }
                                      width={76}
                                      height={76}
                                      style={{
                                        imageRendering: "pixelated",
                                      }}
                                      className="h-10 w-10 object-contain transition-transform group-hover:scale-105 sm:h-14 sm:w-14"
                                    />
                                  </span>
                                  <span className="mb-0.5 max-w-full truncate text-[11px] font-medium leading-tight text-gray-500 dark:text-gray-400">
                                    {getEvolutionStageLabel(index, line.length)}
                                  </span>
                                  <span className="max-w-full truncate text-sm font-bold leading-tight">
                                    {stageEntry?.displayName ??
                                      titleCasePokemonName(stage.name)}
                                  </span>
                                  {stageType && (
                                    <span
                                      className="mt-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase text-white"
                                      style={{ backgroundColor: typeColor }}
                                    >
                                      {stageType}
                                    </span>
                                  )}
                                  {isCurrentStage && (
                                    <span className="mt-1 rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                                      Current
                                    </span>
                                  )}
                                </button>
                              </div>
                              {index < line.length - 1 && (
                                <div className="flex w-12 shrink-0 flex-col items-center justify-center gap-1 text-center sm:w-16">
                                  <p className="max-w-full break-words text-[9px] font-bold leading-tight text-gray-700 dark:text-gray-200 sm:text-[10px]">
                                    {line[index + 1]?.conditions.join(" or ") ||
                                      "Special"}
                                  </p>
                                  <ArrowRightIcon className="h-4 w-4 text-emerald-700 dark:text-emerald-300 sm:h-5 sm:w-5" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {shinyOwned && ownedRecord?.shiny_method && (
              <section className="flex flex-col gap-2 px-6 pb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-yellow-600 dark:text-yellow-400">
                  Shiny details
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold capitalize text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300">
                    {ownedRecord.shiny_method}
                  </span>
                  {ownedRecord.shiny_game && (
                    <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300">
                      {ownedRecord.shiny_game}
                    </span>
                  )}
                </div>
              </section>
            )}

            {availableGameOptions.length > 0 && (
              <section className="flex flex-col gap-2 px-6 pb-4">
                <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-gray-400">
                  National Dex
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {availableGameOptions.map((game) => {
                    const isRegistered = isOwnedInGame(game.id);
                    const isShinyInGame = isShinyOwnedInGame(game.id);
                    if (!isRegistered) return null;
                    const grad = GAME_GRADIENT[game.id];
                    const gradBg = grad
                      ? `linear-gradient(135deg, ${grad[0]}, ${grad[1]})`
                      : (GAME_COLORS[game.id] ?? "#6b7280");
                    return (
                      <span
                        key={game.id}
                        style={{ background: gradBg }}
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white"
                      >
                        {game.name}
                        {isShinyInGame && (
                          <SparkleIcon className="h-3 w-3 text-yellow-300" />
                        )}
                      </span>
                    );
                  })}
                  {availableGameOptions.every((g) => !isOwnedInGame(g.id)) && (
                    <p className="text-xs text-gray-400">
                      Not registered in any game
                    </p>
                  )}
                </div>
              </section>
            )}

            <hr className="border-gray-100 dark:border-gray-700" />

            {(selectedEntry.types ?? []).length > 0 &&
              (() => {
                const effectiveness = computeTypeEffectiveness(
                  selectedEntry.types ?? [],
                );
                const weaknesses = Object.entries(effectiveness)
                  .filter(([, m]) => m > 1)
                  .sort(([, a], [, b]) => b - a);
                const resistances = Object.entries(effectiveness)
                  .filter(([, m]) => m > 0 && m < 1)
                  .sort(([, a], [, b]) => a - b);
                const immunities = Object.entries(effectiveness).filter(
                  ([, m]) => m === 0,
                );
                const TypePill = ({
                  type,
                  label,
                }: {
                  type: string;
                  label?: string;
                }) => (
                  <span
                    key={type}
                    className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white"
                    style={{ backgroundColor: TYPE_COLORS[type] ?? "#888" }}
                  >
                    {type}
                    {label && <span className="opacity-80">{label}</span>}
                  </span>
                );
                return (
                  <section className="px-6 pb-4">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Type matchup
                    </h3>
                    <div className="space-y-2.5">
                      {weaknesses.length > 0 && (
                        <div>
                          <p className="mb-1.5 text-[11px] font-medium text-gray-400">
                            Weak to
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {weaknesses.map(([type, m]) => (
                              <TypePill
                                key={type}
                                type={type}
                                label={m === 4 ? "4×" : "2×"}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      {resistances.length > 0 && (
                        <div>
                          <p className="mb-1.5 text-[11px] font-medium text-gray-400">
                            Resists
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {resistances.map(([type, m]) => (
                              <TypePill
                                key={type}
                                type={type}
                                label={m === 0.25 ? "¼×" : "½×"}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      {immunities.length > 0 && (
                        <div>
                          <p className="mb-1.5 text-[11px] font-medium text-gray-400">
                            Immune to
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {immunities.map(([type]) => (
                              <TypePill key={type} type={type} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                );
              })()}

            {Object.keys(stats).length > 0 && (
              <section className="px-6 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Base stats
                  </h3>
                  <span className="text-xs font-semibold tabular-nums text-gray-400">
                    BST {totalStats}
                  </span>
                </div>
                <div className="space-y-2">
                  {Object.entries(STAT_LABELS).map(([statKey, label]) => {
                    const value = stats[statKey as keyof typeof stats] ?? 0;
                    return (
                      <div
                        key={statKey}
                        className="grid grid-cols-[36px_36px_1fr] items-center gap-2 text-xs"
                      >
                        <span className="font-semibold text-gray-500 dark:text-gray-400">
                          {label}
                        </span>
                        <span className="text-right tabular-nums text-gray-400">
                          {value}
                        </span>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                          <div
                            className="h-full rounded-full bg-blue-400"
                            style={{
                              width: `${Math.min(100, (value / 180) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <hr className="border-gray-100 dark:border-gray-700" />

            <section className="px-6 py-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Availability
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {isMythical(speciesId) && (
                  <span className="rounded-md bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
                    Mythical - event only
                  </span>
                )}
                {requiresTrade(speciesId) && (
                  <span className="rounded-md bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    Trade evolution
                  </span>
                )}
                {hasWildEncounters && (
                  <span className="rounded-md bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 dark:bg-green-950 dark:text-green-300">
                    Wild encounter data
                  </span>
                )}
                {!hasWildEncounters &&
                  !isMythical(speciesId) &&
                  !requiresTrade(speciesId) && (
                    <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      No wild encounters - check breeding or transfer
                    </span>
                  )}
                {availableWildGames.length > 0 && (
                  <span className="rounded-md bg-green-50 px-2 py-1 text-xs font-semibold text-green-600 dark:bg-green-950 dark:text-green-400">
                    Available in {availableWildGames.length} selected game
                    {availableWildGames.length === 1 ? "" : "s"}
                  </span>
                )}
                {unavailableWildGames.length > 0 && hasWildEncounters && (
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    Not wild in {unavailableWildGames.length} selected game
                    {unavailableWildGames.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            </section>

            <hr className="border-gray-100 dark:border-gray-700" />

            <section className="px-6 py-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Where to catch
                </h3>
                {encounterLocationGroups.length > 0 && (
                  <span className="text-[11px] tabular-nums text-gray-400">
                    {encounterLocationGroups.length} group
                    {encounterLocationGroups.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              {encLoading ? (
                <div className="flex flex-col gap-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700"
                    />
                  ))}
                </div>
              ) : encounterLocationGroups.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Not available in the wild
                  </p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    {isMythical(speciesId)
                      ? "Mythical — obtain via event distribution"
                      : requiresTrade(speciesId)
                        ? "Evolves via trade — catch the pre-evolution"
                        : "Check breeding, HOME transfers, or events"}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-700">
                  {encounterLocationGroups.map((group) => {
                    const groupKey = `${group.games.join("|")}:${group.locations.join("|")}`;
                    const hasAvailableGame =
                      availableGameNames.size === 0 ||
                      group.games.some((game) =>
                        gameNameMatchesAvailableGame(game, availableGameNames),
                      );
                    const collapsed =
                      collapsedEncounterGroups[groupKey] ?? !hasAvailableGame;

                    return (
                      <div key={groupKey} className="py-2 first:pt-0 last:pb-0">
                        <button
                          type="button"
                          onClick={() =>
                            setCollapsedEncounterGroups((state) => ({
                              ...state,
                              [groupKey]: !collapsed,
                            }))
                          }
                          className="flex w-full items-start justify-between gap-3 rounded-md py-1 text-left transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:hover:bg-gray-700/50"
                          aria-expanded={!collapsed}
                        >
                          <span className="min-w-0">
                            <span className="block text-xs font-semibold leading-tight text-gray-600 dark:text-gray-300">
                              {group.games.join(" / ")}
                            </span>
                            {collapsed && (
                              <span className="text-[10px] text-gray-400">
                                {group.locations.slice(0, 2).join(", ")}
                                {group.locations.length > 2
                                  ? ` +${group.locations.length - 2} more`
                                  : ""}
                              </span>
                            )}
                          </span>
                          <span className="inline-flex shrink-0 items-center gap-1 text-[10px] tabular-nums text-gray-400">
                            {group.locations.length}
                            <ChevronDownIcon
                              className={`h-3.5 w-3.5 transition-transform ${collapsed ? "-rotate-90" : ""}`}
                            />
                          </span>
                        </button>
                        {!collapsed && (
                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {group.locations.map((location) => (
                              <span
                                key={location}
                                className="rounded-md bg-gray-100 px-2 py-1 text-xs leading-tight text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                              >
                                {location}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="mt-3 text-[11px] italic text-amber-600 dark:text-amber-400">
                Encounter data can be incomplete in PokeAPI for some titles; use
                it as guidance, not a guarantee.
              </p>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
