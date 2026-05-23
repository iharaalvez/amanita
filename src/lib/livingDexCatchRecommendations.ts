import recommendationRows from "@/data/living-dex-catch-recommendations.json";
import { getCosmeticFormLabel, getFormLabel } from "@/lib/forms";
import type { LivingDexEntry } from "@/types/pokemon";

export type LivingDexCatchRecommendation = {
  speciesId: number;
  form: string;
  primaryGame: string;
  location: string;
  method: string;
  secondaryGame: string;
  notes: string;
};

const RECOMMENDATIONS = recommendationRows as LivingDexCatchRecommendation[];
const GENERIC_FORM_WORDS = new Set(["default", "form", "style"]);

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getMeaningfulTokens(value: string): string[] {
  return normalize(value)
    .split(" ")
    .filter((token) => token && !GENERIC_FORM_WORDS.has(token));
}

export function isDefaultRecommendationForm(form: string): boolean {
  return normalize(form).startsWith("default");
}

function recommendationScore(
  entry: LivingDexEntry,
  recommendation: LivingDexCatchRecommendation,
): number {
  const recommendationForm = normalize(recommendation.form);

  if (entry.formName === null) {
    if (recommendationForm === "default") return 400;
    if (recommendationForm === "default male") return 350;
    if (isDefaultRecommendationForm(recommendation.form)) return 300;
    return 0;
  }

  const formLabel =
    getCosmeticFormLabel(entry.formName) || getFormLabel(entry.formName);
  const selectedFormText = normalize(
    [entry.formName, entry.displayName, entry.regionLabel ?? "", formLabel]
      .filter(Boolean)
      .join(" "),
  );
  const formTokens = getMeaningfulTokens(recommendation.form);

  if (formTokens.length === 0) return 0;
  if (formTokens.every((token) => selectedFormText.includes(token))) {
    return 200 + formTokens.length;
  }

  return 0;
}

function dedupeRecommendations(
  recommendations: LivingDexCatchRecommendation[],
): LivingDexCatchRecommendation[] {
  const seen = new Set<string>();

  return recommendations.filter((recommendation) => {
    const key = [
      recommendation.primaryGame,
      recommendation.location,
      recommendation.method,
      recommendation.secondaryGame,
    ].join("|");

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getLivingDexCatchRecommendations(
  entry: LivingDexEntry,
  rows: readonly LivingDexCatchRecommendation[] = RECOMMENDATIONS,
): LivingDexCatchRecommendation[] {
  const speciesRows = rows.filter((row) => row.speciesId === entry.speciesId);
  const scoredRows = speciesRows
    .map((row) => ({ row, score: recommendationScore(entry, row) }))
    .filter(({ score }) => score > 0);
  const bestScore = Math.max(0, ...scoredRows.map(({ score }) => score));

  if (bestScore > 0) {
    return dedupeRecommendations(
      scoredRows
        .filter(({ score }) => score === bestScore)
        .map(({ row }) => row),
    );
  }

  if (entry.formName === null) {
    return speciesRows.slice(0, 1);
  }

  return [];
}
