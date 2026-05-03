// Temporary curated fallback data for game Pokedexes that are not yet available in PokeAPI.
// Legends: Z-A was bootstrapped from Game8's structured Pokedex data on 2026-05-02,
// then normalized to PokeAPI species IDs. Replace this with PokeAPI data once available.
export const GAME_POKEDEX_OVERRIDES: Record<string, number[]> = {
  'legends-za': [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 13, 14, 15, 16, 17, 18, 23,
    24, 25, 26, 35, 36, 63, 64, 65, 66, 67, 68, 69, 70, 71, 79, 80,
    92, 93, 94, 95, 115, 120, 121, 123, 127, 129, 130, 133, 134, 135, 136, 142,
    147, 148, 149, 150, 152, 153, 154, 158, 159, 160, 167, 168, 172, 173, 179, 180,
    181, 196, 197, 199, 208, 212, 214, 225, 227, 228, 229, 246, 247, 248, 280, 281,
    282, 302, 303, 304, 305, 306, 307, 308, 309, 310, 315, 318, 319, 322, 323, 333,
    334, 353, 354, 359, 361, 362, 371, 372, 373, 374, 375, 376, 406, 407, 427, 428,
    443, 444, 445, 447, 448, 449, 450, 459, 460, 470, 471, 475, 478, 498, 499, 500,
    504, 505, 511, 512, 513, 514, 515, 516, 529, 530, 531, 543, 544, 545, 551, 552,
    553, 559, 560, 568, 569, 582, 583, 584, 587, 602, 603, 604, 607, 608, 609, 618,
    650, 651, 652, 653, 654, 655, 656, 657, 658, 659, 660, 661, 662, 663, 664, 665,
    666, 667, 668, 669, 670, 671, 672, 673, 674, 675, 676, 677, 678, 679, 680, 681,
    682, 683, 684, 685, 686, 687, 688, 689, 690, 691, 692, 693, 694, 695, 696, 697,
    698, 699, 700, 701, 702, 703, 704, 705, 706, 707, 708, 709, 710, 711, 712, 713,
    714, 715, 716, 717, 718, 719, 780, 870,
  ],
};

export function getGamePokedexOverride(gameId: string): number[] | undefined {
  return GAME_POKEDEX_OVERRIDES[gameId];
}

export function hasGamePokedexOverride(gameId: string): boolean {
  return gameId in GAME_POKEDEX_OVERRIDES;
}
