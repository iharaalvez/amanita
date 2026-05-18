import { MealPower, TypeIndex } from './enum';
import { ResultPower, TargetPower } from './types';

export const mealPowerHasType = (mealPower: MealPower) =>
  mealPower !== MealPower.EGG;

export const powersMatch = (test: ResultPower, target: TargetPower) =>
  test.level >= target.level &&
  test.mealPower === target.mealPower &&
  (!mealPowerHasType(test.mealPower!) ||
    test.type === target.type ||
    test.type === TypeIndex.ALL_TYPES);

export const powerSetsMatch = (test: ResultPower[], target: TargetPower[]) =>
  target.every((tp) => test.some((p) => powersMatch(p, tp)));
