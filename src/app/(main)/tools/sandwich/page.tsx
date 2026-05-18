'use client';

import { useState } from 'react';
import { ChefHat, Plus, X, MapPin, Coins, Star, Sparkles } from 'lucide-react';
import {
  MealPower,
  MEAL_POWER_NAMES,
  TypeIndex,
  TYPE_NAMES,
  TYPE_COLORS,
  Currency,
} from '@/lib/sandwich/enum';
import { TargetPower, SandwichRecipe, Meal } from '@/lib/sandwich/types';
import {
  getRecipesForPowers,
  getShinyRecipesForPowers,
  getMealsForPowers,
  ShinyRecipeGroup,
} from '@/lib/sandwich/search';
import { mealPowerHasType } from '@/lib/sandwich/powers';
import { ingredientName, ingredientImageSrc } from '@/lib/sandwich/ingredientNames';

const VARIABLE_HERBA = new Set(['hmswt', 'hmspc', 'hmsr']);

interface CollapsedRecipe {
  recipe: SandwichRecipe;
  herbaOptions: string[];
}

function collapseHerbaVariants(recipes: SandwichRecipe[]): CollapsedRecipe[] {
  const groups = new Map<string, CollapsedRecipe>();
  for (const recipe of recipes) {
    const fixedCondiments = recipe.condiments.filter((id) => !VARIABLE_HERBA.has(id));
    const variableHerba = recipe.condiments.filter((id) => VARIABLE_HERBA.has(id));
    const key = recipe.fillings.join('|') + '::' + fixedCondiments.join('|');
    if (groups.has(key)) {
      const existing = groups.get(key)!;
      for (const h of variableHerba) {
        if (!existing.herbaOptions.includes(h)) existing.herbaOptions.push(h);
      }
    } else {
      const name = recipe.name.replace(/\s*\((Sweet|Spicy|Sour)\)$/, '');
      groups.set(key, {
        recipe: { ...recipe, name, condiments: fixedCondiments },
        herbaOptions: [...variableHerba],
      });
    }
  }
  return Array.from(groups.values());
}

const ALL_MEAL_POWERS = Object.values(MealPower).filter(
  (v): v is MealPower => typeof v === 'number',
);

const ALL_TYPES = Object.values(TypeIndex)
  .filter((v): v is TypeIndex => typeof v === 'number')
  .filter((v) => v !== TypeIndex.ALL_TYPES);

const LEVEL_OPTIONS = [1, 2, 3] as const;

interface PowerSlot {
  mealPower: MealPower;
  type: TypeIndex;
  level: 1 | 2 | 3;
}

const defaultSlot = (): PowerSlot => ({
  mealPower: MealPower.ENCOUNTER,
  type: TypeIndex.DRAGON,
  level: 1,
});

function IngredientItem({ id }: { id: string }) {
  const src = ingredientImageSrc(id);
  const name = ingredientName(id);
  return (
    <span className="inline-flex items-center gap-1">
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-5 w-5 object-contain" />
      )}
      <span className="text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-200">
        {name}
      </span>
    </span>
  );
}

function PowerBadge({ power }: { power: TargetPower }) {
  const needsType = mealPowerHasType(power.mealPower);
  const color = needsType ? TYPE_COLORS[power.type] : '#6366f1';
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white"
      style={{ backgroundColor: color }}
    >
      {MEAL_POWER_NAMES[power.mealPower]}
      {needsType && ` ${TYPE_NAMES[power.type]}`}
      <span className="opacity-75">Lv.{power.level}</span>
    </span>
  );
}

