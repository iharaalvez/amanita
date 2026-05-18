"use client";

import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Box,
  Boxes,
  Gamepad2,
  Grid3X3,
  LayoutDashboard,
  LogOut,
  Medal,
  Search,
  Settings,
  Sparkles,
  Wrench,
} from "lucide-react";

type LandingPageProps = {
  onSignIn: () => void;
};

type Feature = {
  title: string;
  body: string;
  Icon: LucideIcon;
};

const previewPokemon = [
  {
    id: 906,
    name: "Sprigatito",
    level: 12,
    status: "Today",
    owned: true,
    sprite:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/906.png",
  },
  {
    id: 661,
    name: "Fletchling",
    level: 5,
    status: "Today",
    owned: true,
    sprite:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/661.png",
  },
  {
    id: 747,
    name: "Mareanie",
    level: 17,
    status: "Yesterday",
    owned: true,
    sprite:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/747.png",
  },
  {
    id: 633,
    name: "Deino",
    level: 30,
    status: "Yesterday",
    owned: true,
    sprite:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/633.png",
  },
];

const features: Feature[] = [
  { title: "Living Dex", body: "Track every Pokemon", Icon: Box },
  { title: "Box Management", body: "Organize with ease", Icon: Boxes },
  { title: "Completion Tools", body: "See what's missing", Icon: Medal },
  {
    title: "Game Sync",
    body: "Keep everything in sync and backed up",
    Icon: Sparkles,
  },
];

const livingDexTotal = 1025;
const ownedTotal = 674;
const missingTotal = livingDexTotal - ownedTotal;
const ownedProgress = Math.round((ownedTotal / livingDexTotal) * 100);

const stats = [
  {
    label: "Living Dex",
    value: String(ownedTotal),
    total: String(livingDexTotal),
    progress: ownedProgress,
  },
  { label: "Shiny Owned", value: "128", total: "1025", progress: 12 },
];

const nextTargets = [
  { dexNumber: "0152", name: "Chikorita", detail: "Johto starter" },
  { dexNumber: "0350", name: "Milotic", detail: "Trade evolution" },
  { dexNumber: "0442", name: "Spiritomb", detail: "Rare encounter" },
  { dexNumber: "1006", name: "Iron Valiant", detail: "Version target" },
];

const navItems = [
  { label: "Dashboard", Icon: LayoutDashboard },
  { label: "Dex", Icon: Grid3X3 },
  { label: "Boxes", Icon: Boxes },
  { label: "Games", Icon: Gamepad2 },
  { label: "Tools", Icon: Wrench },
];

