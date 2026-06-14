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

// ─────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────

const VARIABLE_HERBA = new Set(['hmswt', 'hmspc', 'hmsr']);

const ALL_MEAL_POWERS = Object.values(MealPower).filter(
  (v): v is MealPower => typeof v === 'number',
);
const ALL_TYPES = Object.values(TypeIndex)
  .filter((v): v is TypeIndex => typeof v === 'number')
  .filter((v) => v !== TypeIndex.ALL_TYPES);
const ALL_FLAVORS = SANDWICH_FLAVORS.map((f) => f.id);
const LEVEL_OPTIONS = [1, 2, 3] as const;
const MAX_FILLINGS = 6;
const MAX_CONDIMENTS = 4;

type PageMode = 'finder' | 'ingredients';
type Tab = 'recipes' | 'meals';
type IngredientFilter = 'all' | SandwichIngredientType | 'herba';

const FILTER_PILLS: [IngredientFilter, string][] = [
  ['all', 'All'],
  ['filling', 'Fillings'],
  ['condiment', 'Condiments'],
  ['herba', 'Herba'],
];

const MODE_TABS: [PageMode, string][] = [
  ['finder', 'Power Finder'],
  ['ingredients', 'Ingredient Builder'],
];

interface CollapsedRecipe {
  recipe: SandwichRecipe;
  herbaOptions: string[];
}

interface PowerSlot {
  mealPower: MealPower;
  type: TypeIndex;
  level: 1 | 2 | 3;
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

const defaultSlot = (): PowerSlot => ({
  mealPower: MealPower.ENCOUNTER,
  type: TypeIndex.DRAGON,
  level: 1,
});

// ─────────────────────────────────────────────────
// Shared micro-components
// ─────────────────────────────────────────────────

function PowerBadge({ power }: { power: TargetPower }) {
  const needsType = mealPowerHasType(power.mealPower);
  const color = needsType ? TYPE_COLORS[power.type] : '#7c3aed';
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white"
      style={{ backgroundColor: color }}
    >
      {MEAL_POWER_NAMES[power.mealPower]}
      {needsType && ` ${TYPE_NAMES[power.type]}`}
      <span className="opacity-70">Lv.{power.level}</span>
    </span>
  );
}

function IngredientImage({ id }: { id: string }) {
  const src = ingredientImageSrc(id);
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#2f2b40]">
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-7 w-7 object-contain" />
      )}
    </span>
  );
}

function IngredientItem({ id }: { id: string }) {
  const src = ingredientImageSrc(id);
  return (
    <span className="inline-flex items-center gap-1.5">
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-5 w-5 object-contain" />
      )}
      <span className="text-[10px] font-bold uppercase tracking-wide text-[#c8c0d8]">
        {ingredientName(id)}
      </span>
    </span>
  );
}

function FlavorDots({ flavorVector }: { flavorVector: number[] }) {
  const top = SANDWICH_FLAVORS
    .map((f) => ({ flavor: f, value: flavorVector[f.id] ?? 0 }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 2);
  if (top.length === 0) return <span className="text-[10px] text-[#3d3456]">—</span>;
  return (
    <span className="flex items-center gap-2">
      {top.map(({ flavor, value }) => (
        <span key={flavor.id} className="flex items-center gap-0.5">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: flavor.color }}
          />
          <span className="text-[10px] tabular-nums text-[#a09ab5]">{value}</span>
        </span>
      ))}
    </span>
  );
}

