"use client";

import type { MouseEvent, ReactNode } from "react";
import { Plus } from "lucide-react";
import { Tooltip } from "@/components/ui";
import { PokemonSprite } from "@/components/pokemon/PokemonSprite";

type Props = {
  spriteUrl: string;
  spriteAlt: string;
  slotName: string;
  tooltipLabel: string;
  formPill?: string | null;
  regionLabel?: string | null;
  isActive: boolean;
  toggleActive: boolean;
  onSelect: () => void;
  onToggle: (e: MouseEvent<HTMLButtonElement>) => void;
  toggleLabel: string;
  activeIcon: ReactNode;
  compact?: boolean;
  variant?: "green" | "yellow";
  shinyLocked?: boolean;
};

export function EmptySlot() {
  return (
    <div className="aspect-square rounded-md border border-dashed border-gray-200 bg-white/50 dark:border-gray-700/50 dark:bg-gray-900/20 sm:rounded-lg sm:border-2" />
  );
}

export function SlotTile({
  spriteUrl,
  spriteAlt,
  slotName,
  tooltipLabel,
  formPill,
  regionLabel,
  isActive,
  toggleActive,
  onSelect,
  onToggle,
  toggleLabel,
  activeIcon,
  compact = false,
  variant = "green",
  shinyLocked = false,
}: Props) {
  const borderBg = shinyLocked
    ? "border-slate-200 bg-slate-100/70 dark:border-slate-700 dark:bg-slate-900/30"
    : variant === "yellow"
      ? isActive
        ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-950/40"
        : "border-transparent bg-white/30 hover:bg-yellow-50/30 dark:bg-gray-900/10 dark:hover:bg-yellow-950/20"
      : isActive
        ? "border-green-400 bg-green-50/50 dark:bg-green-950/30"
        : "border-transparent bg-white/50 hover:bg-gray-100 dark:bg-gray-900/20 dark:hover:bg-gray-700/50";

  const toggleBg =
    variant === "yellow"
      ? toggleActive
        ? "border-yellow-400 bg-yellow-400 text-white"
        : "border-yellow-200 bg-white text-yellow-500 hover:bg-yellow-50 dark:border-yellow-900/70 dark:bg-gray-900 dark:text-yellow-400"
      : toggleActive
        ? "border-green-400 bg-green-400 text-white"
        : "border-green-200 bg-white text-green-600 hover:bg-green-50 dark:border-green-900/70 dark:bg-gray-900 dark:text-green-400";

  return (
    <Tooltip content={tooltipLabel} className="w-full">
      <div className="relative w-full">
        <button
          type="button"
          onClick={onSelect}
          aria-label={tooltipLabel}
          aria-pressed={isActive}
          className={`group relative flex w-full cursor-pointer flex-col items-center justify-center gap-0 rounded-md border p-0.5 pb-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:gap-0.5 sm:rounded-lg sm:border-2 sm:p-1 sm:pb-5 ${borderBg}`}
        >
          <PokemonSprite
            src={spriteUrl}
            alt={spriteAlt}
            width={72}
            height={72}
            style={{ imageRendering: "pixelated" }}
            className={`object-contain transition-all duration-200 group-hover:scale-110 ${
              compact
                ? "h-8 w-8"
                : "h-9 w-9 min-[390px]:h-10 min-[390px]:w-10 sm:h-16 sm:w-16"
            } ${
              shinyLocked
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
              {formPill && (
                <span
                  className={`absolute bottom-0.5 max-w-[90%] truncate rounded-full px-1 py-0.5 text-[7px] font-semibold leading-none sm:bottom-1 sm:px-1.5 sm:text-[8px] ${
                    regionLabel
                      ? "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300"
                      : "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300"
                  }`}
                >
                  {formPill}
                </span>
              )}
            </>
          )}
        </button>

        {!compact && !shinyLocked && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={toggleLabel}
            aria-pressed={toggleActive}
            className={`absolute left-1 top-1 z-10 grid h-7 w-7 place-items-center rounded-full border shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:h-6 sm:w-6 ${toggleBg}`}
          >
            {toggleActive ? activeIcon : <Plus className="h-4 w-4 sm:h-3 sm:w-3" />}
          </button>
        )}
      </div>
    </Tooltip>
  );
}
