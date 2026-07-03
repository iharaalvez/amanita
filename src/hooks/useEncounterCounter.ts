"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EncounterConfig } from "@/config/encounter-regions";
import { getDefaultEncounterConfig } from "@/config/encounter-regions";
import { getOcrWorker } from "@/lib/ocrEngine";
import { preprocessForOcr, normalizeEncounterName } from "@/lib/imageProcessing";
import { useScreenCapture } from "@/hooks/useScreenCapture";
import type { CaptureStatus } from "@/hooks/useScreenCapture";

// Number of consecutive blank OCR frames required before resetting from
// "in-battle" back to "idle". At 300ms intervals this is ~0.9 s — long
// enough for the dialog to disappear between encounters without false resets.
const BLANK_GATE = 3;
const POLL_MS = 300;

const CONFIG_KEY = "amanita-encounter-v1";

function loadConfig(gameId: string): EncounterConfig {
  if (typeof window === "undefined") return getDefaultEncounterConfig(gameId);
  try {
    const raw = localStorage.getItem(`${CONFIG_KEY}-${gameId}`);
    if (raw) return JSON.parse(raw) as EncounterConfig;
  } catch { /* ignore */ }
  return getDefaultEncounterConfig(gameId);
}

function saveConfig(gameId: string, config: EncounterConfig) {
  try {
    localStorage.setItem(`${CONFIG_KEY}-${gameId}`, JSON.stringify(config));
  } catch { /* ignore */ }
}

type Phase =
  | { tag: "idle" }
  | { tag: "counted"; lastName: string; blankFrames: number };

export type EncounterCounterStatus = CaptureStatus;

export type UseEncounterCounterReturn = {
  status: EncounterCounterStatus;
  message: string;
  lastDetected: string | null;
  inBattle: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  captureFrame: () => boolean;
  getFrameCanvas: () => HTMLCanvasElement | null;
  config: EncounterConfig;
  setConfig: (config: EncounterConfig) => void;
};

export function useEncounterCounter({
  gameId,
  onEncounter,
}: {
  gameId: string;
  onEncounter?: (name: string) => void;
}): UseEncounterCounterReturn {
  const capture = useScreenCapture();
  const {
    status: captureStatus,
    message: captureMessage,
    startCapture,
    stopCapture,
    captureFrame,
    getFrameCanvas,
  } = capture;

  const [config, setConfigState] = useState<EncounterConfig>(() =>
    loadConfig(gameId),
  );
  const [lastDetected, setLastDetected] = useState<string | null>(null);
  const [inBattle, setInBattle] = useState(false);

  const configRef = useRef(config);
  const onEncounterRef = useRef(onEncounter);
  const phaseRef = useRef<Phase>({ tag: "idle" });
  const ocrLockRef = useRef(false);

  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { onEncounterRef.current = onEncounter; }, [onEncounter]);

  // Reset state machine and load new config when game changes
  useEffect(() => {
    phaseRef.current = { tag: "idle" };
    setLastDetected(null);
    setInBattle(false);
    setConfigState(loadConfig(gameId));
  }, [gameId]);

  const setConfig = useCallback(
    (next: EncounterConfig) => {
      setConfigState(next);
      saveConfig(gameId, next);
    },
    [gameId],
  );

  const runTick = useCallback(async () => {
    if (ocrLockRef.current) return;
    if (!captureFrame()) return;
    const canvas = getFrameCanvas();
    if (!canvas) return;

    ocrLockRef.current = true;
    try {
      const worker = await getOcrWorker();
      const preprocessed = preprocessForOcr(
        canvas,
        configRef.current.encounterRegion,
      );
      const { data } = await worker.recognize(preprocessed);
      const name = normalizeEncounterName(data.text);

      const phase = phaseRef.current;

      if (!name) {
        // Blank frame — increment blank counter; reset to idle after gate
        if (phase.tag === "counted") {
          const blanks = phase.blankFrames + 1;
          if (blanks >= BLANK_GATE) {
            phaseRef.current = { tag: "idle" };
            setInBattle(false);
          } else {
            phaseRef.current = { ...phase, blankFrames: blanks };
          }
        }
      } else if (phase.tag === "idle" || name !== phase.lastName) {
        // New encounter (either from idle, or a different Pokémon)
        phaseRef.current = { tag: "counted", lastName: name, blankFrames: 0 };
        setLastDetected(name);
        setInBattle(true);
        onEncounterRef.current?.(name);
      } else {
        // Same encounter still active — stay counted, reset blank counter
        phaseRef.current = { ...phase, blankFrames: 0 };
      }
    } finally {
      ocrLockRef.current = false;
    }
  }, [captureFrame, getFrameCanvas]);

  // Start polling when capture is ready; stop otherwise
  useEffect(() => {
    if (captureStatus !== "ready") return;
    void getOcrWorker(); // pre-warm
    const id = setInterval(() => { void runTick(); }, POLL_MS);
    return () => clearInterval(id);
  }, [captureStatus, runTick]);

  return {
    status: captureStatus,
    message: captureMessage,
    lastDetected,
    inBattle,
    connect: startCapture,
    disconnect: stopCapture,
    captureFrame,
    getFrameCanvas,
    config,
    setConfig,
  };
}
