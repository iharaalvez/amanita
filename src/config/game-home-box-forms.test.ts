import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COSMETIC_FORMS } from "./cosmetic-forms";
import { isAllowedGameHomeBoxForm } from "./game-home-box-forms";

describe("game HOME box form allowlists", () => {
  it("keeps Scarlet/Violet Basculin to Red and Blue Stripe only", () => {
    assert.equal(isAllowedGameHomeBoxForm("scarlet-violet", 550, null), true);
    assert.equal(
      isAllowedGameHomeBoxForm(
        "scarlet-violet",
        550,
        "basculin-blue-striped",
      ),
      true,
    );
    assert.equal(
      isAllowedGameHomeBoxForm(
        "scarlet-violet",
        550,
        "basculin-white-striped",
      ),
      false,
    );
  });

  it("keeps PLA Basculin to White Stripe only", () => {
    assert.equal(isAllowedGameHomeBoxForm("pla", 550, null), false);
    assert.equal(
      isAllowedGameHomeBoxForm("pla", 550, "basculin-blue-striped"),
      false,
    );
    assert.equal(
      isAllowedGameHomeBoxForm("pla", 550, "basculin-white-striped"),
      true,
    );
  });

  it("uses Alolan Vulpix and Ninetales for PLA", () => {
    assert.equal(isAllowedGameHomeBoxForm("pla", 37, null), false);
    assert.equal(isAllowedGameHomeBoxForm("pla", 37, "vulpix-alola"), true);
    assert.equal(isAllowedGameHomeBoxForm("pla", 38, null), false);
    assert.equal(isAllowedGameHomeBoxForm("pla", 38, "ninetales-alola"), true);
  });

  it("blocks event-only or non-boxable cosmetic forms from SV and PLA boxes", () => {
    assert.equal(
      isAllowedGameHomeBoxForm(
        "scarlet-violet",
        25,
        "pikachu-original-cap",
      ),
      false,
    );
    assert.equal(
      isAllowedGameHomeBoxForm("scarlet-violet", 666, "vivillon-poke-ball"),
      false,
    );
    assert.equal(
      isAllowedGameHomeBoxForm("scarlet-violet", 670, "floette-eternal"),
      false,
    );
    assert.equal(
      isAllowedGameHomeBoxForm("scarlet-violet", 999, "gimmighoul-roaming"),
      false,
    );
    assert.equal(
      isAllowedGameHomeBoxForm("pla", 25, "pikachu-original-cap"),
      false,
    );
    assert.equal(
      isAllowedGameHomeBoxForm("pla", 901, "ursaluna-bloodmoon"),
      false,
    );
  });

  it("tracks every distinct SV Vivillon pattern without duplicating base Meadow", () => {
    const vivillonForms = new Set(
      COSMETIC_FORMS.filter((form) => form.speciesId === 666).map(
        (form) => form.apiName,
      ),
    );

    assert.equal(isAllowedGameHomeBoxForm("scarlet-violet", 666, null), true);
    assert.equal(
      isAllowedGameHomeBoxForm("scarlet-violet", 666, "vivillon-meadow"),
      false,
    );
    assert.equal(vivillonForms.has("vivillon-meadow"), false);

    for (const formName of [
      "vivillon-fancy",
      "vivillon-icy-snow",
      "vivillon-polar",
      "vivillon-tundra",
      "vivillon-continental",
      "vivillon-garden",
      "vivillon-elegant",
      "vivillon-modern",
      "vivillon-marine",
      "vivillon-archipelago",
      "vivillon-high-plains",
      "vivillon-sandstorm",
      "vivillon-river",
      "vivillon-monsoon",
      "vivillon-savanna",
      "vivillon-sun",
      "vivillon-ocean",
      "vivillon-jungle",
    ]) {
      assert.equal(vivillonForms.has(formName), true, formName);
      assert.equal(
        isAllowedGameHomeBoxForm("scarlet-violet", 666, formName),
        true,
        formName,
      );
    }

    assert.equal(
      isAllowedGameHomeBoxForm("scarlet-violet", 666, "vivillon-poke-ball"),
      false,
    );
  });
});
