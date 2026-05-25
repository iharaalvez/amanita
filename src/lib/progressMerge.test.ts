import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeOwnedRecords } from "./progressMerge";
import type { OwnedRecord } from "@/types/pokemon";

function record(
  owned: boolean,
  updatedAt?: string,
  overrides: Partial<OwnedRecord> = {},
): OwnedRecord {
  return {
    pokedex_number: 1,
    form_name: null,
    owned,
    shiny_owned: false,
    updated_at: updatedAt,
    ...overrides,
  };
}

describe("owned record sync merge", () => {
  it("keeps newer remote ownership over stale local progress", () => {
    const merged = mergeOwnedRecords(
      { "1-base": record(false, "2026-05-20T10:00:00.000Z") },
      { "1-base": record(true, "2026-05-25T10:00:00.000Z") },
    );

    assert.equal(merged["1-base"].owned, true);
  });

  it("keeps newer local clears over older remote ownership", () => {
    const merged = mergeOwnedRecords(
      { "1-base": record(false, "2026-05-25T10:00:00.000Z") },
      { "1-base": record(true, "2026-05-20T10:00:00.000Z") },
    );

    assert.equal(merged["1-base"].owned, false);
  });

  it("uses remote rows over untimestamped local rows during migration", () => {
    const merged = mergeOwnedRecords(
      { "1-base": record(false) },
      { "1-base": record(true, "2026-05-25T10:00:00.000Z") },
    );

    assert.equal(merged["1-base"].owned, true);
  });
});