export function LandingPage({ onSignIn }: LandingPageProps) {
  return (
    <main className="h-dvh w-full overflow-y-auto bg-[#e9e3d8] text-[#f8f0df]">
      <section className="relative flex min-h-full w-full flex-col overflow-hidden bg-[#0d1019]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,rgba(13,16,25,0.98)_0%,rgba(18,20,31,0.98)_48%,rgba(25,22,39,0.98)_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-52 bg-[radial-gradient(ellipse_at_30%_100%,rgba(178,234,132,0.34),transparent_44%)]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-44 w-[440px] opacity-35 [background-image:radial-gradient(circle,#7b63ae_1px,transparent_1.2px)] [background-size:16px_16px]" />

        <div className="relative z-10 mx-auto flex w-full max-w-[1840px] items-center justify-between px-5 py-4 sm:px-8">
          <AmanitaLockup />
          <button
            type="button"
            onClick={onSignIn}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-[#312b46] bg-[#151622]/80 px-4 text-sm font-bold text-[#f8f0df] shadow-sm shadow-black/20 transition-colors hover:bg-[#202033] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9ec86]"
          >
            Sign in
          </button>
        </div>

        <div className="relative z-10 mx-auto grid w-full max-w-[1840px] flex-1 gap-10 px-5 pb-14 pt-8 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-14 lg:pb-16 lg:pt-7">
          <div className="max-w-xl">
            <div className="inline-flex h-7 items-center rounded-full border border-[#b9ec86]/35 bg-[#172318]/75 px-4 text-[10px] font-black uppercase tracking-[0.18em] text-[#b9ec86]">
              Built for trainers.
            </div>

            <Image
              src="/logo.svg"
              alt="Amanita"
              width={355}
              height={86}
              priority
              className="mt-5 h-auto w-full max-w-[355px]"
            />

            <p className="mt-4 max-w-[460px] text-xl leading-snug text-[#ebe2d6] sm:text-2xl">
              The all-in-one companion for your Pokemon journey.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              {features.map(({ title, body, Icon }) => (
                <div key={title}>
                  <Icon className="h-7 w-7 text-[#bba4ef]" strokeWidth={1.8} />
                  <p className="mt-3 text-xs font-black text-[#f8f0df]">
                    {title}
                  </p>
                  <p className="mt-1 text-[10px] font-medium leading-snug text-[#c6bcd2]">
                    {body}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onSignIn}
                className="inline-flex h-11 items-center justify-center gap-3 rounded-lg bg-[#b9ec86] px-5 text-sm font-black text-[#0b140d] transition-colors hover:bg-[#c9f49d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9ec86]"
              >
                Get Started
                <ArrowRight className="h-4 w-4" strokeWidth={2.6} />
              </button>
            </div>
          </div>

          <DashboardPreview />
        </div>
      </section>
    </main>
  );
}

function AmanitaLockup() {
  return (
    <div className="flex items-center gap-2 text-[#f8f0df]">
      <span className="grid h-8 w-8 place-items-center rounded-full border border-[#6f5a9f]/70 bg-[#151622]">
        <Image src="/icon.svg" alt="" width={18} height={18} />
      </span>
      <span className="text-base font-black">Amanita</span>
    </div>
  );
}

function DashboardPreview() {
  const livingDexProgress = stats[0];

  return (
    <div className="overflow-hidden rounded-lg border border-[#4c426a]/80 bg-[#14141f]/88 shadow-2xl shadow-black/35 backdrop-blur">
      <div className="grid min-h-[404px] md:grid-cols-[152px_1fr]">
        <aside className="hidden flex-col border-r border-[#312b46]/85 p-4 md:flex">
          <AmanitaLockup />
          <nav className="mt-5 flex-1 space-y-1">
            {navItems.map(({ label, Icon }, index) => (
              <div
                key={label}
                className={`flex h-8 items-center gap-2 rounded-md px-2.5 text-[10px] font-semibold ${
                  index === 0 ? "bg-[#4b377a] text-[#f8f0df]" : "text-[#d2c8dc]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                {label}
              </div>
            ))}
          </nav>

          <div className="border-t border-[#312b46]/85 pt-3">
            <div className="mb-1.5 flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-[10px] font-semibold text-[#8f8799]">
                Trainer
              </p>
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[#c9c1d7]">
                <Settings className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
            </div>
            <div className="flex h-8 items-center gap-2 rounded-md px-2.5 text-[10px] font-semibold text-[#c9c1d7]">
              <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
              Sign out
            </div>
          </div>
        </aside>

        <div className="p-4 sm:p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-black sm:text-lg">Dashboard</h2>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-52 items-center gap-2 rounded-md border border-[#312b46]/90 bg-[#10111b]/70 px-2.5 text-[9px] text-[#91899d]">
                <Search className="h-3 w-3" />
                Search Pokemon...
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-[#312b46]/90 bg-[#1a1a28]/88 p-3.5"
              >
                <p className="text-[9px] font-semibold text-[#aaa0b8]">
                  {stat.label}
                </p>
                <p className="mt-1 text-xl font-black">
                  {stat.value}{" "}
                  <span className="text-[10px] font-medium text-[#aaa0b8]">
                    / {stat.total}
                  </span>
                </p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#383646]">
                  <span
                    className="block h-full rounded-full bg-[#b9ec86]"
                    style={{ width: `${stat.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_1fr_0.86fr]">
            <section className="rounded-lg border border-[#312b46]/90 bg-[#1a1a28]/82 p-3.5">
              <h3 className="mb-3 text-[11px] font-black">Recent Catches</h3>
              {previewPokemon.map((pokemon) => (
                <div
                  key={pokemon.id}
                  className="grid min-h-11 grid-cols-[34px_1fr_auto] items-center gap-2 border-t border-[#312b46]/60 py-1.5 first:border-t-0"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[#242536]">
                    <Image
                      src={pokemon.sprite}
                      alt=""
                      width={36}
                      height={36}
                      className={
                        pokemon.owned
                          ? "h-9 w-9 object-contain"
                          : "h-9 w-9 object-contain grayscale opacity-35"
                      }
                    />
                  </span>
                  <div>
                    <p className="text-[10px] font-bold">{pokemon.name}</p>
                    <p className="text-[9px] text-[#aaa0b8]">
                      Lv. {pokemon.level}
                    </p>
                  </div>
                  <p className="text-[9px] font-semibold text-[#ddd7e2]">
                    {pokemon.status}
                  </p>
                </div>
              ))}
            </section>

            <section className="rounded-lg border border-[#312b46]/90 bg-[#1a1a28]/82 p-3.5 text-center">
              <h3 className="mb-4 text-left text-[11px] font-black">
                Living Dex Progress
              </h3>
              <div
                className="mx-auto grid h-28 w-28 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(#b9ec86 ${livingDexProgress.progress * 3.6}deg, #383646 0deg)`,
                }}
                aria-label={`${livingDexProgress.progress}% Living Dex progress`}
              >
                <div className="grid h-[88px] w-[88px] place-items-center rounded-full bg-[#1a1a28]">
                  <div>
                    <p className="text-2xl font-black">
                      {livingDexProgress.progress}%
                    </p>
                    <p className="text-[11px] text-[#cfc8d8]">
                      {livingDexProgress.value} / {livingDexProgress.total}
                    </p>
                  </div>
                </div>
              </div>
              <p className="mt-6 text-[10px] font-semibold text-[#d4cedb]">
                More than halfway done!
              </p>
            </section>

            <section className="rounded-lg border border-[#312b46]/90 bg-[#1a1a28]/82 p-3.5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[11px] font-black">Next Targets</h3>
                <span className="rounded-full bg-[#b9ec86]/12 px-2 py-0.5 text-[9px] font-black text-[#b9ec86]">
                  {missingTotal} left
                </span>
              </div>
              {nextTargets.map((pokemon) => (
                <div
                  key={pokemon.dexNumber}
                  className="grid min-h-11 grid-cols-[34px_1fr] items-center gap-2 border-t border-[#312b46]/60 py-1.5 first:border-t-0"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full border border-[#554a70] bg-[#242536] text-[8px] font-black text-[#bcaee0]">
                    #{pokemon.dexNumber}
                  </span>
                  <div className="min-w-0 text-left">
                    <p className="truncate text-[10px] font-bold">
                      {pokemon.name}
                    </p>
                    <p className="truncate text-[9px] text-[#aaa0b8]">
                      {pokemon.detail}
                    </p>
                  </div>
                </div>
              ))}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
