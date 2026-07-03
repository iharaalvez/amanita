import type { CaptureRegion } from "@/lib/imageProcessing";

export type EncounterConfig = {
  encounterRegion: CaptureRegion;
};

// Normalized (0–1 fractions of source frame) coordinates of the encounter
// dialog text line. These are approximate starting points for each game —
// users should fine-tune via calibration if they don't match their setup.
const PRESETS: Partial<Record<string, EncounterConfig>> = {
  swsh: {
    encounterRegion: { left: 0.03, top: 0.76, width: 0.62, height: 0.10 },
  },
  "brilliant-diamond": {
    encounterRegion: { left: 0.03, top: 0.76, width: 0.62, height: 0.10 },
  },
  "shining-pearl": {
    encounterRegion: { left: 0.03, top: 0.76, width: 0.62, height: 0.10 },
  },
};

const FALLBACK: EncounterConfig = {
  encounterRegion: { left: 0.0, top: 0.70, width: 0.70, height: 0.15 },
};

export function getDefaultEncounterConfig(gameId: string): EncounterConfig {
  return PRESETS[gameId] ?? FALLBACK;
}

// Region meta shape compatible with AssistCalibration's regionMeta prop.
// Exported so a future calibration UI can pass it in without coupling
// encounter-regions.ts to the component layer.
export const ENCOUNTER_REGION_META = {
  encounterRegion: { label: "Dialog Text", color: "#67d9ff", optional: false },
} as const;
