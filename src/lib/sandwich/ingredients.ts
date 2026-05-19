import rawIngredients from "./data/ingredients.json";
import { Flavor, MealPower, TypeIndex } from "./enum";

export type SandwichIngredientType = "filling" | "condiment";

export type SandwichIngredient = {
  id: string;
  pieces: number;
  isHerbaMystica: boolean;
  imagePath: string;
  imageUrl?: string;
  flavorVector: number[];
  typeVector: number[];
  baseMealPowerVector: number[];
  ingredientType: SandwichIngredientType;
};

export type SandwichIngredientSelection = Record<string, number>;

export type SandwichIngredientTotals = {
  flavors: Record<Flavor, number>;
  types: Record<TypeIndex, number>;
  mealPowers: Record<MealPower, number>;
  ingredientCount: number;
  pieceCount: number;
  fillingCount: number;
  condimentCount: number;
  herbaCount: number;
};

export type RankedTotal<T extends number> = {
  id: T;
  value: number;
};

export const SANDWICH_INGREDIENT_SOURCE_URL =
  "https://www.serebii.net/scarletviolet/sandwichingredients.shtml";

export const SANDWICH_INGREDIENTS =
  rawIngredients as readonly SandwichIngredient[];

export const SANDWICH_FLAVORS: {
  id: Flavor;
  label: string;
  className: string;
}[] = [
  { id: Flavor.SWEET, label: "Sweet", className: "bg-pink-500" },
  { id: Flavor.SALTY, label: "Salty", className: "bg-sky-500" },
  { id: Flavor.SOUR, label: "Sour", className: "bg-lime-500" },
  { id: Flavor.BITTER, label: "Bitter", className: "bg-violet-500" },
  { id: Flavor.SPICY, label: "Spicy", className: "bg-red-500" },
];

const EMPTY_FLAVORS = {
  [Flavor.SWEET]: 0,
  [Flavor.SALTY]: 0,
  [Flavor.SOUR]: 0,
  [Flavor.BITTER]: 0,
  [Flavor.SPICY]: 0,
};

const EMPTY_TYPES = {
  [TypeIndex.NORMAL]: 0,
  [TypeIndex.FIGHTING]: 0,
  [TypeIndex.FLYING]: 0,
  [TypeIndex.POISON]: 0,
  [TypeIndex.GROUND]: 0,
  [TypeIndex.ROCK]: 0,
  [TypeIndex.BUG]: 0,
  [TypeIndex.GHOST]: 0,
  [TypeIndex.STEEL]: 0,
  [TypeIndex.FIRE]: 0,
  [TypeIndex.WATER]: 0,
  [TypeIndex.GRASS]: 0,
  [TypeIndex.ELECTRIC]: 0,
  [TypeIndex.PSYCHIC]: 0,
  [TypeIndex.ICE]: 0,
  [TypeIndex.DRAGON]: 0,
  [TypeIndex.DARK]: 0,
  [TypeIndex.FAIRY]: 0,
  [TypeIndex.ALL_TYPES]: 0,
};

const EMPTY_MEAL_POWERS = {
  [MealPower.EGG]: 0,
  [MealPower.CATCH]: 0,
  [MealPower.EXP]: 0,
  [MealPower.ITEM]: 0,
  [MealPower.RAID]: 0,
  [MealPower.SPARKLING]: 0,
  [MealPower.TITLE]: 0,
  [MealPower.HUMUNGO]: 0,
  [MealPower.TEENSY]: 0,
  [MealPower.ENCOUNTER]: 0,
};

export function calculateSandwichIngredientTotals(
  selection: SandwichIngredientSelection,
): SandwichIngredientTotals {
  const totals: SandwichIngredientTotals = {
    flavors: { ...EMPTY_FLAVORS },
    types: { ...EMPTY_TYPES },
    mealPowers: { ...EMPTY_MEAL_POWERS },
    ingredientCount: 0,
    pieceCount: 0,
    fillingCount: 0,
    condimentCount: 0,
    herbaCount: 0,
  };

  for (const ingredient of SANDWICH_INGREDIENTS) {
    const count = selection[ingredient.id] ?? 0;
    if (count <= 0) continue;

    totals.ingredientCount += count;
    totals.pieceCount += ingredient.pieces * count;
    if (ingredient.ingredientType === "filling") {
      totals.fillingCount += count;
    } else {
      totals.condimentCount += count;
    }
    if (ingredient.isHerbaMystica) totals.herbaCount += count;

    for (const flavor of SANDWICH_FLAVORS) {
      totals.flavors[flavor.id] +=
        (ingredient.flavorVector[flavor.id] ?? 0) * count;
    }

    for (let type = TypeIndex.NORMAL; type <= TypeIndex.FAIRY; type += 1) {
      totals.types[type] += (ingredient.typeVector[type] ?? 0) * count;
    }

    for (let power = MealPower.EGG; power <= MealPower.ENCOUNTER; power += 1) {
      totals.mealPowers[power] +=
        (ingredient.baseMealPowerVector[power] ?? 0) * count;
    }
  }

  return totals;
}

export function getRankedTotals<T extends number>(
  values: Record<T, number>,
  ids: readonly T[],
  limit: number,
): RankedTotal<T>[] {
  return ids
    .map((id) => ({ id, value: values[id] ?? 0 }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value || a.id - b.id)
    .slice(0, limit);
}
