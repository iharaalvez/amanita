"use client";

import { GameDexView } from "@/components/pokemon/GameDexView";
import { useOpenPokemon } from "@/hooks/useOpenPokemon";

export default function GamePage() {
  const openPokemon = useOpenPokemon();

  return (
    <GameDexView
      onSelect={(speciesId, formName, gameId) =>
        openPokemon(speciesId, formName, gameId)
      }
    />
  );
}
