"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LandingPage } from "@/components/LandingPage";
import { AuthModal } from "@/components/auth/AuthModal";
import { PokemonDetailModal } from "@/components/pokemon/PokemonDetailModal";
import { Sidebar } from "@/components/layout/Sidebar";
import { useUIStore } from "@/store/uiStore";
import { usePokedexStore } from "@/store/pokedexStore";
import { useLivingDexEntries } from "@/hooks/usePokemon";
import { getOwnedEntryCount, isLivingDexSpecies } from "@/lib/livingDex";

const SHOWN_MILESTONES_KEY = "living-pokedex-shown-milestones-v1";

function getShownMilestones(): Set<number> {
  try {
    const value = JSON.parse(
      localStorage.getItem(SHOWN_MILESTONES_KEY) ?? "[]",
    ) as unknown;
    return new Set(
      Array.isArray(value)
        ? value.filter((t): t is number => Number.isInteger(t))
        : [],
    );
  } catch {
    return new Set();
  }
}

const MILESTONES: [number, string][] = [
  [1, "First Pokémon caught!"],
  [50, "50 caught — just getting started."],
  [100, "100 Pokémon owned!"],
  [250, "250 owned — a quarter of the way there."],
  [500, "Halfway to a complete Living Dex!"],
  [750, "750 owned — almost there."],
  [1025, "Living Dex complete! 🎉"],
];

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 60 * 1000 } },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <MainLayoutContent>{children}</MainLayoutContent>
    </QueryClientProvider>
  );
}

function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  const selected = useUIStore((s) => s.selectedPokemon);
  const closePokemon = useUIStore((s) => s.closePokemon);
  const openPokemon = useUIStore((s) => s.openPokemon);

  const ownedRecords = usePokedexStore((s) => s.owned);
  const { data: livingDexEntries, isSuccess: livingDexLoaded } =
    useLivingDexEntries();

  const [milestoneMessage, setMilestoneMessage] = useState<string | null>(null);
  const prevOwnedRef = useRef<number | null>(null);
  const milestoneReadyRef = useRef(false);

  const filteredEntries = useMemo(
    () => (livingDexEntries ?? []).filter(isLivingDexSpecies),
    [livingDexEntries],
  );

  const ownedCount = useMemo(
    () => getOwnedEntryCount(filteredEntries, ownedRecords),
    [filteredEntries, ownedRecords],
  );

  useEffect(() => {
    if (!livingDexLoaded) return;
    const prev = prevOwnedRef.current;
    prevOwnedRef.current = ownedCount;
    if (!milestoneReadyRef.current) {
      milestoneReadyRef.current = true;
      return;
    }
    if (prev === null || ownedCount <= prev) return;
    const shown = getShownMilestones();
    for (const [threshold, message] of MILESTONES) {
      if (
        prev < threshold &&
        ownedCount >= threshold &&
        !shown.has(threshold)
      ) {
        shown.add(threshold);
        localStorage.setItem(
          SHOWN_MILESTONES_KEY,
          JSON.stringify(Array.from(shown)),
        );
        setMilestoneMessage(message);
        const timer = setTimeout(() => setMilestoneMessage(null), 4500);
        return () => clearTimeout(timer);
      }
    }
  }, [livingDexLoaded, ownedCount]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b1120] px-4 text-white">
        <div className="text-center">
          <p className="text-lg font-bold">Gotta Catch &apos;Em All!</p>
          <p className="mt-2 text-sm text-slate-400">Checking your session…</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <>
        <LandingPage onSignIn={() => setAuthOpen(true)} />
        {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
      </>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-white dark:bg-gray-900">
      <Sidebar user={user} />

      <main className="min-w-0 flex-1 overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-0">
        {children}
      </main>

      {selected && (
        <PokemonDetailModal
          pokemonId={selected.pokemonId}
          speciesId={selected.speciesId}
          formName={selected.formName}
          contextGameId={selected.contextGameId}
          onClose={closePokemon}
          onNavigate={(pokemonId, speciesId, formName) =>
            openPokemon(pokemonId, speciesId, formName, selected.contextGameId)
          }
        />
      )}

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}

      {milestoneMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg sm:bottom-6 dark:bg-white dark:text-gray-900"
        >
          {milestoneMessage}
        </div>
      )}
    </div>
  );
}
