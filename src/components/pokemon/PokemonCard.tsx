'use client';

import Image from 'next/image';
import { usePokedexStore, ownedKey } from '@/store/pokedexStore';
import { getFormLabel } from '@/lib/forms';
import { CheckIcon } from '@/components/ui';
import type { LivingDexEntry } from '@/types/pokemon';

const REGION_TAG_CLASSES: Record<string, string> = {
  Alolan: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  Galarian: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  Hisuian: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  Paldean: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
};

type Props = {
  entry: LivingDexEntry;
  onSelect: (speciesId: number, formName: string | null) => void;
};

export function PokemonCard({ entry, onSelect }: Props) {
  const { speciesId, formName, displayName, spriteUrl } = entry;
  const key = ownedKey(speciesId, formName);
  const owned = usePokedexStore((s) => !!s.owned[key]?.owned);

  const paddedNumber = `#${String(speciesId).padStart(4, '0')}`;
  const formLabel = formName ? getFormLabel(formName) : null;

  return (
    <button
      onClick={() => onSelect(speciesId, formName)}
      title={`${displayName} - click for details`}
      aria-label={`${displayName}, ${owned ? 'owned' : 'not owned'}`}
      aria-pressed={owned}
      className={`relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all cursor-pointer w-full
        ${owned
          ? 'ring-2 ring-green-400 bg-green-50 dark:bg-green-950'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
    >
      {owned && (
        <span
          aria-hidden
          className="absolute top-1 right-1 w-4 h-4 bg-green-400 rounded-full flex items-center justify-center text-white text-[9px] leading-none font-bold"
        >
          <CheckIcon className="w-2.5 h-2.5" />
        </span>
      )}

      <Image
        src={spriteUrl}
        alt={displayName}
        width={64}
        height={64}
        style={{ imageRendering: 'pixelated' }}
        className={`w-16 h-16 object-contain transition-all duration-200 ${
          owned ? '' : 'grayscale opacity-40'
        }`}
      />

      <span className="text-[10px] text-gray-400 tabular-nums">{paddedNumber}</span>

      {/* Base species name — strip the region prefix so 'Alolan Vulpix' just shows 'Vulpix' */}
      <span className="text-[11px] font-medium text-center leading-tight truncate w-full px-1">
        {formName
          ? displayName.split(' ').slice(1).join(' ') || displayName
          : displayName}
      </span>

      {formLabel && (
        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-none ${REGION_TAG_CLASSES[formLabel] ?? 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300'}`}>
          {formLabel}
        </span>
      )}
    </button>
  );
}
