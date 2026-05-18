import { Currency, MealPower, TypeIndex } from './enum';

export interface ResultPower {
  mealPower?: MealPower;
  type: TypeIndex;
  level: number;
}

export interface TargetPower extends ResultPower {
  mealPower: MealPower;
}

export interface SandwichRecipe {
  number: string;
  name: string;
  fillings: string[];
  condiments: string[];
  powers: TargetPower[];
  imagePath?: string;
  gameLocation: string;
  tags?: string[];
}

export interface Meal {
  name: string;
  currency: Currency;
  cost: number;
  powers: TargetPower[];
  shop: string;
  towns: string[];
  imagePath: string;
  imageUrl?: string;
}

export interface MealsSearchOptions {
  excludePaldea?: boolean;
  kitakami?: boolean;
  blueberry?: boolean;
}
