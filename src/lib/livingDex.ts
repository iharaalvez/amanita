import { BATTLE_ONLY_FORM_NAMES } from "@/config/battle-forms";
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
  ownedRecords: Record<string, OwnedRecord>,
): number {
  return entries.filter((entry) => isOwnedForEntry(entry, ownedRecords)).length;
}

export function getOwnedOrShinyEntryCount(
  entries: LivingDexEntry[],
  ownedRecords: Record<string, OwnedRecord>,
): number {
  return entries.filter((entry) => isOwnedOrShinyForEntry(entry, ownedRecords))
    .length;
}

export function getSpeciesOwnedCount(
  baseEntries: LivingDexEntry[],
  ownedRecords: Record<string, OwnedRecord>,
): number {
  const ownedSpecies = new Set(
    Object.values(ownedRecords)
      .filter((r) => r.owned || r.shiny_owned)
      .map((r) => r.pokedex_number),
  );
  return baseEntries.filter((entry) => ownedSpecies.has(entry.speciesId)).length;
}

export function getShinyEntryCount(
  entries: LivingDexEntry[],
  ownedRecords: Record<string, OwnedRecord>,
): number {
  return entries.filter(
    (entry) =>
      isShinyTargetEntry(entry) && isShinyOwnedForEntry(entry, ownedRecords),
  ).length;
}

function isOwnedForEntry(
  entry: LivingDexEntry,
  ownedRecords: Record<string, OwnedRecord>,
): boolean {
  if (ownedRecords[ownedKey(entry.speciesId, entry.formName)]?.owned) {
    return true;
  }
  return hasOwnedGenderVariant(entry, ownedRecords, "owned");
}

function isOwnedOrShinyForEntry(
  entry: LivingDexEntry,
  ownedRecords: Record<string, OwnedRecord>,
): boolean {
  const record = ownedRecords[ownedKey(entry.speciesId, entry.formName)];
  return !!(record?.owned || record?.shiny_owned);
}

function isShinyOwnedForEntry(
  entry: LivingDexEntry,
  ownedRecords: Record<string, OwnedRecord>,
): boolean {
  const record = ownedRecords[ownedKey(entry.speciesId, entry.formName)];
  if (record?.shiny_owned) {
    return true;
  }

  return hasOwnedGenderVariant(entry, ownedRecords, "shiny_owned");
}

function hasOwnedGenderVariant(
  entry: LivingDexEntry,
  ownedRecords: Record<string, OwnedRecord>,
  field: "owned" | "shiny_owned",
): boolean {
  if (entry.formName !== null) return false;

  return Object.values(ownedRecords).some(
    (record) =>
      record.pokedex_number === entry.speciesId &&
      !!record.form_name &&
      !!record[field] &&
      GENDER_DIFFERENCE_FORM_KEYS.has(`${entry.speciesId}-${record.form_name}`),
  );
}
