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
  gameDex: {
    "scarlet-violet": {
      "1-base": { owned: true, shiny: false },
      "4-base": { owned: true, shiny: false },
    },
  },
  availableGames: {
    "scarlet-violet": true,
  },
};

describe("progress snapshot validation", () => {
  it("accepts a complete backup shape", () => {
    assert.equal(isProgressSnapshot(validSnapshot), true);
  });

  it("rejects snapshots missing the gameDex field", () => {
    const bad = { ...validSnapshot };
    delete (bad as Partial<ProgressSnapshot>).gameDex;
    assert.equal(isProgressSnapshot(bad), false);
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
});
