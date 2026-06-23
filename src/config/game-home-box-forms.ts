type SpeciesFormKey = string | null;

// Per-game overrides for HOME transfer box forms. These are stricter than the
// National Dex rows because HOME reward tracking cares about the exact
// obtainable forms from that game.
export const GAME_HOME_BOX_FORM_ALLOWLIST: Record<
  string,
  Record<number, readonly SpeciesFormKey[]>
> = {
  "scarlet-violet": {
    // Cap Pikachu are event-only, not Scarlet/Violet-origin HOME box slots.
    25: [null, "pikachu-female"],
    // White Stripe Basculin is PLA-exclusive (evolves to Basculegion); only Red and Blue are in SV.
    550: [null, "basculin-blue-striped"],
    // Base Vivillon uses the Meadow/default sprite, so do not duplicate it as vivillon-meadow.
    // SV supports Fancy plus postcard patterns, but not the event-only Poke Ball pattern.
    666: [
      null,
      "vivillon-fancy",
      "vivillon-icy-snow",
      "vivillon-polar",
      "vivillon-tundra",
      "vivillon-continental",
      "vivillon-garden",
      "vivillon-elegant",
      "vivillon-modern",
      "vivillon-marine",
      "vivillon-archipelago",
      "vivillon-high-plains",
      "vivillon-sandstorm",
      "vivillon-river",
      "vivillon-monsoon",
      "vivillon-savanna",
      "vivillon-sun",
      "vivillon-ocean",
      "vivillon-jungle",
    ],
    // Eternal Flower was never distributed; Paldea has the regular flower colors.
    670: [
      null,
      "floette-yellow",
      "floette-orange",
      "floette-blue",
      "floette-white",
    ],
    // Roaming Form is visible in SV overworld coin encounters, but not catchable/boxable.
    999: [null],
  },
  "pla": {
    // Cap Pikachu are event-only, not PLA-origin HOME box slots.
    25: [null, "pikachu-female"],
    // The numbered Hisui dex Vulpix/Ninetales entries are the Alolan request forms.
    37: ["vulpix-alola"],
    38: ["ninetales-alola"],
    // Only White Stripe Basculin is in Hisui; Red and Blue Stripe are not obtainable in PLA.
    550: ["basculin-white-striped"],
    // Bloodmoon Ursaluna is from Scarlet/Violet DLC, not PLA.
    901: [null],
  },
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
