"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useMapOutlines } from "@/hooks/useMapOutlines";
import { PokemonSprite } from "@/components/pokemon/PokemonSprite";
import { ArrowUpRightIcon } from "@/components/ui";
import type { GameLocationGroup, MapLocationOutline } from "@/types/pokemon";

type LeafletProps = {
  gameId: string;
  outlines: MapLocationOutline[];
  locations: GameLocationGroup[];
  registeredIds: readonly number[];
  selectedRegion: string | null;
  onZoneClick: (location: GameLocationGroup) => void;
};

const LeafletMap = dynamic<LeafletProps>(
  () => import("./GameMapLeaflet"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-slate-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    ),
  },
);

type Props = {
  gameId: string;
  locations: GameLocationGroup[];
  registeredIds: readonly number[];
  onSelect: (speciesId: number, formName: string | null, gameId: string) => void;
};

const GAME_REGION_ORDER: Record<string, string[]> = {
  "scarlet-violet": ["paldea", "kitakami", "blueberry-academy"],
};

type ExternalMapConfig = {
  title: string;
  embedUrl: string;
  sourceUrl: string;
};

const EXTERNAL_GAME_MAPS: Record<string, ExternalMapConfig> = {
  pla: {
    title: "Legends: Arceus Hisui Region",
    embedUrl:
      "https://mapgenie.io/pokemon-legends-arceus/maps/hisui-region?embed=light",
    sourceUrl: "https://mapgenie.io/pokemon-legends-arceus/maps/hisui-region",
  },
  "legends-za": {
    title: "Legends: Z-A Lumiose City",
    embedUrl:
      "https://mapgenie.io/pokemon-legends-z-a/maps/lumiose-city?embed=light",
    sourceUrl: "https://mapgenie.io/pokemon-legends-z-a/maps/lumiose-city",
  },
};

function formatRegionLabel(identifier: string): string {
  return identifier
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function GameMapView({
  gameId,
  locations,
  registeredIds,
  onSelect,
}: Props) {
  const { data: outlines, isLoading, error } = useMapOutlines(gameId);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [activeLocation, setActiveLocation] =
    useState<GameLocationGroup | null>(null);

  const externalMap = EXTERNAL_GAME_MAPS[gameId];
  const registeredSet = useMemo(() => new Set(registeredIds), [registeredIds]);

  const regions = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const outline of outlines ?? []) {
      if (
        outline.regionAreaIdentifier &&
        !seen.has(outline.regionAreaIdentifier)
      ) {
        seen.add(outline.regionAreaIdentifier);
        list.push(outline.regionAreaIdentifier);
      }
    }
    const preferredOrder = GAME_REGION_ORDER[gameId] ?? [];
    return list.sort((a, b) => {
      const aIndex = preferredOrder.indexOf(a);
      const bIndex = preferredOrder.indexOf(b);
      if (aIndex !== -1 || bIndex !== -1) {
        return (
          (aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex) -
          (bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex)
        );
      }
      return a.localeCompare(b);
    });
  }, [gameId, outlines]);

  const activeRegion = selectedRegion ?? regions[0] ?? null;

  if (externalMap) {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <div>
            <h3 className="text-sm font-black text-gray-950 dark:text-white">
              {externalMap.title}
            </h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Interactive map embedded from MapGenie.
            </p>
          </div>
          <a
            href={externalMap.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 transition-colors hover:border-blue-300 hover:text-blue-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-800 dark:hover:text-blue-300"
          >
            Open full map
            <ArrowUpRightIcon className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="h-[520px] bg-gray-100 dark:bg-gray-950 lg:h-[640px]">
          <iframe
            title={`${externalMap.title} map`}
            src={externalMap.embedUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-full w-full border-0"
          />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-[520px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Loading map data…
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
        Failed to load map data.
      </div>
    );
  }

  if (!outlines?.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center dark:border-gray-800">
        <p className="text-sm font-bold text-gray-600 dark:text-gray-300">
          No map data seeded for this game yet.
        </p>
        <p className="mx-auto mt-1 max-w-lg text-sm text-gray-500 dark:text-gray-400">
          Location outline data will appear here once imported. The Locations
          list tab above still works via encounter data.
        </p>
      </div>
    );
  }

  const missing = activeLocation
    ? activeLocation.pokemon.filter((p) => !registeredSet.has(p.speciesId))
        .length
    : 0;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
      {regions.length > 1 && (
        <div
          className="flex flex-wrap gap-1 border-b border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-900"
          aria-label="Select map region"
        >
          {regions.map((region) => (
            <button
              key={region}
              type="button"
              onClick={() => setSelectedRegion(region)}
              aria-pressed={activeRegion === region}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeRegion === region
                  ? "bg-blue-500 text-white"
                  : "text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
              }`}
            >
              {formatRegionLabel(region)}
            </button>
          ))}
        </div>
      )}

      <div className="relative isolate h-[520px] overflow-hidden bg-[radial-gradient(circle_at_center,_#0f1b2f_0%,_#07111f_72%)] lg:h-[640px]">
        <div className="absolute inset-0 z-0">
          <LeafletMap
            gameId={gameId}
            outlines={outlines}
            locations={locations}
            registeredIds={registeredIds}
            selectedRegion={activeRegion}
            onZoneClick={setActiveLocation}
          />
        </div>

        {activeLocation && (
          <div className="absolute right-0 top-0 z-20 flex h-full w-72 max-w-[85%] flex-col bg-slate-900/95 shadow-xl backdrop-blur-sm">
            <div className="flex items-start justify-between border-b border-slate-700 px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {activeLocation.location}
                </h3>
                {missing > 0 && (
                  <p className="mt-0.5 text-xs text-amber-400">
                    {missing} missing
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActiveLocation(null)}
                className="ml-2 mt-0.5 text-slate-400 hover:text-white"
                aria-label="Close"
              >
                X
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-4 gap-1">
                {activeLocation.pokemon.map((pokemon) => {
                  const isRegistered = registeredSet.has(pokemon.speciesId);
                  return (
                    <button
                      key={`${pokemon.speciesId}-${pokemon.formName ?? "base"}`}
                      type="button"
                      onClick={() =>
                        onSelect(
                          pokemon.speciesId,
                          pokemon.formName ?? null,
                          gameId,
                        )
                      }
                      title={pokemon.displayName}
                      className="flex flex-col items-center gap-0.5 rounded-lg p-1.5 transition-colors hover:bg-slate-700"
                      style={{ opacity: isRegistered ? 1 : 0.4 }}
                    >
                      <PokemonSprite
                        src={pokemon.spriteUrl}
                        alt={pokemon.displayName}
                        width={40}
                        height={40}
                        className="h-10 w-10"
                        style={{ imageRendering: "pixelated" }}
                      />
                      <span className="w-full truncate text-center text-[10px] text-slate-300">
                        {pokemon.displayName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-gray-200 bg-white px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
        <span className="flex items-center gap-1.5 text-xs">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />
          <span className="text-gray-500 dark:text-gray-400">Has missing</span>
        </span>
        <span className="flex items-center gap-1.5 text-xs">
          <span className="h-2.5 w-2.5 rounded-sm bg-green-500" />
          <span className="text-gray-500 dark:text-gray-400">Complete</span>
        </span>
        <span className="flex items-center gap-1.5 text-xs">
          <span className="h-2.5 w-2.5 rounded-sm bg-slate-500" />
          <span className="text-gray-500 dark:text-gray-400">Not tracked</span>
        </span>
        <span className="ml-auto text-[11px] text-gray-400">
          Click a zone to see Pokémon · Scroll or pinch to zoom
        </span>
      </div>
    </div>
  );
}

