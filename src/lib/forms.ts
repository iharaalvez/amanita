const REGIONAL_KEYWORDS = ['alola', 'galar', 'hisui', 'paldea'] as const;
type RegionalKeyword = (typeof REGIONAL_KEYWORDS)[number];

const EXCLUDED_KEYWORDS = [
  'mega', 'gmax', 'primal', 'eternamax', 'totem',
  'battle-bond', 'power-construct', 'busted', 'school',
] as const;

const FORM_LABEL: Record<RegionalKeyword, string> = {
  alola: 'Alolan',
  galar: 'Galarian',
  hisui: 'Hisuian',
  paldea: 'Paldean',
};

export function isLivingDexForm(varietyName: string): boolean {
  const lower = varietyName.toLowerCase();
  if (EXCLUDED_KEYWORDS.some((kw) => lower.includes(kw))) return false;
  return REGIONAL_KEYWORDS.some((kw) => lower.includes(kw));
}

export function getFormLabel(varietyName: string): string {
  const lower = varietyName.toLowerCase();
  for (const kw of REGIONAL_KEYWORDS) {
    if (lower.includes(kw)) return FORM_LABEL[kw];
  }
  return '';
}

export const GAME_REGION: Record<string, string | null> = {
  'red-blue': null,
  'yellow': null,
  'gold-silver': null,
  'crystal': null,
  'ruby-sapphire': null,
  'emerald': null,
  'firered-leafgreen': null,
  'diamond-pearl': null,
  'platinum': null,
  'heartgold-soulsilver': null,
  'black-white': null,
  'black2-white2': null,
  'x-y': null,
  'oras': null,
  'sun-moon': 'alola',
  'usum': 'alola',
  'swsh': 'galar',
  'bdsp': null,
  'pla': 'hisui',
  'scarlet-violet': 'paldea',
  'legends-za': null,
};

// Base-form Pokémon that have regional evolutions — documented for reference.
// The actual filtering in fetchAllLivingDexEntries happens via isLivingDexForm
// on each species' varieties array, which already includes these evolution forms.
export const HARDCODED_EXTRA_FORMS: string[] = [
  'slowpoke',  // → slowbro-galar, slowking-galar
  'linoone',   // → obstagoon (galarian evo)
  'corsola',   // → cursola (galarian evo)
  'yamask',    // → runerigus (galarian evo)
  'farfetchd', // → sirfetchd (galarian evo)
  'sneasel',   // → sneasler (hisuian evo)
  'qwilfish',  // → overqwil (hisuian evo)
  'basculin',  // → basculegion (hisuian evo)
  'stantler',  // → wyrdeer (hisuian evo)
  'primeape',  // → annihilape (paldean evo)
];
