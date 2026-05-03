export type CosmeticFormConfig = {
  speciesId: number;
  apiName: string; // PokéAPI pokemon name (e.g. 'oricorio-pompom')
  displayName: string; // Shown in the app
  label: string; // Short badge text
};

const unownLetters: CosmeticFormConfig[] = "bcdefghijklmnopqrstuvwxyz"
  .split("")
  .map((l) => ({
    speciesId: 201,
    apiName: `unown-${l}`,
    displayName: `Unown ${l.toUpperCase()}`,
    label: l.toUpperCase(),
  }));

export const COSMETIC_FORMS: CosmeticFormConfig[] = [
  // --- Unown (201) ---
  ...unownLetters,
  {
    speciesId: 201,
    apiName: "unown-exclamation",
    displayName: "Unown !",
    label: "!",
  },
  {
    speciesId: 201,
    apiName: "unown-question",
    displayName: "Unown ?",
    label: "?",
  },

  // --- Castform (351) ---
  {
    speciesId: 351,
    apiName: "castform-sunny",
    displayName: "Castform Sunny",
    label: "Sunny",
  },
  {
    speciesId: 351,
    apiName: "castform-rainy",
    displayName: "Castform Rainy",
    label: "Rainy",
  },
  {
    speciesId: 351,
    apiName: "castform-snowy",
    displayName: "Castform Snowy",
    label: "Snowy",
  },

  // --- Deoxys (386) ---
  {
    speciesId: 386,
    apiName: "deoxys-attack",
    displayName: "Deoxys Attack",
    label: "Attack",
  },
  {
    speciesId: 386,
    apiName: "deoxys-defense",
    displayName: "Deoxys Defense",
    label: "Defense",
  },
  {
    speciesId: 386,
    apiName: "deoxys-speed",
    displayName: "Deoxys Speed",
    label: "Speed",
  },

  // --- Wormadam (413) ---
  {
    speciesId: 413,
    apiName: "wormadam-sandy",
    displayName: "Wormadam Sandy",
    label: "Sandy",
  },
  {
    speciesId: 413,
    apiName: "wormadam-trash",
    displayName: "Wormadam Trash",
    label: "Trash",
  },

  // --- Rotom (479) ---
  {
    speciesId: 479,
    apiName: "rotom-heat",
    displayName: "Rotom Heat",
    label: "Heat",
  },
  {
    speciesId: 479,
    apiName: "rotom-wash",
    displayName: "Rotom Wash",
    label: "Wash",
  },
  {
    speciesId: 479,
    apiName: "rotom-frost",
    displayName: "Rotom Frost",
    label: "Frost",
  },
  {
    speciesId: 479,
    apiName: "rotom-fan",
    displayName: "Rotom Fan",
    label: "Fan",
  },
  {
    speciesId: 479,
    apiName: "rotom-mow",
    displayName: "Rotom Mow",
    label: "Mow",
  },

  // --- Giratina (487) ---
  {
    speciesId: 487,
    apiName: "giratina-origin",
    displayName: "Giratina Origin",
    label: "Origin",
  },

  // --- Shaymin (492) ---
  {
    speciesId: 492,
    apiName: "shaymin-sky",
    displayName: "Shaymin Sky",
    label: "Sky",
  },

  // --- Basculin (550) ---
  {
    speciesId: 550,
    apiName: "basculin-blue-striped",
    displayName: "Basculin Blue-Striped",
    label: "Blue",
  },

  // --- Deerling / Sawsbuck seasons (585 / 586) ---
  {
    speciesId: 585,
    apiName: "deerling-summer",
    displayName: "Deerling Summer",
    label: "Summer",
  },
  {
    speciesId: 585,
    apiName: "deerling-autumn",
    displayName: "Deerling Autumn",
    label: "Autumn",
  },
  {
    speciesId: 585,
    apiName: "deerling-winter",
    displayName: "Deerling Winter",
    label: "Winter",
  },
  {
    speciesId: 586,
    apiName: "sawsbuck-summer",
    displayName: "Sawsbuck Summer",
    label: "Summer",
  },
  {
    speciesId: 586,
    apiName: "sawsbuck-autumn",
    displayName: "Sawsbuck Autumn",
    label: "Autumn",
  },
  {
    speciesId: 586,
    apiName: "sawsbuck-winter",
    displayName: "Sawsbuck Winter",
    label: "Winter",
  },

  // --- Forces of Nature Therian forms (641 / 642 / 645) ---
  {
    speciesId: 641,
    apiName: "tornadus-therian",
    displayName: "Tornadus Therian",
    label: "Therian",
  },
  {
    speciesId: 642,
    apiName: "thundurus-therian",
    displayName: "Thundurus Therian",
    label: "Therian",
  },
  {
    speciesId: 645,
    apiName: "landorus-therian",
    displayName: "Landorus Therian",
    label: "Therian",
  },

  // --- Keldeo (647) ---
  {
    speciesId: 647,
    apiName: "keldeo-resolute",
    displayName: "Keldeo Resolute",
    label: "Resolute",
  },

  // --- Meloetta (648) ---
  {
    speciesId: 648,
    apiName: "meloetta-pirouette",
    displayName: "Meloetta Pirouette",
    label: "Pirouette",
  },

  // --- Meowstic (678) ---
  {
    speciesId: 678,
    apiName: "meowstic-female",
    displayName: "Meowstic ♀",
    label: "♀",
  },

  // --- Aegislash (681) ---
  {
    speciesId: 681,
    apiName: "aegislash-blade",
    displayName: "Aegislash Blade",
    label: "Blade",
  },

  // --- Pumpkaboo / Gourgeist sizes (710 / 711) ---
  {
    speciesId: 710,
    apiName: "pumpkaboo-small",
    displayName: "Pumpkaboo Small",
    label: "Small",
  },
  {
    speciesId: 710,
    apiName: "pumpkaboo-large",
    displayName: "Pumpkaboo Large",
    label: "Large",
  },
  {
    speciesId: 710,
    apiName: "pumpkaboo-super",
    displayName: "Pumpkaboo Super",
    label: "Super",
  },
  {
    speciesId: 711,
    apiName: "gourgeist-small",
    displayName: "Gourgeist Small",
    label: "Small",
  },
  {
    speciesId: 711,
    apiName: "gourgeist-large",
    displayName: "Gourgeist Large",
    label: "Large",
  },
  {
    speciesId: 711,
    apiName: "gourgeist-super",
    displayName: "Gourgeist Super",
    label: "Super",
  },

  // --- Oricorio styles (741) ---
  {
    speciesId: 741,
    apiName: "oricorio-pom-pom",
    displayName: "Oricorio Pom-Pom",
    label: "Pom-Pom",
  },
  {
    speciesId: 741,
    apiName: "oricorio-pau",
    displayName: "Oricorio Pa'u",
    label: "Pa'u",
  },
  {
    speciesId: 741,
    apiName: "oricorio-sensu",
    displayName: "Oricorio Sensu",
    label: "Sensu",
  },

  // --- Lycanroc forms (745) ---
  {
    speciesId: 745,
    apiName: "lycanroc-midnight",
    displayName: "Lycanroc Midnight",
    label: "Midnight",
  },
  {
    speciesId: 745,
    apiName: "lycanroc-dusk",
    displayName: "Lycanroc Dusk",
    label: "Dusk",
  },

  // --- Wishiwashi (746) ---
  {
    speciesId: 746,
    apiName: "wishiwashi-school",
    displayName: "Wishiwashi School",
    label: "School",
  },

  // --- Necrozma fusions (800) ---
  {
    speciesId: 800,
    apiName: "necrozma-dusk",
    displayName: "Necrozma Dusk Mane",
    label: "Dusk Mane",
  },
  {
    speciesId: 800,
    apiName: "necrozma-dawn",
    displayName: "Necrozma Dawn Wings",
    label: "Dawn Wings",
  },
  {
    speciesId: 800,
    apiName: "necrozma-ultra",
    displayName: "Ultra Necrozma",
    label: "Ultra",
  },

  // --- Zacian / Zamazenta Crowned (888 / 889) ---
  {
    speciesId: 888,
    apiName: "zacian-crowned",
    displayName: "Zacian Crowned",
    label: "Crowned",
  },
  {
    speciesId: 889,
    apiName: "zamazenta-crowned",
    displayName: "Zamazenta Crowned",
    label: "Crowned",
  },

  // --- Toxtricity (849) ---
  {
    speciesId: 849,
    apiName: "toxtricity-low-key",
    displayName: "Toxtricity Low Key",
    label: "Low Key",
  },

  // --- Eiscue (875) ---
  {
    speciesId: 875,
    apiName: "eiscue-noice",
    displayName: "Eiscue No Ice",
    label: "No Ice",
  },

  // --- Indeedee (876) ---
  {
    speciesId: 876,
    apiName: "indeedee-female",
    displayName: "Indeedee ♀",
    label: "♀",
  },

  // --- Morpeko (877) ---
  {
    speciesId: 877,
    apiName: "morpeko-hangry",
    displayName: "Morpeko Hangry",
    label: "Hangry",
  },

  // --- Urshifu (892) ---
  {
    speciesId: 892,
    apiName: "urshifu-rapid-strike",
    displayName: "Urshifu Rapid Strike",
    label: "Rapid",
  },

  // --- Calyrex fusions (898) ---
  {
    speciesId: 898,
    apiName: "calyrex-ice",
    displayName: "Calyrex Ice Rider",
    label: "Ice Rider",
  },
  {
    speciesId: 898,
    apiName: "calyrex-shadow",
    displayName: "Calyrex Shadow Rider",
    label: "Shadow",
  },

  // --- Palafin (964) ---
  {
    speciesId: 964,
    apiName: "palafin-hero",
    displayName: "Palafin Hero",
    label: "Hero",
  },

  // --- Gimmighoul (999) ---
  {
    speciesId: 999,
    apiName: "gimmighoul-roaming",
    displayName: "Gimmighoul Roaming",
    label: "Roaming",
  },
];

export const COSMETIC_FORM_KEYS = new Set(
  COSMETIC_FORMS.map((f) => `${f.speciesId}-${f.apiName}`),
);
