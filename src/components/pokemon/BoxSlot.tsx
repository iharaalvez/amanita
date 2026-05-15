"use client";

import { usePokedexStore, ownedKey } from "@/store/pokedexStore";
import { CheckIcon, SparkleIcon, Tooltip, XIcon } from "@/components/ui";
import { PokemonSprite } from "@/components/pokemon/PokemonSprite";
import { isShinyLocked } from "@/config/pokemon-flags";
import {
  getCosmeticFormLabel,
  getDisplayNameWithoutFormLabel,
  getFormLabel,
} from "@/lib/forms";
import type { LivingDexEntry } from "@/types/pokemon";

type Props = {
  entry: LivingDexEntry | null;
  onSelect?: (speciesId: number, formName: string | null) => void;
  isShinySlot?: boolean;
  hasShinyPair?: boolean;
  compact?: boolean;
};

export function BoxSlot({
  entry,
  onSelect,
  isShinySlot = false,
  hasShinyPair = false,
  compact = false,
}: Props) {
  const key = entry ? ownedKey(entry.speciesId, entry.formName) : "";
  const owned = usePokedexStore((s) => (entry ? !!s.owned[key]?.owned : false));
  const shinyOwned = usePokedexStore((s) =>
    entry ? !!s.owned[key]?.shiny_owned : false,
  );

  if (!entry) {
    return (
      <div className="aspect-square rounded-md border border-dashed border-gray-200 bg-white/50 dark:border-gray-700/50 dark:bg-gray-900/20 sm:rounded-lg sm:border-2" />
    );
  }

  const paddedNumber = `#${String(entry.speciesId).padStart(4, "0")}`;
  const regionLabel = entry.formName ? getFormLabel(entry.formName) : null;
  const cosmeticLabel =
    entry.formName && !regionLabel
      ? getCosmeticFormLabel(entry.formName)
      : null;
  const formPill = regionLabel || cosmeticLabel;
  const slotName = getDisplayNameWithoutFormLabel(entry.displayName, formPill);
  const shinyLocked = isShinyLocked(entry.speciesId, entry.formName);

  const spriteUrl =
    isShinySlot && !shinyLocked
      ? (entry.shinySpriteUrl ?? entry.spriteUrl)
      : entry.spriteUrl;

  const isActive =
    isShinySlot && shinyLocked
      ? false
      : isShinySlot
        ? shinyOwned
        : hasShinyPair
          ? owned
          : owned || shinyOwned;

  let statusClass: string;
  if (isShinySlot && shinyLocked) {
    statusClass =
      "border-slate-200 bg-slate-100/70 dark:border-slate-700 dark:bg-slate-900/30";
  } else if (isShinySlot) {
    statusClass = shinyOwned
      ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-950/40"
      : "border-transparent bg-white/30 hover:bg-yellow-50/30 dark:bg-gray-900/10 dark:hover:bg-yellow-950/20";
  } else if (hasShinyPair) {
    // Normal slot in shiny dex mode — only reflect owned, not shinyOwned
    statusClass = owned
      ? "border-green-400 bg-green-50/50 dark:bg-green-950/30"
      : "border-transparent bg-white/50 hover:bg-gray-100 dark:bg-gray-900/20 dark:hover:bg-gray-700/50";
  } else {
    statusClass = shinyOwned
      ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-950/40"
      : owned
        ? "border-green-400 bg-green-50/50 dark:bg-green-950/30"
        : "border-transparent bg-white/50 hover:bg-gray-100 dark:bg-gray-900/20 dark:hover:bg-gray-700/50";
  }

  const label = isShinySlot
    ? `${paddedNumber} - ✦ ${entry.displayName}${
        shinyLocked
          ? " - shiny unavailable"
          : shinyOwned
            ? " - shiny owned"
            : ""
      }`
    : shinyOwned
      ? `${paddedNumber} - ${entry.displayName} - shiny owned`
      : `${paddedNumber} - ${entry.displayName}${owned ? " - Owned" : ""}`;

  return (
    <Tooltip content={label} className="w-full">
      <button
        onClick={() => onSelect?.(entry.speciesId, entry.formName)}
        aria-label={
          isShinySlot
            ? `Shiny ${entry.displayName}, ${
                shinyLocked
                  ? "shiny unavailable"
                  : shinyOwned
                    ? "shiny owned"
                    : "not shiny owned"
              }`
            : `${entry.displayName}, ${owned ? "owned" : "not owned"}${shinyOwned ? ", shiny owned" : ""}`
        }
        aria-pressed={isActive}
        className={`group relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-0 rounded-md border p-0.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:gap-0.5 sm:rounded-lg sm:border-2 sm:p-1 ${statusClass}`}
      >
        {/* Corner indicators */}
        <span
          className={`absolute flex gap-0.5 ${
            compact
              ? "right-0.5 top-0.5"
              : "right-0.5 top-0.5 sm:right-1 sm:top-1"
          }`}
          aria-hidden
        >
          {isShinySlot ? (
            shinyLocked ? (
              <XIcon
                className={
                  compact
                    ? "h-2.5 w-2.5 text-slate-400"
                    : "h-3 w-3 text-slate-400 sm:h-3.5 sm:w-3.5"
                }
              />
            ) : (
              shinyOwned && (
                <SparkleIcon
                  className={
                    compact
                      ? "h-2.5 w-2.5 text-yellow-400"
                      : "h-3 w-3 text-yellow-400 sm:h-3.5 sm:w-3.5"
                  }
                />
              )
            )
          ) : hasShinyPair ? (
            owned && (
              <CheckIcon
                className={
                  compact
                    ? "h-2.5 w-2.5 text-green-400"
                    : "h-3 w-3 text-green-400 sm:h-3.5 sm:w-3.5"
                }
              />
            )
          ) : (
            <>
              {shinyOwned && (
                <SparkleIcon className="h-3 w-3 text-yellow-400 sm:h-3.5 sm:w-3.5" />
              )}
              {owned && !shinyOwned && (
                <CheckIcon className="h-3 w-3 text-green-400 sm:h-3.5 sm:w-3.5" />
              )}
            </>
          )}
        </span>

        {/* Shiny slot marker */}
        {isShinySlot && (
          <span
            className={`absolute left-0.5 top-0.5 font-bold leading-none text-yellow-400 ${compact ? "text-[6px]" : "text-[8px]"}`}
            aria-hidden
          >
            ✦
          </span>
        )}

        <PokemonSprite
          src={spriteUrl}
          alt={isShinySlot ? `Shiny ${entry.displayName}` : entry.displayName}
          width={72}
          height={72}
          style={{ imageRendering: "pixelated" }}
          className={`object-contain transition-all duration-200 group-hover:scale-110 ${
            compact
              ? "h-8 w-8"
              : "h-9 w-9 min-[390px]:h-10 min-[390px]:w-10 sm:h-16 sm:w-16"
          } ${
            shinyLocked && isShinySlot
              ? "grayscale opacity-30"
              : isActive
                ? ""
                : "grayscale opacity-50"
          }`}
        />
        {!compact && (
          <>
            <span className="w-full truncate text-center text-[8px] font-semibold leading-none text-gray-600 dark:text-gray-200 min-[390px]:text-[9px] sm:px-0.5 sm:text-[10px] sm:leading-tight">
              {slotName}
            </span>
            <span
              className={`max-w-full truncate rounded-full px-1 py-0.5 text-[7px] font-semibold leading-none sm:px-1.5 sm:text-[8px] ${
                formPill
                  ? regionLabel
                    ? "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300"
                    : "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300"
                  : "hidden invisible sm:inline-flex"
              }`}
            >
              {formPill ?? " "}
            </span>
          </>
        )}
      </button>
    </Tooltip>
  );
}
