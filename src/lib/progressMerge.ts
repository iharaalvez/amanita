import type { OwnedRecord } from "@/types/pokemon";

function timestampMs(value: string | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function mergeUntimestampedOwnedRecords(
  local: OwnedRecord,
  remote: OwnedRecord,
): OwnedRecord {
  return {
    ...remote,
    ...local,
    owned: local.owned || remote.owned,
    shiny_owned: local.shiny_owned || remote.shiny_owned,
    method: local.method ?? remote.method,
    shiny_method: local.shiny_method ?? remote.shiny_method,
    shiny_game: local.shiny_game ?? remote.shiny_game,
    date_obtained: local.date_obtained ?? remote.date_obtained,
    game: local.game ?? remote.game,
  };
}

export function mergeOwnedRecords(
  local: Record<string, OwnedRecord>,
  remote: Record<string, OwnedRecord>,
): Record<string, OwnedRecord> {
  const keys = new Set([...Object.keys(local), ...Object.keys(remote)]);
  const merged: Record<string, OwnedRecord> = {};

  for (const key of keys) {
    const localRecord = local[key];
    const remoteRecord = remote[key];

    if (!localRecord) {
      merged[key] = remoteRecord;
      continue;
    }
    if (!remoteRecord) {
      merged[key] = localRecord;
      continue;
    }

    const localUpdatedAt = timestampMs(localRecord.updated_at);
    const remoteUpdatedAt = timestampMs(remoteRecord.updated_at);

    if (localUpdatedAt !== null && remoteUpdatedAt !== null) {
      merged[key] =
        localUpdatedAt >= remoteUpdatedAt ? localRecord : remoteRecord;
      continue;
    }

    if (remoteUpdatedAt !== null) {
      merged[key] = remoteRecord;
      continue;
    }

    if (localUpdatedAt !== null) {
      merged[key] = localRecord;
      continue;
    }

    merged[key] = mergeUntimestampedOwnedRecords(localRecord, remoteRecord);
  }

  return merged;
}
