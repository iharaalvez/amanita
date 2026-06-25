import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ItemPrinterSeed, PrinterCategory, PrinterMode } from '@/lib/itemPrinter/types';

interface BrowseParams {
  category: PrinterCategory | 'all';
  mode: PrinterMode;
  primaryItem?: string;
  minSeconds?: number;
  limit?: number;
}

interface SearchParams {
  query: string;
  mode?: PrinterMode;
  limit?: number;
}

export function useItemPrinterBrowse({ category, mode, primaryItem, minSeconds, limit = 20 }: BrowseParams) {
  return useQuery({
    queryKey: ['item-printer-browse', category, mode, primaryItem, minSeconds, limit],
    queryFn: async (): Promise<ItemPrinterSeed[]> => {
      let q = supabase
        .from('item_printer_seeds')
        .select('*')
        .eq('mode', mode)
        .order('primary_item_count', { ascending: false })
        .limit(limit);

      if (category !== 'all') q = q.eq('category', category);
      if (primaryItem) q = q.eq('primary_item', primaryItem);
      if (minSeconds && minSeconds > 0) q = q.eq('seed_seconds', minSeconds);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ItemPrinterSeed[];
    },
    staleTime: Infinity,
  });
}

export function useItemPrinterSearch({ query, mode, limit = 30 }: SearchParams) {
  return useQuery({
    queryKey: ['item-printer-search', query, mode, limit],
    queryFn: async (): Promise<ItemPrinterSeed[]> => {
      if (!query.trim()) return [];

      let q = supabase
        .from('item_printer_seeds')
        .select('*')
        .ilike('primary_item', `%${query.trim()}%`)
        .order('primary_item_count', { ascending: false })
        .limit(limit);

      if (mode) q = q.eq('mode', mode);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ItemPrinterSeed[];
    },
    enabled: query.trim().length >= 2,
    staleTime: Infinity,
  });
}

export function useItemPrinterPrimaryItems(category: PrinterCategory) {
  return useQuery({
    queryKey: ['item-printer-items', category],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('item_printer_seeds')
        .select('primary_item')
        .eq('category', category)
        .order('primary_item');

      if (error) throw error;
      return [...new Set((data ?? []).map((r: { primary_item: string }) => r.primary_item))];
    },
    staleTime: Infinity,
  });
}
