import type { OwnedRecord, ProgressSnapshot } from "@/types/pokemon";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBooleanRecord(value: unknown): value is Record<string, boolean> {
  return (
    isRecord(value) &&
    Object.values(value).every((entry) => typeof entry === "boolean")
  );
}

function isNestedBooleanRecord(
  value: unknown,
): value is Record<string, Record<string, boolean>> {
  return (
    isRecord(value) &&
    Object.values(value).every((gameEntry) => isBooleanRecord(gameEntry))
  );
}

function isGameDexFlags(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return typeof value.owned === "boolean" && typeof value.shiny === "boolean";
}

function isGameDexRecord(
  value: unknown,
): value is Record<string, Record<string, { owned: boolean; shiny: boolean }>> {
  if (!isRecord(value)) return false;
  return Object.values(value).every(
    (gameEntry) =>
      isRecord(gameEntry) &&
      Object.values(gameEntry).every(isGameDexFlags),
  );
}

function isOwnedRecord(value: unknown): value is OwnedRecord {
  if (!isRecord(value)) return false;

  return (
    typeof value.pokedex_number === "number" &&
    Number.isInteger(value.pokedex_number) &&
    (typeof value.form_name === "string" || value.form_name === null) &&
    typeof value.owned === "boolean" &&
    typeof value.shiny_owned === "boolean"
  );
}

function isOwnedRecordMap(
  value: unknown,
): value is Record<string, OwnedRecord> {
  return isRecord(value) && Object.values(value).every(isOwnedRecord);
}

function isSpeciesFormRef(value: unknown): value is {
  speciesId: number;
  formName: string | null;
} {
  if (!isRecord(value)) return false;
  return (
    typeof value.speciesId === "number" &&
    Number.isInteger(value.speciesId) &&
    (typeof value.formName === "string" || value.formName === null)
  );
}

function isShinyHunt(value: unknown): boolean {
  if (!isSpeciesFormRef(value) || !isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.gameId === "string" &&
    typeof value.method === "string" &&
    typeof value.counterMode === "string" &&
    typeof value.count === "number" &&
    Number.isInteger(value.count) &&
    value.count >= 0 &&
    typeof value.startedAt === "string" &&
    (value.completedAt === undefined || typeof value.completedAt === "string")
  );
}

function isCatchEvent(value: unknown): boolean {
  if (!isSpeciesFormRef(value) || !isRecord(value)) return false;
  return (
    typeof value.gameId === "string" &&
    typeof value.date === "string" &&
    typeof value.isShiny === "boolean" &&
    typeof value.isAlpha === "boolean"
  );
}

function isShinyHuntArray(value: unknown): boolean {
  return Array.isArray(value) && value.every(isShinyHunt);
}

function isCatchEventArray(value: unknown): boolean {
  return Array.isArray(value) && value.every(isCatchEvent);
}

export function isProgressSnapshot(value: unknown): value is ProgressSnapshot {
  if (!isRecord(value)) return false;

  return (
    isOwnedRecordMap(value.owned) &&
    isGameDexRecord(value.gameDex) &&
    (value.gameHomeBoxes === undefined ||
      isNestedBooleanRecord(value.gameHomeBoxes)) &&
    isBooleanRecord(value.availableGames) &&
    (value.pinnedGameId === undefined ||
      value.pinnedGameId === null ||
      typeof value.pinnedGameId === "string") &&
    (value.shinyHunts === undefined || isShinyHuntArray(value.shinyHunts)) &&
    (value.recentCatches === undefined ||
      isCatchEventArray(value.recentCatches))
  );
}
