'use client';

import { useEffect } from 'react';
import { api } from '@/lib/api';
import { usePokedexStore } from '@/store/pokedexStore';
import type { ProgressSnapshot } from '@/types/pokemon';

function hasProgress(snapshot: ProgressSnapshot): boolean {
  return (
    Object.keys(snapshot.owned).length > 0 ||
    Object.keys(snapshot.gameDexProgress).length > 0 ||
    Object.keys(snapshot.availableGames).length > 0
  );
}

export function ProgressPersistence() {
  useEffect(() => {
    let hydrated = false;
    let saveTimer: ReturnType<typeof setTimeout> | undefined;

    async function hydrate() {
      try {
        const localSnapshot = usePokedexStore.getState().getProgressSnapshot();
        const serverSnapshot = await api.getProgress();

        if (hasProgress(serverSnapshot)) {
          usePokedexStore.getState().setProgressSnapshot(serverSnapshot);
        } else if (hasProgress(localSnapshot)) {
          await api.saveProgress(localSnapshot);
        }
      } catch (error) {
        console.warn('Failed to sync progress with local API.', error);
      } finally {
        hydrated = true;
      }
    }

    void hydrate();

    const unsubscribe = usePokedexStore.subscribe((state) => {
      if (!hydrated) return;
      if (saveTimer) clearTimeout(saveTimer);

      const snapshot: ProgressSnapshot = {
        owned: state.owned,
        gameDexProgress: state.gameDexProgress,
        availableGames: state.availableGames,
      };

      saveTimer = setTimeout(() => {
        void api.saveProgress(snapshot).catch((error) => {
          console.warn('Failed to save progress to local API.', error);
        });
      }, 500);
    });

    return () => {
      if (saveTimer) clearTimeout(saveTimer);
      unsubscribe();
    };
  }, []);

  return null;
}
