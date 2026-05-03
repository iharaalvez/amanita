'use client';

import Image from 'next/image';
import { usePokedexStore, ownedKey } from '@/store/pokedexStore';
import { Tooltip } from '@/components/ui';
import type { LivingDexEntry } from '@/types/pokemon';

type Props = {
  entry: LivingDexEntry | null;
  slotIndex: number;
  onSelect?: (speciesId: number, formName: string | null) => void;
};

export function BoxSlot({ entry, onSelect }: Props) {
  const key = entry ? ownedKey(entry.speciesId, entry.formName) : '';
  const owned = usePokedexStore((s) => (entry ? !!s.owned[key]?.owned : false));

  if (!entry) {
    return (
      <div className="aspect-square min-h-[88px] rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700" />
    );
  }

  const paddedNumber = `#${String(entry.speciesId).padStart(4, '0')}`;

  return (
    <Tooltip content={`${paddedNumber} · ${entry.displayName}`}>
      <button
        onClick={() => onSelect?.(entry.speciesId, entry.formName)}
        aria-label={`${entry.displayName}, ${owned ? 'owned' : 'not owned'}`}
        aria-pressed={owned}
        className={`aspect-square min-h-[88px] w-full rounded-lg flex flex-col items-center justify-center gap-1 transition-all cursor-pointer p-1.5
          ${owned
            ? 'ring-1 ring-green-400 bg-white dark:bg-gray-700'
            : 'hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
      >
        <Image
          src={entry.spriteUrl}
          alt={entry.displayName}
          width={40}
          height={40}
          style={{ imageRendering: 'pixelated' }}
          className={`w-12 h-12 object-contain transition-all duration-200 ${
            owned ? '' : 'grayscale opacity-35'
          }`}
        />
        <span className="w-full truncate px-1 text-center text-[10px] font-medium leading-tight text-gray-500 dark:text-gray-300">
          {entry.displayName}
        </span>
      </button>
    </Tooltip>
  );
}
