/**
 * Fetches all Item Printer RNG seed lists from Lusamine's gists and the
 * Game8 guide, then populates the item_printer_seeds table.
 *
 * Run once with:
 *   npm run seed:item-printer
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY (or
 * NEXT_PUBLIC_SUPABASE_ANON_KEY) in .env.local.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { GIST_CATALOG, rawGistUrl } from '../src/lib/itemPrinter/gists';
import { parseGistText } from '../src/lib/itemPrinter/parser';
import { GAME8_SEEDS } from '../src/lib/itemPrinter/game8Seeds';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY env vars.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchGist(url: string): Promise<string> {
  const raw = rawGistUrl(url);
  const res = await fetch(raw);
  if (!res.ok) throw new Error(`Failed to fetch ${raw}: ${res.status}`);
  return res.text();
}

async function main() {
  console.log('Clearing existing item_printer_seeds…');
  const { error: deleteError } = await supabase
    .from('item_printer_seeds')
    .delete()
    .neq('id', 0);
  if (deleteError) throw deleteError;

  let totalInserted = 0;

  for (const entry of GIST_CATALOG) {
    process.stdout.write(`Fetching ${entry.category} / ${entry.mode} / ${entry.print_count}-print… `);
    const text = await fetchGist(entry.url);
    const seeds = parseGistText(text, entry);
    process.stdout.write(`${seeds.length} seeds  `);

    if (seeds.length === 0) {
      console.log('(skipped)');
      continue;
    }

    const rows = seeds.map((s) => ({
      seed: s.seed,
      seed_datetime: s.seed_datetime,
      category: s.category,
      mode: s.mode,
      print_count: s.print_count,
      summary: s.summary,
      primary_item: s.primary_item,
      primary_item_count: s.primary_item_count,
      prints: s.prints,
      trigger_print: s.trigger_print ?? null,
      bonus_print: s.bonus_print ?? null,
      note: s.note,
      source_gist: s.source_gist,
      source: 'lusamine',
    }));

    // Upsert in batches of 500 — skip duplicates on (seed, mode)
    const BATCH = 500;
    for (let i = 0; i < rows.length; i += BATCH) {
      const { error } = await supabase
        .from('item_printer_seeds')
        .upsert(rows.slice(i, i + BATCH), { onConflict: 'seed,mode', ignoreDuplicates: true });
      if (error) throw error;
    }

    totalInserted += seeds.length;
    console.log('done');

    // Gentle rate limiting for GitHub
    await new Promise((r) => setTimeout(r, 300));
  }

  // ── Game8 seeds ──────────────────────────────────────────────────────
  process.stdout.write(`\nInserting ${GAME8_SEEDS.length} Game8 seeds… `);
  const { error: g8Error, count } = await supabase
    .from('item_printer_seeds')
    .upsert(GAME8_SEEDS, { onConflict: 'seed,mode', ignoreDuplicates: true, count: 'exact' });
  if (g8Error) throw g8Error;
  console.log(`${count ?? GAME8_SEEDS.length} inserted (skipped duplicates)`);
  totalInserted += count ?? GAME8_SEEDS.length;

  console.log(`\nDone. Inserted ${totalInserted} seeds total.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
