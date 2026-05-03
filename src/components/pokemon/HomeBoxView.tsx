'use client';

import { useLivingDexEntries } from '@/hooks/usePokemon';
import { BoxSlot } from './BoxSlot';
import type { LivingDexEntry } from '@/types/pokemon';

const BOX_SIZE = 30;

function buildBoxes(entries: LivingDexEntry[]): (LivingDexEntry | null)[][] {
  const totalBoxes = Math.ceil(entries.length / BOX_SIZE);
  return Array.from({ length: totalBoxes }, (_, index) => {
    const chunk: (LivingDexEntry | null)[] = entries.slice(index * BOX_SIZE, (index + 1) * BOX_SIZE);
    while (chunk.length < BOX_SIZE) chunk.push(null);
    return chunk;
  });
}

type Props = {
  onSelect: (speciesId: number, formName: string | null) => void;
};

export function HomeBoxView({ onSelect }: Props) {
  const { data, isLoading, error } = useLivingDexEntries();

  if (error) {
    return (
      <div className="text-center py-20 text-red-500">
        Failed to load Pokemon data. Check your connection and try again.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const orderedEntries = [...(data ?? [])].toSorted((a, b) => {
    if (a.speciesId !== b.speciesId) return a.speciesId - b.speciesId;
    if (a.formName === null) return -1;
    if (b.formName === null) return 1;
    return a.displayName.localeCompare(b.displayName);
  });
  const boxes = buildBoxes(orderedEntries);

  return (
    <div className="max-w-7xl mx-auto px-4 pb-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {boxes.map((box, boxIndex) => (
          <section
            key={boxIndex}
            className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700"
          >
            <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold tracking-wide uppercase mb-3">
              Box {boxIndex + 1}
            </p>
            <div className="grid grid-cols-6 gap-2">
              {box.map((entry, slotIndex) => (
                <BoxSlot key={`${boxIndex}-${slotIndex}`} entry={entry} slotIndex={slotIndex} onSelect={onSelect} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
