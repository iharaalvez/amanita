export enum Flavor {
  SWEET,
  SALTY,
  SOUR,
  BITTER,
  SPICY,
}

export enum MealPower {
  EGG,
  CATCH,
  EXP,
  ITEM,
  RAID,
  SPARKLING,
  TITLE,
  HUMUNGO,
  TEENSY,
  ENCOUNTER,
}

export const MEAL_POWER_NAMES: Record<MealPower, string> = {
  [MealPower.EGG]: 'Egg Power',
  [MealPower.CATCH]: 'Catching Power',
  [MealPower.EXP]: 'Exp. Point Power',
  [MealPower.ITEM]: 'Item Drop Power',
  [MealPower.RAID]: 'Raid Power',
  [MealPower.SPARKLING]: 'Sparkling Power',
  [MealPower.TITLE]: 'Title Power',
  [MealPower.HUMUNGO]: 'Humungo Power',
  [MealPower.TEENSY]: 'Teensy Power',
  [MealPower.ENCOUNTER]: 'Encounter Power',
};

export enum TypeIndex {
  NORMAL,
  FIGHTING,
  FLYING,
  POISON,
  GROUND,
  ROCK,
  BUG,
  GHOST,
  STEEL,
  FIRE,
  WATER,
  GRASS,
  ELECTRIC,
  PSYCHIC,
  ICE,
  DRAGON,
  DARK,
  FAIRY,
  ALL_TYPES,
}

export const TYPE_NAMES: Record<number, string> = {
  [TypeIndex.NORMAL]: 'Normal',
  [TypeIndex.FIGHTING]: 'Fighting',
  [TypeIndex.FLYING]: 'Flying',
  [TypeIndex.POISON]: 'Poison',
  [TypeIndex.GROUND]: 'Ground',
  [TypeIndex.ROCK]: 'Rock',
  [TypeIndex.BUG]: 'Bug',
  [TypeIndex.GHOST]: 'Ghost',
  [TypeIndex.STEEL]: 'Steel',
  [TypeIndex.FIRE]: 'Fire',
  [TypeIndex.WATER]: 'Water',
  [TypeIndex.GRASS]: 'Grass',
  [TypeIndex.ELECTRIC]: 'Electric',
  [TypeIndex.PSYCHIC]: 'Psychic',
  [TypeIndex.ICE]: 'Ice',
  [TypeIndex.DRAGON]: 'Dragon',
  [TypeIndex.DARK]: 'Dark',
  [TypeIndex.FAIRY]: 'Fairy',
  [TypeIndex.ALL_TYPES]: 'All Types',
};

export const TYPE_COLORS: Record<number, string> = {
  [TypeIndex.NORMAL]: '#A8A878',
  [TypeIndex.FIGHTING]: '#C03028',
  [TypeIndex.FLYING]: '#A890F0',
  [TypeIndex.POISON]: '#A040A0',
  [TypeIndex.GROUND]: '#E0C068',
  [TypeIndex.ROCK]: '#B8A038',
  [TypeIndex.BUG]: '#A8B820',
  [TypeIndex.GHOST]: '#705898',
  [TypeIndex.STEEL]: '#B8B8D0',
  [TypeIndex.FIRE]: '#F08030',
  [TypeIndex.WATER]: '#6890F0',
  [TypeIndex.GRASS]: '#78C850',
  [TypeIndex.ELECTRIC]: '#F8D030',
  [TypeIndex.PSYCHIC]: '#F85888',
  [TypeIndex.ICE]: '#98D8D8',
  [TypeIndex.DRAGON]: '#7038F8',
  [TypeIndex.DARK]: '#705848',
  [TypeIndex.FAIRY]: '#EE99AC',
  [TypeIndex.ALL_TYPES]: '#68A090',
};

export const rangeFlavors = [...Array(5).keys()];
export const rangeTypes = [...Array(18).keys()];
export const rangeMealPowers = [...Array(10).keys()];

export enum Currency {
  POKE = 'poke',
  BP = 'bp',
}