function MiniPill({ label, amber = false }: { label: string; amber?: boolean }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide ${
        amber ? 'bg-[#f8d85a]/15 text-[#f8d85a]' : 'bg-[#2f2b40] text-[#a09ab5]'
      }`}
    >
      {label}
    </span>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#13131e] px-3 py-2 text-center">
      <p className="text-sm font-black tabular-nums text-[#e8e4f0]">{value}</p>
      <p className="text-[9px] font-black uppercase tracking-widest text-[#6b6480]">{label}</p>
    </div>
  );
}

function EmptyState({ message, hint }: { message: string; hint: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#2f2b40] p-8 text-center">
      <p className="text-sm font-semibold text-[#a09ab5]">{message}</p>
      <p className="mt-1 text-xs text-[#6b6480]">{hint}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Recipe + Meal cards
// ─────────────────────────────────────────────────

function RecipeCard({
  recipe,
  shiny = false,
  herbaOptions = [],
}: {
  recipe: SandwichRecipe;
  shiny?: boolean;
  herbaOptions?: string[];
}) {
  const isNumbered = /^\d+$/.test(recipe.number);
  return (
    <div
      className={`rounded-xl border p-4 ${
        shiny
          ? 'border-[#f8d85a]/30 bg-[#1e1a10] ring-1 ring-[#f8d85a]/15'
          : 'border-[#2f2b40] bg-[#1a1a27]'
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          {isNumbered && (
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#6b6480]">
              #{recipe.number.padStart(3, '0')}
            </p>
          )}
          <h3 className="text-base font-black text-[#e8e4f0]">{recipe.name}</h3>
        </div>
        {shiny && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#f8d85a]/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#f8d85a]">
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
        <div className="flex items-start gap-1.5 text-xs text-[#6b6480]">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{recipe.gameLocation}</span>
        </div>
      )}

      {(recipe.fillings.length > 0 || recipe.condiments.length > 0 || herbaOptions.length > 0) && (
        <div className="mt-3 border-t border-[#2f2b40] pt-3">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            {[...recipe.fillings, ...recipe.condiments].map((id, i) => (
              <span key={`${id}-${i}`} className="inline-flex items-center gap-2">
                {i > 0 && (
                  <span className="text-[10px] font-black text-[#3d3456]">+</span>
                )}
                <IngredientItem id={id} />
              </span>
            ))}
            {herbaOptions.length > 0 && (
              <span className="inline-flex items-center gap-2">
                {(recipe.fillings.length > 0 || recipe.condiments.length > 0) && (
                  <span className="text-[10px] font-black text-[#3d3456]">+</span>
                )}
                <span className="inline-flex items-center gap-1">
                  {herbaOptions.map((h, i) => {
                    const src = ingredientImageSrc(h);
                    return (
                      <span key={h} className="inline-flex items-center gap-1">
                        {i > 0 && (
                          <span className="text-[10px] font-black text-[#3d3456]">/</span>
                        )}
                        {src && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={src} alt="" className="h-5 w-5 object-contain" />
                        )}
                      </span>
                    );
                  })}
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[#c8c0d8]">
                    {herbaOptions
                      .map((h) => ingredientName(h).replace(' Herba Mystica', ''))
                      .join(' / ')}{' '}
                    Herba Mystica
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
    <div className="rounded-xl border border-[#2f2b40] bg-[#1a1a27] p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#6b6480]">
            {meal.shop}
          </p>
          <h3 className="text-base font-black text-[#e8e4f0]">{meal.name}</h3>
        </div>
        <div
          className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${
            isBP
              ? 'bg-[#f8d85a]/10 text-[#f8d85a]'
              : 'bg-[#4ade80]/10 text-[#4ade80]'
          }`}
        >
          {isBP ? <Star className="h-3 w-3" /> : <Coins className="h-3 w-3" />}
          {meal.cost.toLocaleString()} {isBP ? 'BP' : '₽'}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {meal.powers.map((p, i) => (
          <PowerBadge key={i} power={p} />
        ))}
      </div>

      <div className="flex items-start gap-1.5 text-xs text-[#6b6480]">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{meal.towns.join(', ')}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Power Finder components
// ─────────────────────────────────────────────────

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
    <div className="rounded-xl border border-[#2f2b40] bg-[#1a1a27] p-3">
      <div className="flex items-center gap-2">
        <span className="w-5 shrink-0 text-center text-xs font-black text-[#6b6480]">
          {index + 1}
        </span>
        <select
          value={slot.mealPower}
          onChange={(e) =>
            onChange({ ...slot, mealPower: Number(e.target.value) as MealPower })
          }
          className="min-w-0 flex-1 rounded-lg border border-[#2f2b40] bg-[#13131e] px-2 py-1.5 text-sm font-medium text-[#e8e4f0] outline-none focus:border-violet-600"
        >
          {ALL_MEAL_POWERS.map((mp) => (
            <option key={mp} value={mp} style={{ background: '#13131e' }}>
              {MEAL_POWER_NAMES[mp]}
            </option>
          ))}
        </select>
        <button
          onClick={onRemove}
          className="shrink-0 rounded-lg p-1.5 text-[#6b6480] transition-colors hover:bg-[#2f2b40] hover:text-[#e8e4f0]"
          aria-label="Remove power"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 flex gap-2 pl-7">
        {needsType && (
          <select
            value={slot.type}
            onChange={(e) =>
              onChange({ ...slot, type: Number(e.target.value) as TypeIndex })
            }
            className="min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-sm font-semibold outline-none"
            style={{
              borderColor: typeColor,
              backgroundColor: typeColor ? `${typeColor}18` : '#13131e',
              color: typeColor,
            }}
          >
            {ALL_TYPES.map((t) => (
              <option key={t} value={t} style={{ color: '#e8e4f0', backgroundColor: '#13131e' }}>
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
          className="w-20 rounded-lg border border-[#2f2b40] bg-[#13131e] px-2 py-1.5 text-sm font-medium text-[#e8e4f0] outline-none focus:border-violet-600"
        >
          {LEVEL_OPTIONS.map((l) => (
            <option key={l} value={l} style={{ background: '#13131e' }}>
              Lv. {l}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Ingredient Builder components
// ─────────────────────────────────────────────────

function SlotIndicator({
  fillingCount,
  condimentCount,
}: {
  fillingCount: number;
  condimentCount: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1" title={`${fillingCount}/${MAX_FILLINGS} fillings`}>
        {Array.from({ length: MAX_FILLINGS }).map((_, i) => (
          <div
            key={i}
            className={`h-2.5 w-2.5 rounded-full transition-colors ${
              i < fillingCount ? 'bg-violet-500' : 'bg-[#2f2b40]'
            }`}
          />
        ))}
      </div>
      <div className="h-3 w-px bg-[#2f2b40]" />
      <div className="flex items-center gap-1" title={`${condimentCount}/${MAX_CONDIMENTS} condiments`}>
        {Array.from({ length: MAX_CONDIMENTS }).map((_, i) => (
          <div
            key={i}
            className={`h-2.5 w-2.5 rounded transition-colors ${
              i < condimentCount ? 'bg-amber-400' : 'bg-[#2f2b40]'
            }`}
          />
        ))}
      </div>
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
    <div className="flex items-center gap-2 rounded-lg bg-[#16162a] p-2">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet-900/50 text-xs font-black text-violet-300">
        {count}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-[#e8e4f0]">
          {ingredientName(ingredient.id)}
        </span>
        <span className="block text-[9px] font-bold uppercase tracking-widest text-[#6b6480]">
          {ingredient.isHerbaMystica ? 'Herba Mystica' : ingredient.ingredientType}
        </span>
      </span>
      <button
        type="button"
        onClick={onDecrease}
        className="grid h-7 w-7 place-items-center rounded-lg bg-[#2f2b40] text-[#a09ab5] transition-colors hover:text-[#e8e4f0]"
        aria-label={`Remove ${ingredientName(ingredient.id)}`}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onIncrease}
        disabled={!canIncrease}
        className="grid h-7 w-7 place-items-center rounded-lg bg-[#2f2b40] text-violet-400 transition-colors hover:text-violet-200 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={`Add ${ingredientName(ingredient.id)}`}
      >
        <Plus className="h-3.5 w-3.5" />
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
  const topPower = topVectorLabel(
    ingredient.baseMealPowerVector,
    MEAL_POWER_NAMES,
    ALL_MEAL_POWERS,
  );
  const isHerba = ingredient.isHerbaMystica;

  return (
    <div
      className={`grid gap-2 px-3 py-2.5 transition-colors lg:grid-cols-[minmax(150px,1fr)_80px_64px_120px_120px_80px] lg:items-center ${
        count > 0
          ? 'bg-[#1e1a30]'
          : isHerba
          ? 'bg-[#1e180e] hover:bg-[#22190f]'
          : 'hover:bg-[#16162a]'
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <IngredientImage id={ingredient.id} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-[#e8e4f0]">
            {ingredientName(ingredient.id)}
          </h3>
          <div className="mt-1 flex flex-wrap gap-1 lg:hidden">
            <MiniPill
              label={isHerba ? 'Herba' : ingredient.ingredientType}
              amber={isHerba}
            />
            <MiniPill label={`${ingredient.pieces} pcs`} />
          </div>
        </div>
      </div>

      <p className="hidden text-center text-xs font-black uppercase tracking-wide text-[#a09ab5] lg:block">
        {isHerba ? 'Herba' : ingredient.ingredientType}
      </p>
      <p className="hidden text-center text-sm font-black tabular-nums text-[#e8e4f0] lg:block">
        {ingredient.pieces}
      </p>
      <div className="hidden justify-center lg:flex">
        <FlavorDots flavorVector={ingredient.flavorVector} />
      </div>
      <p className="hidden text-center text-xs font-bold text-[#a09ab5] lg:block">
        {topPower}
      </p>

      <div className="grid grid-cols-[36px_1fr_36px] items-center gap-1 lg:grid-cols-[24px_28px_24px]">
        <button
          type="button"
          onClick={onRemove}
          disabled={count === 0}
          className="grid h-9 w-9 place-items-center rounded-lg bg-[#2f2b40] text-[#a09ab5] transition-colors hover:bg-[#3a3558] hover:text-[#e8e4f0] disabled:cursor-not-allowed disabled:opacity-40 lg:h-7 lg:w-7"
          aria-label={`Remove ${ingredientName(ingredient.id)}`}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="text-center text-sm font-black tabular-nums text-[#e8e4f0]">
          {count}
        </span>
        <button
          type="button"
          onClick={onAdd}
          disabled={!canAdd}
          className="grid h-9 w-9 place-items-center rounded-lg bg-violet-700 text-white transition-colors hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-40 lg:h-7 lg:w-7"
          aria-label={`Add ${ingredientName(ingredient.id)}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Ingredient Builder view
// ─────────────────────────────────────────────────

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
  const topTypes = getRankedTotals(totals.types, ALL_TYPES, 8);
  const topPowers = getRankedTotals(totals.mealPowers, ALL_MEAL_POWERS, 5);
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
    <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
      {/* Sidebar */}
      <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
        {/* Current sandwich */}
        <section className="rounded-xl border border-[#2f2b40] bg-[#1a1a27] p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-violet-400">
                Current Sandwich
              </p>
              <div className="mt-2.5">
                <SlotIndicator
                  fillingCount={totals.fillingCount}
                  condimentCount={totals.condimentCount}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelection({})}
              className="grid h-8 w-8 place-items-center rounded-lg bg-[#2f2b40] text-[#a09ab5] transition-colors hover:bg-[#3a3558] hover:text-[#e8e4f0]"
              aria-label="Clear sandwich"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            <StatChip label="Fillings" value={`${totals.fillingCount}/${MAX_FILLINGS}`} />
            <StatChip label="Condiment" value={`${totals.condimentCount}/${MAX_CONDIMENTS}`} />
            <StatChip label="Herba" value={totals.herbaCount.toString()} />
          </div>

          {selectedIngredients.length > 0 ? (
            <div className="space-y-1.5">
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
          ) : (
            <p className="py-3 text-center text-xs text-[#6b6480]">
              Add ingredients from the table →
            </p>
          )}
        </section>

        {/* Flavor totals */}
        <section className="rounded-xl border border-[#2f2b40] bg-[#1a1a27] p-4">
          <h2 className="mb-3 text-[10px] font-black uppercase tracking-widest text-[#6b6480]">
            Flavor Totals
          </h2>
          <div className="space-y-3">
            {SANDWICH_FLAVORS.map((flavor) => {
              const points = totals.flavors[flavor.id];
              const pct = Math.min(100, (points / maxFlavorValue) * 100);
              return (
                <div key={flavor.id}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-bold" style={{ color: flavor.color }}>
                      {flavor.label}
                    </span>
                    <span className="tabular-nums text-[#6b6480]">{points}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#2f2b40]">
                    <div
                      className="h-full rounded-full transition-all duration-200"
                      style={{ width: `${pct}%`, backgroundColor: flavor.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Boost leaders */}
        <section className="rounded-xl border border-[#2f2b40] bg-[#1a1a27] p-4">
          <h2 className="mb-3 text-[10px] font-black uppercase tracking-widest text-[#6b6480]">
            Boost Leaders
          </h2>

          <div className="mb-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#6b6480]">
              Types
            </p>
            {topTypes.length === 0 ? (
              <p className="text-xs text-[#6b6480]">No boosts yet</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {topTypes.map((item) => (
                  <span
                    key={item.id}
                    className="rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{
                      backgroundColor: `${TYPE_COLORS[item.id]}22`,
                      color: TYPE_COLORS[item.id],
                    }}
                  >
                    {TYPE_NAMES[item.id]}{' '}
                    <span className="tabular-nums opacity-80">{item.value}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#6b6480]">
              Meal Powers
            </p>
            {topPowers.length === 0 ? (
              <p className="text-xs text-[#6b6480]">No boosts yet</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {topPowers.map((item) => (
                  <span
                    key={item.id}
                    className="rounded-full bg-violet-900/40 px-2 py-0.5 text-xs font-semibold text-violet-300"
                  >
                    {MEAL_POWER_NAMES[item.id]}{' '}
                    <span className="tabular-nums opacity-80">{item.value}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      </aside>

      {/* Ingredient table */}
      <main>
        <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <label htmlFor="sandwich-ingredient-search" className="sr-only">
              Search ingredients
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b6480]" />
            <input
              id="sandwich-ingredient-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ingredients…"
              className="h-10 w-full rounded-lg border border-[#2f2b40] bg-[#13131e] pl-9 pr-3 text-sm text-[#e8e4f0] outline-none placeholder:text-[#6b6480] focus:border-violet-600 focus:ring-1 focus:ring-violet-600/40"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {FILTER_PILLS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  filter === value
                    ? value === 'herba'
                      ? 'bg-[#f8d85a]/15 text-[#f8d85a]'
                      : 'bg-violet-700 text-white'
                    : 'bg-[#2f2b40] text-[#a09ab5] hover:bg-[#3a3558] hover:text-[#e8e4f0]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <section className="overflow-hidden rounded-xl border border-[#2f2b40] bg-[#1a1a27]">
          <div className="grid grid-cols-[minmax(150px,1fr)_80px_64px_120px_120px_80px] gap-2 border-b border-[#2f2b40] bg-[#13131e] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#6b6480] max-lg:hidden">
            <span>Ingredient</span>
            <span className="text-center">Kind</span>
            <span className="text-center">Pieces</span>
            <span className="text-center">Top Flavors</span>
            <span className="text-center">Top Power</span>
            <span className="text-center">Qty</span>
          </div>
          <div className="divide-y divide-[#2f2b40]">
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

// ─────────────────────────────────────────────────
// Page root
// ─────────────────────────────────────────────────

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
  const updateSlot = (i: number, slot: PowerSlot) =>
    setSlots(slots.map((s, idx) => (idx === i ? slot : s)));
  const removeSlot = (i: number) =>
    setSlots(slots.filter((_, idx) => idx !== i));

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 pb-10">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            href="/tools"
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#6b6480] hover:text-[#e8e4f0]"
          >
            <ArrowLeft className="h-4 w-4" />
            Tools
          </Link>
          <div className="mb-2 grid h-11 w-11 place-items-center rounded-xl bg-violet-900/40 text-violet-400">
            <ChefHat className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#e8e4f0]">
            Sandwich Maker
          </h1>
          <p className="mt-1 text-sm text-[#6b6480]">
            Find Scarlet/Violet recipes, meals, and ingredient boost totals.
          </p>
        </div>

        <a
          href={SANDWICH_INGREDIENT_SOURCE_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center gap-1.5 self-start rounded-lg border border-[#2f2b40] bg-[#1a1a27] px-3 text-sm font-bold text-[#a09ab5] transition-colors hover:border-violet-600 hover:text-violet-400"
        >
          Data: Serebii
        </a>
      </div>

      {/* Mode tabs */}
      <div className="mb-5 flex gap-1 rounded-xl border border-[#2f2b40] bg-[#13131e] p-1">
        {MODE_TABS.map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            onClick={() => setPageMode(mode)}
            aria-pressed={pageMode === mode}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
              pageMode === mode
                ? 'bg-[#1a1a27] text-[#e8e4f0] shadow-sm'
                : 'text-[#6b6480] hover:text-[#a09ab5]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {pageMode === 'ingredients' ? (
        <IngredientBuilderView />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
          {/* Left: power selectors */}
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#6b6480]">
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
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#2f2b40] py-2.5 text-sm font-semibold text-[#6b6480] transition-colors hover:border-violet-600 hover:text-violet-400"
              >
                <Plus className="h-4 w-4" />
                {slots.length === 0 ? 'Select a power to search' : 'Add another power'}
              </button>
            )}

            {/* Region filters */}
            <div className="rounded-xl border border-[#2f2b40] bg-[#1a1a27] p-3">
              <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-[#6b6480]">
                Meal regions (DLC)
              </p>
              <label className="flex cursor-pointer items-center gap-2 py-1">
                <input
                  type="checkbox"
                  checked={includeKitakami}
                  onChange={(e) => setIncludeKitakami(e.target.checked)}
                  className="accent-violet-600"
                />
                <span className="text-sm text-[#a09ab5]">Kitakami (The Teal Mask)</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 py-1">
                <input
                  type="checkbox"
                  checked={includeBlueberry}
                  onChange={(e) => setIncludeBlueberry(e.target.checked)}
                  className="accent-violet-600"
                />
                <span className="text-sm text-[#a09ab5]">
                  Blueberry Academy (The Indigo Disk)
                </span>
              </label>
            </div>
          </div>

          {/* Right: results */}
          <div>
            {slots.length === 0 ? (
              <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-[#2f2b40] p-10 text-center">
                <ChefHat className="mb-3 h-10 w-10 text-[#2f2b40]" />
                <p className="text-sm font-semibold text-[#6b6480]">
                  Select at least one power to find matching recipes and meals.
                </p>
                <button
                  onClick={addSlot}
                  className="mt-4 flex items-center gap-1.5 rounded-lg bg-violet-700 px-4 py-2 text-sm font-bold text-white hover:bg-violet-600"
                >
                  <Plus className="h-4 w-4" />
                  Add a power
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4 flex gap-1 rounded-xl border border-[#2f2b40] bg-[#13131e] p-1">
                  {(['recipes', 'meals'] as Tab[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`flex-1 rounded-lg px-4 py-2 text-sm font-bold capitalize transition-colors ${
                        tab === t
                          ? 'bg-[#1a1a27] text-[#e8e4f0] shadow-sm'
                          : 'text-[#6b6480] hover:text-[#a09ab5]'
                      }`}
                    >
                      {t}
                      <span
                        className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                          tab === t
                            ? 'bg-violet-900/60 text-violet-300'
                            : 'bg-[#2f2b40] text-[#6b6480]'
                        }`}
                      >
                        {t === 'recipes'
                          ? recipes.length +
                            shinyRecipes.reduce(
                              (n, g) => n + collapseHerbaVariants(g.recipes).length,
                              0,
                            )
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
                          <p className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#f8d85a]">
                            <Sparkles className="h-3.5 w-3.5" />
                            {group.label}
                          </p>
                          <div className="space-y-2">
                            {collapsed.map(({ recipe, herbaOptions }, i) => (
                              <RecipeCard
                                key={`${group.tag}-${recipe.number}-${i}`}
                                recipe={recipe}
                                shiny
                                herbaOptions={herbaOptions}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {recipes.length > 0 && (
                      <div>
                        {shinyRecipes.length > 0 && (
                          <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-[#6b6480]">
                            Official Recipes
                          </p>
                        )}
                        <div className="space-y-2">
                          {recipes.map((r) => (
                            <RecipeCard key={r.number} recipe={r} />
                          ))}
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
