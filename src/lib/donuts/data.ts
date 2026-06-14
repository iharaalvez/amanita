export type DonutFlavor = "sweet" | "spicy" | "sour" | "bitter" | "fresh";

export type DonutBerry = {
  id: string;
  name: string;
  sweet: number;
  spicy: number;
  sour: number;
  bitter: number;
  fresh: number;
  level: number;
  calories: number;
  /** Where to obtain this berry. Omitted for basic early-game forage berries. */
  location?: string;
};

export type DonutSelection = Record<string, number>;

export type RecommendedDonutRecipe = {
  id: string;
  title: string;
  category: "Shiny Hunting" | "Item Farming" | "Berry Farming" | "Story";
  description: string;
  ingredients: { berryId: string; count: number }[];
};

export type DonutTotals = Record<DonutFlavor, number> & {
  level: number;
  calories: number;
  berryCount: number;
};

export const DONUT_SOURCE_URL =
  "https://www.serebii.net/legendsz-a/anshasdonuts.shtml";
export const DONUT_RECIPE_SOURCE_URL =
  "https://game8.co/games/Pokemon-Legends-Z-A/archives/570965";

export const DONUT_FLAVORS: {
  id: DonutFlavor;
  label: string;
  /** Hex color for inline styles and charts. */
  color: string;
  /** Tailwind bg class for pill badges. */
  className: string;
  powers: string[];
}[] = [
  {
    id: "sweet",
    label: "Sweet",
    color: "#f472b6",
    className: "bg-pink-400",
    powers: ["Sparkling", "Alpha", "Humungo", "Teensy"],
  },
  {
    id: "spicy",
    label: "Spicy",
    color: "#f87171",
    className: "bg-red-400",
    powers: ["Move", "Attack", "Sp. Attack", "Speed"],
  },
  {
    id: "sour",
    label: "Sour",
    color: "#a3e635",
    className: "bg-lime-400",
    powers: ["Item", "Big Haul", "Mega Charging", "Mega Conservation"],
  },
  {
    id: "bitter",
    label: "Bitter",
    color: "#c084fc",
    className: "bg-violet-400",
    powers: ["Resistance", "Defense", "Sp. Defense"],
  },
  {
    id: "fresh",
    label: "Fresh",
    color: "#67e8f9",
    className: "bg-cyan-300",
    powers: ["Capture", "Encounter"],
  },
];

// Per-flavor budget levels, keyed by minimum point total.
export const FLAVOR_BUDGET_THRESHOLDS = [
  { points: 120, budget: 1 },
  { points: 160, budget: 2 },
  { points: 200, budget: 3 },
  { points: 300, budget: 4 },
  { points: 360, budget: 5 },
  { points: 420, budget: 6 },
  { points: 525, budget: 7 },
  { points: 700, budget: 8 },
  { points: 760, budget: 9 },
];

// Combined-total budget: used for the overall donut budget level.
export const TOTAL_FLAVOR_BUDGET_THRESHOLDS = [
  { points: 120, budget: 1 },
  { points: 240, budget: 2 },
  { points: 350, budget: 3 },
  { points: 420, budget: 4 },
  { points: 500, budget: 5 },
  { points: 600, budget: 6 },
  { points: 700, budget: 7 },
  { points: 800, budget: 8 },
  { points: 900, budget: 9 },
];

