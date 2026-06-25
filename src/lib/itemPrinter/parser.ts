import type { PrintJob, GistEntry } from './types';

interface ParsedSeed {
  seed: number;
  seed_datetime: string;
  summary: string | null;
  prints: PrintJob[];
  trigger_print: PrintJob | null;
  bonus_print: PrintJob | null;
  note: string | null;
  primary_item: string;
  primary_item_count: number;
  print_count: number;
}

function parsePrintLine(line: string): PrintJob | null {
  const match = line.match(/^x(\d+)\s+(.+)$/);
  if (!match) return null;
  return { count: parseInt(match[1], 10), item: match[2].trim() };
}

function findPrimaryItem(prints: PrintJob[]): { item: string; count: number } {
  const totals = new Map<string, number>();
  for (const p of prints) {
    totals.set(p.item, (totals.get(p.item) ?? 0) + p.count);
  }
  let best = { item: '', count: 0 };
  for (const [item, count] of totals) {
    if (count > best.count) best = { item, count };
  }
  return best;
}

function parseEntry(lines: string[], isCombo: boolean): ParsedSeed | null {
  if (lines.length === 0) return null;

  // First line: "{seed}, {YYYY-MM-DD HH:MM:SS}"
  const headerMatch = lines[0].match(/^(\d+),\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})$/);
  if (!headerMatch) return null;

  const seed = parseInt(headerMatch[1], 10);
  const seed_datetime = headerMatch[2].replace(' ', 'T');

  let summary: string | null = null;
  const noteLines: string[] = [];
  const printLines: string[] = [];
  const triggerLines: string[] = [];
  let inTriggerSection = false;
  let inMainSection = false;
  let pastNote = false;
  const bonusLines: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('-->')) {
      if (isCombo) {
        if (!inTriggerSection && !inMainSection) {
          inTriggerSection = true;
        } else if (inTriggerSection) {
          inTriggerSection = false;
          inMainSection = true;
        } else {
          noteLines.push(line.slice(3).trim());
        }
      } else {
        noteLines.push(line.slice(3).trim());
        pastNote = true;
      }
    } else if (line.startsWith('x') && /^x\d/.test(line)) {
      if (isCombo && inTriggerSection) {
        triggerLines.push(line);
      } else if (!isCombo && pastNote) {
        // Extra print line after a note — this is the bonus print (ball lotto assorted)
        bonusLines.push(line);
      } else {
        printLines.push(line);
      }
    } else if (!summary) {
      summary = line.trim();
    }
  }

  const prints = printLines.map(parsePrintLine).filter((p): p is PrintJob => p !== null);
  const trigger_print = triggerLines.length > 0
    ? parsePrintLine(triggerLines[0])
    : null;
  const bonus_print = bonusLines.length > 0
    ? parsePrintLine(bonusLines[0])
    : null;

  if (prints.length === 0 && !isCombo) return null;

  const primary = findPrimaryItem(prints.length > 0 ? prints : (trigger_print ? [trigger_print] : []));

  return {
    seed,
    seed_datetime,
    summary: summary || null,
    prints,
    trigger_print,
    bonus_print,
    note: noteLines.length > 0 ? noteLines.join('; ') : null,
    primary_item: primary.item,
    primary_item_count: primary.count,
    print_count: prints.length,
  };
}

export function parseGistText(
  text: string,
  entry: GistEntry,
): Omit<ParsedSeed & { category: GistEntry['category']; mode: GistEntry['mode']; source_gist: string }, 'id'>[] {
  const isCombo = entry.mode === 'combo';
  const blocks = text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  const results = [];
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const parsed = parseEntry(lines, isCombo);
    if (!parsed) continue;
    results.push({
      ...parsed,
      print_count: parsed.print_count || entry.print_count,
      category: entry.category,
      mode: entry.mode,
      source_gist: entry.url,
    });
  }
  return results;
}
