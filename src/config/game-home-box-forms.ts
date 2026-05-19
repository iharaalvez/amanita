type SpeciesFormKey = string | null;

// Per-game overrides for HOME transfer box forms. These are stricter than the
// National Dex rows because HOME reward tracking cares about the exact
// obtainable forms from that game.
export const GAME_HOME_BOX_FORM_ALLOWLIST: Record<
  string,
  Record<number, readonly SpeciesFormKey[]>
> = {
  "legends-za": {
    // Caps are event-only and not obtainable from Legends: Z-A.
    25: [null, "pikachu-female"],
    // Normal, Marine, and Jungle patterns are obtainable in Legends: Z-A.
    666: [null, "vivillon-marine", "vivillon-jungle"],
    // Battle/regional/cell-count variants not kept as separate Z-A HOME slots.
    681: [null],
    713: [null],
    718: [null],
  },
};

export function isAllowedGameHomeBoxForm(
  gameId: string,
  speciesId: number,
  formName: string | null,
): boolean {
  const speciesAllowlist = GAME_HOME_BOX_FORM_ALLOWLIST[gameId]?.[speciesId];
  if (!speciesAllowlist) return true;
  return speciesAllowlist.includes(formName);
}
