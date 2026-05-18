"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getGameById } from "@/config/games";
import { usePokedexStore } from "@/store/pokedexStore";
import {
  Boxes,
  Gamepad2,
  Grid3X3,
  LayoutDashboard,
  LogOut,
  Pin,
  Settings,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  Icon: LucideIcon;
  activePaths?: string[];
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    shortLabel: "Home",
    Icon: LayoutDashboard,
  },
  {
    href: "/pokedex",
    label: "Dex",
    shortLabel: "Dex",
    Icon: Grid3X3,
  },
  {
    href: "/home",
    label: "Boxes",
    shortLabel: "Boxes",
    Icon: Boxes,
  },
  {
    href: "/game",
    label: "Games",
    shortLabel: "Games",
    Icon: Gamepad2,
  },
  {
    href: "/tools",
    label: "Tools",
    shortLabel: "Tools",
    Icon: Wrench,
  },
];

type SidebarProps = {
  user: User;
};

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const pinnedGameId = usePokedexStore((s) => s.pinnedGameId);
  const pinnedGame = pinnedGameId ? getGameById(pinnedGameId) : undefined;
  const userLabel =
    (user.user_metadata?.display_name as string | undefined) ??
    user.email ??
    "Trainer";

  return (
    <>
      <aside className="hidden w-[224px] shrink-0 flex-col border-r border-[#2f2b40] bg-[#151520] text-[#f8f0df] sm:flex">
        <nav className="flex-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item);
            const Icon = item.Icon;

            return (
              <Link
                key={`${item.label}-${item.href}`}
                href={item.href}
                className={`mb-1 flex h-11 items-center gap-3 rounded-lg px-3.5 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-[#4e367f] text-[#f8f0df]"
                    : "text-[#c9c1d7] hover:bg-white/5 hover:text-[#f8f0df]"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={2.2} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {pinnedGame && (
            <div className="mt-5 border-t border-[#2f2b40] pt-4">
              <p className="mb-2 px-3.5 text-[10px] font-black uppercase tracking-widest text-[#8f8799]">
                Pinned
              </p>
              <Link
                href={`/game/${pinnedGame.id}`}
                className={`mb-1 flex min-h-11 items-center gap-3 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                  pathname === `/game/${pinnedGame.id}` ||
                  pathname.startsWith(`/game/${pinnedGame.id}/`)
                    ? "bg-[#4e367f] text-[#f8f0df]"
                    : "text-[#c9c1d7] hover:bg-white/5 hover:text-[#f8f0df]"
                }`}
              >
                <Pin className="h-4 w-4 shrink-0" strokeWidth={2.2} />
                <span className="min-w-0 truncate">{pinnedGame.name}</span>
              </Link>
            </div>
          )}
        </nav>

        <div className="border-t border-[#2f2b40] px-4 py-4">
          <div className="mb-2 flex items-center gap-2.5">
            <p className="min-w-0 flex-1 truncate text-xs font-semibold text-[#8f8799]">
              {userLabel}
            </p>
            <Link
              href="/settings"
              aria-label="Open settings"
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors ${
                pathname === "/settings"
                  ? "bg-[#4e367f] text-[#f8f0df]"
                  : "text-[#c9c1d7] hover:bg-white/5 hover:text-[#f8f0df]"
              }`}
            >
              <Settings className="h-4 w-4" strokeWidth={2.2} />
            </Link>
          </div>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="flex h-10 w-full items-center gap-3 rounded-lg px-3.5 text-left text-sm font-semibold text-[#c9c1d7] transition-colors hover:bg-white/5 hover:text-[#f8f0df]"
          >
            <LogOut className="h-4 w-4" strokeWidth={2.2} />
            Sign out
          </button>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[#2f2b40] bg-[#151520] pb-[env(safe-area-inset-bottom)] sm:hidden">
        {NAV_ITEMS.slice(0, 4).map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.Icon;

          return (
            <Link
              key={`${item.label}-mobile`}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${
                active ? "text-[#b9ec86]" : "text-[#8f8799]"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={2.2} />
              {item.shortLabel}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function isActive(pathname: string, item: NavItem): boolean {
  const paths = item.activePaths ?? [item.href];
  return paths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}
