/**
 * Seeds cosmetic/variant form Pokémon into living_dex_entries.
 *
 * Run once with:
 *   npm run seed:forms
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 * in your .env.local (or set them as env vars before running).
 *
 * NOTE: Before running, add a unique constraint in Supabase SQL editor:
 *   ALTER TABLE living_dex_entries
 *   ADD CONSTRAINT living_dex_entries_species_form_key
 *   UNIQUE (species_id, form_name) NULLS NOT DISTINCT;
 */

import { config } from "dotenv";
config({ path: ".env.local" }); // Next.js env file
import { createClient } from "@supabase/supabase-js";
import { COSMETIC_FORMS } from "../src/config/cosmetic-forms";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_KEY env vars.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

type PokéAPISprites = {
  front_default: string | null;
  front_shiny: string | null;
  front_female?: string | null;
  front_shiny_female?: string | null;
};
type PokéAPIPokemon = {
  sprites: PokéAPISprites;
  types: { slot: number; type: { name: string } }[];
  height: number;
  weight: number;
};
type PokéAPIForm = { sprites: PokéAPISprites };

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getJson(url: string): Promise<unknown | null> {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

type FormData = {
  spriteUrl: string;
  shinySpriteUrl: string;
  types: string[];
  height: number;
  weight: number;
};

function selectSprite(sprites: PokéAPISprites, gender?: "female") {
  if (gender === "female") {
    return {
      spriteUrl: sprites.front_female ?? sprites.front_default ?? "",
      shinySpriteUrl: sprites.front_shiny_female ?? sprites.front_shiny ?? "",
    };
  }

  return {
    spriteUrl: sprites.front_default ?? "",
    shinySpriteUrl: sprites.front_shiny ?? "",
  };
}

/** Tries /pokemon/{name}, then /pokemon-form/{name} + base types. */
async function fetchFormData(
  apiName: string,
  speciesId: number,
  spriteGender?: "female",
): Promise<FormData | null> {
  const pokemon = (await getJson(
    `https://pokeapi.co/api/v2/pokemon/${apiName}`,
  )) as PokéAPIPokemon | null;
  if (pokemon) {
    return {
      ...selectSprite(pokemon.sprites, spriteGender),
      types: pokemon.types
        .sort((a, b) => a.slot - b.slot)
        .map((t) => t.type.name),
      height: pokemon.height,
      weight: pokemon.weight,
    };
  }

  // Fallback: form-only variants (Unown letters, seasonal forms, etc.)
  const form = (await getJson(
    `https://pokeapi.co/api/v2/pokemon-form/${apiName}`,
  )) as PokéAPIForm | null;
  if (!form) return null;

  await sleep(200);
  const base = (await getJson(
    `https://pokeapi.co/api/v2/pokemon/${speciesId}`,
  )) as PokéAPIPokemon | null;
  const types = base
    ? base.types.sort((a, b) => a.slot - b.slot).map((t) => t.type.name)
    : [];

  return {
    ...selectSprite(form.sprites, spriteGender),
    types,
    height: base?.height ?? 0,
    weight: base?.weight ?? 0,
  };
}

async function main() {
  console.log(`Seeding ${COSMETIC_FORMS.length} cosmetic form entries…\n`);

  const bySpecies = new Map<number, typeof COSMETIC_FORMS>();
  for (const form of COSMETIC_FORMS) {
    if (!bySpecies.has(form.speciesId)) bySpecies.set(form.speciesId, []);
    bySpecies.get(form.speciesId)!.push(form);
  }

  let inserted = 0;
  let skipped = 0;

  for (const [speciesId, forms] of bySpecies) {
    console.log(`Species ${speciesId} — ${forms.length} form(s)`);

    for (let i = 0; i < forms.length; i++) {
      const form = forms[i]!;
      process.stdout.write(`  ${form.apiName} … `);

      await sleep(400); // ~2.5 req/s

      const data = await fetchFormData(
        form.dataName ?? form.apiName,
        speciesId,
        form.spriteGender,
      );
      if (!data) {
        console.log("⚠️  not found in PokéAPI, skipping");
        skipped++;
        continue;
      }

      const row = {
        species_id: speciesId,
        form_name: form.apiName,
        display_name: form.displayName,
        sprite_url: form.spriteUrl ?? data.spriteUrl,
        shiny_sprite_url: form.shinySpriteUrl ?? data.shinySpriteUrl,
        is_regional_form: form.isRegionalForm ?? false,
        region_label: form.regionLabel ?? null,
        sort_order: speciesId * 1000 + i + 1,
        types: data.types,
        height: data.height,
        weight: data.weight,
      };

      // Delete existing row first (idempotent re-run support)
      await supabase
        .from("living_dex_entries")
        .delete()
        .eq("species_id", speciesId)
        .eq("form_name", form.apiName);

      const { error } = await supabase.from("living_dex_entries").insert(row);

      if (error) {
        console.log(`ERROR — ${error.message}`);
        skipped++;
      } else {
        console.log("✓");
        inserted++;
      }
    }
  }

  console.log(`\nDone. Inserted: ${inserted}  Skipped: ${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
