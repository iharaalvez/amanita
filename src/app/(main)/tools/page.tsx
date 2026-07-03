import Image from "next/image";
import Link from "next/link";
import {
  Calculator,
  ChefHat,
  Donut,
  Gamepad2,
  Globe,
  Map,
  MonitorPlay,
  Printer,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Tool = {
  title: string;
  description: string;
  Icon: LucideIcon;
  href: string | null;
  available: boolean;
};

type GameSection = {
  game: string;
  gameId: string | null;
  tools: Tool[];
};

const GAME_SECTIONS: GameSection[] = [
  {
    game: "Sword / Shield",
    gameId: "swsh",
    tools: [
      {
        title: "Dynamax Adventures",
        description:
          "Find the best rental Pokémon types to counter each legendary in the Crown Tundra's Dynamax Adventures.",
        Icon: Map,
        href: "/tools/dynamax-adventures",
        available: true,
      },
    ],
  },
  {
    game: "Scarlet / Violet",
    gameId: "scarlet-violet",
    tools: [
      {
        title: "Sandwich Maker",
        description:
          "Find recipes and meals that grant Encounter, Title, and Sparkling powers.",
        Icon: ChefHat,
        href: "/tools/sandwich",
        available: true,
      },
      {
        title: "Item Printer Seeds",
        description:
          "Find RNG seeds for the SV Item Printer. Set your Switch clock to guarantee Ability Patches, Tera Shards, Rare Balls, and more.",
        Icon: Printer,
        href: "/tools/item-printer",
        available: true,
      },
    ],
  },
  {
    game: "Legends: Z-A",
    gameId: "legends-za",
    tools: [
      {
        title: "Ansha's Donuts",
        description:
          "Build Legends: Z-A donuts from berry flavors, calories, and level boosts.",
        Icon: Donut,
        href: "/tools/donuts",
        available: true,
      },
    ],
  },
  {
    game: "All Games",
    gameId: null,
    tools: [
      {
        title: "HOME Organizer Overlay",
        description:
          "Open Amanita's HOME organizer overlay for OBS and live sorting sessions.",
        Icon: MonitorPlay,
        href: "/stream",
        available: true,
      },
      {
        title: "Gameplay Overlay",
        description:
          "Show the current game, goal, shiny hunt, recent finds, and party on stream.",
        Icon: Gamepad2,
        href: "/stream/game",
        available: true,
      },
      {
        title: "Shiny Odds",
        description: "Compare charm, outbreak, Masuda, and method modifiers.",
        Icon: Sparkles,
        href: null,
        available: false,
      },
    ],
  },
];

export default function ToolsPage() {
  return (
    <div className="mx-auto max-w-7xl px-3 py-5 pb-10 sm:px-4">
      <header className="mb-5 overflow-hidden rounded-lg border border-[#302a43] bg-[#151421]">
        <div className="bg-[radial-gradient(circle_at_12%_0%,rgba(196,181,253,0.18),transparent_34%),linear-gradient(135deg,rgba(48,42,67,0.72),rgba(16,19,31,0.92))] p-4">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-[#8b5cf6]/15 text-[#c4b5fd] ring-1 ring-[#8b5cf6]/25">
            <Calculator className="h-6 w-6" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c4b5fd]">
            Utility Library
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#f8f0df] sm:text-3xl">
            Tools
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#aaa2ba]">
            Utilities for planning hunts, recipes, overlays, and next captures.
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-6">
        {GAME_SECTIONS.map(({ game, gameId, tools }) => (
          <section key={game}>
            <div className="mb-3 flex items-center gap-2.5">
              {gameId ? (
                <div className="grid h-8 w-10 shrink-0 place-items-center rounded border border-white/10 bg-[#151421] px-1.5">
                  <Image
                    src={`/icons/games/${gameId}.png`}
                    alt={game}
                    width={60}
                    height={28}
                    className="max-h-6 w-auto object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-8 w-10 shrink-0 items-center justify-center rounded border border-white/10 bg-[#151421]">
                  <Globe className="h-4 w-4 text-[#9189a4]" />
                </div>
              )}
              <h2 className="text-sm font-black uppercase tracking-[0.14em] text-[#9189a4]">
                {game}
              </h2>
              <div className="h-px flex-1 bg-[#302a43]" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {tools.map(({ title, description, Icon, href, available }) => {
                const card = (
                  <article
                    className={`relative flex min-h-[168px] flex-col rounded-lg border bg-[#151421] p-4 shadow-sm transition-all ${
                      available
                        ? "border-[#302a43] hover:-translate-y-0.5 hover:border-[#8b5cf6]/60 hover:shadow-lg hover:shadow-black/20"
                        : "border-[#302a43]/70 opacity-55"
                    }`}
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#8b5cf6]/15 text-[#c4b5fd] ring-1 ring-[#8b5cf6]/25">
                        <Icon className="h-5 w-5" />
                      </div>
                      {!available && (
                        <span className="rounded-full bg-[#2a1948] px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#c4b5fd] ring-1 ring-[#8b5cf6]/25">
                          Coming soon
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-black text-[#f8f0df]">
                      {title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#aaa2ba]">
                      {description}
                    </p>
                    {available && (
                      <span className="mt-auto pt-4 text-xs font-black text-[#c4b5fd]">
                        Open tool
                      </span>
                    )}
                  </article>
                );

                return href ? (
                  <Link key={title} href={href}>
                    {card}
                  </Link>
                ) : (
                  <div key={title}>{card}</div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
