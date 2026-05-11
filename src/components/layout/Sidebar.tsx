"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { usePokedexStore, ownedKey } from "@/store/pokedexStore";
import { useLivingDexEntries } from "@/hooks/usePokemon";
import {
  BarChartIcon,
  CompassIcon,
  GamepadIcon,
  GridIcon,
  HomeIcon,
} from "@/components/ui";
import type { ComponentType } from "react";

type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  Icon: ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/pokedex", label: "Pokédex", shortLabel: "Dex", Icon: GridIcon },
  { href: "/home", label: "HOME", shortLabel: "HOME", Icon: HomeIcon },
  { href: "/game", label: "Game Dex", shortLabel: "Games", Icon: GamepadIcon },
  { href: "/guide", label: "Hunt Guide", shortLabel: "Guide", Icon: CompassIcon },
  { href: "/stats", label: "Stats", shortLabel: "Stats", Icon: BarChartIcon },
];

function LivingDexProgress() {
  const ownedRecords = usePokedexStore((s) => s.owned);
  const showCosmeticForms = usePokedexStore((s) => s.showCosmeticForms);
  const { data: livingDexEntries } = useLivingDexEntries();

  const { ownedCount, total } = useMemo(() => {
    const entries = (livingDexEntries ?? []).filter(
      (e) => e.formName === null || e.isRegionalForm || showCosmeticForms,
    );
    const owned = entries.filter(
      (e) => ownedRecords[ownedKey(e.speciesId, e.formName)]?.owned,
    ).length;
    return { ownedCount: owned, total: entries.length || 1025 };
  }, [livingDexEntries, ownedRecords, showCosmeticForms]);

  const pct = total > 0 ? (ownedCount / total) * 100 : 0;

  return (
    <div className="px-4 py-3">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Living Dex
        </span>
        <span className="text-[11px] tabular-nums text-slate-400">
          <span className="font-bold text-green-400">{ownedCount}</span>
          <span className="mx-0.5 text-slate-600">/</span>
          {total}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-700">
        <div
          className="h-full rounded-full bg-green-400 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-right text-[10px] tabular-nums font-semibold text-green-400">
        {pct.toFixed(1)}%
      </p>
    </div>
  );
}

type SidebarProps = {
  user: User;
};

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const displayName = user.user_metadata?.display_name as string | undefined;

  function startEditName() {
    setNameInput(displayName ?? "");
    setEditingName(true);
  }

  useEffect(() => {
    if (editingName) inputRef.current?.focus();
  }, [editingName]);

  async function saveName() {
    setEditingName(false);
    const trimmed = nameInput.trim();
    if (trimmed === (displayName ?? "")) return;
    await supabase.auth.updateUser({ data: { display_name: trimmed || null } });
  }

  function handleNameKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") e.currentTarget.blur();
    if (e.key === "Escape") setEditingName(false);
  }

  const userLabel = displayName ?? user.email ?? "Trainer";

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden sm:flex sm:w-56 lg:w-60 shrink-0 flex-col bg-[#0b1120] text-white h-screen sticky top-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-0.5">
            Living Dex
          </p>
          <h1 className="text-base font-bold leading-tight text-white">
            Gotta Catch &apos;Em All!
          </h1>
        </div>

        {/* Progress */}
        <div className="border-b border-white/10">
          <LivingDexProgress />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon
                  className={`h-4.5 w-4.5 shrink-0 ${active ? "text-green-400" : ""}`}
                />
                {label}
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-green-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t border-white/10 px-4 py-4">
          <div className="mb-2">
            {editingName ? (
              <input
                ref={inputRef}
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={saveName}
                onKeyDown={handleNameKey}
                placeholder="Your name"
                className="w-full rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-green-400"
              />
            ) : (
              <button
                type="button"
                onClick={startEditName}
                title="Click to edit name"
                className="max-w-full truncate text-left text-xs text-slate-400 hover:text-white transition-colors"
              >
                {userLabel}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="w-full rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:border-white/20 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 flex bg-[#0b1120] border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map(({ href, shortLabel, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${
                active ? "text-green-400" : "text-slate-500"
              }`}
            >
              <Icon className="h-5 w-5" />
              {shortLabel}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
