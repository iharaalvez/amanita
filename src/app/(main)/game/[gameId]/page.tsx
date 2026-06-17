"use client";

import { useState } from "react";
import { notFound, useParams } from "next/navigation";
import { GameDexView } from "@/components/pokemon/GameDexView";
import { GameHomeBoxView } from "@/components/pokemon/GameHomeBoxView";
import { GameLocationView } from "@/components/pokemon/GameLocationView";
import { getGameById, getDlcGames } from "@/config/games";
import { useOpenPokemon } from "@/hooks/useOpenPokemon";

type Tab =
  | "dex"
  | "boxes"
  | "locations"
  | `dlc-${string}-dex`
  | `dlc-${string}-boxes`;

export default function GamePage() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;
  const [activeTab, setActiveTab] = useState<Tab>("dex");
  const openPokemon = useOpenPokemon();

  const game = getGameById(gameId);
  if (!game) notFound();

  const dlcGames = getDlcGames(gameId);

  type TabConfig = { id: Tab; label: string };
  const tabs: TabConfig[] = [
    { id: "dex", label: "National Dex" },
    { id: "boxes", label: "National Dex Boxes" },
    ...dlcGames.flatMap((dlc) => [
      { id: `dlc-${dlc.id}-dex` as Tab, label: `${dlc.name} Dex` },
      { id: `dlc-${dlc.id}-boxes` as Tab, label: `${dlc.name} Boxes` },
    ]),
    { id: "locations", label: "Locations" },
  ];

  const activeDlcGame = dlcGames.find(
    (dlc) =>
      activeTab === `dlc-${dlc.id}-dex` ||
      activeTab === `dlc-${dlc.id}-boxes`,
  );

  return (
    <div>
      <div className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 px-2 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95 sm:px-4">
        <div className="flex gap-1 overflow-x-auto pt-1.5 sm:pt-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 rounded-t-lg px-3 py-2 text-xs font-semibold transition-colors sm:px-4 sm:text-sm ${
                activeTab === tab.id
                  ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {tab.label}
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
        ) : activeTab === "boxes" ? (
          <GameHomeBoxView
            gameId={gameId}
            gameName={game.name}
            onSelect={(speciesId, formName, contextGameId) =>
              openPokemon(speciesId, formName, contextGameId)
            }
          />
        ) : activeDlcGame && activeTab === `dlc-${activeDlcGame.id}-dex` ? (
          <GameDexView
            gameId={activeDlcGame.id}
            onSelect={(speciesId, formName, contextGameId) =>
              openPokemon(speciesId, formName, contextGameId)
            }
          />
        ) : activeDlcGame && activeTab === `dlc-${activeDlcGame.id}-boxes` ? (
          <GameHomeBoxView
            gameId={activeDlcGame.id}
            gameName={activeDlcGame.name}
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
