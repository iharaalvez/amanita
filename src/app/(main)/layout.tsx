"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { LandingPage } from "@/components/LandingPage";
import { AuthModal } from "@/components/auth/AuthModal";
import { PokemonDetailModal } from "@/components/pokemon/PokemonDetailModal";
import { Sidebar } from "@/components/layout/Sidebar";
import { useUIStore } from "@/store/uiStore";
import { usePokedexStore } from "@/store/pokedexStore";
import { useLivingDexEntries } from "@/hooks/usePokemon";
import { getOwnedEntryCount, isLivingDexSpecies } from "@/lib/livingDex";
import { supabase } from "@/lib/supabase";

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
      <main className="flex min-h-screen items-center justify-center bg-[#0d0f18] px-4 text-white">
        <div className="text-center">
          <p className="text-2xl font-black tracking-tight text-[#f8f0df]">
            Amanita
          </p>
          <p className="mt-3 text-sm text-slate-400">
            Checking your session...
          </p>
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
    <div className="flex h-dvh flex-col overflow-hidden bg-[#f4f0e8] dark:bg-[#0d0f18]">
      <AppHeader user={user} />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-y-auto pb-[calc(4.25rem+env(safe-area-inset-bottom))] sm:pb-0">
          {children}
        </main>
      </div>

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

function AppHeader({ user }: { user: SupabaseUser }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const userLabel =
    (user.user_metadata?.display_name as string | undefined) ??
    user.email ??
    "Trainer";
  const initial = userLabel.trim().charAt(0).toUpperCase() || "T";

  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className="relative z-40 flex h-14 shrink-0 items-center justify-between border-b border-[#d9d1c2] bg-[#f4f0e8]/95 px-4 shadow-sm shadow-black/[0.03] backdrop-blur sm:h-16 sm:px-5 dark:border-[#2f2b40] dark:bg-[#151520]/95">
      <div className="flex items-center gap-2 text-[#10131d] dark:text-[#f8f0df]">
        <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#9b84c8]/45 bg-white/75 shadow-sm dark:bg-[#0d0f18]">
          <Image
            src="/icon.png"
            alt=""
            aria-hidden="true"
            width={32}
            height={32}
            className="h-full w-full object-cover"
          />
        </span>
        <span className="text-lg font-black tracking-tight">Amanita</span>
      </div>

      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Open user menu"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="flex h-10 items-center gap-2 rounded-full border border-[#d9d1c2] bg-white/70 pl-1.5 pr-2 text-[#10131d] shadow-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9b84c8] dark:border-[#2f2b40] dark:bg-[#1a1a27] dark:text-[#f8f0df] dark:hover:bg-[#211b32]"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[#151520] text-xs font-black text-[#b9ec86] dark:bg-[#0d0f18]">
            {initial}
          </span>
          <span className="hidden max-w-36 truncate text-sm font-bold sm:block">
            {userLabel}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-[#8f8799] transition-transform ${
              menuOpen ? "rotate-180" : ""
            }`}
            strokeWidth={2.2}
          />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="fixed right-4 top-14 z-50 w-64 overflow-hidden rounded-lg border border-[#d9d1c2] bg-white shadow-xl shadow-black/10 sm:right-5 sm:top-16 dark:border-[#2f2b40] dark:bg-[#151520] dark:shadow-black/40"
          >
            <div className="border-b border-[#eee7dc] px-4 py-3 dark:border-[#2f2b40]">
              <p className="truncate text-sm font-black text-[#10131d] dark:text-[#f8f0df]">
                {userLabel}
              </p>
              {user.email && (
                <p className="mt-0.5 truncate text-xs font-medium text-[#8f8799]">
                  {user.email}
                </p>
              )}
            </div>

            <div className="p-1.5">
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold text-[#514874] transition-colors hover:bg-[#f4f0e8] dark:text-[#c9c1d7] dark:hover:bg-white/5"
              >
                <Settings className="h-4 w-4" strokeWidth={2.2} />
                Settings
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => supabase.auth.signOut()}
                className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-semibold text-[#514874] transition-colors hover:bg-[#f4f0e8] dark:text-[#c9c1d7] dark:hover:bg-white/5"
              >
                <LogOut className="h-4 w-4" strokeWidth={2.2} />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
