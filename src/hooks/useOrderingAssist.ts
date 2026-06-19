"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AssistConfig } from "@/lib/assistDetection";
import {
  DEFAULT_ASSIST_CONFIG,
  cropToCanvas,
  detectGender,
  detectShiny,
  normalizeHomeName,
} from "@/lib/assistDetection";
import type { OrderingAssistDetection } from "@/lib/orderingAssist";

const CONFIG_KEY = "amanita-assist-v1";

function loadConfig(): AssistConfig {
  if (typeof window === "undefined") return DEFAULT_ASSIST_CONFIG;
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw)
      return {
        ...DEFAULT_ASSIST_CONFIG,
        ...(JSON.parse(raw) as Partial<AssistConfig>),
      };
  } catch {
    // ignore
  }
  return DEFAULT_ASSIST_CONFIG;
}

export type AssistStatus =
  | "idle"
  | "requesting"
  | "ready"
  | "detecting"
  | "initializing-ocr"
  | "error";

export type UseOrderingAssistReturn = {
  status: AssistStatus;
  message: string;
  config: AssistConfig;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  frameCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  setConfig: (config: AssistConfig) => void;
  startCapture: () => Promise<void>;
  stopCapture: () => void;
  captureFrame: () => boolean;
  detect: () => Promise<OrderingAssistDetection | null>;
};

export function useOrderingAssist(): UseOrderingAssistReturn {
  const [status, setStatus] = useState<AssistStatus>("idle");
  const [message, setMessage] = useState(
    "Click Start to select your capture window.",
  );
  // Lazy initializer: safe for SSR because typeof window guard returns default on server
  const [config, setConfigState] = useState<AssistConfig>(() => loadConfig());

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<import("tesseract.js").Worker | null>(null);
  const workerInitRef = useRef<Promise<void> | null>(null);
  const statusRef = useRef<AssistStatus>("idle");

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const setConfig = useCallback((next: AssistConfig) => {
    setConfigState(next);
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const ensureWorker = useCallback(async () => {
    if (workerRef.current) return;
    if (workerInitRef.current) {
      await workerInitRef.current;
      return;
    }

    workerInitRef.current = (async () => {
      setStatus("initializing-ocr");
      setMessage("Loading OCR engine — first use only, please wait…");
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, { logger: () => {} });
      await worker.setParameters({
        tessedit_char_whitelist:
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.'-: ",
        // PSM 7 = single text line
        tessedit_pageseg_mode: "7",
      } as Parameters<typeof worker.setParameters>[0]);
      workerRef.current = worker;
    })();

    await workerInitRef.current;
  }, []);

  const stopCapture = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
    setMessage("Click Start to select your capture window.");
  }, []);

  const startCapture = useCallback(async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setStatus("error");
      setMessage("Screen capture is not supported in this browser.");
      return;
    }
    stopCapture();
    setStatus("requesting");
    setMessage("Select your OBS projector window…");

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 } },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.muted = true;
        await video.play().catch(() => {
          // autoplay policy — play() may throw but stream still works
        });
      }

      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        streamRef.current = null;
        setStatus("idle");
        setMessage("Screen sharing ended. Click Start to reconnect.");
      });

      setStatus("ready");
      setMessage("Ready — press the hotkey to detect.");
    } catch (err: unknown) {
      const denied =
        err instanceof DOMException && err.name === "NotAllowedError";
      setStatus("error");
      setMessage(
        denied
          ? "Screen capture permission denied."
          : "Could not start screen capture.",
      );
    }
  }, [stopCapture]);

  const captureFrame = useCallback((): boolean => {
    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA)
      return false;
    // Create offscreen canvas lazily (client-only)
    if (!frameCanvasRef.current)
      frameCanvasRef.current = document.createElement("canvas");
    const canvas = frameCanvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    return true;
  }, []);

  const detect = useCallback(async (): Promise<OrderingAssistDetection | null> => {
    if (statusRef.current !== "ready") return null;
    if (!captureFrame()) {
      setMessage("No video frame available — is the window visible?");
      return null;
    }

    const canvas = frameCanvasRef.current!;
    setStatus("detecting");
    setMessage("Detecting…");

    try {
      await ensureWorker();

      // Crop name region then scale 3x with grayscale + contrast boost
      const crop = cropToCanvas(canvas, config.nameRegion);
      const scaled = document.createElement("canvas");
      scaled.width = crop.width * 3;
      scaled.height = crop.height * 3;
      const sCtx = scaled.getContext("2d")!;
      sCtx.filter = "grayscale(1) contrast(1.8)";
      sCtx.drawImage(crop, 0, 0, scaled.width, scaled.height);

      const { data } = await workerRef.current!.recognize(scaled);
      const name = normalizeHomeName(data.text);

      if (!name) {
        setStatus("ready");
        setMessage(
          "No name detected — try calibrating the Name region.",
        );
        return null;
      }

      const isShiny =
        config.shinyRegion !== null
          ? detectShiny(canvas, config.shinyRegion, config.shinyThreshold)
          : null;
      const gender =
        config.genderRegion !== null
          ? detectGender(canvas, config.genderRegion, config.genderThreshold)
          : null;

      setStatus("ready");
      setMessage(`Detected: ${name}`);

      return {
        name,
        confidence: data.confidence / 100,
        source: "ocr",
        rawText: data.text.trim() || null,
        isShiny,
        gender,
      };
    } catch {
      setStatus("ready");
      setMessage("Detection error — try again.");
      return null;
    }
  }, [config, captureFrame, ensureWorker]);

  // Pre-warm the Tesseract worker as soon as the stream is ready so the
  // first F8 press doesn't block on the ~4MB language-data download.
  useEffect(() => {
    if (status !== "ready") return;
    void ensureWorker().then(() => {
      if (statusRef.current === "ready")
        setMessage("Ready — press the hotkey to detect.");
    });
  }, [status, ensureWorker]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCapture();
      void workerRef.current?.terminate();
    };
  }, [stopCapture]);

  return {
    status,
    message,
    config,
    videoRef,
    frameCanvasRef,
    setConfig,
    startCapture,
    stopCapture,
    captureFrame,
    detect,
  };
}
