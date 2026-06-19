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
import type { GameDexFlags, LivingDexEntry } from "@/types/pokemon";

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
  overrides: Partial<GameDexFlags> = {},
): GameDexFlags {
  return {
    owned: true,
    shiny: false,
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
    const battleOnlyForms = [
      entry(6, "Charizard Mega X", "charizard-mega-x"),
      entry(351, "Castform Sunny Form", "castform-sunny"),
      entry(483, "Dialga Origin Forme", "dialga-origin"),
      entry(487, "Giratina Origin Forme", "giratina-origin"),
      entry(493, "Arceus Fire Type", "arceus-fire"),
      entry(383, "Groudon Primal", "groudon-primal"),
      entry(555, "Darmanitan Galarian Zen Mode", "darmanitan-galar-zen"),
      entry(648, "Meloetta Pirouette Forme", "meloetta-pirouette"),
      entry(649, "Genesect Douse Drive", "genesect-douse"),
      entry(681, "Aegislash Blade Forme", "aegislash-blade"),
      entry(716, "Xerneas Active Mode", "xerneas-active"),
      entry(718, "Zygarde Complete Forme", "zygarde-complete"),
      entry(746, "Wishiwashi School Form", "wishiwashi-school"),
      entry(773, "Silvally Fire Type", "silvally-fire"),
      entry(774, "Minior Meteor Form", "minior-meteor"),
      entry(778, "Mimikyu Busted Form", "mimikyu-busted"),
      entry(800, "Necrozma Dusk Mane", "necrozma-dusk"),
      entry(845, "Cramorant Gulping Form", "cramorant-gulping"),
      entry(875, "Eiscue Noice Face", "eiscue-noice"),
      entry(877, "Morpeko Hangry Mode", "morpeko-hangry"),
      entry(888, "Zacian Crowned Sword", "zacian-crowned"),
      entry(889, "Zamazenta Crowned Shield", "zamazenta-crowned"),
      entry(898, "Calyrex Ice Rider", "calyrex-ice"),
      entry(964, "Palafin Hero Form", "palafin-hero"),
      entry(1017, "Ogerpon Wellspring Mask", "ogerpon-wellspring-mask"),
      entry(1024, "Terapagos Stellar Form", "terapagos-stellar"),
    ];

    for (const form of battleOnlyForms) {
      assert.equal(isHomeTrackedEntry(form, true, true), false);
    }
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
      "1-base": owned(),
      "37-vulpix-alola": owned(),
    };

    assert.equal(getOwnedEntryCount(entries, ownedRecords), 2);
  });

  it("counts owned gender variants toward the base Living Dex species", () => {
    const entries = [entry(25, "Pikachu")];
    const ownedRecords = {
      "25-pikachu-female": owned(),
    };

    assert.equal(getOwnedEntryCount(entries, ownedRecords), 1);
  });

  it("keeps shiny-only gender variants out of normal Living Dex ownership", () => {
    const entries = [entry(3, "Venusaur")];
    const ownedRecords = {
      "3-venusaur-female": owned({
        owned: false,
        shiny: true,
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
      "25-base": owned({ shiny: true }),
      "1025-base": owned({ shiny: true }),
    };

    assert.equal(isShinyTargetEntry(entries[0]), true);
    assert.equal(isShinyTargetEntry(entries[1]), false);
    assert.equal(getShinyEntryCount(entries, ownedRecords), 1);
  });
});
