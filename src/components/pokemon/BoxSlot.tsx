"use client";

import Image from "next/image";
import { usePokedexStore, ownedKey } from "@/store/pokedexStore";
import {
  ArrowUpRightIcon,
  BookmarkIcon,
  HomeIcon,
  SparkleIcon,
  Tooltip,
} from "@/components/ui";
import { getCosmeticFormLabel, getFormLabel } from "@/lib/forms";
import type { LivingDexEntry } from "@/types/pokemon";

type Props = {
  entry: LivingDexEntry | null;
  onSelect?: (speciesId: number, formName: string | null) => void;
};

export function BoxSlot({ entry, onSelect }: Props) {
  const key = entry ? ownedKey(entry.speciesId, entry.formName) : "";
  const owned = usePokedexStore((s) => (entry ? !!s.owned[key]?.owned : false));
  const shinyOwned = usePokedexStore((s) =>
    entry ? !!s.owned[key]?.shiny_owned : false,
  );
  const inHome = usePokedexStore((s) =>
    entry ? !!s.owned[key]?.in_home : false,
  );
  const planned = usePokedexStore((s) =>
    entry ? !!s.owned[key]?.planned : false,
  );

  if (!entry) {
    return (
      <div className="aspect-square rounded-lg border border-dashed border-gray-200 bg-white/50 dark:border-gray-700/50 dark:bg-gray-900/20" />
    );
  }

  const paddedNumber = `#${String(entry.speciesId).padStart(4, "0")}`;
  const regionLabel = entry.formName ? getFormLabel(entry.formName) : null;
  const cosmeticLabel =
    entry.formName && !regionLabel
      ? getCosmeticFormLabel(entry.formName)
      : null;
  const formPill = regionLabel || cosmeticLabel;
  const slotName = entry.formName
    ? cosmeticLabel
      ? entry.displayName.split(" ")[0]!
      : entry.displayName.split(" ").slice(1).join(" ") || entry.displayName
    : entry.displayName;

  const ringClass = shinyOwned
    ? "ring-2 ring-yellow-400 bg-yellow-50 dark:bg-yellow-950/40"
    : inHome
      ? "ring-2 ring-green-400 bg-green-50/50 dark:bg-green-950/30"
      : owned
        ? "ring-2 ring-blue-400 bg-blue-50/50 dark:bg-blue-950/20"
        : planned
          ? "ring-2 ring-violet-400 bg-violet-50 dark:bg-violet-950/30"
          : "bg-white/50 hover:bg-gray-100 dark:bg-gray-900/20 dark:hover:bg-gray-700/50";

  const label = shinyOwned
    ? `${paddedNumber} - ${entry.displayName} - shiny owned`
    : `${paddedNumber} - ${entry.displayName}${inHome ? " - In HOME" : owned ? " - Pending transfer" : planned ? " - Planned" : ""}`;

  return (
    <Tooltip content={label} className="w-full">
      <button
        onClick={() => onSelect?.(entry.speciesId, entry.formName)}
        aria-label={`${entry.displayName}, ${inHome ? "in HOME" : owned ? "owned, pending transfer" : planned ? "planned" : "not owned"}${shinyOwned ? ", shiny owned" : ""}`}
        aria-pressed={owned || shinyOwned || planned}
        className={`group relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg p-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:p-1.5 ${ringClass}`}
      >
        <span className="absolute right-1.5 top-1.5 flex gap-1" aria-hidden>
          {shinyOwned && (
            <SparkleIcon className="h-3.5 w-3.5 text-yellow-400" />
          )}
          {inHome && <HomeIcon className="h-3.5 w-3.5 text-green-400" />}
          {owned && !inHome && (
            <ArrowUpRightIcon className="h-3.5 w-3.5 text-blue-400" />
          )}
          {!owned && planned && (
            <BookmarkIcon className="h-3.5 w-3.5 text-violet-400" />
          )}
        </span>
        <Image
          src={entry.spriteUrl}
          alt={entry.displayName}
          width={48}
          height={48}
          style={{ imageRendering: "pixelated" }}
          className={`h-10 w-10 object-contain transition-all duration-200 group-hover:scale-110 sm:h-12 sm:w-12 ${
            owned || inHome || shinyOwned ? "" : "grayscale opacity-50"
          }`}
        />
        <span className="w-full truncate px-1 text-center text-[9px] font-medium leading-tight text-gray-500 dark:text-gray-300">
          {slotName}
        </span>
        <span
          className={`truncate rounded-full px-1.5 py-0.5 text-[8px] font-semibold leading-none ${
            formPill
              ? regionLabel
                ? "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300"
                : "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300"
              : "invisible"
          }`}
        >
          {formPill ?? " "}
        </span>
      </button>
    </Tooltip>
  );
}
