"use client";

import { HomeBoxView } from "@/components/pokemon/HomeBoxView";
import { useOpenPokemon } from "@/hooks/useOpenPokemon";

export default function HomePage() {
  const openPokemon = useOpenPokemon();

  return (
    <div className="pt-2 sm:pt-4">
      <HomeBoxView
        onSelect={(speciesId, formName) => openPokemon(speciesId, formName)}
      />
    </div>
  );
}
