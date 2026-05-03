'use client';

import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  BookmarkIcon,
  CheckIcon,
  HomeIcon,
  SparkleIcon,
} from '@/components/ui';

type LandingPageProps = {
  onSignIn: () => void;
};

const previewPokemon = [
  {
    id: 1,
    name: 'Bulbasaur',
    color: 'border-blue-400 bg-blue-950/60 text-blue-200',
    owned: true,
    inHome: false,
    planned: false,
    shiny: true,
  },
  {
    id: 2,
    name: 'Ivysaur',
    color: 'border-green-400 bg-green-950/60 text-green-200',
    owned: true,
    inHome: true,
    planned: false,
    shiny: false,
  },
  {
    id: 3,
    name: 'Venusaur',
    color: 'border-violet-400 bg-violet-950/60 text-violet-200',
    owned: false,
    inHome: false,
    planned: true,
    shiny: false,
  },
  {
    id: 4,
    name: 'Charmander',
    color: 'border-blue-400 bg-blue-950/60 text-blue-200',
    owned: true,
    inHome: false,
    planned: false,
    shiny: true,
  },
  {
    id: 5,
    name: 'Charmeleon',
    color: 'border-green-400 bg-green-950/60 text-green-200',
    owned: true,
    inHome: true,
    planned: false,
    shiny: false,
  },
  {
    id: 6,
    name: 'Charizard',
    color: 'border-slate-600 bg-slate-900/80 text-slate-400',
    owned: false,
    inHome: false,
    planned: false,
    shiny: false,
  },
];

const features = [
  {
    title: 'Living Dex tracking',
    body: 'Mark what you personally caught or bred, including forms, planned hunts, and shiny progress.',
    icon: CheckIcon,
    color: 'bg-emerald-100 text-emerald-700',
  },
  {
    title: 'HOME-style boxes',
    body: 'Organize progress in familiar 30-slot boxes that are easy to check while playing.',
    icon: HomeIcon,
    color: 'bg-sky-100 text-sky-700',
  },
  {
    title: 'Game Dex goals',
    body: 'Follow per-game National Dex completion so the Shiny Charm target stays visible.',
    icon: SparkleIcon,
    color: 'bg-amber-100 text-amber-700',
  },
];

export function LandingPage({ onSignIn }: LandingPageProps) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#08111f] text-white">
      <section className="border-b border-white/10 bg-[#0d1828]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <div>
            <p className="text-lg font-bold tracking-tight">Gotta Catch `Em All!</p>
          </div>
          <button
            type="button"
            onClick={onSignIn}
            className="rounded-lg bg-sky-400 px-4 py-2 text-sm font-bold text-slate-950 transition-colors hover:bg-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
          >
            Sign in
          </button>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-16">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">
            <SparkleIcon className="h-3.5 w-3.5" />
            Built for Living Dex and Shiny Charm progress
          </div>
          <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
            Know exactly what is missing from your Pokedex.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Track your Pokemon, organize them like Pokemon HOME, and keep your game-specific dex goals in one calm, readable place.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 transition-colors hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
            >
              Start tracking
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-[#111d2e] p-4 shadow-2xl shadow-black/30">
          <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <p className="text-sm font-black">HOME Box 1</p>
              <p className="text-xs text-slate-400">4 owned / 2 pending transfer</p>
            </div>
            <div className="rounded-md bg-emerald-400 px-2 py-1 text-xs font-black text-slate-950">0.4%</div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {previewPokemon.map((pokemon) => (
              <div
                key={pokemon.name}
                className={`aspect-square rounded-lg border p-2 ${pokemon.color}`}
              >
                <div className="flex h-full flex-col items-center justify-between">
                  <div className="flex w-full justify-between">
                    <span className="text-[10px] font-bold tabular-nums">#{String(pokemon.id).padStart(4, '0')}</span>
                    <span className="flex items-center gap-1">
                      {pokemon.shiny && <SparkleIcon className="h-3.5 w-3.5 text-yellow-400" />}
                      {pokemon.inHome && <HomeIcon className="h-3.5 w-3.5 text-green-400" />}
                      {pokemon.owned && !pokemon.inHome && <ArrowUpRightIcon className="h-3.5 w-3.5 text-blue-400" />}
                      {!pokemon.owned && pokemon.planned && <BookmarkIcon className="h-3.5 w-3.5 text-violet-400" />}
                    </span>
                  </div>
                  <img
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`}
                    alt={pokemon.name}
                    className={`h-14 w-14 object-contain [image-rendering:pixelated] ${
                      pokemon.owned || pokemon.inHome || pokemon.shiny ? '' : 'grayscale opacity-50'
                    }`}
                  />
                  <span className="max-w-full truncate text-center text-[10px] font-bold">{pokemon.name}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-[#17263a] p-3">
              <p className="text-lg font-black text-emerald-300">4</p>
              <p className="text-[10px] font-bold text-slate-400">owned</p>
            </div>
            <div className="rounded-lg bg-[#17263a] p-3">
              <p className="text-lg font-black text-sky-300">2</p>
              <p className="text-[10px] font-bold text-slate-400">in HOME</p>
            </div>
            <div className="rounded-lg bg-[#17263a] p-3">
              <p className="text-lg font-black text-amber-300">1</p>
              <p className="text-[10px] font-bold text-slate-400">planned</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#eef6ff] text-slate-950">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-10 sm:px-6 lg:grid-cols-3">
          {features.map((feature) => {
            const FeatureIcon = feature.icon;
            return (
            <article key={feature.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${feature.color}`}>
                <FeatureIcon className="h-5 w-5" />
              </div>
              <h2 className="text-base font-black">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{feature.body}</p>
            </article>
          );
          })}
        </div>
      </section>
    </main>
  );
}