// Source: Serebii Ansha's Donuts, accessed 2026-05-18.
export const DONUT_BERRIES: DonutBerry[] = [
  // ── Basic berries (early-game forage) ──────────────────────────────────
  { id: "cheri-berry",   name: "Cheri Berry",   sweet: 0,  spicy: 10, sour: 0,  bitter: 0,  fresh: 0,  level: 1, calories: 60 },
  { id: "chesto-berry",  name: "Chesto Berry",  sweet: 0,  spicy: 0,  sour: 0,  bitter: 0,  fresh: 10, level: 1, calories: 60 },
  { id: "pecha-berry",   name: "Pecha Berry",   sweet: 10, spicy: 0,  sour: 0,  bitter: 0,  fresh: 0,  level: 1, calories: 60 },
  { id: "rawst-berry",   name: "Rawst Berry",   sweet: 0,  spicy: 0,  sour: 0,  bitter: 10, fresh: 0,  level: 1, calories: 60 },
  { id: "aspear-berry",  name: "Aspear Berry",  sweet: 0,  spicy: 0,  sour: 10, bitter: 0,  fresh: 0,  level: 1, calories: 60 },
  { id: "oran-berry",    name: "Oran Berry",    sweet: 0,  spicy: 5,  sour: 5,  bitter: 5,  fresh: 5,  level: 1, calories: 60 },
  { id: "persim-berry",  name: "Persim Berry",  sweet: 5,  spicy: 5,  sour: 5,  bitter: 0,  fresh: 5,  level: 1, calories: 60 },
  { id: "lum-berry",     name: "Lum Berry",     sweet: 5,  spicy: 5,  sour: 0,  bitter: 5,  fresh: 5,  level: 2, calories: 65 },
  { id: "sitrus-berry",  name: "Sitrus Berry",  sweet: 5,  spicy: 0,  sour: 5,  bitter: 5,  fresh: 5,  level: 2, calories: 65 },
  { id: "pomeg-berry",   name: "Pomeg Berry",   sweet: 10, spicy: 10, sour: 0,  bitter: 10, fresh: 0,  level: 2, calories: 65 },
  { id: "kelpsy-berry",  name: "Kelpsy Berry",  sweet: 0,  spicy: 0,  sour: 10, bitter: 10, fresh: 10, level: 2, calories: 65 },
  { id: "qualot-berry",  name: "Qualot Berry",  sweet: 10, spicy: 10, sour: 10, bitter: 0,  fresh: 0,  level: 2, calories: 65 },
  { id: "hondew-berry",  name: "Hondew Berry",  sweet: 0,  spicy: 10, sour: 0,  bitter: 10, fresh: 10, level: 2, calories: 65 },
  { id: "grepa-berry",   name: "Grepa Berry",   sweet: 10, spicy: 0,  sour: 10, bitter: 0,  fresh: 10, level: 2, calories: 65 },
  { id: "tamato-berry",  name: "Tamato Berry",  sweet: 0,  spicy: 15, sour: 0,  bitter: 0,  fresh: 10, level: 2, calories: 65 },
  { id: "occa-berry",    name: "Occa Berry",    sweet: 10, spicy: 15, sour: 0,  bitter: 0,  fresh: 0,  level: 3, calories: 70 },
  { id: "passho-berry",  name: "Passho Berry",  sweet: 0,  spicy: 0,  sour: 0,  bitter: 10, fresh: 15, level: 3, calories: 70 },
  { id: "wacan-berry",   name: "Wacan Berry",   sweet: 15, spicy: 0,  sour: 10, bitter: 0,  fresh: 0,  level: 3, calories: 70 },
  { id: "rindo-berry",   name: "Rindo Berry",   sweet: 0,  spicy: 10, sour: 0,  bitter: 15, fresh: 0,  level: 3, calories: 70 },
  { id: "yache-berry",   name: "Yache Berry",   sweet: 0,  spicy: 0,  sour: 15, bitter: 0,  fresh: 10, level: 3, calories: 70 },
  { id: "chople-berry",  name: "Chople Berry",  sweet: 0,  spicy: 15, sour: 0,  bitter: 10, fresh: 0,  level: 3, calories: 70 },
  { id: "kebia-berry",   name: "Kebia Berry",   sweet: 0,  spicy: 0,  sour: 10, bitter: 0,  fresh: 15, level: 3, calories: 70 },
  { id: "shuca-berry",   name: "Shuca Berry",   sweet: 15, spicy: 10, sour: 0,  bitter: 0,  fresh: 0,  level: 3, calories: 70 },
  { id: "coba-berry",    name: "Coba Berry",    sweet: 0,  spicy: 0,  sour: 0,  bitter: 15, fresh: 10, level: 3, calories: 70 },
  { id: "payapa-berry",  name: "Payapa Berry",  sweet: 10, spicy: 0,  sour: 15, bitter: 0,  fresh: 0,  level: 3, calories: 70 },
  // ── Vendor berries (purchased from Ansha's shop) ───────────────────────
  { id: "tanga-berry",   name: "Tanga Berry",   sweet: 0,  spicy: 20, sour: 10, bitter: 0,  fresh: 0,  level: 3, calories: 70,  location: "Vendor" },
  { id: "charti-berry",  name: "Charti Berry",  sweet: 0,  spicy: 10, sour: 0,  bitter: 0,  fresh: 20, level: 3, calories: 70,  location: "Vendor" },
  { id: "kasib-berry",   name: "Kasib Berry",   sweet: 20, spicy: 0,  sour: 0,  bitter: 0,  fresh: 10, level: 3, calories: 70,  location: "Vendor" },
  { id: "haban-berry",   name: "Haban Berry",   sweet: 10, spicy: 0,  sour: 0,  bitter: 20, fresh: 0,  level: 3, calories: 70,  location: "Vendor" },
  { id: "colbur-berry",  name: "Colbur Berry",  sweet: 0,  spicy: 0,  sour: 20, bitter: 10, fresh: 0,  level: 3, calories: 70,  location: "Vendor" },
  { id: "babiri-berry",  name: "Babiri Berry",  sweet: 0,  spicy: 25, sour: 0,  bitter: 0,  fresh: 10, level: 3, calories: 70,  location: "Vendor" },
  { id: "chilan-berry",  name: "Chilan Berry",  sweet: 10, spicy: 0,  sour: 0,  bitter: 0,  fresh: 25, level: 3, calories: 70,  location: "Vendor" },
  { id: "roseli-berry",  name: "Roseli Berry",  sweet: 25, spicy: 0,  sour: 0,  bitter: 10, fresh: 0,  level: 3, calories: 70,  location: "Vendor" },
  // ── Hyper berries – Rank ★1 ────────────────────────────────────────────
  { id: "hyper-cheri-berry",  name: "Hyper Cheri Berry",  sweet: 0,  spicy: 40, sour: 0,  bitter: 0,  fresh: 0,  level: 5, calories: 80,  location: "★1" },
  { id: "hyper-chesto-berry", name: "Hyper Chesto Berry", sweet: 0,  spicy: 0,  sour: 0,  bitter: 0,  fresh: 40, level: 3, calories: 100, location: "★1" },
  { id: "hyper-pecha-berry",  name: "Hyper Pecha Berry",  sweet: 40, spicy: 0,  sour: 0,  bitter: 0,  fresh: 0,  level: 2, calories: 100, location: "★1" },
  { id: "hyper-rawst-berry",  name: "Hyper Rawst Berry",  sweet: 0,  spicy: 0,  sour: 0,  bitter: 40, fresh: 0,  level: 3, calories: 110, location: "★1" },
  { id: "hyper-aspear-berry", name: "Hyper Aspear Berry", sweet: 0,  spicy: 0,  sour: 40, bitter: 0,  fresh: 0,  level: 4, calories: 90,  location: "★1" },
  // ── Hyper berries – Rank ★1–2 ──────────────────────────────────────────
  { id: "hyper-oran-berry",    name: "Hyper Oran Berry",    sweet: 10, spicy: 20, sour: 15, bitter: 15, fresh: 0,  level: 6, calories: 90,  location: "★1-2" },
  { id: "hyper-persim-berry",  name: "Hyper Persim Berry",  sweet: 0,  spicy: 15, sour: 15, bitter: 10, fresh: 20, level: 4, calories: 110, location: "★1-2" },
  { id: "hyper-lum-berry",     name: "Hyper Lum Berry",     sweet: 20, spicy: 15, sour: 10, bitter: 0,  fresh: 15, level: 3, calories: 110, location: "★1-2" },
  { id: "hyper-sitrus-berry",  name: "Hyper Sitrus Berry",  sweet: 15, spicy: 10, sour: 0,  bitter: 20, fresh: 15, level: 4, calories: 120, location: "★1-2" },
  // ── Hyper berries – Rank ★2 ────────────────────────────────────────────
  { id: "hyper-pomeg-berry",   name: "Hyper Pomeg Berry",   sweet: 30, spicy: 35, sour: 0,  bitter: 0,  fresh: 5,  level: 7, calories: 140, location: "★2" },
  { id: "hyper-kelpsy-berry",  name: "Hyper Kelpsy Berry",  sweet: 5,  spicy: 0,  sour: 0,  bitter: 30, fresh: 35, level: 5, calories: 160, location: "★2" },
  { id: "hyper-qualot-berry",  name: "Hyper Qualot Berry",  sweet: 35, spicy: 0,  sour: 30, bitter: 5,  fresh: 0,  level: 4, calories: 160, location: "★2" },
  { id: "hyper-hondew-berry",  name: "Hyper Hondew Berry",  sweet: 0,  spicy: 5,  sour: 35, bitter: 0,  fresh: 30, level: 6, calories: 150, location: "★2" },
  // ── Hyper berries – Rank ★3 ────────────────────────────────────────────
  { id: "hyper-grepa-berry",   name: "Hyper Grepa Berry",   sweet: 0,  spicy: 60, sour: 25, bitter: 0,  fresh: 5,  level: 8, calories: 140, location: "★3" },
  { id: "hyper-tamato-berry",  name: "Hyper Tamato Berry",  sweet: 5,  spicy: 25, sour: 0,  bitter: 0,  fresh: 60, level: 6, calories: 180, location: "★3" },
  { id: "hyper-occa-berry",    name: "Hyper Occa Berry",    sweet: 60, spicy: 0,  sour: 0,  bitter: 5,  fresh: 25, level: 5, calories: 180, location: "★3" },
  { id: "hyper-passho-berry",  name: "Hyper Passho Berry",  sweet: 25, spicy: 0,  sour: 5,  bitter: 60, fresh: 0,  level: 6, calories: 200, location: "★3" },
  { id: "hyper-wacan-berry",   name: "Hyper Wacan Berry",   sweet: 0,  spicy: 5,  sour: 60, bitter: 25, fresh: 0,  level: 7, calories: 160, location: "★3" },
  { id: "hyper-rindo-berry",   name: "Hyper Rindo Berry",   sweet: 15, spicy: 55, sour: 0,  bitter: 5,  fresh: 25, level: 9, calories: 210, location: "★3" },
  { id: "hyper-yache-berry",   name: "Hyper Yache Berry",   sweet: 25, spicy: 0,  sour: 5,  bitter: 15, fresh: 55, level: 7, calories: 250, location: "★3" },
  { id: "hyper-chople-berry",  name: "Hyper Chople Berry",  sweet: 55, spicy: 5,  sour: 15, bitter: 25, fresh: 0,  level: 6, calories: 250, location: "★3" },
  { id: "hyper-kebia-berry",   name: "Hyper Kebia Berry",   sweet: 0,  spicy: 15, sour: 25, bitter: 55, fresh: 5,  level: 7, calories: 270, location: "★3" },
  { id: "hyper-shuca-berry",   name: "Hyper Shuca Berry",   sweet: 5,  spicy: 25, sour: 55, bitter: 0,  fresh: 15, level: 8, calories: 230, location: "★3" },
  // ── Hyper berries – Rank ★4 ────────────────────────────────────────────
  { id: "hyper-coba-berry",    name: "Hyper Coba Berry",    sweet: 10, spicy: 95, sour: 0,  bitter: 10, fresh: 5,  level: 10, calories: 240, location: "★4" },
  { id: "hyper-payapa-berry",  name: "Hyper Payapa Berry",  sweet: 5,  spicy: 0,  sour: 10, bitter: 10, fresh: 95, level: 8,  calories: 300, location: "★4" },
  { id: "hyper-tanga-berry",   name: "Hyper Tanga Berry",   sweet: 95, spicy: 10, sour: 10, bitter: 5,  fresh: 0,  level: 7,  calories: 300, location: "★4" },
  { id: "hyper-charti-berry",  name: "Hyper Charti Berry",  sweet: 0,  spicy: 10, sour: 5,  bitter: 95, fresh: 10, level: 8,  calories: 330, location: "★4" },
  { id: "hyper-kasib-berry",   name: "Hyper Kasib Berry",   sweet: 10, spicy: 5,  sour: 95, bitter: 0,  fresh: 10, level: 9,  calories: 270, location: "★4" },
  { id: "hyper-haban-berry",   name: "Hyper Haban Berry",   sweet: 85, spicy: 0,  sour: 0,  bitter: 0,  fresh: 65, level: 8,  calories: 370, location: "★4" },
  { id: "hyper-colbur-berry",  name: "Hyper Colbur Berry",  sweet: 0,  spicy: 0,  sour: 65, bitter: 0,  fresh: 85, level: 9,  calories: 370, location: "★4" },
  { id: "hyper-babiri-berry",  name: "Hyper Babiri Berry",  sweet: 0,  spicy: 0,  sour: 65, bitter: 85, fresh: 0,  level: 9,  calories: 400, location: "★4" },
  { id: "hyper-chilan-berry",  name: "Hyper Chilan Berry",  sweet: 0,  spicy: 85, sour: 0,  bitter: 65, fresh: 0,  level: 9,  calories: 370, location: "★4" },
  { id: "hyper-roseli-berry",  name: "Hyper Roseli Berry",  sweet: 0,  spicy: 65, sour: 85, bitter: 0,  fresh: 0,  level: 10, calories: 340, location: "★4" },
];

