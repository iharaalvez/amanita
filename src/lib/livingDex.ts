import { ownedKey } from "@/store/pokedexStore";
import type { LivingDexEntry, OwnedRecord } from "@/types/pokemon";

export function isLivingDexSpecies(entry: LivingDexEntry): boolean {
  return entry.formName === null;
}

export function isHomeTrackedEntry(
  entry: LivingDexEntry,
  includeCosmeticForms: boolean,
): boolean {
  return (
    isLivingDexSpecies(entry) || entry.isRegionalForm || includeCosmeticForms
  );
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
