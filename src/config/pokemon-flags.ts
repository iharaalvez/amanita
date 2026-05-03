// Mythical Pokémon — distributed via limited-time events, cannot be encountered in wild
export const MYTHICAL_IDS = new Set<number>([
  151,  // Mew
  251,  // Celebi
  385,  // Jirachi
  386,  // Deoxys
  489,  // Phione
  490,  // Manaphy
  491,  // Darkrai
  492,  // Shaymin
  493,  // Arceus
  494,  // Victini
  647,  // Keldeo
  648,  // Meloetta
  649,  // Genesect
  719,  // Diancie
  720,  // Hoopa
  721,  // Volcanion
  801,  // Magearna
  802,  // Marshadow
  807,  // Zeraora
  808,  // Meltan
  809,  // Melmetal
  893,  // Zarude
  1025, // Pecharunt
]);

// Species that are the direct result of a trade evolution — cannot be obtained without trading
export const TRADE_OBTAINED_IDS = new Set<number>([
  65,   // Alakazam      (trade Kadabra)
  68,   // Machamp       (trade Machoke)
  76,   // Golem         (trade Graveler)
  94,   // Gengar        (trade Haunter)
  186,  // Politoed      (trade Poliwhirl + King's Rock)
  199,  // Slowking      (trade Slowpoke + King's Rock)
  208,  // Steelix       (trade Onix + Metal Coat)
  212,  // Scizor        (trade Scyther + Metal Coat)
  230,  // Kingdra       (trade Seadra + Dragon Scale)
  233,  // Porygon2      (trade Porygon + Up-Grade)
  350,  // Milotic       (trade Feebas + Prism Scale, Gen 5+)
  464,  // Rhyperior     (trade Rhydon + Protector)
  466,  // Electivire    (trade Electabuzz + Electirizer)
  467,  // Magmortar     (trade Magmar + Magmarizer)
  474,  // Porygon-Z     (trade Porygon2 + Dubious Disc)
  477,  // Dusknoir      (trade Dusclops + Reaper Cloth)
  683,  // Aromatisse    (trade Spritzee + Sachet)
  685,  // Slurpuff      (trade Swirlix + Whipped Dream)
  709,  // Trevenant     (trade Phantump)
  711,  // Gourgeist     (trade Pumpkaboo)
]);

// Species whose shiny has NEVER been legitimately obtainable in any main-series game
// or official distribution. Update when events release previously locked shinies.
export const SHINY_LOCKED_IDS = new Set<number>([
  494,  // Victini
  720,  // Hoopa
  721,  // Volcanion
  801,  // Magearna
  802,  // Marshadow
  891,  // Kubfu
  892,  // Urshifu
  893,  // Zarude
  896,  // Glastrier
  897,  // Spectrier
  898,  // Calyrex
  1009, // Walking Wake
  1010, // Iron Leaves
  1014, // Okidogi
  1015, // Munkidori
  1016, // Fezandipiti
  1017, // Ogerpon
  1020, // Gouging Fire
  1021, // Raging Bolt
  1022, // Iron Boulder
  1023, // Iron Crown
  1024, // Terapagos
  1025, // Pecharunt
]);

// Form-specific shiny locks — the base species may have an obtainable shiny,
// but these specific forms do not.
export const SHINY_LOCKED_FORMS = new Set<string>([
  'greninja-battle-bond',
  'floette-eternal',
  'pikachu-cosplay',
  'pikachu-original-cap',
  'pikachu-hoenn-cap',
  'pikachu-sinnoh-cap',
  'pikachu-unova-cap',
  'pikachu-kalos-cap',
  'pikachu-alola-cap',
  'pikachu-partner-cap',
  'pikachu-world-cap',
  'eevee-starter',
  'pichu-spiky-eared',
  'melmetal-gmax',
]);

export function isMythical(speciesId: number): boolean {
  return MYTHICAL_IDS.has(speciesId);
}

export function requiresTrade(speciesId: number): boolean {
  return TRADE_OBTAINED_IDS.has(speciesId);
}

export function isShinyLocked(speciesId: number, formName?: string | null): boolean {
  if (SHINY_LOCKED_IDS.has(speciesId)) return true;
  if (formName && SHINY_LOCKED_FORMS.has(formName)) return true;
  return false;
}
