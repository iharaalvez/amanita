import type { PrinterCategory, PrinterMode, PrintJob } from './types';

export interface Game8SeedEntry {
  datetime: string;
  category: PrinterCategory;
  mode: PrinterMode;
  print_count: number;
  prints: PrintJob[];
  trigger_print?: PrintJob;
}

function toSeed(isoDatetime: string): number {
  return Math.floor(new Date(isoDatetime + 'Z').getTime() / 1000);
}

function primaryItem(prints: PrintJob[]): { item: string; count: number } {
  return prints.reduce((best, p) => (p.count > best.count ? p : best), { item: '', count: 0 });
}

const RAW: Omit<Game8SeedEntry, 'print_count'>[] = [
  // ── Ball Lotto 5-print ──────────────────────────────────────────────
  {
    datetime: '2058-08-14T15:39:17',
    category: 'rare-ball',
    mode: 'ball-lotto',
    prints: [{ item: 'Master Ball', count: 4 }, { item: 'Beast Ball', count: 1 }],
  },
  {
    datetime: '2049-01-02T01:20:22',
    category: 'rare-ball',
    mode: 'ball-lotto',
    prints: [{ item: 'Safari Ball', count: 5 }],
  },
  {
    datetime: '2042-10-14T05:56:33',
    category: 'rare-ball',
    mode: 'ball-lotto',
    prints: [{ item: 'Moon Ball', count: 5 }],
  },
  {
    datetime: '2023-05-22T05:36:11',
    category: 'rare-ball',
    mode: 'ball-lotto',
    prints: [{ item: 'Love Ball', count: 5 }],
  },
  {
    datetime: '2028-10-31T15:17:02',
    category: 'rare-ball',
    mode: 'ball-lotto',
    prints: [{ item: 'Heavy Ball', count: 5 }],
  },
  {
    datetime: '2057-11-21T04:28:37',
    category: 'rare-ball',
    mode: 'ball-lotto',
    prints: [{ item: 'Lure Ball', count: 5 }],
  },
  {
    datetime: '2045-03-17T10:05:38',
    category: 'rare-ball',
    mode: 'ball-lotto',
    prints: [{ item: 'Level Ball', count: 5 }],
  },
  {
    datetime: '2045-07-19T00:08:56',
    category: 'rare-ball',
    mode: 'ball-lotto',
    prints: [{ item: 'Friend Ball', count: 5 }],
  },
  {
    datetime: '2034-09-01T02:33:39',
    category: 'rare-ball',
    mode: 'ball-lotto',
    prints: [{ item: 'Fast Ball', count: 5 }],
  },
  {
    datetime: '2009-06-05T20:17:11',
    category: 'rare-ball',
    mode: 'ball-lotto',
    prints: [{ item: 'Sport Ball', count: 5 }],
  },
  {
    datetime: '2043-10-23T16:32:45',
    category: 'rare-ball',
    mode: 'ball-lotto',
    prints: [{ item: 'Dream Ball', count: 5 }],
  },
  {
    datetime: '2000-08-23T11:16:28',
    category: 'rare-ball',
    mode: 'ball-lotto',
    prints: [{ item: 'Beast Ball', count: 5 }],
  },

  // ── Competitive Items — 2× Item Bonus 5-print ──────────────────────
  {
    datetime: '2000-05-12T22:59:28',
    category: 'ability-patch',
    mode: 'item-bonus',
    prints: [{ item: 'Ability Patch', count: 16 }, { item: 'Dark Tera Shard', count: 36 }],
  },
  {
    datetime: '2033-02-08T10:48:09',
    category: 'exp-candy',
    mode: 'item-bonus',
    prints: [
      { item: 'Exp. Candy XL', count: 28 },
      { item: 'Exp. Candy L', count: 20 },
      { item: 'Protein', count: 4 },
    ],
  },
  {
    datetime: '2049-07-23T00:16:57',
    category: 'pp-max',
    mode: 'item-bonus',
    prints: [
      { item: 'PP Max', count: 18 },
      { item: 'Ability Capsule', count: 2 },
      { item: 'Magnet', count: 2 },
    ],
  },
  {
    datetime: '2018-01-24T09:29:28',
    category: 'gold-bottle-cap',
    mode: 'item-bonus',
    prints: [{ item: 'Gold Bottle Cap', count: 14 }, { item: 'Exp. Candy XS', count: 18 }],
  },

  // ── Rare Ball Combo — 10-print (1× trigger + 10× main) ────────────
  // Trigger print activates Ball Lotto in-seed; no pre-activation needed.
  {
    datetime: '2039-03-21T12:14:42',
    category: 'rare-ball',
    mode: 'combo',
    trigger_print: { item: 'Pretty Feather', count: 9 },
    prints: [
      { item: 'Level Ball', count: 2 },
      { item: 'Heavy Ball', count: 2 },
      { item: 'Fast Ball', count: 1 },
      { item: 'Love Ball', count: 1 },
      { item: 'Moon Ball', count: 1 },
      { item: 'Lure Ball', count: 1 },
      { item: 'Dream Ball', count: 1 },
      { item: 'Friend Ball', count: 1 },
    ],
  },
  {
    datetime: '2052-08-07T07:58:29',
    category: 'rare-ball',
    mode: 'combo',
    trigger_print: { item: 'Big Nugget', count: 5 },
    prints: [
      { item: 'Beast Ball', count: 3 },
      { item: 'Love Ball', count: 3 },
      { item: 'Master Ball', count: 1 },
      { item: 'Lure Ball', count: 1 },
      { item: 'Sport Ball', count: 1 },
      { item: 'Moon Ball', count: 1 },
    ],
  },
  {
    datetime: '2056-09-19T19:55:31',
    category: 'rare-ball',
    mode: 'combo',
    trigger_print: { item: 'Upgrade', count: 2 },
    prints: [
      { item: 'Fast Ball', count: 2 },
      { item: 'Love Ball', count: 2 },
      { item: 'Dream Ball', count: 1 },
      { item: 'Sport Ball', count: 1 },
      { item: 'Heavy Ball', count: 1 },
      { item: 'Lure Ball', count: 1 },
      { item: 'Master Ball', count: 1 },
      { item: 'Friend Ball', count: 1 },
    ],
  },

  // ── Tera Shards — 2× Item Bonus 5-print ────────────────────────────
  {
    datetime: '2041-03-11T01:10:10',
    category: 'tera-shard',
    mode: 'item-bonus',
    prints: [{ item: 'Normal Tera Shard', count: 134 }],
  },
  {
    datetime: '2054-08-05T03:35:10',
    category: 'tera-shard',
    mode: 'item-bonus',
    prints: [{ item: 'Fire Tera Shard', count: 148 }],
  },
  {
    datetime: '2003-04-26T13:23:25',
    category: 'tera-shard',
    mode: 'item-bonus',
    prints: [{ item: 'Water Tera Shard', count: 126 }, { item: 'Comet Shard', count: 10 }],
  },
  {
    datetime: '2040-11-15T04:12:36',
    category: 'tera-shard',
    mode: 'item-bonus',
    prints: [{ item: 'Electric Tera Shard', count: 140 }, { item: 'Max Ether', count: 8 }],
  },
  {
    datetime: '2006-02-28T08:25:19',
    category: 'tera-shard',
    mode: 'item-bonus',
    prints: [{ item: 'Grass Tera Shard', count: 126 }, { item: 'Stardust', count: 12 }],
  },
  {
    datetime: '2051-05-10T10:07:10',
    category: 'tera-shard',
    mode: 'item-bonus',
    prints: [{ item: 'Ice Tera Shard', count: 134 }, { item: 'Metal Coat', count: 2 }],
  },
  {
    datetime: '2017-11-14T18:02:15',
    category: 'tera-shard',
    mode: 'item-bonus',
    prints: [{ item: 'Fighting Tera Shard', count: 132 }, { item: 'Shiny Stone', count: 6 }],
  },
  {
    datetime: '2001-09-03T02:14:28',
    category: 'tera-shard',
    mode: 'item-bonus',
    prints: [{ item: 'Poison Tera Shard', count: 158 }, { item: 'Exp. Candy M', count: 26 }],
  },
  {
    datetime: '2016-05-15T14:18:09',
    category: 'tera-shard',
    mode: 'item-bonus',
    prints: [{ item: 'Ground Tera Shard', count: 130 }, { item: 'PP Up', count: 10 }],
  },
  {
    datetime: '2055-06-10T06:03:31',
    category: 'tera-shard',
    mode: 'item-bonus',
    prints: [{ item: 'Flying Tera Shard', count: 134 }, { item: 'Revive', count: 6 }],
  },
  {
    datetime: '2052-12-12T20:44:15',
    category: 'tera-shard',
    mode: 'item-bonus',
    prints: [{ item: 'Psychic Tera Shard', count: 132 }, { item: 'Toxic Orb', count: 4 }],
  },
  {
    datetime: '2047-11-23T08:17:28',
    category: 'tera-shard',
    mode: 'item-bonus',
    prints: [{ item: 'Bug Tera Shard', count: 134 }, { item: 'Ether', count: 4 }],
  },
  {
    datetime: '2024-07-22T14:18:16',
    category: 'tera-shard',
    mode: 'item-bonus',
    prints: [{ item: 'Rock Tera Shard', count: 120 }, { item: 'Focus Band', count: 2 }],
  },
  {
    datetime: '2017-02-05T17:31:13',
    category: 'tera-shard',
    mode: 'item-bonus',
    prints: [{ item: 'Ghost Tera Shard', count: 122 }, { item: 'Grass Tera Shard', count: 118 }],
  },
  {
    datetime: '2038-04-23T22:25:09',
    category: 'tera-shard',
    mode: 'item-bonus',
    prints: [{ item: 'Dragon Tera Shard', count: 136 }, { item: 'Ability Patch', count: 2 }],
  },
  {
    datetime: '2055-04-05T11:05:12',
    category: 'tera-shard',
    mode: 'item-bonus',
    prints: [{ item: 'Dark Tera Shard', count: 122 }, { item: 'Max Ether', count: 8 }],
  },
  {
    datetime: '2019-03-30T06:49:09',
    category: 'tera-shard',
    mode: 'item-bonus',
    prints: [{ item: 'Steel Tera Shard', count: 146 }, { item: 'Exp. Candy S', count: 26 }],
  },
  {
    datetime: '2038-06-14T21:11:07',
    category: 'tera-shard',
    mode: 'item-bonus',
    prints: [{ item: 'Fairy Tera Shard', count: 134 }, { item: 'Safety Goggles', count: 2 }],
  },
  {
    datetime: '2004-10-11T21:16:10',
    category: 'tera-shard',
    mode: 'item-bonus',
    prints: [
      { item: 'Stellar Tera Shard', count: 82 },
      { item: 'Exp. Candy XL', count: 2 },
      { item: 'Pearl', count: 18 },
    ],
  },
];

export const GAME8_SEEDS = RAW.map((entry) => {
  const seed = toSeed(entry.datetime);
  const best = primaryItem(entry.prints);
  return {
    seed,
    seed_datetime: entry.datetime.replace('T', ' '),
    category: entry.category,
    mode: entry.mode,
    print_count: entry.mode === 'combo' ? 10 : 5,
    summary: null as string | null,
    primary_item: best.item,
    primary_item_count: best.count,
    prints: entry.prints,
    trigger_print: entry.trigger_print ?? null,
    bonus_print: null,
    note: null as string | null,
    source_gist: 'https://game8.co/games/Pokemon-Scarlet-Violet/archives/451129',
    source: 'game8' as const,
  };
});
