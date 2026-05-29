"use client";

import { useState } from "react";
import { useLivingDexEntries } from "@/hooks/usePokemon";
import { useGenerationFilter } from "@/hooks/useGeneration";
import {
  GEN_FILTER_VALUES,
  type GenerationFilter,
  type PokemonType,
} from "@/types/pokemon";
import { compareLivingDexEntries, isHomeTrackedEntry } from "@/lib/livingDex";
import { PokemonCard } from "./PokemonCard";
import { CheckIcon, ChevronDownIcon } from "@/components/ui";

const GEN_LABELS: Record<(typeof GEN_FILTER_VALUES)[number], string> = {
  all: "All",
  1: "Gen I",
  2: "Gen II",
  3: "Gen III",
  4: "Gen IV",
  5: "Gen V",
  6: "Gen VI",
  7: "Gen VII",
  8: "Gen VIII",
  9: "Gen IX",
};

const TYPE_FILTER_VALUES: PokemonType[] = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
];

type SortMode = "dex" | "name";
type DexTargetFilters = {
  showCosmeticForms: boolean;
  showGenderForms: boolean;
  showGigantamaxForms: boolean;
};

type Props = {
  onSelect: (speciesId: number, formName: string | null) => void;
  search: string;
  filtersOpen: boolean;
};

type SelectControlProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
};

const toggleBaseClass =
  "inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fc5ff] sm:h-8";
const DEX_TARGET_FILTERS_KEY = "amanita-dex-target-filters";
const DEFAULT_DEX_TARGET_FILTERS: DexTargetFilters = {
  showCosmeticForms: false,
  showGenderForms: false,
  showGigantamaxForms: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readDexTargetFilters(): DexTargetFilters {
  if (typeof window === "undefined") return DEFAULT_DEX_TARGET_FILTERS;
  try {
    const stored = window.localStorage.getItem(DEX_TARGET_FILTERS_KEY);
    if (!stored) return DEFAULT_DEX_TARGET_FILTERS;
    const parsed: unknown = JSON.parse(stored);
    if (!isRecord(parsed)) return DEFAULT_DEX_TARGET_FILTERS;
    return {
      showCosmeticForms: parsed.showCosmeticForms === true,
      showGenderForms: parsed.showGenderForms === true,
      showGigantamaxForms: parsed.showGigantamaxForms === true,
    };
  } catch {
    return DEFAULT_DEX_TARGET_FILTERS;
  }
}

function saveDexTargetFilters(filters: DexTargetFilters): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEX_TARGET_FILTERS_KEY, JSON.stringify(filters));
}

function SelectControl({
  id,
  label,
  value,
  onChange,
  children,
}: SelectControlProps) {
  return (
    <div className="min-w-0">
      <label
        className="mb-1 block text-[10px] font-bold uppercase text-[#8f8799]"
        htmlFor={id}
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-full appearance-none rounded-lg border border-[#343047] bg-[#0f1421] px-3 pr-9 text-xs font-bold text-[#f8f0df] outline-none transition-colors hover:border-[#514874] focus:ring-2 focus:ring-[#8fc5ff] sm:h-8"
        >
          {children}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8f8799]" />
      </div>
    </div>
  );
}

