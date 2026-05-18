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

export function isProgressSnapshot(value: unknown): value is ProgressSnapshot {
  if (!isRecord(value)) return false;

  return (
    isOwnedRecordMap(value.owned) &&
    isGameDexRecord(value.gameDex) &&
    isBooleanRecord(value.availableGames) &&
    (value.pinnedGameId === undefined ||
      value.pinnedGameId === null ||
      typeof value.pinnedGameId === "string")
  );
}
