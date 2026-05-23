import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getLivingDexCatchRecommendations,
  type LivingDexCatchRecommendation,
} from "./livingDexCatchRecommendations";
import type { LivingDexEntry } from "@/types/pokemon";

function entry(
  speciesId: number,
  displayName: string,
  formName: string | null = null,
  overrides: Partial<LivingDexEntry> = {},
): LivingDexEntry {
  return {
    id: speciesId,
    speciesId,
    name: displayName.toLowerCase().replaceAll(" ", "-"),
    formName,
    displayName,
    generation: 1,
    spriteUrl: "/sprite.png",
    ...overrides,
  };
}

function route(
  speciesId: number,
  form: string,
  primaryGame: string,
): LivingDexCatchRecommendation {
  return {
    speciesId,
    form,
    primaryGame,
    location: "Route",
    method: "Catch",
    secondaryGame: "N/A",
    notes: "",
  };
}

describe("Living Dex catch recommendations", () => {
  it("prefers the default route for base species", () => {
    const recommendations = getLivingDexCatchRecommendations(
      entry(25, "Pikachu"),
      [
        route(25, "Original Cap", "Event: Sword/Shield"),
        route(25, "Default [Male]", "Legends: Arceus"),
      ],
    );

    assert.deepEqual(
      recommendations.map((recommendation) => recommendation.primaryGame),
      ["Legends: Arceus"],
    );
  });

  it("matches cosmetic form labels from the tracker to the sheet", () => {
    const recommendations = getLivingDexCatchRecommendations(
      entry(25, "Pikachu Original Cap", "pikachu-original-cap"),
      [
        route(25, "Default [Male]", "Legends: Arceus"),
        route(25, "Original Cap", "Event: Sword/Shield"),
      ],
    );

    assert.deepEqual(
      recommendations.map((recommendation) => recommendation.primaryGame),
      ["Event: Sword/Shield"],
    );
  });

  it("matches regional form labels from the tracker to the sheet", () => {
    const recommendations = getLivingDexCatchRecommendations(
      entry(58, "Growlithe Hisuian", "growlithe-hisui", {
        regionLabel: "Hisuian",
      }),
      [
        route(58, "Default", "Let's Go, Pikachu!"),
        route(58, "Hisuian Form", "Legends: Arceus"),
      ],
    );

    assert.deepEqual(
      recommendations.map((recommendation) => recommendation.primaryGame),
      ["Legends: Arceus"],
    );
  });

  it("uses the first species route when the sheet has no default row", () => {
    const recommendations = getLivingDexCatchRecommendations(
      entry(741, "Oricorio"),
      [
        route(741, "Baile Style", "Scarlet"),
        route(741, "Pom-Pom Style", "Violet"),
      ],
    );

    assert.deepEqual(
      recommendations.map((recommendation) => recommendation.primaryGame),
      ["Scarlet"],
    );
  });
});
