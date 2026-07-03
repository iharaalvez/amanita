"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AssistConfig } from "@/lib/imageProcessing";
import { DEFAULT_ASSIST_CONFIG } from "@/lib/imageProcessing";
import { getOcrWorker, subscribeOcrStatus } from "@/lib/ocrEngine";
import {
  preprocessForOcr,
  detectShinyPixels,
  detectGenderPixels,
  normalizeHomeName,
} from "@/lib/imageProcessing";
import { useScreenCapture } from "@/hooks/useScreenCapture";
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
  setConfig: (config: AssistConfig) => void;
  startCapture: () => Promise<void>;
  stopCapture: () => void;
  captureFrame: () => boolean;
  detect: () => Promise<OrderingAssistDetection | null>;
  getFrameCanvas: () => HTMLCanvasElement | null;
};

export function useOrderingAssist(): UseOrderingAssistReturn {
  const capture = useScreenCapture();
  const {
    status: captureStatus,
    message: captureMessage,
    startCapture,
    stopCapture,
    captureFrame,
    getFrameCanvas,
  } = capture;

  const [config, setConfigState] = useState<AssistConfig>(() => loadConfig());

  // Transient overlay states layered on top of capture status
  const [transientStatus, setTransientStatus] = useState<
    "detecting" | "initializing-ocr" | null
  >(null);
  const [transientMessage, setTransientMessage] = useState<string | null>(null);

  // Ref so detect() can read current capture status without stale closure
  const captureStatusRef = useRef(captureStatus);
  const detectingRef = useRef(false);

  useEffect(() => {
    captureStatusRef.current = captureStatus;
  }, [captureStatus]);

  const setConfig = useCallback((next: AssistConfig) => {
    setConfigState(next);
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  // Pre-warm OCR as soon as stream is ready; reflect initializing state if it's the first load
  useEffect(() => {
    if (captureStatus !== "ready") return;
    void getOcrWorker();
    return subscribeOcrStatus((s) => {
      if (detectingRef.current) return;
      if (s === "initializing") {
        setTransientStatus("initializing-ocr");
        setTransientMessage(
          "Loading OCR engine — first use only, please wait…",
        );
      } else {
        setTransientStatus((prev) =>
          prev === "initializing-ocr" ? null : prev,
        );
        setTransientMessage((prev) =>
          prev === "Loading OCR engine — first use only, please wait…"
            ? null
            : prev,
        );
      }
    });
  }, [captureStatus]);

  // Clear transient overlay when capture stops or errors
  useEffect(() => {
    if (captureStatus === "idle" || captureStatus === "error") {
      setTransientStatus(null);
      setTransientMessage(null);
      detectingRef.current = false;
    }
  }, [captureStatus]);

  const detect = useCallback(async (): Promise<OrderingAssistDetection | null> => {
    if (captureStatusRef.current !== "ready") return null;
    if (!captureFrame()) {
      setTransientMessage("No video frame available — is the window visible?");
      return null;
    }

    const canvas = getFrameCanvas();
    if (!canvas) return null;

    detectingRef.current = true;
    setTransientStatus("detecting");
    setTransientMessage("Detecting…");

    try {
      const worker = await getOcrWorker();
      const preprocessed = preprocessForOcr(canvas, config.nameRegion);
      const { data } = await worker.recognize(preprocessed);
      const name = normalizeHomeName(data.text);

      if (!name) {
        detectingRef.current = false;
        setTransientStatus(null);
        setTransientMessage(
          "No name detected — try calibrating the Name region.",
        );
        return null;
      }

      const isShiny =
        config.shinyRegion !== null
          ? detectShinyPixels(canvas, config.shinyRegion, config.shinyThreshold)
          : null;
      const gender =
        config.genderRegion !== null
          ? detectGenderPixels(
              canvas,
              config.genderRegion,
              config.genderThreshold,
            )
          : null;

      detectingRef.current = false;
      setTransientStatus(null);
      setTransientMessage(`Detected: ${name}`);

      return {
        name,
        confidence: data.confidence / 100,
        source: "ocr",
        rawText: data.text.trim() || null,
        isShiny,
        gender,
      };
    } catch {
      detectingRef.current = false;
      setTransientStatus(null);
      setTransientMessage("Detection error — try again.");
      return null;
    }
  }, [config, captureFrame, getFrameCanvas]);

  const status: AssistStatus = transientStatus ?? (captureStatus as AssistStatus);
  const message = transientMessage ?? captureMessage;

  return {
    status,
    message,
    config,
    setConfig,
    startCapture,
    stopCapture,
    captureFrame,
    detect,
    getFrameCanvas,
  };
}
