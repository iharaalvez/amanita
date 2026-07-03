"use client";

import { MonitorPlay, MonitorStop, Loader2 } from "lucide-react";
import { useEncounterCounter } from "@/hooks/useEncounterCounter";

type Props = {
  gameId: string;
  onEncounter: () => void;
};

export function EncounterAutoCounter({ gameId, onEncounter }: Props) {
  const counter = useEncounterCounter({ gameId, onEncounter });

  const isReady = counter.status === "ready";
  const isBusy = counter.status === "requesting";

  return (
    <div className="mt-2 rounded border border-[#1a2136] bg-[#050814] p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[9px] font-black uppercase tracking-[0.16em] text-[#687696]">
            Auto Detect
          </p>
          <p className="mt-0.5 truncate font-mono text-[10px] text-[#53607c]">
            {isReady
              ? counter.lastDetected
                ? (counter.inBattle ? "⚔ " : "") + counter.lastDetected
                : "Scanning…"
              : isBusy
                ? "Connecting…"
                : "Not connected"}
          </p>
        </div>

        <button
          type="button"
          onClick={isReady ? counter.disconnect : counter.connect}
          disabled={isBusy}
          aria-label={isReady ? "Stop auto-detect" : "Start auto-detect"}
          title={isReady ? "Stop auto-detect" : "Start auto-detect"}
          className={`grid h-8 w-8 shrink-0 place-items-center rounded border transition disabled:opacity-40 ${
            isReady
              ? "border-[#67d9ff]/40 bg-[#061620] text-[#67d9ff] hover:border-[#ff8f8f] hover:text-[#ff8f8f]"
              : "border-[#27304c] bg-[#050814] text-[#8ca0c9] hover:border-[#67d9ff] hover:text-[#67d9ff]"
          }`}
        >
          {isBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isReady ? (
            <MonitorStop className="h-3.5 w-3.5" />
          ) : (
            <MonitorPlay className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
