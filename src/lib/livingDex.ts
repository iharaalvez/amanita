import { GENDER_DIFFERENCE_FORM_KEYS } from "@/config/cosmetic-forms";
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
      ownedRecords[ownedKey(entry.speciesId, entry.formName)]?.shiny_owned,
  ).length;
}
