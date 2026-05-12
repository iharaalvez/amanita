import { GENDER_DIFFERENCE_FORM_KEYS } from "@/config/cosmetic-forms";
import { isShinyLocked } from "@/config/pokemon-flags";
import { ownedKey } from "@/store/pokedexStore";
import type { LivingDexEntry, OwnedRecord } from "@/types/pokemon";

export function isLivingDexSpecies(entry: LivingDexEntry): boolean {
  return entry.formName === null;
}

export function isHomeTrackedEntry(
  entry: LivingDexEntry,
  includeCosmeticForms: boolean,
  includeGenderDifferences: boolean,
): boolean {
  if (isLivingDexSpecies(entry)) return true;
  if (isGenderDifferenceForm(entry)) return includeGenderDifferences;
  return entry.isRegionalForm || includeCosmeticForms;
}

export function isGenderDifferenceForm(entry: LivingDexEntry): boolean {
  if (!entry.formName) return false;
  return GENDER_DIFFERENCE_FORM_KEYS.has(`${entry.speciesId}-${entry.formName}`);
}

function formSortRank(entry: LivingDexEntry): number {
  if (entry.formName === null) return 0;
  if (isGenderDifferenceForm(entry)) return 1;
  return 2;
}

export function compareLivingDexEntries(
  a: LivingDexEntry,
  b: LivingDexEntry,
): number {
  if (a.speciesId !== b.speciesId) return a.speciesId - b.speciesId;

  const rankDiff = formSortRank(a) - formSortRank(b);
  if (rankDiff !== 0) return rankDiff;

  return a.displayName.localeCompare(b.displayName);
}

export function isShinyTargetEntry(entry: LivingDexEntry): boolean {
  return !isShinyLocked(entry.speciesId, entry.formName);
}

export function getOwnedEntryCount(
  entries: LivingDexEntry[],
  ownedRecords: Record<string, OwnedRecord>,
): number {
  return entries.filter(
    (entry) => ownedRecords[ownedKey(entry.speciesId, entry.formName)]?.owned,
  ).length;
}

export function getShinyEntryCount(
  entries: LivingDexEntry[],
  ownedRecords: Record<string, OwnedRecord>,
): number {
  return entries.filter(
    (entry) =>
      isShinyTargetEntry(entry) &&
      ownedRecords[ownedKey(entry.speciesId, entry.formName)]?.shiny_owned,
  ).length;
}