// Source: Game8 Best Donut Recipes, accessed 2026-05-18.
export const RECOMMENDED_DONUT_RECIPES: RecommendedDonutRecipe[] = [
  // ── Shiny Hunting ───────────────────────────────────────────────────────
  {
    id: "shiny-haban-8",
    title: "Max Sweet (Shiny Focus)",
    category: "Shiny Hunting",
    description:
      "8× Hyper Haban pushes Sweet to 680 and Fresh to 520 — the highest combined Sparkling + Alpha budget you can build.",
    ingredients: [{ berryId: "hyper-haban-berry", count: 8 }],
  },
  {
    id: "shiny-haban-tanga",
    title: "Max Sweet (Balanced)",
    category: "Shiny Hunting",
    description:
      "Hyper Tanga raises Sweet even higher than Haban alone; pairing 4+4 lands at Sweet 720 with good Fresh coverage.",
    ingredients: [
      { berryId: "hyper-tanga-berry", count: 4 },
      { berryId: "hyper-haban-berry", count: 4 },
    ],
  },
  {
    id: "shiny-balanced-sweet",
    title: "Sweet Hunt + Fresh Bonus",
    category: "Shiny Hunting",
    description:
      "Haban + Occa + Tanga blend keeps Sweet dominant while mixing in Capture and Encounter chances.",
    ingredients: [
      { berryId: "hyper-haban-berry", count: 3 },
      { berryId: "hyper-occa-berry",  count: 3 },
      { berryId: "hyper-tanga-berry", count: 2 },
    ],
  },
  // ── Item Farming ────────────────────────────────────────────────────────
  {
    id: "item-kasib-8",
    title: "Max Sour (Item Haul)",
    category: "Item Farming",
    description:
      "8× Hyper Kasib hits Sour 760 — the highest single-flavor budget cap, guaranteeing Lv. 9 Big Haul / Item rolls.",
    ingredients: [{ berryId: "hyper-kasib-berry", count: 8 }],
  },
  {
    id: "item-kasib-roseli",
    title: "Sour + Spicy Farm",
    category: "Item Farming",
    description:
      "Kasib + Roseli splits Sour and Spicy across two strong flavors; still hits Lv. 7+ Sour with Spicy coverage.",
    ingredients: [
      { berryId: "hyper-kasib-berry",  count: 4 },
      { berryId: "hyper-roseli-berry", count: 4 },
    ],
  },
  {
    id: "item-kasib-colbur-babiri",
    title: "Sour Blend Farm",
    category: "Item Farming",
    description:
      "Wider Sour base using three berries. Lower budget than pure Kasib but uses fewer rare ★4 berries.",
    ingredients: [
      { berryId: "hyper-kasib-berry",  count: 4 },
      { berryId: "hyper-colbur-berry", count: 2 },
      { berryId: "hyper-babiri-berry", count: 2 },
    ],
  },
  // ── Berry Farming ───────────────────────────────────────────────────────
  {
    id: "berry-efficient-six",
    title: "Hyper Berry Sampler",
    category: "Berry Farming",
    description:
      "One of each Hyper Sour berry — cost-efficient Sour build that farms back the berries you spend. Add a 7th and 8th freely.",
    ingredients: [
      { berryId: "hyper-payapa-berry", count: 1 },
      { berryId: "hyper-tanga-berry",  count: 1 },
      { berryId: "hyper-kasib-berry",  count: 1 },
      { berryId: "hyper-colbur-berry", count: 1 },
      { berryId: "hyper-babiri-berry", count: 1 },
      { berryId: "hyper-roseli-berry", count: 1 },
    ],
  },
  // ── Story ───────────────────────────────────────────────────────────────
  {
    id: "story-early-pecha",
    title: "Early Sweet Donut",
    category: "Story",
    description: "Simple 3-berry Sweet donut from the first berries you find.",
    ingredients: [{ berryId: "pecha-berry", count: 3 }],
  },
  {
    id: "story-early-mixed",
    title: "Early Mixed Flavors",
    category: "Story",
    description:
      "Variety pack with Sweet, Sour, and Fresh — useful for sampling what each flavor unlocks.",
    ingredients: [
      { berryId: "occa-berry",  count: 1 },
      { berryId: "wacan-berry", count: 1 },
      { berryId: "yache-berry", count: 1 },
    ],
  },
  {
    id: "story-late-coba-charti",
    title: "Spicy + Bitter Late Push",
    category: "Story",
    description:
      "High-level recipe with Hyper Coba (Spicy 95) and Hyper Charti (Bitter 95) for strong combat boosts.",
    ingredients: [
      { berryId: "hyper-coba-berry",   count: 4 },
      { berryId: "hyper-charti-berry", count: 4 },
    ],
  },
];

export function calculateDonutTotals(selection: DonutSelection): DonutTotals {
  const totals: DonutTotals = {
    sweet: 0, spicy: 0, sour: 0, bitter: 0, fresh: 0,
    level: 0, calories: 0, berryCount: 0,
  };

  for (const berry of DONUT_BERRIES) {
    const count = selection[berry.id] ?? 0;
    if (count <= 0) continue;
    totals.berryCount += count;
    totals.level    += berry.level    * count;
    totals.calories += berry.calories * count;
    for (const flavor of DONUT_FLAVORS) {
      totals[flavor.id] += berry[flavor.id] * count;
    }
  }

  return totals;
}

export function getBudgetForPoints(
  points: number,
  thresholds: { points: number; budget: number }[],
): number {
  let budget = 0;
  for (const t of thresholds) {
    if (points >= t.points) budget = t.budget;
  }
  return budget;
}

export function getDominantFlavors(totals: DonutTotals): DonutFlavor[] {
  const max = Math.max(...DONUT_FLAVORS.map((f) => totals[f.id]));
  if (max <= 0) return [];
  return DONUT_FLAVORS.filter((f) => totals[f.id] === max).map((f) => f.id);
}
