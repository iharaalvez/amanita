"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { AssistConfig, AssistRegion } from "@/lib/assistDetection";
import { cropToCanvas } from "@/lib/assistDetection";

type RegionKey = "nameRegion" | "shinyRegion" | "genderRegion";

const REGION_META: Record<
  RegionKey,
  { label: string; color: string; optional: boolean }
> = {
  nameRegion: { label: "Name", color: "#f7c948", optional: false },
  shinyRegion: { label: "Shiny", color: "#67d9ff", optional: true },
  genderRegion: { label: "Gender", color: "#ff9ee8", optional: true },
};

type Props = {
  getFrameCanvas: () => HTMLCanvasElement | null;
  captureFrame: () => boolean;
  config: AssistConfig;
  onSave: (config: AssistConfig) => void;
  onClose: () => void;
};

type DragState = { sx: number; sy: number; ex: number; ey: number };

function clamp(v: number, lo = 0, hi = 1) {
  return Math.max(lo, Math.min(hi, v));
}

function dragToRegion(drag: DragState): AssistRegion {
  const left = clamp(Math.min(drag.sx, drag.ex));
  const top = clamp(Math.min(drag.sy, drag.ey));
  const width = clamp(Math.abs(drag.ex - drag.sx), 0.001);
  const height = clamp(Math.abs(drag.ey - drag.sy), 0.001);
  return { left, top, width, height };
}

function regionLabel(r: AssistRegion, cw: number, ch: number): string {
  return `${Math.round(r.left * cw)}×${Math.round(r.top * ch)} / ${Math.round(r.width * cw)}×${Math.round(r.height * ch)}px`;
}

