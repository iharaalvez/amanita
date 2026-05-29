"use client";

import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Boxes,
  Gamepad2,
  Grid3X3,
  History,
  Sparkles,
} from "lucide-react";

type LandingPageProps = {
  onSignIn: () => void;
};

type Feature = {
  title: string;
  body: string;
  Icon: LucideIcon;
};

const features: Feature[] = [
  {
    title: "Living Dex",
    body: "Track personally caught or bred Pokemon across every species.",
    Icon: Grid3X3,
  },
  {
    title: "HOME Boxes",
    body: "Arrange collections around 30-slot HOME-style box logic.",
    Icon: Boxes,
  },
  {
    title: "Game Progress",
    body: "Follow per-game dex goals for Shiny Charm routes.",
    Icon: Gamepad2,
  },
  {
    title: "Trainer Log",
    body: "Keep shiny hunts and recent catches close at hand.",
    Icon: History,
  },
];

const gameLogos = ["x-y", "bdsp", "scarlet-violet", "legends-za"];

const heroPokemon = [
  {
    id: 711,
    name: "Gourgeist",
    sprite:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/711.png",
  },
  {
    id: 831,
    name: "Wooloo",
    sprite:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/831.png",
  },
  {
    id: 877,
    name: "Morpeko",
    sprite:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/877.png",
  },
];

export function LandingPage({ onSignIn }: LandingPageProps) {
  return (
    <main className="min-h-dvh overflow-y-auto bg-[#11111b] text-[#f8f0df]">
      <section className="mx-auto flex min-h-dvh w-full max-w-[1220px] flex-col px-4 py-4 sm:px-6 lg:px-7">
        <header className="flex items-center justify-between border-b border-[#2f2b40] pb-4">
          <AmanitaLockup />
          <button
            type="button"
            onClick={onSignIn}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-[#2f2b40] bg-[#151520] px-4 text-sm font-bold text-[#f8f0df] shadow-sm shadow-black/20 transition-colors hover:bg-[#211b32] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9ec86]"
          >
            Sign in
          </button>
        </header>

        <div className="grid flex-1 gap-10 py-10 lg:grid-cols-[0.95fr_0.85fr] lg:items-center lg:py-14">
          <div className="max-w-[620px]">
            <div className="inline-flex h-7 items-center rounded-full border border-[#2f2b40] bg-[#1a1a27] px-3 text-[10px] font-black uppercase tracking-widest text-[#b9ec86]">
              Living Dex tracker
            </div>

            <Image
              src="/brand/brand.svg"
              alt="Amanita"
              width={420}
              height={96}
              priority
              className="mt-5 h-auto w-full max-w-[360px]"
            />

            <h1 className="mt-6 max-w-[560px] text-3xl font-black leading-tight tracking-tight text-[#f8f0df] sm:text-5xl">
              Your collection, organized without the noise.
            </h1>
            <p className="mt-5 max-w-[540px] text-sm font-medium leading-6 text-[#b8afc4] sm:text-base">
              Amanita keeps the serious collector workflow calm: Living Dex
              progress, HOME box planning, per-game goals, shiny hunts, and
              recent catches in one private tracker.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onSignIn}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#b9ec86] px-5 text-sm font-black text-[#0b140d] transition-colors hover:bg-[#c9f49d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9ec86]"
              >
                Open Amanita
                <ArrowRight className="h-4 w-4" strokeWidth={2.6} />
              </button>
            </div>
          </div>

          <BrandTeaser />
        </div>

        <div className="grid gap-3 pb-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ title, body, Icon }) => (
            <div
              key={title}
              className="rounded-lg border border-[#2f2b40] bg-[#1a1a27]/80 p-4"
            >
              <Icon className="h-4 w-4 text-[#b9ec86]" strokeWidth={2.2} />
              <p className="mt-3 text-xs font-black text-[#f8f0df]">{title}</p>
              <p className="mt-1 text-[11px] font-medium leading-snug text-[#8f8799]">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function AmanitaLockup() {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#9b84c8]/45 bg-white/75 p-0.5 shadow-sm dark:bg-[#0d0f18]">
        <Image
          src="/brand/180x180.png"
          alt=""
          aria-hidden="true"
          width={40}
          height={40}
          priority
          className="h-full w-full object-contain"
        />
      </span>
      <Image
        src="/brand/brand.svg"
        alt="Amanita"
        width={180}
        height={41}
        priority
        className="h-8 w-auto max-w-[180px] object-contain"
      />
    </div>
  );
}

function BrandTeaser() {
  return (
    <div className="relative mx-auto w-full max-w-[420px] lg:mr-0">
      <div className="rounded-[1.75rem] border border-[#2f2b40] bg-[#151520] p-5 shadow-2xl shadow-black/30">
        <div className="grid aspect-square place-items-center rounded-[1.25rem] border border-[#2f2b40] bg-[#11111b] p-8">
          <Image
            src="/brand/base.png"
            alt=""
            aria-hidden="true"
            width={420}
            height={420}
            priority
            className="h-full w-full object-contain"
          />
        </div>

        <div className="mt-4 grid grid-cols-4 items-end gap-3">
          {gameLogos.map((id) => (
            <Image
              key={id}
              src={`/icons/games/${id}.png`}
              alt=""
              width={130}
              height={52}
              unoptimized
              className="h-9 w-full object-contain opacity-85"
            />
          ))}
        </div>
      </div>

      <div className="absolute -bottom-5 left-1/2 grid w-[86%] -translate-x-1/2 grid-cols-3 gap-2 rounded-2xl border border-[#2f2b40] bg-[#1a1a27] p-2 shadow-xl shadow-black/30">
        {heroPokemon.map((pokemon) => (
          <div
            key={pokemon.id}
            className="flex items-center gap-2 rounded-xl bg-[#11111b] px-2 py-2"
          >
            <Image
              src={pokemon.sprite}
              alt=""
              width={36}
              height={36}
              unoptimized
              className="h-9 w-9 shrink-0 object-contain [image-rendering:pixelated]"
            />
            <div className="min-w-0">
              <p className="truncate text-[10px] font-black">{pokemon.name}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[9px] font-bold text-[#f8d85a]">
                <Sparkles className="h-2.5 w-2.5" />
                tracked
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
