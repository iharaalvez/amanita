"use client";

import { CompassIcon } from "@/components/ui";

export default function GuidePage() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
        <CompassIcon className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
      </div>
      <h1 className="mb-2 text-xl font-bold dark:text-white">Hunt Guide</h1>
      <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
        Smart recommendations for what to catch next — coming soon. It will
        surface the most efficient targets based on your missing Pokémon and
        available games.
      </p>
    </div>
  );
}
