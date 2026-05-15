import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isProgressSnapshot } from "./progressSnapshot";
import type { ProgressSnapshot } from "@/types/pokemon";

const validSnapshot: ProgressSnapshot = {
  owned: {
    "1-base": {
      pokedex_number: 1,
      form_name: null,
      owned: true,
      shiny_owned: false,
      method: "caught",
    },
  },
  gameDexProgress: {
    "scarlet-violet": [1, 4, 7],
  },
  shinyGameDexProgress: {
    "scarlet-violet": [1],
  },
  availableGames: {
    "scarlet-violet": true,
  },
};

describe("progress snapshot validation", () => {
  it("accepts a complete backup shape", () => {
    assert.equal(isProgressSnapshot(validSnapshot), true);
  });

  it("rejects pre-shiny-game-progress backups so imports do not silently lose data", () => {
    const legacySnapshot = { ...validSnapshot };
    delete (legacySnapshot as Partial<ProgressSnapshot>).shinyGameDexProgress;

    assert.equal(isProgressSnapshot(legacySnapshot), false);
  });

  it("rejects malformed owned records", () => {
    assert.equal(
      isProgressSnapshot({
        ...validSnapshot,
        owned: {
          "1-base": {
            pokedex_number: "1",
            form_name: null,
            owned: true,
            shiny_owned: false,
          },
        },
      }),
      false,
    );
  });

  it("rejects malformed game progress arrays", () => {
    assert.equal(
      isProgressSnapshot({
        ...validSnapshot,
        gameDexProgress: {
          "scarlet-violet": [1, "4", 7],
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
});