export function PokemonGrid({ onSelect, search, filtersOpen }: Props) {
  const { data, isLoading, error } = useLivingDexEntries();
  const { generation, setGeneration } = useGenerationFilter();
  const [typeFilter, setTypeFilter] = useState<PokemonType | "all">("all");
  const [sortMode, setSortMode] = useState<SortMode>("dex");
  const [targetFilters, setTargetFilters] = useState(readDexTargetFilters);
  const { showCosmeticForms, showGenderForms, showGigantamaxForms } =
    targetFilters;

  const updateTargetFilters = (patch: Partial<DexTargetFilters>) => {
    setTargetFilters((current) => {
      const next = { ...current, ...patch };
      saveDexTargetFilters(next);
      return next;
    });
  };

  const all = (data ?? []).filter((e) =>
    isHomeTrackedEntry(
      e,
      showCosmeticForms,
      showGenderForms,
      showGigantamaxForms,
    ),
  );
  const byGen =
    generation === "all" ? all : all.filter((e) => e.generation === generation);

  const sorted = byGen.toSorted((a, b) => {
    if (sortMode === "name")
      return (
        a.displayName.localeCompare(b.displayName) ||
        compareLivingDexEntries(a, b)
      );
    return compareLivingDexEntries(a, b);
  });

  const q = search.trim().toLowerCase();

  const visibleEntries = sorted.filter((e) => {
    if (typeFilter !== "all" && !e.types?.includes(typeFilter)) return false;
    if (q) {
      const nameMatch = e.displayName.toLowerCase().includes(q);
      const numMatch = String(e.speciesId).startsWith(q.replace(/^#0*/, ""));
      if (!nameMatch && !numMatch) return false;
    }
    return true;
  });

  const sortOptions: { value: SortMode; label: string }[] = [
    { value: "dex", label: "Dex order" },
    { value: "name", label: "Name A-Z" },
  ];

  if (error) {
    return (
      <div className="py-20 text-center text-red-500">
        Failed to load Pokemon data. Check your connection and try again.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-3 pb-8 sm:px-4">
      <div
        id="pokedex-filters"
        className={`${filtersOpen ? "block" : "hidden"} -mx-3 mb-5 border-b border-[#252033] bg-[#111827]/95 px-3 py-3 backdrop-blur-sm sm:-mx-4 sm:block sm:px-4`}
      >
        <div className="rounded-xl border border-[#2f2942] bg-[#151421] p-3 shadow-[0_14px_40px_rgba(0,0,0,0.18)] sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center">
                <button
                  type="button"
                  onClick={() =>
                    updateTargetFilters({
                      showCosmeticForms: !showCosmeticForms,
                    })
                  }
                  className={`${toggleBaseClass} ${
                    showCosmeticForms
                      ? "border-[#44d7c4] bg-[#44d7c4] text-[#061016]"
                      : "border-[#343047] bg-[#202635] text-[#c9c1d7] hover:border-[#514874] hover:bg-[#273044]"
                  }`}
                >
                  {showCosmeticForms && <CheckIcon className="h-3.5 w-3.5" />}
                  Variants
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateTargetFilters({ showGenderForms: !showGenderForms })
                  }
                  className={`${toggleBaseClass} ${
                    showGenderForms
                      ? "border-[#e84ea6] bg-[#e84ea6] text-white"
                      : "border-[#343047] bg-[#202635] text-[#c9c1d7] hover:border-[#514874] hover:bg-[#273044]"
                  }`}
                >
                  {showGenderForms && <CheckIcon className="h-3.5 w-3.5" />}
                  Gender
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateTargetFilters({
                      showGigantamaxForms: !showGigantamaxForms,
                    })
                  }
                  className={`${toggleBaseClass} ${
                    showGigantamaxForms
                      ? "border-[#f34f60] bg-[#f34f60] text-white"
                      : "border-[#343047] bg-[#202635] text-[#c9c1d7] hover:border-[#514874] hover:bg-[#273044]"
                  }`}
                >
                  {showGigantamaxForms && <CheckIcon className="h-3.5 w-3.5" />}
                  G-Max
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 lg:w-[280px]">
              <SelectControl
                id="type-filter"
                value={typeFilter}
                label="Type"
                onChange={(value) =>
                  setTypeFilter(value as PokemonType | "all")
                }
              >
                <option value="all">All types</option>
                {TYPE_FILTER_VALUES.map((type) => (
                  <option key={type} value={type}>
                    {type[0].toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </SelectControl>

              <SelectControl
                id="sort-mode"
                value={sortMode}
                label="Sort"
                onChange={(value) => setSortMode(value as SortMode)}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectControl>
            </div>
          </div>

          <div
            className="mt-3 rounded-xl border border-[#252033] bg-[#0f1421] p-1"
            aria-label="Generation filters"
          >
            <div className="flex gap-1 overflow-x-auto pb-0.5 sm:grid sm:grid-cols-10 sm:overflow-visible sm:pb-0">
              {GEN_FILTER_VALUES.map((value) => (
                <button
                  key={value}
                  onClick={() => setGeneration(value as GenerationFilter)}
                  className={`h-8 shrink-0 rounded-lg px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fc5ff] sm:px-2 ${
                    generation === value
                      ? "bg-[#4f83ee] text-white shadow-sm shadow-[#4f83ee]/20"
                      : "text-[#a9a1b8] hover:bg-[#202635] hover:text-[#f8f0df]"
                  }`}
                >
                  {GEN_LABELS[value]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-2 min-[430px]:grid-cols-4 sm:grid-cols-5 lg:grid-cols-8">
          {Array.from({ length: 32 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700"
            />
          ))}
        </div>
      ) : visibleEntries.length === 0 ? (
        <div className="py-20 text-center text-sm text-gray-400">
          No Pokemon match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 min-[430px]:grid-cols-4 sm:grid-cols-5 lg:grid-cols-8">
          {visibleEntries.map((entry) => (
            <PokemonCard
              key={`${entry.speciesId}-${entry.formName ?? "base"}`}
              entry={entry}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
