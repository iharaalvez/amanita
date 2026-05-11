import { create } from "zustand";

type SelectedPokemon = {
  pokemonId: number;
  speciesId: number;
  formName: string | null;
  contextGameId?: string;
};

type UIState = {
  selectedPokemon: SelectedPokemon | null;
  openPokemon: (
    pokemonId: number,
    speciesId: number,
    formName: string | null,
    contextGameId?: string,
  ) => void;
  closePokemon: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  selectedPokemon: null,
  openPokemon: (pokemonId, speciesId, formName, contextGameId) =>
    set({ selectedPokemon: { pokemonId, speciesId, formName, contextGameId } }),
  closePokemon: () => set({ selectedPokemon: null }),
}));
