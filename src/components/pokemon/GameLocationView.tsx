"use client";

import { useMemo, useState } from "react";
import { useGameLocations } from "@/hooks/useGameLocations";
import { usePokedexStore } from "@/store/pokedexStore";
import { CompassIcon, ListIcon, MapIcon, XIcon } from "@/components/ui";
import { GameMapView } from "@/components/pokemon/GameMapView";
import { PokemonSprite } from "@/components/pokemon/PokemonSprite";
import type { GameDexFlags, GameLocationPokemon } from "@/types/pokemon";

const EMPTY_GAME_FLAGS: Record<string, GameDexFlags> = {};

type LocationFilter = "all" | "missing" | "registered";
type MethodCategory = "all" | "wild" | "raids" | "gift";

const METHOD_CATEGORY_OPTIONS: {
  value: MethodCategory;
  label: string;
}[] = [
  { value: "all", label: "All methods" },
  { value: "wild", label: "Wild" },
  { value: "raids", label: "Raids" },
  { value: "gift", label: "Gift/Trade" },
];

type ViewMode = "list" | "map";

type Props = {
  gameId: string;
  gameName: string;
  onSelect: (
    speciesId: number,
    formName: string | null,
    contextGameId: string,
  ) => void;
};

type LocationPokemonButtonProps = {
  pokemon: GameLocationPokemon;
  registered: boolean;
  methodCategory: MethodCategory;
  methodFilter: string;
  versionFilter: string;
  onSelect: () => void;
};

function getMethodCategory(method: string): Exclude<MethodCategory, "all"> {
  const normalized = method.toLowerCase();
  if (normalized.includes("raid")) return "raids";
  if (
    normalized.includes("gift") ||
    normalized.includes("trade") ||
    normalized.includes("revive") ||
    normalized === "boxes"
  ) {
    return "gift";
  }
  return "wild";
}

function pokemonMatchesMethodCategory(
  pokemon: GameLocationPokemon,
  category: MethodCategory,
): boolean {
  if (category === "all") return true;
  return (pokemon.methods ?? []).some(
    (method) => getMethodCategory(method) === category,
  );
}

function pokemonMatchesMethod(
  pokemon: GameLocationPokemon,
  method: string,
): boolean {
  if (method === "all") return true;
  return (pokemon.methods ?? []).includes(method);
}

function pokemonMatchesVersion(
  pokemon: GameLocationPokemon,
  version: string,
): boolean {
  if (version === "all") return true;
  return (pokemon.versions ?? []).includes(version);
}

