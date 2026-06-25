export type PrinterCategory =
  | 'tera-shard'
  | 'ability-patch'
  | 'exp-candy'
  | 'gold-bottle-cap'
  | 'pp-max'
  | 'evolution-item'
  | 'alcremie-sweet'
  | 'rare-ball';

export type PrinterMode = 'regular' | 'item-bonus' | 'ball-lotto' | 'combo';

export interface PrintJob {
  item: string;
  count: number;
}

export interface ItemPrinterSeed {
  id: number;
  seed: number;
  seed_datetime: string;
  seed_seconds: number;
  category: PrinterCategory;
  mode: PrinterMode;
  print_count: number;
  summary: string | null;
  primary_item: string;
  primary_item_count: number;
  prints: PrintJob[];
  trigger_print: PrintJob | null;
  bonus_print: PrintJob | null;
  note: string | null;
  source_gist: string;
  source: 'lusamine' | 'game8';
}

export interface GistEntry {
  url: string;
  category: PrinterCategory;
  mode: PrinterMode;
  print_count: number;
}

export const CATEGORY_LABELS: Record<PrinterCategory, string> = {
  'tera-shard': 'Tera Shard',
  'ability-patch': 'Ability Patch',
  'exp-candy': 'Exp. Candy',
  'gold-bottle-cap': 'Gold Bottle Cap',
  'pp-max': 'PP Max',
  'evolution-item': 'Evolution Item',
  'alcremie-sweet': 'Alcremie Sweet',
  'rare-ball': 'Rare Ball',
};

export const MODE_LABELS: Record<PrinterMode, string> = {
  regular: 'Regular',
  'item-bonus': '2× Item Bonus',
  'ball-lotto': 'Ball Lotto',
  combo: 'Combo',
};

export const MODE_ORDER: PrinterMode[] = ['regular', 'item-bonus', 'ball-lotto', 'combo'];

export const CATEGORY_MODES: Record<PrinterCategory, PrinterMode[]> = {
  'tera-shard': ['regular', 'item-bonus', 'combo'],
  'ability-patch': ['regular', 'item-bonus', 'combo'],
  'exp-candy': ['regular', 'item-bonus', 'combo'],
  'gold-bottle-cap': ['regular', 'item-bonus', 'combo'],
  'pp-max': ['regular', 'item-bonus', 'combo'],
  'evolution-item': ['regular'],
  'alcremie-sweet': ['regular'],
  'rare-ball': ['ball-lotto', 'combo'],
};
