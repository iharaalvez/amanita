import Link from "next/link";
import { Calculator, ChefHat, Donut, Sparkles } from "lucide-react";

const tools = [
  {
    title: "Sandwich Maker",
    description:
      "Find recipes and meals that grant Encounter, Title, and Sparkling powers.",
    Icon: ChefHat,
    href: "/tools/sandwich",
    available: true,
  },
  {
    title: "Ansha's Donuts",
    description:
      "Build Legends: Z-A donuts from berry flavors, calories, and level boosts.",
    Icon: Donut,
    href: "/tools/donuts",
    available: true,
  },
  {
    title: "Shiny Odds",
    description: "Compare charm, outbreak, Masuda, and method modifiers.",
    Icon: Sparkles,
    href: null,
    available: false,
  },
  {
    title: "Catch Planner",
    description: "Prioritize targets by game, location, and ownership gaps.",
    Icon: Calculator,
    href: null,
    available: false,
  },
];

export default function ToolsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-5 pb-10">
      <div className="mb-5">
        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-violet-50 text-violet-500 dark:bg-violet-950/40 dark:text-violet-300">
          <Calculator className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-gray-950 dark:text-white">
          Tools
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
          Utilities for planning hunts, recipes, and next captures.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tools.map(({ title, description, Icon, href, available }) => {
          const card = (
            <article
              className={`relative rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 ${
                available
                  ? "transition-shadow hover:shadow-md hover:border-violet-300 dark:hover:border-violet-700"
                  : "opacity-70"
              }`}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-500 dark:bg-violet-950/40 dark:text-violet-300">
                  <Icon className="h-5 w-5" />
                </div>
                {!available && (
                  <span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-violet-600 dark:bg-violet-950/40 dark:text-violet-300">
                    Coming soon
                  </span>
                )}
              </div>
              <h2 className="text-base font-black text-gray-950 dark:text-white">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                {description}
              </p>
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
    </div>
  );
}