function formatVersionLabel(version: string): string {
  return version
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getDisplayMethods(
  pokemon: GameLocationPokemon,
  methodCategory: MethodCategory,
  methodFilter: string,
): string[] {
  const methods = pokemon.methods ?? [];
  if (methodFilter !== "all") {
    return methods.includes(methodFilter) ? [methodFilter] : methods;
  }
  if (methodCategory !== "all") {
    const filtered = methods.filter(
      (method) => getMethodCategory(method) === methodCategory,
    );
    return filtered.length > 0 ? filtered : methods;
  }
  return methods;
}

function getDisplayVersions(
  pokemon: GameLocationPokemon,
  versionFilter: string,
): string[] {
  const versions = pokemon.versions ?? [];
  if (versionFilter === "all") return versions;
  return versions.includes(versionFilter) ? [versionFilter] : versions;
}

function LocationPokemonButton({
  pokemon,
  registered,
  methodCategory,
  methodFilter,
  versionFilter,
  onSelect,
}: LocationPokemonButtonProps) {
  const displayMethods = getDisplayMethods(
    pokemon,
    methodCategory,
    methodFilter,
  );
  const displayVersions = getDisplayVersions(pokemon, versionFilter);
  const extraMethodCount = Math.max(0, displayMethods.length - 2);
  const extraVersionCount = Math.max(0, displayVersions.length - 2);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${pokemon.displayName}, ${
        registered ? "registered" : "missing"
      } in this game`}
      className={`group flex min-w-0 items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
        registered
          ? "border-green-200 bg-green-50 hover:border-green-300 dark:border-green-900/60 dark:bg-green-950/30"
          : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-900 dark:hover:bg-blue-950/30"
      }`}
    >
      <PokemonSprite
        src={pokemon.spriteUrl}
        alt={pokemon.displayName}
        width={40}
        height={40}
        style={{ imageRendering: "pixelated" }}
        className={`h-10 w-10 shrink-0 object-contain transition-all ${
          registered ? "" : "grayscale opacity-60"
        }`}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-bold text-gray-900 dark:text-white">
          {pokemon.displayName}
        </span>
        <span className="block text-[10px] tabular-nums text-gray-400">
          #{String(pokemon.speciesId).padStart(4, "0")}
          {pokemon.optional ? " · optional" : ""}
        </span>
        <span className="mt-1 flex min-w-0 flex-wrap gap-1">
          {displayVersions.slice(0, 2).map((version) => (
            <span
              key={version}
              className="max-w-full truncate rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold leading-none text-blue-600 dark:bg-blue-950/40 dark:text-blue-300"
            >
              {formatVersionLabel(version)}
            </span>
          ))}
          {extraVersionCount > 0 && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold leading-none text-gray-400 dark:bg-gray-800">
              +{extraVersionCount}
            </span>
          )}
          {displayMethods.slice(0, 2).map((method) => (
            <span
              key={method}
              className={`max-w-full truncate rounded px-1.5 py-0.5 text-[9px] font-bold leading-none ${
                getMethodCategory(method) === "raids"
                  ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300"
                  : getMethodCategory(method) === "gift"
                    ? "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300"
                    : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300"
              }`}
            >
              {method}
            </span>
          ))}
          {extraMethodCount > 0 && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold leading-none text-gray-400 dark:bg-gray-800">
              +{extraMethodCount}
            </span>
          )}
        </span>
        <span className="mt-1 block truncate text-[10px] leading-tight text-gray-400">
          {pokemon.levels?.[0] ? `Lv. ${pokemon.levels[0]}` : "Encounter"}
        </span>
      </span>
    </button>
  );
}

export function GameLocationView({ gameId, gameName, onSelect }: Props) {
  const { data: locations, isLoading, error } = useGameLocations(gameId);
  const gameFlags = usePokedexStore((state) => state.gameDex[gameId] ?? EMPTY_GAME_FLAGS);
  const registeredIds = useMemo(
    () => Object.entries(gameFlags).filter(([, f]) => f.owned).map(([k]) => Number(k.split("-")[0])),
    [gameFlags],
  );
  const registeredSet = useMemo(() => new Set(registeredIds), [registeredIds]);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<LocationFilter>("all");
  const [methodCategory, setMethodCategory] = useState<MethodCategory>("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [versionFilter, setVersionFilter] = useState("all");

  const filteredLocations = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return (locations ?? [])
      .map((locationGroup) => {
        const pokemon = locationGroup.pokemon.filter((entry) => {
          const registered = registeredSet.has(entry.speciesId);
          if (!pokemonMatchesMethodCategory(entry, methodCategory)) {
            return false;
          }
          if (!pokemonMatchesMethod(entry, methodFilter)) return false;
          if (!pokemonMatchesVersion(entry, versionFilter)) return false;
          if (filter === "missing" && registered) return false;
          if (filter === "registered" && !registered) return false;
          if (!normalizedQuery) return true;

          return (
            locationGroup.location.toLowerCase().includes(normalizedQuery) ||
            entry.displayName.toLowerCase().includes(normalizedQuery) ||
            String(entry.speciesId).includes(normalizedQuery) ||
            String(entry.speciesId).padStart(4, "0").includes(normalizedQuery)
          );
        });

        return { ...locationGroup, pokemon };
      })
      .filter((locationGroup) => locationGroup.pokemon.length > 0);
  }, [
    filter,
    locations,
    methodCategory,
    methodFilter,
    registeredSet,
    searchQuery,
    versionFilter,
  ]);

  const methodOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const locationGroup of locations ?? []) {
      for (const pokemon of locationGroup.pokemon) {
        for (const method of pokemon.methods ?? []) {
          counts.set(method, (counts.get(method) ?? 0) + 1);
        }
      }
    }

    return Array.from(counts.entries())
      .map(([method, count]) => ({ method, count }))
      .sort((a, b) => a.method.localeCompare(b.method));
  }, [locations]);

  const methodCategoryCounts = useMemo(() => {
    const counts: Record<MethodCategory, number> = {
      all: 0,
      wild: 0,
      raids: 0,
      gift: 0,
    };

    for (const locationGroup of locations ?? []) {
      for (const pokemon of locationGroup.pokemon) {
        counts.all += 1;
        const categories = new Set(
          (pokemon.methods ?? []).map(getMethodCategory),
        );
        for (const category of categories) {
          counts[category] += 1;
        }
      }
    }

    return counts;
  }, [locations]);

  const versionOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const locationGroup of locations ?? []) {
      for (const pokemon of locationGroup.pokemon) {
        for (const version of pokemon.versions ?? []) {
          counts.set(version, (counts.get(version) ?? 0) + 1);
        }
      }
    }

    return Array.from(counts.entries())
      .map(([version, count]) => ({ version, count }))
      .sort((a, b) => a.version.localeCompare(b.version));
  }, [locations]);

  const allPokemonKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const locationGroup of locations ?? []) {
      for (const pokemon of locationGroup.pokemon) {
        keys.add(`${pokemon.speciesId}-${pokemon.formName ?? "base"}`);
      }
    }
    return keys;
  }, [locations]);

  const totalPokemon = allPokemonKeys.size;
  const dataSource = locations?.find((location) => location.source)?.source;
  const confidence = locations?.find(
    (location) => location.confidence,
  )?.confidence;
  const registeredPokemon = useMemo(() => {
    const registered = new Set<number>();
    for (const locationGroup of locations ?? []) {
      for (const pokemon of locationGroup.pokemon) {
        if (registeredSet.has(pokemon.speciesId)) {
          registered.add(pokemon.speciesId);
        }
      }
    }
    return registered.size;
  }, [locations, registeredSet]);
  const missingPokemon = Math.max(0, totalPokemon - registeredPokemon);
  const visiblePokemonCount = filteredLocations.reduce(
    (sum, locationGroup) => sum + locationGroup.pokemon.length,
    0,
  );
  const visibleMissingCount = filteredLocations.reduce(
    (sum, locationGroup) =>
      sum +
      locationGroup.pokemon.filter(
        (pokemon) => !registeredSet.has(pokemon.speciesId),
      ).length,
    0,
  );

  const filters: { value: LocationFilter; label: string; count: number }[] = [
    { value: "all", label: "All", count: totalPokemon },
    { value: "missing", label: "Missing", count: missingPokemon },
    { value: "registered", label: "Registered", count: registeredPokemon },
  ];
  const hasMethodFilters =
    methodCategory !== "all" ||
    methodFilter !== "all" ||
    versionFilter !== "all";

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 pb-10">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          Failed to load location data for {gameName}.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10">
      <section className="mb-5 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <CompassIcon className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-black text-gray-950 dark:text-white">
              Locations - {gameName}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              Browse seeded encounter locations and jump into Pokemon details.
            </p>
            {dataSource && (
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-md bg-blue-50 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                  {dataSource === "pokedb"
                    ? "PokeDB"
                    : dataSource === "pokeapi"
                      ? "PokéAPI"
                      : "Manual"}
                </span>
                {confidence && (
                  <span className="rounded-md bg-gray-100 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                    {confidence} confidence
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center lg:min-w-80">
            <div className="rounded-lg bg-gray-100 px-3 py-2 dark:bg-gray-800">
              <p className="text-lg font-black tabular-nums text-gray-950 dark:text-white">
                {locations?.length ?? 0}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                Locations
              </p>
            </div>
            <div className="rounded-lg bg-gray-100 px-3 py-2 dark:bg-gray-800">
              <p className="text-lg font-black tabular-nums text-gray-950 dark:text-white">
                {totalPokemon}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                Species
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-950/30">
              <p className="text-lg font-black tabular-nums text-amber-600 dark:text-amber-400">
                {missingPokemon}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600/70 dark:text-amber-300/70">
                Missing
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mb-4 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          {viewMode === "list" ? "Location List" : "Map View"}
        </span>
        <div
          className="flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800"
          aria-label="Switch between list and map view"
        >
          <button
            type="button"
            onClick={() => setViewMode("list")}
            aria-pressed={viewMode === "list"}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              viewMode === "list"
                ? "bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <ListIcon className="h-3.5 w-3.5" />
            List
          </button>
          <button
            type="button"
            onClick={() => setViewMode("map")}
            aria-pressed={viewMode === "map"}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              viewMode === "map"
                ? "bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <MapIcon className="h-3.5 w-3.5" />
            Map
          </button>
        </div>
      </div>

      {viewMode === "map" ? (
        <GameMapView
          gameId={gameId}
          locations={locations ?? []}
          registeredIds={registeredIds}
          onSelect={onSelect}
        />
      ) : (
        <>
      <div className="mb-4 space-y-2">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-sm">
            <label htmlFor="location-search" className="sr-only">
              Search locations or Pokemon
            </label>
            <input
              id="location-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search location or Pokemon"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 pr-8 text-sm text-gray-700 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-950"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear location search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:hover:text-gray-200"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div
            className="flex w-fit rounded-lg bg-gray-100 p-1 dark:bg-gray-800"
            aria-label="Location completion filter"
          >
            {filters.map(({ value, label, count }) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filter === value
                    ? "bg-blue-500 text-white"
                    : "text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
                }`}
              >
                {label}{" "}
                <span className="tabular-nums opacity-75">({count})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div
            className="grid w-full grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 min-[520px]:flex min-[520px]:w-fit dark:bg-gray-800"
            aria-label="Encounter method category filter"
          >
            {METHOD_CATEGORY_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMethodCategory(value)}
                aria-pressed={methodCategory === value}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  methodCategory === value
                    ? value === "raids"
                      ? "bg-red-500 text-white"
                      : "bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900"
                    : "text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
                }`}
              >
                {label}{" "}
                <span className="tabular-nums opacity-75">
                  ({methodCategoryCounts[value]})
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 min-[520px]:flex-row min-[520px]:items-center">
            {versionOptions.length > 0 && (
              <>
                <label htmlFor="version-filter" className="sr-only">
                  Filter by version
                </label>
                <select
                  id="version-filter"
                  value={versionFilter}
                  onChange={(event) => setVersionFilter(event.target.value)}
                  className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-blue-400 dark:focus:ring-blue-950"
                >
                  <option value="all">Any version</option>
                  {versionOptions.map(({ version, count }) => (
                    <option key={version} value={version}>
                      {formatVersionLabel(version)} ({count})
                    </option>
                  ))}
                </select>
              </>
            )}

            <label htmlFor="method-filter" className="sr-only">
              Filter by encounter method
            </label>
            <select
              id="method-filter"
              value={methodFilter}
              onChange={(event) => setMethodFilter(event.target.value)}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-blue-400 dark:focus:ring-blue-950"
            >
              <option value="all">Any method</option>
              {methodOptions.map(({ method, count }) => (
                <option key={method} value={method}>
                  {method} ({count})
                </option>
              ))}
            </select>

            {hasMethodFilters && (
              <button
                type="button"
                onClick={() => {
                  setMethodCategory("all");
                  setMethodFilter("all");
                  setVersionFilter("all");
                }}
                className="h-9 rounded-lg px-3 text-sm font-medium text-gray-500 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Clear methods
              </button>
            )}
          </div>
        </div>

        {!isLoading && (locations ?? []).length > 0 && (
          <p className="text-xs font-medium text-gray-400">
            Showing{" "}
            <span className="tabular-nums text-gray-600 dark:text-gray-300">
              {filteredLocations.length}
            </span>{" "}
            locations and{" "}
            <span className="tabular-nums text-gray-600 dark:text-gray-300">
              {visiblePokemonCount}
            </span>{" "}
            Pokemon
            {visibleMissingCount > 0 ? (
              <>
                {" "}
                -{" "}
                <span className="tabular-nums text-amber-600 dark:text-amber-400">
                  {visibleMissingCount}
                </span>{" "}
                missing
              </>
            ) : null}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800"
            />
          ))}
        </div>
      ) : (locations ?? []).length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center dark:border-gray-800">
          <p className="text-sm font-bold text-gray-600 dark:text-gray-300">
            No location data seeded for this game yet.
          </p>
          <p className="mx-auto mt-1 max-w-xl text-sm text-gray-500 dark:text-gray-400">
            Encounter coverage depends on the seeded PokéAPI and curated data.
            This game can still be tracked through its National Dex.
          </p>
        </div>
      ) : filteredLocations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center dark:border-gray-800">
          <p className="text-sm font-bold text-gray-600 dark:text-gray-300">
            No locations match this view.
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Try clearing search or switching the filters.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLocations.map((locationGroup) => {
            const missingInLocation = locationGroup.pokemon.filter(
              (pokemon) => !registeredSet.has(pokemon.speciesId),
            ).length;

            return (
              <section
                key={locationGroup.location}
                className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-black text-gray-950 dark:text-white">
                    {locationGroup.location}
                  </h3>
                  <span className="text-xs tabular-nums text-gray-400">
                    {locationGroup.pokemon.length} species · {missingInLocation}{" "}
                    missing
                    {locationGroup.areaCount && locationGroup.areaCount > 1
                      ? ` · ${locationGroup.areaCount} areas`
                      : ""}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {locationGroup.pokemon.map((pokemon) => (
                    <LocationPokemonButton
                      key={`${locationGroup.location}-${pokemon.speciesId}-${pokemon.formName ?? "base"}`}
                      pokemon={pokemon}
                      registered={registeredSet.has(pokemon.speciesId)}
                      methodCategory={methodCategory}
                      methodFilter={methodFilter}
                      versionFilter={versionFilter}
                      onSelect={() =>
                        onSelect(pokemon.speciesId, pokemon.formName, gameId)
                      }
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-[11px] italic text-amber-600 dark:text-amber-400">
        Encounter data can be incomplete in PokéAPI for some titles; use it as
        guidance, not a guarantee.
      </p>
        </>
      )}
    </div>
  );
}
