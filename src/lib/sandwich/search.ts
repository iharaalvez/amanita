import recipesData from './data/recipes.json';
import simpleData from './data/shinyRecipesSimple.json';
import universalData from './data/shinyRecipesUniversal.json';
import multiHerbData from './data/shinyRecipesMultiHerb.json';
import groupData from './data/shinyRecipesGroup.json';
import mealsData from './data/meals.json';
import { powerSetsMatch } from './powers';
import { Meal, MealsSearchOptions, SandwichRecipe, TargetPower } from './types';

const recipes = recipesData as SandwichRecipe[];
const meals = mealsData as Meal[];

export interface ShinyRecipeGroup {
  tag: string;
  label: string;
  recipes: SandwichRecipe[];
}

const SHINY_GROUPS: { tag: string; label: string; data: SandwichRecipe[] }[] = [
  { tag: 'simple', label: 'Simple (Papa Jefe)', data: simpleData as SandwichRecipe[] },
  { tag: 'universal', label: 'Universal (Papa Jefe)', data: universalData as SandwichRecipe[] },
  { tag: 'multi-herb', label: 'Multi-Herb (Papa Jefe)', data: multiHerbData as SandwichRecipe[] },
  { tag: 'group', label: 'Group Sharing (Papa Jefe)', data: groupData as SandwichRecipe[] },
];

const RECIPE_RESULT_LIMIT = 3;
const RECIPE_SCORE_THRESHOLD = 9;
const MEAL_RESULT_LIMIT = 3;

const HERBA_IDS = new Set(['hmbtr', 'hmslt', 'hmswt', 'hmsr', 'hmspc', 'hmany']);

const isHerba = (id: string) => HERBA_IDS.has(id);

export const getRecipesForPowers = (
  targetPowers: TargetPower[],
): SandwichRecipe[] => {
  if (targetPowers.length === 0) return [];

  const matchingRecipes = recipes.filter((recipe) =>
    powerSetsMatch(recipe.powers, targetPowers),
  );
  if (matchingRecipes.length === 0) return [];

  const scoredRecipes = matchingRecipes.map((recipe) => ({
    ...recipe,
    score:
      35 * recipe.condiments.filter(isHerba).length +
      5 * recipe.fillings.length +
      recipe.condiments.length,
  }));

  scoredRecipes.sort((a, b) => a.score - b.score);
  const lowestScore = scoredRecipes[0].score;
  const scoreLimit = lowestScore + RECIPE_SCORE_THRESHOLD;

  return scoredRecipes
    .filter((recipe) => recipe.score <= scoreLimit)
    .slice(0, RECIPE_RESULT_LIMIT);
};

export const getShinyRecipesForPowers = (
  targetPowers: TargetPower[],
): ShinyRecipeGroup[] => {
  if (targetPowers.length === 0) return [];
  return SHINY_GROUPS.map(({ tag, label, data }) => ({
    tag,
    label,
    recipes: data.filter((recipe) => powerSetsMatch(recipe.powers, targetPowers)),
  })).filter((group) => group.recipes.length > 0);
};

const matchesOptions = (meal: Meal, options: MealsSearchOptions) => {
  const { excludePaldea = false, kitakami = false, blueberry = false } =
    options;
  return (
    (!excludePaldea ||
      meal.towns.some(
        (town) => town === 'Kitakami Hall' || town === 'Blueberry Academy',
      )) &&
    (kitakami || meal.towns.some((town) => town !== 'Kitakami Hall')) &&
    (blueberry || meal.towns.some((town) => town !== 'Blueberry Academy'))
  );
};

export const getMealsForPowers = (
  targetPowers: TargetPower[],
  options: MealsSearchOptions = {},
): Meal[] => {
  if (targetPowers.length === 0) return [];

  const matchingMeals = meals.filter(
    (meal) =>
      matchesOptions(meal, options) && powerSetsMatch(meal.powers, targetPowers),
  );

  matchingMeals.sort((a, b) => {
    if (a.currency !== 'bp' && b.currency === 'bp') return -1;
    if (a.currency === 'bp' && b.currency !== 'bp') return 1;
    return a.cost - b.cost;
  });

  type Accum = { meals: Meal[]; covered: Record<string, true> };
  const { meals: coveringMeals } = matchingMeals.reduce<Accum>(
    ({ meals: acc, covered }, meal) => {
      if (meal.towns.some((town) => !covered[town])) {
        return {
          meals: [...acc, meal],
          covered: {
            ...covered,
            ...Object.fromEntries(meal.towns.map((t) => [t, true])),
          },
        };
      }
      return { meals: acc, covered };
    },
    { meals: [], covered: {} },
  );

  return coveringMeals.slice(0, MEAL_RESULT_LIMIT);
};
