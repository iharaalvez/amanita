"use client";

import { useMemo, useState } from "react";
import { notFound, useParams } from "next/navigation";
import { GameDexView } from "@/components/pokemon/GameDexView";
import { GameLocationView } from "@/components/pokemon/GameLocationView";
import { PokemonSprite } from "@/components/pokemon/PokemonSprite";
import { CheckIcon, CompassIcon } from "@/components/ui";
import { getGameById } from "@/config/games";
import { useGamePokedex } from "@/hooks/useGamePokedex";
import { useOpenPokemon } from "@/hooks/useOpenPokemon";
import { usePokedexStore } from "@/store/pokedexStore";
import type { GameDexEntry, GameDexFlags } from "@/types/pokemon";

type Tab = "dex" | "guide" | "locations";

const EMPTY_GAME_FLAGS: Record<string, GameDexFlags> = {};

type HuntGuideProps = {
  gameId: string;
  gameName: string;
  onSelect: (
    speciesId: number,
    formName: string | null,
    contextGameId: string,
  ) => void;
};

function HuntTargetCard({
  entry,
  gameId,
  onSelect,
}: {
  entry: GameDexEntry;
  gameId: string;
  onSelect: HuntGuideProps["onSelect"];
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(entry.speciesId, entry.formName, gameId)}
      className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-900 dark:hover:bg-blue-950/30"
    >
      <PokemonSprite
        src={entry.spriteUrl}
        alt={entry.displayName}
        width={56}
        height={56}
        style={{ imageRendering: "pixelated" }}
        className="h-14 w-14 shrink-0 object-contain"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] tabular-nums text-gray-400">
          #{String(entry.entryNumber).padStart(3, "0")} / Nat. #
          {String(entry.speciesId).padStart(4, "0")}
        </span>
        <span className="block truncate text-sm font-bold text-gray-900 dark:text-white">
          {entry.displayName}
        </span>
        <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
          Open details for catch locations
        </span>
      </span>
    </button>
  );
}

function HuntGuideView({ gameId, gameName, onSelect }: HuntGuideProps) {
  const { data: gameDex, isLoading, error } = useGamePokedex(gameId);
  const gameFlags = usePokedexStore((state) => state.gameDex[gameId] ?? EMPTY_GAME_FLAGS);
  const registeredSet = useMemo(
    () => new Set(Object.entries(gameFlags).filter(([, f]) => f.owned).map(([k]) => Number(k.split("-")[0]))),
    [gameFlags],
  );

  const targets = useMemo(
    () =>
      (gameDex ?? []).filter(
        (entry) => !entry.optional && !registeredSet.has(entry.speciesId),
      ),
    [gameDex, registeredSet],
  );
  const total = gameDex?.filter((entry) => !entry.optional).length ?? 0;
  const registered = Math.min(registeredSet.size, total);
  const missing = Math.max(0, total - registered);
  const nextTargets = targets.slice(0, 12);

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 pb-10">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          Failed to load hunt recommendations for {gameName}.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10">
      <section className="mb-5 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <CompassIcon className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-black text-gray-950 dark:text-white">
              Hunt Guide - {gameName}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              Start with missing Pokemon from this National Dex.
            </p>
          </div>
          {total > 0 && (
            <div className="grid grid-cols-3 gap-2 text-center sm:min-w-72">
              <div className="rounded-lg bg-gray-100 px-3 py-2 dark:bg-gray-800">
                <p className="text-lg font-black tabular-nums text-gray-950 dark:text-white">
                  {registered}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  Registered
                </p>
              </div>
              <div className="rounded-lg bg-gray-100 px-3 py-2 dark:bg-gray-800">
                <p className="text-lg font-black tabular-nums text-gray-950 dark:text-white">
                  {total}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  Total
                </p>
              </div>
              <div className="rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-950/30">
                <p className="text-lg font-black tabular-nums text-amber-600 dark:text-amber-400">
                  {missing}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600/70 dark:text-amber-300/70">
                  Missing
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <div
              key={index}
              className="h-20 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800"
            />
          ))}
        </div>
      ) : targets.length === 0 ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-8 text-center dark:border-green-900/60 dark:bg-green-950/30">
          <CheckIcon className="mx-auto mb-3 h-8 w-8 text-green-500" />
          <p className="text-sm font-bold text-green-700 dark:text-green-300">
            This game dex is complete.
          </p>
          <p className="mt-1 text-xs text-green-700/70 dark:text-green-300/70">
            Nothing missing here. Beautiful little victory screen.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-black uppercase tracking-wide text-gray-700 dark:text-gray-200">
              Next Targets
            </h3>
            <span className="text-xs tabular-nums text-gray-400">
              {nextTargets.length}/{targets.length}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {nextTargets.map((entry) => (
              <HuntTargetCard
                key={`${entry.speciesId}-${entry.formName ?? "base"}`}
                entry={entry}
                gameId={gameId}
                onSelect={onSelect}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function GamePage() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;
  const [activeTab, setActiveTab] = useState<Tab>("dex");
  const openPokemon = useOpenPokemon();

  const game = getGameById(gameId);
  if (!game) notFound();

  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 px-4 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
        <div className="flex gap-1 pt-2">
          {(["dex", "guide", "locations"] as Tab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {tab === "dex"
                ? "National Dex"
                : tab === "guide"
                  ? "Hunt Guide"
                  : "Locations"}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4">
        {activeTab === "dex" ? (
          <GameDexView
            gameId={gameId}
            onSelect={(speciesId, formName, contextGameId) =>
              openPokemon(speciesId, formName, contextGameId)
            }
          />
        ) : activeTab === "guide" ? (
          <HuntGuideView
            gameId={gameId}
            gameName={game.name}
            onSelect={(speciesId, formName, contextGameId) =>
              openPokemon(speciesId, formName, contextGameId)
            }
          />
        ) : (
          <GameLocationView
            gameId={gameId}
            gameName={game.name}
            onSelect={(speciesId, formName, contextGameId) =>
              openPokemon(speciesId, formName, contextGameId)
            }
          />
        )}
      </div>
    </div>
  );
}
