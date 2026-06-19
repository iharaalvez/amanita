"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

  // Redraw the display canvas whenever snapshot / draft / drag / activeKey change
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

  // Update preview whenever draft / snapshot / activeKey change
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
    // Scale up 3× to match what Tesseract will receive
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
    setDraft((prev) => ({ ...prev, [key]: prev[key] ? null : { left: 0.3, top: 0.3, width: 0.1, height: 0.05 } }));
    setDirty(true);
  };

  const activeRegion = draft[activeKey];
  const sw = snapshot?.width ?? 0;
  const sh = snapshot?.height ?? 0;

  return (
    <div className="mt-2 space-y-2 rounded border border-[#2f2750] bg-[#060915] p-2">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#687696]">
          Calibration
        </p>
        <button
          type="button"
          onClick={takeSnapshot}
          className="rounded border border-[#27304c] bg-[#0d1120] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[#8ca0c9] transition hover:border-[#8fe388] hover:text-[#8fe388]"
        >
          {snapshot ? "Re-capture" : "Capture frame"}
        </button>
      </div>

      {/* Region selector tabs */}
      <div className="flex gap-1">
        {(Object.entries(REGION_META) as [RegionKey, (typeof REGION_META)[RegionKey]][]).map(
          ([key, meta]) => (
            <div key={key} className="flex items-center gap-0.5">
              {meta.optional && (
                <button
                  type="button"
                  onClick={() => toggleOptional(key as "shinyRegion" | "genderRegion")}
                  className="font-mono text-[9px] text-[#53607c] transition hover:text-[#f4f1ff]"
                  title={draft[key] ? "Disable this region" : "Enable this region"}
                >
                  {draft[key] ? "✕" : "+"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveKey(key)}
                disabled={meta.optional && !draft[key]}
                className="rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] transition disabled:opacity-30"
                style={{
                  color: meta.color,
                  background:
                    activeKey === key ? `${meta.color}22` : "transparent",
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

      {!snapshot && (
        <p className="py-4 text-center font-mono text-[9px] text-[#53607c]">
          Capture a frame first, then drag on the image to set each region.
        </p>
      )}

      {snapshot && (
        <>
          {/* Main canvas — drag to draw region */}
          <div
            className="overflow-hidden rounded border border-[#1d253c]"
            style={{
              aspectRatio: `${snapshot.width} / ${snapshot.height}`,
              position: "relative",
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

          {/* Active region info + preview */}
          {activeRegion && (
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
              <div>
                <p className="font-mono text-[8px] text-[#53607c]">
                  {regionLabel(activeRegion, sw, sh)}
                </p>
                <p className="mt-0.5 font-mono text-[8px] text-[#53607c]">
                  Drag on image to redefine
                </p>
              </div>
              <div className="shrink-0">
                <p className="mb-0.5 font-mono text-[8px] text-[#53607c]">OCR preview</p>
                <canvas
                  ref={previewRef}
                  style={{
                    maxWidth: 96,
                    maxHeight: 40,
                    imageRendering: "pixelated",
                    border: "1px solid #27304c",
                  }}
                />
              </div>
            </div>
          )}

          {!activeRegion && REGION_META[activeKey].optional && (
            <p className="font-mono text-[9px] text-[#53607c]">
              Click the + to enable this region, then drag to define it.
            </p>
          )}
        </>
      )}

      {/* Save row */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            setDraft(config);
            setDirty(false);
          }}
          disabled={!dirty}
          className="rounded border border-[#27304c] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[#687696] transition hover:border-[#f4f1ff] hover:text-[#f4f1ff] disabled:opacity-30"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => {
            onSave(draft);
            setDirty(false);
          }}
          disabled={!dirty}
          className="rounded border border-[#8fe388] bg-[#07140f] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[#8fe388] transition hover:bg-[#0e2519] disabled:opacity-30"
        >
          Save regions
        </button>
      </div>
    </div>
  );
}
