import type { PokemonType } from "@/lib/typeChart";

export type DynamaxLegendary = {
  speciesId: number;
  name: string;
  types: [PokemonType, PokemonType?];
  version?: "sword" | "shield";
};

// The 47 legendaries/mythicals/Ultra Beasts obtainable as Dynamax Adventure
// den bosses in the Crown Tundra DLC. Hosting a run limits you to your
// version's half of any exclusive pair; joining someone else's run lets you
// catch the other version's exclusives too.
export const DYNAMAX_ADVENTURE_LEGENDARIES: DynamaxLegendary[] = [
  { speciesId: 144, name: "Articuno", types: ["ice", "flying"] },
  { speciesId: 145, name: "Zapdos", types: ["electric", "flying"] },
  { speciesId: 146, name: "Moltres", types: ["fire", "flying"] },
  { speciesId: 150, name: "Mewtwo", types: ["psychic"] },

  { speciesId: 243, name: "Raikou", types: ["electric"] },
  { speciesId: 244, name: "Entei", types: ["fire"] },
  { speciesId: 245, name: "Suicune", types: ["water"] },
  {
    speciesId: 249,
    name: "Lugia",
    types: ["psychic", "flying"],
    version: "shield",
  },
  {
    speciesId: 250,
    name: "Ho-Oh",
    types: ["fire", "flying"],
    version: "sword",
  },

  {
    speciesId: 380,
    name: "Latias",
    types: ["dragon", "psychic"],
    version: "shield",
  },
  {
    speciesId: 381,
    name: "Latios",
    types: ["dragon", "psychic"],
    version: "sword",
  },
  { speciesId: 382, name: "Kyogre", types: ["water"], version: "shield" },
  { speciesId: 383, name: "Groudon", types: ["ground"], version: "sword" },
  { speciesId: 384, name: "Rayquaza", types: ["dragon", "flying"] },

  { speciesId: 480, name: "Uxie", types: ["psychic"] },
  { speciesId: 481, name: "Mesprit", types: ["psychic"] },
  { speciesId: 482, name: "Azelf", types: ["psychic"] },
  {
    speciesId: 483,
    name: "Dialga",
    types: ["steel", "dragon"],
    version: "sword",
  },
  {
    speciesId: 484,
    name: "Palkia",
    types: ["water", "dragon"],
    version: "shield",
  },
  { speciesId: 487, name: "Giratina", types: ["ghost", "dragon"] },
  { speciesId: 485, name: "Heatran", types: ["fire", "steel"] },
  { speciesId: 488, name: "Cresselia", types: ["psychic"] },

  {
    speciesId: 641,
    name: "Tornadus",
    types: ["flying"],
    version: "sword",
  },
  {
    speciesId: 642,
    name: "Thundurus",
    types: ["electric", "flying"],
    version: "shield",
  },
  {
    speciesId: 643,
    name: "Reshiram",
    types: ["dragon", "fire"],
    version: "sword",
  },
  {
    speciesId: 644,
    name: "Zekrom",
    types: ["dragon", "electric"],
    version: "shield",
  },
  { speciesId: 645, name: "Landorus", types: ["ground", "flying"] },
  { speciesId: 646, name: "Kyurem", types: ["dragon", "ice"] },

  { speciesId: 716, name: "Xerneas", types: ["fairy"], version: "sword" },
  {
    speciesId: 717,
    name: "Yveltal",
    types: ["dark", "flying"],
    version: "shield",
  },
  { speciesId: 718, name: "Zygarde", types: ["dragon", "ground"] },

  { speciesId: 785, name: "Tapu Koko", types: ["electric", "fairy"] },
  { speciesId: 786, name: "Tapu Lele", types: ["psychic", "fairy"] },
  { speciesId: 787, name: "Tapu Bulu", types: ["grass", "fairy"] },
  { speciesId: 788, name: "Tapu Fini", types: ["water", "fairy"] },

  {
    speciesId: 791,
    name: "Solgaleo",
    types: ["psychic", "steel"],
    version: "sword",
  },
  {
    speciesId: 792,
    name: "Lunala",
    types: ["psychic", "ghost"],
    version: "shield",
  },

  { speciesId: 793, name: "Nihilego", types: ["rock", "poison"] },
  { speciesId: 794, name: "Buzzwole", types: ["bug", "fighting"] },
  { speciesId: 795, name: "Pheromosa", types: ["bug", "fighting"] },
  { speciesId: 796, name: "Xurkitree", types: ["electric"] },
  { speciesId: 797, name: "Celesteela", types: ["steel", "flying"] },
  { speciesId: 798, name: "Kartana", types: ["grass", "steel"] },
  { speciesId: 799, name: "Guzzlord", types: ["dark", "dragon"] },
  { speciesId: 800, name: "Necrozma", types: ["psychic"] },
  { speciesId: 805, name: "Stakataka", types: ["rock", "steel"] },
  { speciesId: 806, name: "Blacephalon", types: ["fire", "ghost"] },
];

export function getLegendarySpriteUrl(speciesId: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${speciesId}.png`;
}
