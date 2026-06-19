import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isProgressSnapshot } from "./progressSnapshot";
import type { ProgressSnapshot } from "@/types/pokemon";

const validSnapshot: ProgressSnapshot = {
  gameDex: {
    "scarlet-violet": {
      "1-base": { owned: true, shiny: false },
      "4-base": { owned: true, shiny: false },
    },
  },
  gameHomeBoxes: {
    "scarlet-violet": {
      "1-base": true,
    },
  },
  availableGames: {
    "scarlet-violet": true,
  },
  shinyHunts: [
    {
      id: "hunt-1",
      speciesId: 1,
      formName: null,
      gameId: "scarlet-violet",
      method: "outbreak",
      counterMode: "encounters",
      count: 42,
      startedAt: "2026-05-20T10:00:00.000Z",
    },
  ],
  recentCatches: [
    {
      speciesId: 1,
      formName: null,
      gameId: "scarlet-violet",
      date: "2026-05-20T10:00:00.000Z",
      isShiny: false,
      isAlpha: false,
    },
  ],
};

describe("progress snapshot validation", () => {
  it("accepts a complete backup shape", () => {
    assert.equal(isProgressSnapshot(validSnapshot), true);
  });

  it("accepts uncounted shiny hunts", () => {
    assert.equal(
      isProgressSnapshot({
        ...validSnapshot,
        shinyHunts: [
          {
            ...validSnapshot.shinyHunts![0],
            count: null,
          },
        ],
      }),
      true,
    );
  });

  it("rejects snapshots missing the gameDex field", () => {
    const bad = { ...validSnapshot };
    delete (bad as Partial<ProgressSnapshot>).gameDex;
    assert.equal(isProgressSnapshot(bad), false);
  });

  it("rejects legacy global owned records", () => {
    assert.equal(
      isProgressSnapshot({
        ...validSnapshot,
        owned: {
          "1-base": true,
        },
      }),
      false,
    );
  });

  it("rejects malformed gameDex flags", () => {
    assert.equal(
      isProgressSnapshot({
        ...validSnapshot,
        gameDex: {
          "scarlet-violet": {
            "1-base": { owned: "yes", shiny: false },
          },
        },
      }),
      false,
    );
  });

  it("rejects malformed available-game flags", () => {
    assert.equal(
      isProgressSnapshot({
        ...validSnapshot,
        availableGames: {
          "scarlet-violet": "yes",
        },
      }),
      false,
    );
  });

  it("rejects malformed game HOME box flags", () => {
    assert.equal(
      isProgressSnapshot({
        ...validSnapshot,
        gameHomeBoxes: {
          "scarlet-violet": {
            "1-base": "yes",
          },
        },
      }),
      false,
    );
  });

  it("rejects malformed shiny hunt entries", () => {
    assert.equal(
      isProgressSnapshot({
        ...validSnapshot,
        shinyHunts: [
          {
            ...validSnapshot.shinyHunts![0],
            count: -1,
          },
        ],
      }),
      false,
    );
  });

  it("rejects malformed recent catch entries", () => {
    assert.equal(
      isProgressSnapshot({
        ...validSnapshot,
        recentCatches: [
          {
            ...validSnapshot.recentCatches![0],
            isShiny: "no",
          },
        ],
      }),
      false,
    );
  });
});
