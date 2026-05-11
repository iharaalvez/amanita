"use client";

import { useLivingDexEntries } from "@/hooks/usePokemon";
import { useUIStore } from "@/store/uiStore";

export function useOpenPokemon() {
  const { data: livingDexEntries } = useLivingDexEntries();
  const openPokemon = useUIStore((s) => s.openPokemon);

  return (
    speciesId: number,
    formName: string | null,
    contextGameId?: string,
  ) => {
    const entry = livingDexEntries?.find(
      (e) => e.speciesId === speciesId && e.formName === formName,
    );
    openPokemon(entry?.id ?? speciesId, speciesId, formName, contextGameId);
  };
}
