// Source: Bulbapedia. Covers base game + DLC exclusives.
// Excludes: form-only differences sharing the same species ID (Basculin, Shellos,
// Kyurem formes, etc.) and event/raid-only encounters.
// Single-title releases (Yellow, Crystal, Emerald, Platinum, PLA, Legends: Z-A)
// have no paired counterpart and are intentionally absent.

export type VersionExclusives = {
  versions: readonly [string, string];
  exclusives: Record<string, readonly number[]>;
};

export const VERSION_EXCLUSIVES: Record<string, VersionExclusives> = {
  "red-blue": {
    versions: ["Red", "Blue"],
    exclusives: {
      Red: [23, 24, 43, 44, 45, 56, 57, 58, 59, 123, 125],
      Blue: [27, 28, 37, 38, 52, 53, 69, 70, 71, 126, 127],
    },
  },

  "gold-silver": {
    versions: ["Gold", "Silver"],
    exclusives: {
      Gold: [56, 57, 58, 59, 167, 168, 179, 180, 181, 203, 207, 216, 217, 226],
      Silver: [37, 38, 52, 53, 165, 166, 200, 223, 224, 225, 227, 231, 232],
    },
  },

  "ruby-sapphire": {
    versions: ["Ruby", "Sapphire"],
    exclusives: {
      Ruby: [273, 274, 275, 303, 335, 338, 381, 383],
      Sapphire: [270, 271, 272, 302, 336, 337, 380, 382],
    },
  },

  "firered-leafgreen": {
    versions: ["FireRed", "LeafGreen"],
    exclusives: {
      FireRed: [
        23, 24, 43, 44, 45, 54, 55, 58, 59, 90, 91, 123, 125, 182, 194, 195,
        198, 211, 212, 225, 227, 239,
      ],
      LeafGreen: [
        27, 28, 37, 38, 69, 70, 71, 79, 80, 120, 121, 126, 127, 183, 184, 199,
        200, 215, 223, 224, 226, 240, 298,
      ],
    },
  },

  "diamond-pearl": {
    versions: ["Diamond", "Pearl"],
    exclusives: {
      Diamond: [
        86, 87, 123, 198, 212, 246, 247, 248, 261, 262, 304, 305, 306, 352, 408,
        409, 430, 434, 435, 483,
      ],
      Pearl: [
        79, 80, 127, 199, 200, 228, 229, 234, 363, 364, 365, 371, 372, 373, 410,
        411, 429, 431, 432, 484,
      ],
    },
  },

  "heartgold-soulsilver": {
    versions: ["HeartGold", "SoulSilver"],
    exclusives: {
      HeartGold: [
        56, 57, 58, 59, 138, 139, 167, 168, 207, 226, 231, 232, 302, 343, 344,
        347, 348, 380, 382, 458, 472,
      ],
      SoulSilver: [
        37, 38, 52, 53, 140, 141, 165, 166, 216, 217, 225, 227, 303, 316, 317,
        345, 346, 381, 383,
      ],
    },
  },

  "black-white": {
    versions: ["Black", "White"],
    exclusives: {
      Black: [
        13, 14, 15, 198, 228, 229, 285, 286, 311, 430, 574, 575, 576, 629, 630,
        641, 643,
      ],
      White: [
        10, 11, 12, 46, 47, 200, 261, 262, 312, 429, 577, 578, 579, 627, 628,
        642, 644,
      ],
    },
  },

  "black2-white2": {
    versions: ["Black 2", "White 2"],
    exclusives: {
      "Black 2": [
        13, 14, 15, 126, 167, 168, 185, 240, 311, 325, 326, 379, 381, 427, 428,
        434, 435, 438, 443, 444, 445, 467, 574, 575, 576, 629, 630, 644,
      ],
      "White 2": [
        10, 11, 12, 122, 125, 165, 166, 239, 300, 301, 312, 322, 323, 378, 380,
        431, 432, 439, 466, 577, 578, 579, 627, 628, 643,
      ],
    },
  },

  "x-y": {
    versions: ["X", "Y"],
    exclusives: {
      X: [120, 121, 228, 229, 304, 305, 306, 345, 346, 347, 348, 692, 693, 716],
      Y: [138, 139, 140, 141, 309, 310, 690, 691, 717],
    },
  },

  oras: {
    versions: ["Omega Ruby", "Alpha Sapphire"],
    exclusives: {
      "Omega Ruby": [
        140, 141, 250, 273, 274, 275, 303, 335, 338, 381, 383, 410, 411, 484,
        538, 566, 567, 641, 643, 690, 691,
      ],
      "Alpha Sapphire": [
        138, 139, 249, 270, 271, 272, 302, 336, 337, 380, 382, 408, 409, 483,
        539, 564, 565, 642, 644, 692, 693,
      ],
    },
  },

  "sun-moon": {
    versions: ["Sun", "Moon"],
    exclusives: {
      Sun: [
        37, 38, 408, 409, 546, 547, 564, 565, 627, 628, 766, 776, 791, 794, 798,
      ],
      Moon: [
        27, 28, 410, 411, 548, 549, 566, 567, 629, 630, 765, 780, 792, 795, 797,
      ],
    },
  },

  usum: {
    versions: ["Ultra Sun", "Ultra Moon"],
    exclusives: {
      "Ultra Sun": [
        37, 38, 228, 229, 243, 250, 381, 383, 483, 485, 546, 547, 622, 623, 627,
        628, 641, 643, 692, 693, 716, 766, 776, 791, 794, 798, 806,
      ],
      "Ultra Moon": [
        27, 28, 244, 249, 309, 310, 343, 344, 380, 382, 484, 486, 548, 549, 629,
        630, 642, 644, 690, 691, 717, 765, 780, 792, 795, 797, 805,
      ],
    },
  },

  swsh: {
    versions: ["Sword", "Shield"],
    exclusives: {
      // Includes Isle of Armor and Crown Tundra DLC exclusives
      Sword: [
        83, 127, 138, 139, 250, 273, 274, 275, 303, 338, 371, 372, 373, 381,
        383, 483, 554, 555, 559, 560, 574, 575, 576, 627, 628, 633, 634, 635,
        641, 643, 684, 685, 692, 693, 716, 766, 776, 782, 783, 784, 791, 841,
        865, 874, 888,
      ],
      // Includes Isle of Armor and Crown Tundra DLC exclusives
      Shield: [
        77, 78, 140, 141, 214, 222, 246, 247, 248, 249, 270, 271, 272, 302, 337,
        380, 382, 443, 444, 445, 453, 454, 484, 577, 578, 579, 629, 630, 642,
        644, 682, 683, 690, 691, 704, 705, 706, 717, 765, 780, 792, 842, 864,
        875, 889,
      ],
    },
  },

  bdsp: {
    versions: ["Brilliant Diamond", "Shining Pearl"],
    exclusives: {
      "Brilliant Diamond": [
        10, 11, 12, 23, 24, 58, 59, 86, 87, 123, 125, 198, 207, 212, 239, 243,
        244, 245, 246, 247, 248, 250, 273, 274, 275, 303, 335, 338, 352, 408,
        409, 430, 434, 435, 466, 472, 483,
      ],
      "Shining Pearl": [
        13, 14, 15, 27, 28, 37, 38, 79, 80, 126, 127, 144, 145, 146, 199, 200,
        216, 217, 234, 240, 249, 270, 271, 272, 302, 336, 337, 371, 372, 373,
        410, 411, 429, 431, 432, 467, 484,
      ],
    },
  },

  "scarlet-violet": {
    versions: ["Scarlet", "Violet"],
    exclusives: {
      // Includes Teal Mask and Indigo Disk DLC exclusives
      Scarlet: [
        37, 38, 207, 243, 244, 245, 246, 247, 248, 250, 381, 383, 408, 409, 425,
        426, 434, 435, 472, 633, 634, 635, 643, 690, 691, 765, 791, 845, 874,
        896, 984, 985, 986, 987, 988, 989, 1005, 1007, 1020, 1021,
      ],
      // Includes Teal Mask and Indigo Disk DLC exclusives
      Violet: [
        27, 28, 190, 200, 249, 316, 317, 371, 372, 373, 380, 382, 410, 411, 424,
        429, 638, 639, 640, 644, 692, 693, 766, 792, 875, 877, 885, 886, 887,
        897, 990, 991, 992, 993, 994, 995, 1006, 1008, 1022, 1023,
      ],
    },
  },
};

export function getVersionExclusives(
  gameId: string,
): VersionExclusives | undefined {
  return VERSION_EXCLUSIVES[gameId];
}

// Returns which version name a species belongs to in the given game, or null if not exclusive.
export function getExclusiveVersion(
  gameId: string,
  speciesId: number,
): string | null {
  const entry = VERSION_EXCLUSIVES[gameId];
  if (!entry) return null;
  for (const [version, ids] of Object.entries(entry.exclusives)) {
    if ((ids as readonly number[]).includes(speciesId)) return version;
  }
  return null;
}
