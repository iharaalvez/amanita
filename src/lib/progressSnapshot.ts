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

function isNumberArrayRecord(
  value: unknown,
): value is Record<string, number[]> {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (entry) =>
        Array.isArray(entry) &&
        entry.every(
          (item) => typeof item === "number" && Number.isInteger(item),
        ),
    )
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
    isNumberArrayRecord(value.gameDexProgress) &&
    isNumberArrayRecord(value.shinyGameDexProgress) &&
    isBooleanRecord(value.availableGames)
  );
}
