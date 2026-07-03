// Generic image processing utilities for screen-capture OCR features.
// No domain-specific logic here — callers normalise results for their context.

export type CaptureRegion = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/** Alias kept for backward-compat with AssistCalibration / useOrderingAssist */
export type AssistRegion = CaptureRegion;

export type AssistConfig = {
  nameRegion: CaptureRegion;
  shinyRegion: CaptureRegion | null;
  genderRegion: CaptureRegion | null;
  shinyThreshold: number;
  genderThreshold: number;
  detectKey: string;
  markKey: string;
  clearKey: string;
};

export const DEFAULT_ASSIST_CONFIG: AssistConfig = {
  nameRegion: { left: 0.033, top: 0.463, width: 0.064, height: 0.026 },
  shinyRegion: null,
  genderRegion: null,
  shinyThreshold: 0.15,
  genderThreshold: 0.03,
  detectKey: "F8",
  markKey: "F9",
  clearKey: "F10",
};

/** OpenCV-style HSV: H ∈ [0,180], S/V ∈ [0,255] */
function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const max = Math.max(rn, gn, bn),
    min = Math.min(rn, gn, bn),
    d = max - min;
  const v = max * 255;
  const s = max === 0 ? 0 : (d / max) * 255;
  let h = 0;
  if (d > 0) {
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
  }
  return [h * 180, s, v];
}

export function cropToCanvas(
  src: HTMLCanvasElement,
  region: CaptureRegion,
): HTMLCanvasElement {
  const x = Math.round(region.left * src.width);
  const y = Math.round(region.top * src.height);
  const w = Math.max(1, Math.round(region.width * src.width));
  const h = Math.max(1, Math.round(region.height * src.height));
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  out.getContext("2d")!.drawImage(src, x, y, w, h, 0, 0, w, h);
  return out;
}

/**
 * Scale a region 3× and apply grayscale + contrast boost — the standard
 * preprocessing step before passing a canvas to Tesseract.
 */
export function preprocessForOcr(
  src: HTMLCanvasElement,
  region: CaptureRegion,
  scale = 3,
  contrast = 1.8,
): HTMLCanvasElement {
  const crop = cropToCanvas(src, region);
  const out = document.createElement("canvas");
  out.width = crop.width * scale;
  out.height = crop.height * scale;
  const ctx = out.getContext("2d")!;
  ctx.filter = `grayscale(1) contrast(${contrast})`;
  ctx.drawImage(crop, 0, 0, out.width, out.height);
  return out;
}

/**
 * Returns true when the region contains enough gold/yellow pixels to indicate
 * a shiny sparkle (HOME box or in-game encounter sparkle particles).
 */
export function detectShinyPixels(
  src: HTMLCanvasElement,
  region: CaptureRegion,
  threshold: number,
): boolean {
  const crop = cropToCanvas(src, region);
  const { data, width, height } = crop
    .getContext("2d")!
    .getImageData(0, 0, crop.width, crop.height);
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    const [h, s, v] = rgbToHsv(data[i], data[i + 1], data[i + 2]);
    if ((h >= 18 && h <= 45 && s >= 70 && v >= 110) || (s <= 65 && v >= 190))
      count++;
  }
  return count / (width * height) >= threshold;
}

/**
 * Returns the dominant gender colour in the region, or null if ambiguous.
 * Red-dominant → female, blue-dominant → male (Pokémon HOME icon convention).
 */
export function detectGenderPixels(
  src: HTMLCanvasElement,
  region: CaptureRegion,
  threshold: number,
): "male" | "female" | null {
  const crop = cropToCanvas(src, region);
  const { data, width, height } = crop
    .getContext("2d")!
    .getImageData(0, 0, crop.width, crop.height);
  let red = 0,
    blue = 0;
  const total = width * height;
  for (let i = 0; i < data.length; i += 4) {
    const [h, s, v] = rgbToHsv(data[i], data[i + 1], data[i + 2]);
    if (s >= 45 && v >= 35) {
      if (h <= 12 || h >= 168) red++;
      else if (h >= 92 && h <= 128) blue++;
    }
  }
  const rr = red / total,
    br = blue / total;
  if (rr < threshold && br < threshold) return null;
  return rr >= br ? "female" : "male";
}

// ---------------------------------------------------------------------------
// Domain-specific text normalisers
// ---------------------------------------------------------------------------

/**
 * Strips level, parentheses, and noise from a Pokémon HOME box name OCR result.
 */
export function normalizeHomeName(raw: string): string | null {
  let t = raw.trim();
  if (!t) return null;
  const m = t.match(/^(.*?)(?:\bLv\.?\s*\d+|\()/);
  if (m) t = m[1];
  t = t
    .replace(/[^A-Za-z0-9 .:'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[-\s]+|[-\s]+$/g, "");
  return t.length < 2 ? null : t;
}

/**
 * Strips "A wild … appeared!" framing and normalises casing.
 * Handles both modern Title Case and old ALL-CAPS DS-era dialog.
 */
export function normalizeEncounterName(raw: string): string | null {
  let t = raw.trim();
  if (!t) return null;
  // Strip common dialog framing
  t = t
    .replace(/^a\s+wild\s+/i, "")
    .replace(/\s+appeared[.!]*$/i, "")
    .replace(/[^A-Za-z0-9 .':'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length < 2) return null;
  // Normalise ALL-CAPS to Title Case
  if (t === t.toUpperCase()) {
    t = t.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return t;
}
