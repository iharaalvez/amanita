"use client";

import Image from "next/image";
import { usePokedexStore, ownedKey } from "@/store/pokedexStore";
import { getCosmeticFormLabel, getFormLabel } from "@/lib/forms";
import {
  ArrowUpRightIcon,
  BookmarkIcon,
  HomeIcon,
  SparkleIcon,
} from "@/components/ui";
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
  const key = ownedKey(speciesId, formName);
  const owned = usePokedexStore((s) => !!s.owned[key]?.owned);
  const shinyOwned = usePokedexStore((s) => !!s.owned[key]?.shiny_owned);
  const planned = usePokedexStore((s) => !!s.owned[key]?.planned);
  const inHome = usePokedexStore((s) => !!s.owned[key]?.in_home);

  const paddedNumber = `#${String(speciesId).padStart(4, "0")}`;
  const formLabel = formName ? getFormLabel(formName) : null;
  const cosmeticLabel =
    formName && !formLabel ? getCosmeticFormLabel(formName) : null;

  const ringClass = shinyOwned
    ? "ring-2 ring-yellow-400 bg-yellow-50 dark:bg-yellow-950/50"
    : inHome
      ? "ring-2 ring-green-400 bg-green-50 dark:bg-green-950/40"
      : owned
        ? "ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-950/30"
        : planned
          ? "ring-2 ring-violet-400 bg-violet-50 dark:bg-violet-950/30"
          : "hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:bg-gray-100 dark:focus-visible:bg-gray-800";

  const statusLabel = shinyOwned
    ? "shiny owned"
    : inHome
      ? "in HOME"
      : owned
        ? "owned, pending transfer"
        : planned
          ? "planned"
          : "missing";

  return (
    <div className="relative flex flex-col">
      <button
        onClick={() => onSelect(speciesId, formName)}
        title={`${displayName} - ${statusLabel}`}
        aria-label={`${displayName}, ${statusLabel}`}
        aria-pressed={owned || shinyOwned || planned}
        className={`group relative flex w-full cursor-pointer flex-col items-center gap-1 rounded-xl p-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${ringClass}`}
      >
        <span className="absolute right-1 top-1 flex gap-1" aria-hidden>
          {shinyOwned && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-yellow-400 text-white">
              <SparkleIcon className="h-2.5 w-2.5" />
            </span>
          )}
          {inHome && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-400 text-white">
              <HomeIcon className="h-2.5 w-2.5" />
            </span>
          )}
          {owned && !inHome && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-400 text-white">
              <ArrowUpRightIcon className="h-2.5 w-2.5" />
            </span>
          )}
          {!owned && planned && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-violet-400 text-white">
              <BookmarkIcon className="h-2.5 w-2.5" />
            </span>
          )}
        </span>

        <Image
          src={spriteUrl}
          alt={displayName}
          width={64}
          height={64}
          unoptimized
          style={{ imageRendering: "pixelated" }}
          className={`h-16 w-16 object-contain transition-all duration-200 group-hover:scale-110 ${
            owned || shinyOwned ? "" : "grayscale opacity-50"
          }`}
        />

        <span className="text-[10px] tabular-nums text-gray-400">
          {paddedNumber}
        </span>

        <span className="w-full truncate px-1 text-center text-[11px] font-medium leading-tight">
          {formName
            ? cosmeticLabel
              ? displayName.split(" ")[0]
              : displayName.split(" ").slice(1).join(" ") || displayName
            : displayName}
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
