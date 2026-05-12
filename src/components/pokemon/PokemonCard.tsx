"use client";

import Image from "next/image";
import {
  getCosmeticFormLabel,
  getDisplayNameWithoutFormLabel,
  getFormLabel,
} from "@/lib/forms";
import type { LivingDexEntry } from "@/types/pokemon";

const REGION_TAG_CLASSES: Record<string, string> = {
  Alolan: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  Galarian:
    "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  Hisuian: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  Paldean: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

type Props = {
  entry: LivingDexEntry;
  onSelect: (speciesId: number, formName: string | null) => void;
};

export function PokemonCard({ entry, onSelect }: Props) {
  const { speciesId, formName, displayName, spriteUrl } = entry;
  const paddedNumber = `#${String(speciesId).padStart(4, "0")}`;
  const formLabel = formName ? getFormLabel(formName) : null;
  const cosmeticLabel =
    formName && !formLabel ? getCosmeticFormLabel(formName) : null;
  const formPill = formLabel || cosmeticLabel;

  return (
    <div className="relative flex flex-col">
      <button
        onClick={() => onSelect(speciesId, formName)}
        title={displayName}
        aria-label={`Open ${displayName} Pokedex entry`}
        className="group relative flex w-full cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-transparent p-2 transition-all hover:bg-gray-100 focus-visible:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:hover:bg-gray-800 dark:focus-visible:bg-gray-800"
      >
        <Image
          src={spriteUrl}
          alt={displayName}
          width={64}
          height={64}
          unoptimized
          style={{ imageRendering: "pixelated" }}
          className="h-16 w-16 object-contain transition-all duration-200 group-hover:scale-110"
        />

        <span className="text-[10px] tabular-nums text-gray-400">
          {paddedNumber}
        </span>

        <span className="w-full truncate px-1 text-center text-[11px] font-medium leading-tight">
          {getDisplayNameWithoutFormLabel(displayName, formPill)}
        </span>

        {formLabel && (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none ${REGION_TAG_CLASSES[formLabel] ?? "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300"}`}
          >
            {formLabel}
          </span>
        )}
        {cosmeticLabel && (
          <span className="rounded-full bg-teal-100 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-teal-700 dark:bg-teal-900 dark:text-teal-300">
            {cosmeticLabel}
          </span>
        )}
      </button>
    </div>
  );
}