function RecipeCard({ recipe, shiny = false, herbaOptions = [] }: { recipe: SandwichRecipe; shiny?: boolean; herbaOptions?: string[] }) {
  const isNumbered = /^\d+$/.test(recipe.number);
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${shiny ? 'border-yellow-300 bg-yellow-50 dark:border-yellow-700/60 dark:bg-yellow-950/20' : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'}`}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          {isNumbered && (
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              #{recipe.number.padStart(3, '0')}
            </p>
          )}
          <h3 className="text-base font-black text-gray-950 dark:text-white">
            {recipe.name}
          </h3>
        </div>
        {shiny && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-yellow-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-yellow-800 dark:bg-yellow-800/40 dark:text-yellow-300">
            <Sparkles className="h-3 w-3" />
            Shiny
          </span>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {recipe.powers.map((p, i) => (
          <PowerBadge key={i} power={p} />
        ))}
      </div>

      {recipe.gameLocation && (
        <div className="flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{recipe.gameLocation}</span>
        </div>
      )}

      {(recipe.fillings.length > 0 || recipe.condiments.length > 0 || herbaOptions.length > 0) && (
        <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            {[...recipe.fillings, ...recipe.condiments].map((id, i) => (
              <span key={`${id}-${i}`} className="inline-flex items-center gap-2">
                {i > 0 && (
                  <span className="text-[10px] font-black text-gray-300 dark:text-gray-600">+</span>
                )}
                <IngredientItem id={id} />
              </span>
            ))}
            {herbaOptions.length > 0 && (
              <span className="inline-flex items-center gap-2">
                {(recipe.fillings.length > 0 || recipe.condiments.length > 0) && (
                  <span className="text-[10px] font-black text-gray-300 dark:text-gray-600">+</span>
                )}
                <span className="inline-flex items-center gap-1">
                  {herbaOptions.map((h, i) => {
                    const src = ingredientImageSrc(h);
                    return (
                      <span key={h} className="inline-flex items-center gap-1">
                        {i > 0 && <span className="text-[10px] font-black text-gray-300 dark:text-gray-600">/</span>}
                        {src && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={src} alt="" className="h-5 w-5 object-contain" />
                        )}
                      </span>
                    );
                  })}
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-200">
                    {herbaOptions.map((h) => ingredientName(h).replace(' Herba Mystica', '')).join(' / ')} Herba Mystica
                  </span>
                </span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MealCard({ meal }: { meal: Meal }) {
  const isBP = meal.currency === Currency.BP;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {meal.shop}
          </p>
          <h3 className="text-base font-black text-gray-950 dark:text-white">
            {meal.name}
          </h3>
        </div>
        <div
          className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${
            isBP
              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300'
              : 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300'
          }`}
        >
          {isBP ? (
            <Star className="h-3 w-3" />
          ) : (
            <Coins className="h-3 w-3" />
          )}
          {meal.cost.toLocaleString()} {isBP ? 'BP' : '₽'}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {meal.powers.map((p, i) => (
          <PowerBadge key={i} power={p} />
        ))}
      </div>

      <div className="flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{meal.towns.join(', ')}</span>
      </div>
    </div>
  );
}

function PowerSelector({
  slot,
  index,
  onChange,
  onRemove,
}: {
  slot: PowerSlot;
  index: number;
  onChange: (slot: PowerSlot) => void;
  onRemove: () => void;
}) {
  const needsType = mealPowerHasType(slot.mealPower);
  const typeColor = needsType ? TYPE_COLORS[slot.type] : undefined;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {/* Row 1: index + power + remove */}
      <div className="flex items-center gap-2">
        <span className="w-5 shrink-0 text-center text-xs font-black text-gray-400">
          {index + 1}
        </span>
        <select
          value={slot.mealPower}
          onChange={(e) =>
            onChange({ ...slot, mealPower: Number(e.target.value) as MealPower })
          }
          className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm font-medium text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          {ALL_MEAL_POWERS.map((mp) => (
            <option key={mp} value={mp}>
              {MEAL_POWER_NAMES[mp]}
            </option>
          ))}
        </select>
        <button
          onClick={onRemove}
          className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          aria-label="Remove power"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Row 2: type + level (indented to align under the select) */}
      <div className="mt-2 flex gap-2 pl-7">
        {needsType && (
          <select
            value={slot.type}
            onChange={(e) =>
              onChange({ ...slot, type: Number(e.target.value) as TypeIndex })
            }
            className="min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-sm font-semibold"
            style={{
              borderColor: typeColor,
              backgroundColor: typeColor ? `${typeColor}22` : undefined,
              color: typeColor,
            }}
          >
            {ALL_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_NAMES[t]}
              </option>
            ))}
          </select>
        )}
        <select
          value={slot.level}
          onChange={(e) =>
            onChange({ ...slot, level: Number(e.target.value) as 1 | 2 | 3 })
          }
          className="w-20 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm font-medium text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          {LEVEL_OPTIONS.map((l) => (
            <option key={l} value={l}>
              Lv. {l}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

type Tab = 'recipes' | 'meals';

export default function SandwichPage() {
  const [slots, setSlots] = useState<PowerSlot[]>([]);
  const [tab, setTab] = useState<Tab>('recipes');
  const [includeKitakami, setIncludeKitakami] = useState(true);
  const [includeBlueberry, setIncludeBlueberry] = useState(true);

  const targetPowers: TargetPower[] = slots.map((s) => ({
    mealPower: s.mealPower,
    type: s.type,
    level: s.level,
  }));

  const recipes = getRecipesForPowers(targetPowers);
  const shinyRecipes: ShinyRecipeGroup[] = getShinyRecipesForPowers(targetPowers);
  const meals = getMealsForPowers(targetPowers, {
    kitakami: includeKitakami,
    blueberry: includeBlueberry,
  });

  const addSlot = () => {
    if (slots.length < 3) setSlots([...slots, defaultSlot()]);
  };

  const updateSlot = (i: number, slot: PowerSlot) => {
    setSlots(slots.map((s, idx) => (idx === i ? slot : s)));
  };

  const removeSlot = (i: number) => {
    setSlots(slots.filter((_, idx) => idx !== i));
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 pb-10">
      <div className="mb-5">
        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-violet-50 text-violet-500 dark:bg-violet-950/40 dark:text-violet-300">
          <ChefHat className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-gray-950 dark:text-white">
          Sandwich Maker
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
          Find recipes and meals that grant the meal powers you want.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Left: power selector */}
        <div className="space-y-3">
          <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
            Desired Powers
          </p>

          <div className="space-y-2">
            {slots.map((slot, i) => (
              <PowerSelector
                key={i}
                slot={slot}
                index={i}
                onChange={(s) => updateSlot(i, s)}
                onRemove={() => removeSlot(i)}
              />
            ))}
          </div>

          {slots.length < 3 && (
            <button
              onClick={addSlot}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 py-2 text-sm font-semibold text-gray-500 hover:border-violet-400 hover:text-violet-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-violet-500 dark:hover:text-violet-400"
            >
              <Plus className="h-4 w-4" />
              {slots.length === 0 ? 'Select a power to search' : 'Add another power'}
            </button>
          )}

          {/* Meal region filters */}
          <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Meal regions (DLC)
            </p>
            <label className="flex cursor-pointer items-center gap-2 py-1">
              <input
                type="checkbox"
                checked={includeKitakami}
                onChange={(e) => setIncludeKitakami(e.target.checked)}
                className="accent-violet-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Kitakami (The Teal Mask)
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 py-1">
              <input
                type="checkbox"
                checked={includeBlueberry}
                onChange={(e) => setIncludeBlueberry(e.target.checked)}
                className="accent-violet-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Blueberry Academy (The Indigo Disk)
              </span>
            </label>
          </div>
        </div>

        {/* Right: results */}
        <div>
          {slots.length === 0 ? (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 p-10 text-center dark:border-gray-800">
              <ChefHat className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-700" />
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                Select at least one power to find matching recipes and meals.
              </p>
              <button
                onClick={addSlot}
                className="mt-4 flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700"
              >
                <Plus className="h-4 w-4" />
                Add a power
              </button>
            </div>
          ) : (
            <>
              <div className="mb-4 flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-900/50">
                {(['recipes', 'meals'] as Tab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 rounded-lg px-4 py-2 text-sm font-bold capitalize transition-colors ${
                      tab === t
                        ? 'bg-white text-gray-950 shadow-sm dark:bg-gray-800 dark:text-white'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    {t}
                    <span
                      className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                        tab === t
                          ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300'
                          : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {t === 'recipes'
                        ? recipes.length + shinyRecipes.reduce((n, g) => n + collapseHerbaVariants(g.recipes).length, 0)
                        : meals.length}
                    </span>
                  </button>
                ))}
              </div>

              {tab === 'recipes' && (
                <div className="space-y-5">
                  {shinyRecipes.map((group) => {
                    const collapsed = collapseHerbaVariants(group.recipes);
                    return (
                      <div key={group.tag}>
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">
                          <Sparkles className="h-3.5 w-3.5" />
                          {group.label}
                        </p>
                        <div className="space-y-2">
                          {collapsed.map(({ recipe, herbaOptions }, i) => (
                            <RecipeCard key={`${group.tag}-${recipe.number}-${i}`} recipe={recipe} shiny herbaOptions={herbaOptions} />
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {recipes.length > 0 && (
                    <div>
                      {shinyRecipes.length > 0 && (
                        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                          Official Recipes
                        </p>
                      )}
                      <div className="space-y-2">
                        {recipes.map((r) => <RecipeCard key={r.number} recipe={r} />)}
                      </div>
                    </div>
                  )}

                  {recipes.length === 0 && shinyRecipes.length === 0 && (
                    <EmptyState
                      message="No recipes match these powers."
                      hint="Try adjusting the level or power combination."
                    />
                  )}
                </div>
              )}

              {tab === 'meals' && (
                <div className="space-y-3">
                  {meals.length === 0 ? (
                    <EmptyState
                      message="No meals match these powers."
                      hint="Try adjusting the level, enabling more regions, or changing the power."
                    />
                  ) : (
                    meals.map((m) => <MealCard key={m.name} meal={m} />)
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message, hint }: { message: string; hint: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center dark:border-gray-800">
      <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
        {message}
      </p>
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{hint}</p>
    </div>
  );
}
