import { BATTLE_ONLY_FORM_NAMES } from "@/config/battle-forms";
import { GENDER_DIFFERENCE_FORM_KEYS } from "@/config/cosmetic-forms";
import { isShinyLocked } from "@/config/pokemon-flags";
import { ownedKey } from "@/store/pokedexStore";
import type { GameDexFlags, LivingDexEntry } from "@/types/pokemon";

export function isLivingDexSpecies(entry: LivingDexEntry): boolean {
  return entry.formName === null;
}

export function isHomeTrackedEntry(
  entry: LivingDexEntry,
  includeCosmeticForms: boolean,
  includeGenderDifferences: boolean,
  includeGigantamaxForms = false,
): boolean {
  if (isGigantamaxForm(entry)) return includeGigantamaxForms;
  if (isBattleOnlyForm(entry)) return false;
  if (isLivingDexSpecies(entry)) return true;
  if (isGenderDifferenceForm(entry)) return includeGenderDifferences;
  return entry.isRegionalForm || includeCosmeticForms;
}

export function isBattleOnlyForm(entry: LivingDexEntry): boolean {
  return !!entry.formName && BATTLE_ONLY_FORM_NAMES.has(entry.formName);
}

export function isGigantamaxForm(entry: LivingDexEntry): boolean {
  return !!entry.formName && /(^|-)gmax($|-)/.test(entry.formName);
}

export function isGenderDifferenceForm(entry: LivingDexEntry): boolean {
  if (!entry.formName) return false;
  return GENDER_DIFFERENCE_FORM_KEYS.has(
    `${entry.speciesId}-${entry.formName}`,
  );
}

function formSortRank(entry: LivingDexEntry): number {
  if (entry.formName === null) return 0;
  if (isGenderDifferenceForm(entry)) return 1;
  if (isGigantamaxForm(entry)) return 3;
  return 2;
}

export function compareLivingDexEntries(
  a: LivingDexEntry,
  b: LivingDexEntry,
): number {
  if (a.speciesId !== b.speciesId) return a.speciesId - b.speciesId;

  const rankDiff = formSortRank(a) - formSortRank(b);
  if (rankDiff !== 0) return rankDiff;

  const aSortOrder = a.sortOrder ?? Infinity;
  const bSortOrder = b.sortOrder ?? Infinity;
  if (aSortOrder !== bSortOrder) return aSortOrder - bSortOrder;

  return a.displayName.localeCompare(b.displayName);
}

export function isShinyTargetEntry(entry: LivingDexEntry): boolean {
  return !isShinyLocked(entry.speciesId, entry.formName);
}

export function getOwnedEntryCount(
  entries: LivingDexEntry[],
  progressFlags: Record<string, GameDexFlags>,
): number {
  return entries.filter((entry) => isOwnedForEntry(entry, progressFlags)).length;
}

export function getOwnedOrShinyEntryCount(
  entries: LivingDexEntry[],
  progressFlags: Record<string, GameDexFlags>,
): number {
  return entries.filter((entry) => isOwnedOrShinyForEntry(entry, progressFlags))
    .length;
}

export function getSpeciesOwnedCount(
  baseEntries: LivingDexEntry[],
  progressFlags: Record<string, GameDexFlags>,
): number {
  const ownedSpecies = new Set(
    Object.entries(progressFlags)
      .filter(([, flags]) => flags.owned || flags.shiny)
      .flatMap(([key]) => {
        const speciesId = speciesIdFromProgressKey(key);
        return speciesId === null ? [] : [speciesId];
      }),
  );
  return baseEntries.filter((entry) => ownedSpecies.has(entry.speciesId)).length;
}

export function getShinyEntryCount(
  entries: LivingDexEntry[],
  progressFlags: Record<string, GameDexFlags>,
): number {
  return entries.filter(
    (entry) =>
      isShinyTargetEntry(entry) && isShinyOwnedForEntry(entry, progressFlags),
  ).length;
}

function isOwnedForEntry(
  entry: LivingDexEntry,
  progressFlags: Record<string, GameDexFlags>,
): boolean {
  if (progressFlags[ownedKey(entry.speciesId, entry.formName)]?.owned) {
    return true;
  }
  return hasOwnedGenderVariant(entry, progressFlags, "owned");
}

function isOwnedOrShinyForEntry(
  entry: LivingDexEntry,
  progressFlags: Record<string, GameDexFlags>,
): boolean {
  const flags = progressFlags[ownedKey(entry.speciesId, entry.formName)];
  return !!(flags?.owned || flags?.shiny);
}

function isShinyOwnedForEntry(
  entry: LivingDexEntry,
  progressFlags: Record<string, GameDexFlags>,
): boolean {
  const flags = progressFlags[ownedKey(entry.speciesId, entry.formName)];
  if (flags?.shiny) {
    return true;
  }

  return hasOwnedGenderVariant(entry, progressFlags, "shiny");
}

function hasOwnedGenderVariant(
  entry: LivingDexEntry,
  progressFlags: Record<string, GameDexFlags>,
  field: "owned" | "shiny",
): boolean {
  if (entry.formName !== null) return false;

  return Object.entries(progressFlags).some(([key, flags]) => {
    const parsed = parseProgressKey(key);
    return (
      parsed?.speciesId === entry.speciesId &&
      !!parsed.formName &&
      !!flags[field] &&
      GENDER_DIFFERENCE_FORM_KEYS.has(`${entry.speciesId}-${parsed.formName}`)
    );
  });
}

function parseProgressKey(
  key: string,
): { speciesId: number; formName: string | null } | null {
  const separatorIndex = key.indexOf("-");
  if (separatorIndex < 1) return null;
  const speciesId = Number(key.slice(0, separatorIndex));
  if (!Number.isInteger(speciesId)) return null;
  const formKey = key.slice(separatorIndex + 1);
  return { speciesId, formName: formKey === "base" ? null : formKey };
}

function speciesIdFromProgressKey(key: string): number | null {
  return parseProgressKey(key)?.speciesId ?? null;
}