export function AssistCalibration({
  getFrameCanvas,
  captureFrame,
  config,
  onSave,
  onClose,
}: Props) {
  const displayRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const [snapshot, setSnapshot] = useState<HTMLCanvasElement | null>(null);
  const [draft, setDraft] = useState<AssistConfig>(() => config);
  const [activeKey, setActiveKey] = useState<RegionKey>("nameRegion");
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dirty, setDirty] = useState(false);

  const takeSnapshot = useCallback(() => {
    const ok = captureFrame();
    if (!ok) return;
    const src = getFrameCanvas();
    if (!src || src.width === 0) return;
    const out = document.createElement("canvas");
    out.width = src.width;
    out.height = src.height;
    out.getContext("2d")!.drawImage(src, 0, 0);
    setSnapshot(out);
  }, [captureFrame, getFrameCanvas]);

  // Auto-capture on open if a frame is already available
  useEffect(() => {
    takeSnapshot();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const canvas = displayRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !snapshot) return;

    canvas.width = snapshot.width;
    canvas.height = snapshot.height;
    ctx.drawImage(snapshot, 0, 0);

    const drawRegion = (
      region: AssistRegion,
      color: string,
      label: string,
      isActive: boolean,
    ) => {
      const x = region.left * canvas.width;
      const y = region.top * canvas.height;
      const w = region.width * canvas.width;
      const h = region.height * canvas.height;
      ctx.lineWidth = isActive ? 3 : 1.5;
      ctx.strokeStyle = color;
      ctx.fillStyle = `${color}33`;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = color;
      const fontSize = Math.max(12, canvas.height * 0.018);
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.fillText(label, x + 3, Math.max(y - 3, fontSize));
    };

    for (const [key, meta] of Object.entries(REGION_META) as [
      RegionKey,
      (typeof REGION_META)[RegionKey],
    ][]) {
      const region = draft[key];
      if (region) drawRegion(region, meta.color, meta.label, key === activeKey);
    }

    if (drag) {
      const r = dragToRegion(drag);
      const { color } = REGION_META[activeKey];
      const x = r.left * canvas.width;
      const y = r.top * canvas.height;
      const w = r.width * canvas.width;
      const h = r.height * canvas.height;
      ctx.setLineDash([6, 3]);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
      ctx.fillStyle = `${color}22`;
      ctx.fillRect(x, y, w, h);
    }
  }, [snapshot, draft, drag, activeKey]);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview || !snapshot) return;
    const region = draft[activeKey];
    if (!region) {
      preview.width = 1;
      preview.height = 1;
      return;
    }
    const crop = cropToCanvas(snapshot, region);
    preview.width = crop.width * 3;
    preview.height = crop.height * 3;
    const pCtx = preview.getContext("2d")!;
    pCtx.filter = "grayscale(1) contrast(1.8)";
    pCtx.drawImage(crop, 0, 0, preview.width, preview.height);
  }, [snapshot, draft, activeKey]);

  const getCoords = (e: React.MouseEvent<HTMLCanvasElement>): [number, number] => {
    const rect = e.currentTarget.getBoundingClientRect();
    return [
      (e.clientX - rect.left) / rect.width,
      (e.clientY - rect.top) / rect.height,
    ];
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const [x, y] = getCoords(e);
    setDrag({ sx: x, sy: y, ex: x, ey: y });
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drag) return;
    const [x, y] = getCoords(e);
    setDrag((d) => (d ? { ...d, ex: x, ey: y } : null));
  };

  const onMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drag) return;
    const [x, y] = getCoords(e);
    const region = dragToRegion({ ...drag, ex: x, ey: y });
    if (region.width > 0.005 && region.height > 0.005) {
      setDraft((prev) => ({ ...prev, [activeKey]: region }));
      setDirty(true);
    }
    setDrag(null);
  };

  const toggleOptional = (key: "shinyRegion" | "genderRegion") => {
    setDraft((prev) => ({
      ...prev,
      [key]: prev[key] ? null : { left: 0.3, top: 0.3, width: 0.1, height: 0.05 },
    }));
    setDirty(true);
  };

  const activeRegion = draft[activeKey];
  const sw = snapshot?.width ?? 0;
  const sh = snapshot?.height ?? 0;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex h-full max-h-[92vh] w-full max-w-[92vw] flex-col overflow-hidden rounded-xl border border-[#2f2750] bg-[#060915] shadow-[0_32px_80px_rgba(0,0,0,0.7)]">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[#1a2136] px-4 py-3">
          <div className="flex items-center gap-4">
            <p className="font-mono text-[11px] font-black uppercase tracking-[0.2em] text-[#8fe388]">
              Region Calibration
            </p>
            {/* Region tabs */}
            <div className="flex gap-1.5">
              {(Object.entries(REGION_META) as [RegionKey, (typeof REGION_META)[RegionKey]][]).map(
                ([key, meta]) => (
                  <div key={key} className="flex items-center gap-0.5">
                    {meta.optional && (
                      <button
                        type="button"
                        onClick={() => toggleOptional(key as "shinyRegion" | "genderRegion")}
                        className="font-mono text-[10px] text-[#53607c] transition hover:text-[#f4f1ff]"
                        title={draft[key] ? "Disable this region" : "Enable this region"}
                      >
                        {draft[key] ? "✕" : "+"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveKey(key)}
                      disabled={meta.optional && !draft[key]}
                      className="rounded px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition disabled:opacity-30"
                      style={{
                        color: meta.color,
                        background: activeKey === key ? `${meta.color}22` : "transparent",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: activeKey === key ? meta.color : "#27304c",
                      }}
                    >
                      {meta.label}
                    </button>
                  </div>
                ),
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={takeSnapshot}
              className="rounded border border-[#27304c] bg-[#0d1120] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#8ca0c9] transition hover:border-[#8fe388] hover:text-[#8fe388]"
            >
              {snapshot ? "Re-capture" : "Capture frame"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded border border-[#27304c] bg-[#0d1120] text-[#8ca0c9] transition hover:border-[#ff8f8f] hover:text-[#ff8f8f]"
              title="Close (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_220px]">
          {/* Canvas */}
          <div className="flex min-h-0 items-center justify-center overflow-hidden border-r border-[#1a2136] bg-[#03050d] p-3">
            {!snapshot ? (
              <p className="font-mono text-[11px] text-[#53607c]">
                Click &ldquo;Capture frame&rdquo; to grab a still from your stream, then drag to define each region.
              </p>
            ) : (
              <div
                className="overflow-hidden rounded border border-[#1d253c]"
                style={{
                  aspectRatio: `${snapshot.width} / ${snapshot.height}`,
                  maxWidth: "100%",
                  maxHeight: "100%",
                }}
              >
                <canvas
                  ref={displayRef}
                  style={{ width: "100%", height: "100%", cursor: "crosshair", display: "block" }}
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                  onMouseLeave={onMouseUp}
                />
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="flex flex-col gap-4 overflow-y-auto p-4">
            {/* Active region info */}
            <div>
              <p className="mb-1 font-mono text-[9px] font-black uppercase tracking-[0.16em] text-[#687696]">
                Active — {REGION_META[activeKey].label}
              </p>
              {activeRegion ? (
                <p className="font-mono text-[10px] text-[#8ca0c9]">
                  {regionLabel(activeRegion, sw, sh)}
                </p>
              ) : REGION_META[activeKey].optional ? (
                <p className="font-mono text-[10px] text-[#53607c]">
                  Click + to enable, then drag to draw.
                </p>
              ) : (
                <p className="font-mono text-[10px] text-[#53607c]">
                  Drag on the image to draw.
                </p>
              )}
            </div>

            {/* OCR preview */}
            {activeRegion && snapshot && (
              <div>
                <p className="mb-1.5 font-mono text-[9px] font-black uppercase tracking-[0.16em] text-[#687696]">
                  OCR Preview
                </p>
                <canvas
                  ref={previewRef}
                  style={{
                    maxWidth: "100%",
                    maxHeight: 64,
                    imageRendering: "pixelated",
                    border: "1px solid #27304c",
                    borderRadius: 4,
                    display: "block",
                  }}
                />
                <p className="mt-1 font-mono text-[8px] text-[#53607c]">
                  Greyscale + contrast 1.8× — what OCR sees
                </p>
              </div>
            )}

            {/* Instructions */}
            <div className="rounded border border-[#1a2136] bg-[#0a0d1a] p-3">
              <p className="font-mono text-[9px] font-black uppercase tracking-[0.14em] text-[#687696]">
                How to calibrate
              </p>
              <ul className="mt-2 space-y-1.5 font-mono text-[9px] text-[#53607c]">
                <li>1. Pause on a Pokémon in HOME</li>
                <li>2. Click Capture frame</li>
                <li>3. Select Name tab → drag over the name text</li>
                <li>4. Optionally enable + set Shiny / Gender regions</li>
                <li>5. Save regions</li>
              </ul>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Save row */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setDraft(config); setDirty(false); }}
                disabled={!dirty}
                className="flex-1 rounded border border-[#27304c] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#687696] transition hover:border-[#f4f1ff] hover:text-[#f4f1ff] disabled:opacity-30"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => { onSave(draft); setDirty(false); }}
                disabled={!dirty}
                className="flex-1 rounded border border-[#8fe388] bg-[#07140f] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#8fe388] transition hover:bg-[#0e2519] disabled:opacity-30"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
