'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChefHat,
  Coins,
  MapPin,
  Minus,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import Link from 'next/link';
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
import {
  calculateSandwichIngredientTotals,
  getRankedTotals,
  SANDWICH_FLAVORS,
  SANDWICH_INGREDIENT_SOURCE_URL,
  SANDWICH_INGREDIENTS,
  type SandwichIngredient,
  type SandwichIngredientSelection,
  type SandwichIngredientType,
} from '@/lib/sandwich/ingredients';

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

const ALL_FLAVORS = SANDWICH_FLAVORS.map((flavor) => flavor.id);
const LEVEL_OPTIONS = [1, 2, 3] as const;
const MAX_FILLINGS = 6;
const MAX_CONDIMENTS = 4;

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

function IngredientBuilderView() {
  const [selection, setSelection] = useState<SandwichIngredientSelection>({});
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<IngredientFilter>('all');

  const totals = useMemo(
    () => calculateSandwichIngredientTotals(selection),
    [selection],
  );

  const selectedIngredients = SANDWICH_INGREDIENTS.filter(
    (ingredient) => (selection[ingredient.id] ?? 0) > 0,
  );

  const topFlavors = getRankedTotals(totals.flavors, ALL_FLAVORS, 5);
  const topTypes = getRankedTotals(totals.types, ALL_TYPES, 6);
  const topPowers = getRankedTotals(totals.mealPowers, ALL_MEAL_POWERS, 6);
  const maxFlavorValue = Math.max(1, ...topFlavors.map((item) => item.value));

  const filteredIngredients = SANDWICH_INGREDIENTS.filter((ingredient) => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery =
      !normalizedQuery ||
      ingredientName(ingredient.id).toLowerCase().includes(normalizedQuery);
    const matchesFilter =
      filter === 'all' ||
      (filter === 'herba'
        ? ingredient.isHerbaMystica
        : ingredient.ingredientType === filter);
    return matchesQuery && matchesFilter;
  });

  const canAddIngredient = (ingredient: SandwichIngredient) => {
    if (ingredient.ingredientType === 'filling') {
      return totals.fillingCount < MAX_FILLINGS;
    }
    return totals.condimentCount < MAX_CONDIMENTS;
  };

  const updateIngredient = (ingredient: SandwichIngredient, delta: number) => {
    setSelection((current) => {
      const currentCount = current[ingredient.id] ?? 0;
      if (delta > 0 && !canAddIngredient(ingredient)) return current;

      const nextCount = Math.max(0, currentCount + delta);
      const next = { ...current };
      if (nextCount === 0) {
        delete next[ingredient.id];
      } else {
        next[ingredient.id] = nextCount;
      }
      return next;
    });
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <aside className="space-y-4">
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-violet-500">
                Current Sandwich
              </p>
              <h2 className="mt-1 text-lg font-black text-gray-950 dark:text-white">
                {totals.fillingCount}/{MAX_FILLINGS} fillings /{' '}
                {totals.condimentCount}/{MAX_CONDIMENTS} condiments
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setSelection({})}
              className="grid h-9 w-9 place-items-center rounded-lg bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
              aria-label="Clear sandwich"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Stat label="Items" value={totals.ingredientCount.toString()} />
            <Stat label="Pieces" value={totals.pieceCount.toString()} />
            <Stat label="Herba" value={totals.herbaCount.toString()} />
          </div>

          {selectedIngredients.length > 0 && (
            <div className="mt-4 space-y-2">
              {selectedIngredients.map((ingredient) => (
                <SelectedIngredientRow
                  key={ingredient.id}
                  ingredient={ingredient}
                  count={selection[ingredient.id] ?? 0}
                  canIncrease={canAddIngredient(ingredient)}
                  onDecrease={() => updateIngredient(ingredient, -1)}
                  onIncrease={() => updateIngredient(ingredient, 1)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
            Flavor Totals
          </h2>
          <div className="space-y-3">
            {SANDWICH_FLAVORS.map((flavor) => {
              const points = totals.flavors[flavor.id];
              return (
                <div key={flavor.id}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-600 dark:text-gray-300">
                      {flavor.label}
                    </span>
                    <span className="font-semibold tabular-nums text-gray-400">
                      {points}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className={`h-full rounded-full ${flavor.className}`}
                      style={{
                        width: `${Math.min(100, (points / maxFlavorValue) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
            Boost Leaders
          </h2>
          <RankedBoostList
            title="Types"
            items={topTypes.map((item) => ({
              key: item.id,
              label: TYPE_NAMES[item.id],
              value: item.value,
              color: TYPE_COLORS[item.id],
            }))}
          />
          <RankedBoostList
            title="Meal Powers"
            items={topPowers.map((item) => ({
              key: item.id,
              label: MEAL_POWER_NAMES[item.id],
              value: item.value,
            }))}
          />
        </section>
      </aside>

      <main>
        <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1">
            <label htmlFor="sandwich-ingredient-search" className="sr-only">
              Search ingredients
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              id="sandwich-ingredient-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search ingredients"
              className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-100 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:border-violet-700 dark:focus:ring-violet-950"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              ['all', 'All'],
              ['filling', 'Fillings'],
              ['condiment', 'Condiments'],
              ['herba', 'Herba'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value as IngredientFilter)}
                aria-pressed={filter === value}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  filter === value
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="grid grid-cols-[minmax(150px,1fr)_72px_72px_96px_96px_84px] gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:border-gray-800 dark:bg-gray-900/80 max-lg:hidden">
            <span>Ingredient</span>
            <span className="text-center">Kind</span>
            <span className="text-center">Pieces</span>
            <span className="text-center">Top Type</span>
            <span className="text-center">Top Power</span>
            <span className="text-center">Qty</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredIngredients.map((ingredient) => (
              <IngredientRow
                key={ingredient.id}
                ingredient={ingredient}
                count={selection[ingredient.id] ?? 0}
                canAdd={canAddIngredient(ingredient)}
                onAdd={() => updateIngredient(ingredient, 1)}
                onRemove={() => updateIngredient(ingredient, -1)}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/70">
      <p className="text-lg font-black tabular-nums text-gray-950 dark:text-white">
        {value}
      </p>
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
        {label}
      </p>
    </div>
  );
}

function RankedBoostList({
  title,
  items,
}: {
  title: string;
  items: { key: number; label: string; value: number; color?: string }[];
}) {
  return (
    <div className="mb-4 last:mb-0">
      <p className="mb-2 text-xs font-bold text-gray-500 dark:text-gray-400">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">No positive boosts yet.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              key={item.key}
              className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300"
              style={
                item.color
                  ? { backgroundColor: `${item.color}26`, color: item.color }
                  : undefined
              }
            >
              {item.label}{' '}
              <span className="tabular-nums opacity-70">{item.value}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SelectedIngredientRow({
  ingredient,
  count,
  canIncrease,
  onDecrease,
  onIncrease,
}: {
  ingredient: SandwichIngredient;
  count: number;
  canIncrease: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-2 dark:bg-gray-800/70">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-100 text-xs font-black text-violet-600 dark:bg-violet-950/50 dark:text-violet-300">
        {count}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-gray-700 dark:text-gray-200">
          {ingredientName(ingredient.id)}
        </span>
        <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">
          {ingredient.ingredientType}
        </span>
      </span>
      <button
        type="button"
        onClick={onDecrease}
        className="grid h-8 w-8 place-items-center rounded-lg bg-white text-gray-500 shadow-sm hover:text-gray-900 dark:bg-gray-900 dark:text-gray-300 dark:hover:text-white"
        aria-label={`Remove ${ingredientName(ingredient.id)}`}
      >
        <Minus className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onIncrease}
        disabled={!canIncrease}
        className="grid h-8 w-8 place-items-center rounded-lg bg-white text-violet-500 shadow-sm hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-gray-900 dark:text-violet-300 dark:hover:text-violet-200"
        aria-label={`Add ${ingredientName(ingredient.id)}`}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function topVectorLabel(
  vector: number[],
  labels: Record<number, string>,
  ids: readonly number[],
) {
  const top = ids
    .map((id) => ({ id, value: vector[id] ?? 0 }))
    .sort((a, b) => b.value - a.value || a.id - b.id)[0];
  if (!top || top.value <= 0) return 'None';
  return `${labels[top.id]} ${top.value}`;
}

function IngredientRow({
  ingredient,
  count,
  canAdd,
  onAdd,
  onRemove,
}: {
  ingredient: SandwichIngredient;
  count: number;
  canAdd: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const topType = topVectorLabel(ingredient.typeVector, TYPE_NAMES, ALL_TYPES);
  const topPower = topVectorLabel(
    ingredient.baseMealPowerVector,
    MEAL_POWER_NAMES,
    ALL_MEAL_POWERS,
  );

  return (
    <div
      className={`grid gap-2 px-3 py-2.5 transition-colors lg:grid-cols-[minmax(150px,1fr)_72px_72px_96px_96px_84px] lg:items-center ${
        count > 0
          ? 'bg-violet-50/70 dark:bg-violet-950/20'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <IngredientImage id={ingredient.id} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-gray-950 dark:text-white">
            {ingredientName(ingredient.id)}
          </h3>
          <div className="mt-1 flex flex-wrap gap-1 lg:hidden">
            <MiniPill label={ingredient.ingredientType} />
            <MiniPill label={`${ingredient.pieces} pieces`} />
            {ingredient.isHerbaMystica && <MiniPill label="Herba" />}
          </div>
        </div>
      </div>

      <p className="hidden text-center text-xs font-black uppercase tracking-wide text-gray-500 dark:text-gray-400 lg:block">
        {ingredient.isHerbaMystica ? 'Herba' : ingredient.ingredientType}
      </p>
      <p className="hidden text-center text-sm font-black tabular-nums text-gray-700 dark:text-gray-200 lg:block">
        {ingredient.pieces}
      </p>
      <p className="hidden text-center text-xs font-bold text-gray-500 dark:text-gray-400 lg:block">
        {topType}
      </p>
      <p className="hidden text-center text-xs font-bold text-gray-500 dark:text-gray-400 lg:block">
        {topPower}
      </p>

      <div className="grid grid-cols-[36px_1fr_36px] items-center gap-1 lg:grid-cols-[24px_28px_24px]">
        <button
          type="button"
          onClick={onRemove}
          disabled={count === 0}
          className="grid h-9 w-9 place-items-center rounded-lg bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white lg:h-7 lg:w-7"
          aria-label={`Remove ${ingredientName(ingredient.id)}`}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="text-center text-sm font-black tabular-nums text-gray-900 dark:text-white">
          {count}
        </span>
        <button
          type="button"
          onClick={onAdd}
          disabled={!canAdd}
          className="grid h-9 w-9 place-items-center rounded-lg bg-violet-600 text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40 lg:h-7 lg:w-7"
          aria-label={`Add ${ingredientName(ingredient.id)}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function IngredientImage({ id }: { id: string }) {
  const src = ingredientImageSrc(id);
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gray-100 dark:bg-gray-800">
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-8 w-8 object-contain" />
      )}
    </span>
  );
}

function MiniPill({ label }: { label: string }) {
  return (
    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-300">
      {label}
    </span>
  );
}

type PageMode = 'finder' | 'ingredients';
type Tab = 'recipes' | 'meals';
type IngredientFilter = 'all' | SandwichIngredientType | 'herba';

export default function SandwichPage() {
  const [slots, setSlots] = useState<PowerSlot[]>([]);
  const [pageMode, setPageMode] = useState<PageMode>('finder');
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
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            href="/tools"
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Tools
          </Link>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-violet-50 text-violet-500 dark:bg-violet-950/40 dark:text-violet-300">
            <ChefHat className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-950 dark:text-white">
            Sandwich Maker
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Find Scarlet/Violet recipes, meals, and ingredient boost totals.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={SANDWICH_INGREDIENT_SOURCE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-bold text-gray-600 shadow-sm hover:border-violet-300 hover:text-violet-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-violet-700 dark:hover:text-violet-300"
          >
            Data: Serebii
          </a>
        </div>
      </div>

      <div className="mb-5 flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-900/50">
        {[
          ['finder', 'Power Finder'],
          ['ingredients', 'Ingredient Builder'],
        ].map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            onClick={() => setPageMode(mode as PageMode)}
            aria-pressed={pageMode === mode}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
              pageMode === mode
                ? 'bg-white text-gray-950 shadow-sm dark:bg-gray-800 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {pageMode === 'ingredients' ? (
        <IngredientBuilderView />
      ) : (
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
      )}
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
