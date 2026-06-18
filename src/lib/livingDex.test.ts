import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compareLivingDexEntries,
  getOwnedEntryCount,
  getShinyEntryCount,
  isHomeTrackedEntry,
  isLivingDexSpecies,
  isShinyTargetEntry,
} from "./livingDex";
import type { LivingDexEntry, OwnedRecord } from "@/types/pokemon";

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
    isRegionalForm: false,
    ...overrides,
  };
}

function owned(
  speciesId: number,
  formName: string | null,
  overrides: Partial<OwnedRecord> = {},
): OwnedRecord {
  return {
    pokedex_number: speciesId,
    form_name: formName,
    owned: true,
    shiny_owned: false,
    ...overrides,
  };
}

describe("Living Dex entry rules", () => {
  it("treats only base species as Living Dex species", () => {
    assert.equal(isLivingDexSpecies(entry(25, "Pikachu")), true);
    assert.equal(
      isLivingDexSpecies(entry(37, "Alolan Vulpix", "vulpix-alola")),
      false,
    );
  });

  it("keeps regional forms in HOME while cosmetic forms are opt-in", () => {
    const base = entry(25, "Pikachu");
    const regional = entry(37, "Alolan Vulpix", "vulpix-alola", {
      isRegionalForm: true,
    });
    const cosmetic = entry(25, "Pikachu Original Cap", "pikachu-original-cap");

    assert.equal(isHomeTrackedEntry(base, false, false), true);
    assert.equal(isHomeTrackedEntry(regional, false, false), true);
    assert.equal(isHomeTrackedEntry(cosmetic, false, false), false);
    assert.equal(isHomeTrackedEntry(cosmetic, true, false), true);
  });

  it("excludes battle-only forms from HOME boxes even when forms are enabled", () => {
    const mega = entry(6, "Charizard Mega X", "charizard-mega-x");
    const primal = entry(383, "Groudon Primal", "groudon-primal");
    const hangryMorpeko = entry(
      877,
      "Morpeko Hangry Mode",
      "morpeko-hangry",
    );

    assert.equal(isHomeTrackedEntry(mega, true, true), false);
    assert.equal(isHomeTrackedEntry(primal, true, true), false);
    assert.equal(isHomeTrackedEntry(hangryMorpeko, true, true), false);
  });

  it("tracks Gigantamax forms only when the G-Max option is enabled", () => {
    const gmax = entry(6, "Charizard G-Max", "charizard-gmax");

    assert.equal(isHomeTrackedEntry(gmax, true, true, false), false);
    assert.equal(isHomeTrackedEntry(gmax, false, false, true), true);
  });

  it("sorts base species before forms for stable HOME ordering", () => {
    const entries = [
      entry(37, "Alolan Vulpix", "vulpix-alola"),
      entry(1, "Bulbasaur"),
      entry(37, "Vulpix"),
    ].sort(compareLivingDexEntries);

    assert.deepEqual(
      entries.map((item) => item.displayName),
      ["Bulbasaur", "Vulpix", "Alolan Vulpix"],
    );
  });

  it("counts ownership by exact species/form key", () => {
    const entries = [
      entry(1, "Bulbasaur"),
      entry(37, "Vulpix"),
      entry(37, "Alolan Vulpix", "vulpix-alola"),
    ];
    const ownedRecords = {
      "1-base": owned(1, null),
      "37-vulpix-alola": owned(37, "vulpix-alola"),
    };

    assert.equal(getOwnedEntryCount(entries, ownedRecords), 2);
  });

  it("counts owned gender variants toward the base Living Dex species", () => {
    const entries = [entry(25, "Pikachu")];
    const ownedRecords = {
      "25-pikachu-female": owned(25, "pikachu-female"),
    };

    assert.equal(getOwnedEntryCount(entries, ownedRecords), 1);
  });

  it("keeps shiny-only gender variants out of normal Living Dex ownership", () => {
    const entries = [entry(3, "Venusaur")];
    const ownedRecords = {
      "3-venusaur-female": owned(3, "venusaur-female", {
        owned: false,
        shiny_owned: true,
      }),
    };

    assert.equal(getOwnedEntryCount(entries, ownedRecords), 0);
    assert.equal(getShinyEntryCount(entries, ownedRecords), 1);
  });

  it("excludes shiny-locked species from shiny targets and shiny counts", () => {
    const entries = [
      entry(25, "Pikachu"),
      entry(1025, "Pecharunt", null, { generation: 9 }),
    ];
    const ownedRecords = {
      "25-base": owned(25, null, { shiny_owned: true }),
      "1025-base": owned(1025, null, { shiny_owned: true }),
    };

    assert.equal(isShinyTargetEntry(entries[0]), true);
    assert.equal(isShinyTargetEntry(entries[1]), false);
    assert.equal(getShinyEntryCount(entries, ownedRecords), 1);
  });
});
