"use client";

import type { MouseEvent } from "react";
import { usePokedexStore, ownedKey } from "@/store/pokedexStore";
import { CheckIcon, SparkleIcon } from "@/components/ui";
import { isShinyLocked } from "@/config/pokemon-flags";
import {
  getBaseFormLabel,
  getCosmeticFormLabel,
  getDisplayNameWithoutFormLabel,
  getFormLabel,
} from "@/lib/forms";
import type { LivingDexEntry } from "@/types/pokemon";
import { EmptySlot, SlotTile } from "@/components/pokemon/SlotTile";

type Props = {
  entry: LivingDexEntry | null;
  onSelect?: (speciesId: number, formName: string | null) => void;
  isShinySlot?: boolean;
  compact?: boolean;
  shinyLocked?: boolean;
  progressScopeId?: string;
};

export function BoxSlot({
  entry,
  onSelect,
  isShinySlot = false,
  compact = false,
  shinyLocked: shinyLockedProp,
  progressScopeId,
}: Props) {
  const key = entry ? ownedKey(entry.speciesId, entry.formName) : "";
  const owned = usePokedexStore((s) =>
    entry && progressScopeId
      ? !!s.gameDex[progressScopeId]?.[key]?.owned
      : false,
  );
  const shinyOwned = usePokedexStore((s) =>
    entry && progressScopeId
      ? !!s.gameDex[progressScopeId]?.[key]?.shiny
      : false,
  );
  const markHomeBoxLayoutSlot = usePokedexStore(
    (s) => s.markHomeBoxLayoutSlot,
  );
  const clearHomeBoxLayoutSlot = usePokedexStore(
    (s) => s.clearHomeBoxLayoutSlot,
  );

  if (!entry) return <EmptySlot />;

  const paddedNumber = `#${String(entry.speciesId).padStart(4, "0")}`;
  const regionLabel = entry.formName ? getFormLabel(entry.formName) : null;
  const cosmeticLabel =
    entry.formName && !regionLabel
      ? getCosmeticFormLabel(entry.formName)
      : null;
  const baseLabel = entry.formName ? null : getBaseFormLabel(entry.speciesId);
  const formPill = regionLabel || cosmeticLabel || baseLabel;
  const slotName = getDisplayNameWithoutFormLabel(entry.displayName, formPill);
  const shinyLocked =
    shinyLockedProp !== undefined
      ? shinyLockedProp
      : isShinyLocked(entry.speciesId, entry.formName);

  const spriteUrl =
    isShinySlot && !shinyLocked
      ? (entry.shinySpriteUrl ?? entry.spriteUrl)
      : entry.spriteUrl;

  const isActive =
    isShinySlot && shinyLocked ? false : isShinySlot ? shinyOwned : owned;
  const toggleActive = isShinySlot ? shinyOwned : owned;

  const toggleSlot = (event?: MouseEvent<HTMLButtonElement>) => {
    event?.stopPropagation();
    if (isShinySlot && shinyLocked) return;
    if (!progressScopeId) return;

    if (isShinySlot) {
      if (shinyOwned) {
        clearHomeBoxLayoutSlot(
          progressScopeId,
          entry.speciesId,
          entry.formName,
          true,
        );
      } else {
        markHomeBoxLayoutSlot(
          progressScopeId,
          entry.speciesId,
          entry.formName,
          true,
        );
      }
      return;
    }

    if (owned) {
      clearHomeBoxLayoutSlot(
        progressScopeId,
        entry.speciesId,
        entry.formName,
        false,
      );
    } else {
      markHomeBoxLayoutSlot(
        progressScopeId,
        entry.speciesId,
        entry.formName,
        false,
      );
    }
  };

  const label = isShinySlot
    ? `${paddedNumber} - shiny ${entry.displayName}${
        shinyLocked
          ? " - shiny unavailable"
          : shinyOwned
            ? " - shiny owned"
            : ""
      }`
    : shinyOwned
      ? `${paddedNumber} - ${entry.displayName} - shiny owned`
      : `${paddedNumber} - ${entry.displayName}${owned ? " - owned" : ""}`;
  const toggleLabel = isShinySlot
    ? shinyOwned
      ? `Remove shiny ${entry.displayName} from HOME boxes`
      : `Add shiny ${entry.displayName} to HOME boxes`
    : owned
      ? `Remove ${entry.displayName} from HOME boxes`
      : `Add ${entry.displayName} to HOME boxes`;

  return (
    <SlotTile
      spriteUrl={spriteUrl}
      spriteAlt={isShinySlot ? `Shiny ${entry.displayName}` : entry.displayName}
      slotName={slotName}
      tooltipLabel={label}
      formPill={formPill}
      regionLabel={regionLabel}
      isActive={isActive}
      toggleActive={toggleActive}
      onSelect={() => {
        if (onSelect) {
          onSelect(entry.speciesId, entry.formName);
        } else {
          toggleSlot();
        }
      }}
      onToggle={(e) => toggleSlot(e)}
      toggleLabel={toggleLabel}
      activeIcon={
        isShinySlot ? (
          <SparkleIcon className="h-4 w-4 sm:h-3 sm:w-3" />
        ) : (
          <CheckIcon className="h-4 w-4 sm:h-3 sm:w-3" />
        )
      }
      compact={compact}
      variant={isShinySlot ? "yellow" : "green"}
      shinyLocked={isShinySlot && shinyLocked}
    />
  );
}
