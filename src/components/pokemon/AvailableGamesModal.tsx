"use client";

import { usePokedexStore } from "@/store/pokedexStore";
import { GAME_LIST, getGamesByGeneration } from "@/config/games";
import { CheckIcon, XIcon } from "@/components/ui";

const GEN_LABELS: Record<number, string> = {
  1: "Generation I",
  2: "Generation II",
  3: "Generation III",
  4: "Generation IV",
  5: "Generation V",
  6: "Generation VI",
  7: "Generation VII",
  8: "Generation VIII",
  9: "Generation IX",
};

type Props = {
  onClose: () => void;
};

export function AvailableGamesModal({ onClose }: Props) {
  const availableGames = usePokedexStore((state) => state.availableGames);
  const setGameAvailable = usePokedexStore((state) => state.setGameAvailable);
  const gamesByGen = getGamesByGeneration(GAME_LIST);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Manage available games"
        className="max-h-[82vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 shadow-2xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              My Games
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Choose which games you own or want to track.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {gamesByGen.map(([generation, games]) => (
            <section key={generation}>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {GEN_LABELS[generation]}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {games.map((game) => {
                  const checked = !!availableGames[game.id];
                  return (
                    <button
                      key={game.id}
                      type="button"
                      onClick={() => setGameAvailable(game.id, !checked)}
                      aria-pressed={checked}
                      className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                        checked
                          ? "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      }`}
                    >
                      <span className="block truncate text-sm font-semibold">
                        {game.name}
                      </span>
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          checked
                            ? "border-green-400 bg-green-400 text-white"
                            : "border-gray-300 text-transparent"
                        }`}
                      >
                        <CheckIcon className="h-3 w-3" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
