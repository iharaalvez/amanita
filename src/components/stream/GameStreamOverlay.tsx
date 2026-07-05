"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Gamepad2,
  Info,
  Minus,
  MonitorPlay,
  Plus,
  Settings2,
  Sparkles,
  Swords,
  X,
} from "lucide-react";
import { useLivingDexEntries } from "@/hooks/usePokemon";
import { useEncounters } from "@/hooks/useEncounters";
import { GAME_LIST, getGameById } from "@/config/games";
import { EncounterAutoCounter } from "@/components/stream/EncounterAutoCounter";
import { usePokedexStore, ownedKey } from "@/store/pokedexStore";
import type {
  CatchEvent,
  HuntCounterMode,
  LivingDexEntry,
  ShinyHunt,
  ShinyHuntMethod,
} from "@/types/pokemon";

const SETTINGS_KEY = "amanita-game-stream-overlay-v1";
const PARTY_SIZE = 6;

type OverlayMode = "story" | "shiny-hunt" | "dex-cleanup" | "items" | "custom";

type GameOverlaySettings = {
  gameId: string;
  mode: OverlayMode;
  goal: string;
  note: string;
  huntId: string;
  showHuntPanel: boolean;
  showHuntCount: boolean;
  showAutoCount: boolean;
  showRecentFinds: boolean;
  showSessionNotes: boolean;
  showParty: boolean;
  partyText: string;
};

const DEFAULT_SETTINGS: GameOverlaySettings = {
  gameId: "legends-za",
  mode: "shiny-hunt",
  goal: "Lumiose fieldwork",
  note: "Building the dex one good decision at a time.",
  huntId: "",
  showHuntPanel: true,
  showHuntCount: true,
  showAutoCount: false,
  showRecentFinds: true,
  showSessionNotes: true,
  showParty: false,
  partyText: "",
};

const MODE_LABELS: Record<OverlayMode, string> = {
  story: "Story",
  "shiny-hunt": "Shiny Hunt",
  "dex-cleanup": "Dex Cleanup",
  items: "Item Farming",
  custom: "Custom Goal",
};

const METHOD_LABELS: Record<ShinyHuntMethod, string> = {
  random: "Random",
  overworld: "Overworld",
  masuda: "Masuda",
  breeding: "Breeding",
  "soft-reset": "Soft Reset",
  "poke-radar": "Poke Radar",
  "chain-fishing": "Chain Fishing",
  "friend-safari": "Friend Safari",
  horde: "Horde",
  "dex-nav": "DexNav",
  "sos-chain": "SOS Chain",
  "ultra-wormhole": "Ultra Wormhole",
  "lets-go-catch-combo": "Catch Combo",
  outbreak: "Outbreak",
  "massive-mass-outbreak": "Massive Mass Outbreak",
  sandwich: "Sandwich",
  "isolated-encounter": "Isolated Encounter",
  "dynamax-adventures": "Dynamax Adventures",
  "max-raid": "Max Raid",
  "tera-raid": "Tera Raid",
  "alpha-reset": "Alpha Reset",
  "wild-zone-reset": "Wild Zone Reset",
  "charm-boosted": "Charm Boosted",
};

const COUNTER_LABELS: Record<HuntCounterMode, string> = {
  encounters: "Encounters",
  "soft-resets": "Soft Resets",
  eggs: "Eggs",
  raids: "Raids",
  outbreaks: "Outbreaks",
  sandwiches: "Sandwiches",
  checks: "Checks",
};

const HUNT_METHOD_OPTIONS: ShinyHuntMethod[] = [
  "overworld",
  "outbreak",
  "sandwich",
  "isolated-encounter",
  "soft-reset",
  "masuda",
  "random",
  "alpha-reset",
  "charm-boosted",
];

const COUNTER_MODE_OPTIONS: HuntCounterMode[] = [
  "encounters",
  "checks",
  "soft-resets",
  "eggs",
  "raids",
  "outbreaks",
  "sandwiches",
];

function readSettings(): GameOverlaySettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  const raw = window.localStorage.getItem(SETTINGS_KEY);
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(raw) as Partial<GameOverlaySettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      mode:
        parsed.mode && parsed.mode in MODE_LABELS
          ? parsed.mode
          : DEFAULT_SETTINGS.mode,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function readStartsClean(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("clean") === "1";
}

function entryKey(speciesId: number, formName: string | null): string {
  return ownedKey(speciesId, formName);
}

function dexNumber(speciesId: number): string {
  return `#${String(speciesId).padStart(4, "0")}`;
}

function findEntryForEvent(
  entriesByKey: Map<string, LivingDexEntry>,
  event: CatchEvent,
): LivingDexEntry | undefined {
  return entriesByKey.get(entryKey(event.speciesId, event.formName));
}

function findPartyEntries(
  entries: LivingDexEntry[],
  partyText: string,
): Array<LivingDexEntry | null> {
  const tokens = partyText
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, PARTY_SIZE);

  const slots = tokens.map((token) => {
    const numeric = token.replace(/^#0*/, "");
    return (
      entries.find(
        (entry) =>
          entry.displayName.toLowerCase() === token ||
          entry.name.toLowerCase() === token ||
          String(entry.speciesId) === numeric,
      ) ??
      entries.find(
        (entry) =>
          entry.displayName.toLowerCase().includes(token) ||
          entry.name.toLowerCase().includes(token),
      ) ??
      null
    );
  });

  while (slots.length < PARTY_SIZE) slots.push(null);
  return slots;
}

function findEntryByQuery(
  entries: LivingDexEntry[],
  query: string,
): LivingDexEntry | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;
  const numeric = normalized.replace(/^#0*/, "");
  return (
    entries.find(
      (entry) =>
        entry.displayName.toLowerCase() === normalized ||
        entry.name.toLowerCase() === normalized ||
        String(entry.speciesId) === numeric,
    ) ??
    entries.find(
      (entry) =>
        entry.displayName.toLowerCase().includes(normalized) ||
        entry.name.toLowerCase().includes(normalized),
    ) ??
    null
  );
}

function formatElapsed(startedAt: string): string {
  const started = new Date(startedAt).getTime();
  if (!Number.isFinite(started)) return "00:00";
  const totalMinutes = Math.max(0, Math.floor((Date.now() - started) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function Panel({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-lg border border-[#293152] bg-[#080b17]/94 shadow-[0_18px_45px_rgba(0,0,0,0.35)] ${className}`}
    >
      <div className="flex h-9 items-center gap-2 border-b border-[#1a2136] px-3">
        {icon}
        <h2 className="font-mono text-[11px] font-black uppercase tracking-[0.18em] text-[#8fe388]">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function PokemonSprite({
  entry,
  shiny = false,
  className = "h-14 w-14",
}: {
  entry: LivingDexEntry;
  shiny?: boolean;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={shiny ? (entry.shinySpriteUrl ?? entry.spriteUrl) : entry.spriteUrl}
      alt={entry.displayName}
      className={`${className} object-contain [image-rendering:pixelated] drop-shadow-[0_12px_18px_rgba(0,0,0,0.45)]`}
      loading="lazy"
    />
  );
}

function PokemonInfoButton({
  entry,
  gameName,
  panelPosition = "top",
}: {
  entry: LivingDexEntry;
  gameName: string;
  panelPosition?: "top" | "bottom";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { data: encounters, isLoading } = useEncounters(
    open ? entry.speciesId : null,
  );
  const locations = (encounters ?? []).filter((loc) =>
    loc.games.includes(gameName),
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label={`Where to find ${entry.displayName}`}
        title={`Where to find ${entry.displayName}`}
        className="grid h-4 w-4 place-items-center rounded-full border border-[#27304c] bg-[#050814]/95 text-[#67d9ff] shadow transition hover:border-[#67d9ff]"
      >
        <Info className="h-2.5 w-2.5" />
      </button>
      {open && (
        <div
          className={`absolute left-0 z-40 w-52 rounded-lg border border-[#27304c] bg-[#070914]/97 p-2.5 shadow-[0_18px_45px_rgba(0,0,0,0.5)] backdrop-blur ${
            panelPosition === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
        >
          <p className="mb-1.5 truncate font-mono text-[9px] font-black uppercase tracking-[0.14em] text-[#67d9ff]">
            {entry.displayName} · {gameName}
          </p>
          {isLoading ? (
            <p className="font-mono text-[10px] text-[#53607c]">Loading…</p>
          ) : locations.length > 0 ? (
            <ul className="grid gap-1">
              {locations.map((loc) => (
                <li
                  key={loc.location}
                  className="font-mono text-[10px] leading-4 text-[#d7c8ff]"
                >
                  {loc.location}
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-mono text-[10px] text-[#53607c]">
              No location data for this game.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function RecentFind({
  event,
  entry,
  gameName,
}: {
  event: CatchEvent;
  entry?: LivingDexEntry;
  gameName: string;
}) {
  const game = getGameById(event.gameId);
  return (
    <div className="grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-2 rounded border border-[#27304c] bg-[#050814]/80 px-2 py-1.5">
      <div className="relative grid h-10 w-10 place-items-center rounded bg-[#0d1324]">
        {entry ? (
          <PokemonSprite
            entry={entry}
            shiny={event.isShiny}
            className="h-9 w-9"
          />
        ) : (
          <span className="font-mono text-[10px] text-[#687696]">
            {event.speciesId}
          </span>
        )}
        {entry && (
          <div className="absolute -bottom-1 -right-1">
            <PokemonInfoButton entry={entry} gameName={gameName} />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-black text-[#f4f1ff]">
          {entry?.displayName ?? dexNumber(event.speciesId)}
        </p>
        <p className="truncate font-mono text-[9px] uppercase tracking-[0.12em] text-[#687696]">
          {game?.name ?? event.gameId}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {event.isShiny && <Sparkles className="h-3.5 w-3.5 text-[#f7c948]" />}
        {event.isAlpha && (
          <span className="font-mono text-[10px] font-black text-[#ff8f8f]">
            AL
          </span>
        )}
      </div>
    </div>
  );
}

function SetupDock({
  settings,
  hunts,
  entries,
  onSettingsChange,
  onCreateHunt,
  onClose,
}: {
  settings: GameOverlaySettings;
  hunts: ShinyHunt[];
  entries: LivingDexEntry[];
  onSettingsChange: (patch: Partial<GameOverlaySettings>) => void;
  onCreateHunt: (
    entry: LivingDexEntry,
    method: ShinyHuntMethod,
    counterMode: HuntCounterMode,
  ) => void;
  onClose: () => void;
}) {
  const [huntTarget, setHuntTarget] = useState("");
  const [huntMethod, setHuntMethod] = useState<ShinyHuntMethod>("overworld");
  const [counterMode, setCounterMode] = useState<HuntCounterMode>("encounters");
  const targetEntry = findEntryByQuery(entries, huntTarget);

  const createHunt = () => {
    if (!targetEntry) return;
    onCreateHunt(targetEntry, huntMethod, counterMode);
    setHuntTarget("");
  };

  return (
    <div className="absolute left-4 top-16 z-30 w-[420px] rounded-lg border border-[#3f4d76] bg-[#070914]/95 p-3 shadow-[0_22px_70px_rgba(0,0,0,0.55)] backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-[#8fe388]" />
          <p className="font-mono text-[11px] font-black uppercase tracking-[0.18em] text-[#8fe388]">
            Stream Setup
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-7 w-7 place-items-center rounded text-[#8ca0c9] hover:bg-white/5 hover:text-[#f4f1ff]"
          aria-label="Hide setup"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-2">
        <div className="grid grid-cols-2 gap-2">
          <label className="grid gap-1">
            <span className="font-mono text-[9px] font-black uppercase tracking-[0.14em] text-[#687696]">
              Game
            </span>
            <select
              value={settings.gameId}
              onChange={(event) =>
                onSettingsChange({ gameId: event.target.value })
              }
              className="h-9 rounded border border-[#27304c] bg-[#050814] px-2 text-xs font-bold text-[#f4f1ff] outline-none focus:border-[#8fe388]"
            >
              {GAME_LIST.filter((game) => !game.dlcOf).map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="font-mono text-[9px] font-black uppercase tracking-[0.14em] text-[#687696]">
              Mode
            </span>
            <select
              value={settings.mode}
              onChange={(event) =>
                onSettingsChange({ mode: event.target.value as OverlayMode })
              }
              className="h-9 rounded border border-[#27304c] bg-[#050814] px-2 text-xs font-bold text-[#f4f1ff] outline-none focus:border-[#8fe388]"
            >
              {Object.entries(MODE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="grid gap-1">
          <span className="font-mono text-[9px] font-black uppercase tracking-[0.14em] text-[#687696]">
            Goal
          </span>
          <input
            value={settings.goal}
            onChange={(event) => onSettingsChange({ goal: event.target.value })}
            className="h-9 rounded border border-[#27304c] bg-[#050814] px-2 text-xs font-bold text-[#f4f1ff] outline-none focus:border-[#8fe388]"
          />
        </label>

        <div className="grid grid-cols-5 gap-2">
          <button
            type="button"
            onClick={() =>
              onSettingsChange({ showHuntPanel: !settings.showHuntPanel })
            }
            className={`h-9 rounded border px-3 text-left font-mono text-[10px] font-black uppercase tracking-[0.14em] transition ${
              settings.showHuntPanel
                ? "border-[#f7c948]/45 bg-[#1d1708] text-[#f7c948]"
                : "border-[#27304c] bg-[#050814] text-[#687696]"
            }`}
          >
            Hunt Panel {settings.showHuntPanel ? "On" : "Off"}
          </button>
          <button
            type="button"
            onClick={() =>
              onSettingsChange({ showHuntCount: !settings.showHuntCount })
            }
            className={`h-9 rounded border px-3 text-left font-mono text-[10px] font-black uppercase tracking-[0.14em] transition ${
              settings.showHuntCount
                ? "border-[#f7c948]/45 bg-[#1d1708] text-[#f7c948]"
                : "border-[#27304c] bg-[#050814] text-[#687696]"
            }`}
          >
            Count {settings.showHuntCount ? "On" : "Off"}
          </button>
          <button
            type="button"
            onClick={() =>
              onSettingsChange({ showAutoCount: !settings.showAutoCount })
            }
            className={`h-9 rounded border px-3 text-left font-mono text-[10px] font-black uppercase tracking-[0.14em] transition ${
              settings.showAutoCount
                ? "border-[#67d9ff]/45 bg-[#061620] text-[#67d9ff]"
                : "border-[#27304c] bg-[#050814] text-[#687696]"
            }`}
          >
            Auto {settings.showAutoCount ? "On" : "Off"}
          </button>
          <button
            type="button"
            onClick={() =>
              onSettingsChange({ showRecentFinds: !settings.showRecentFinds })
            }
            className={`h-9 rounded border px-3 text-left font-mono text-[10px] font-black uppercase tracking-[0.14em] transition ${
              settings.showRecentFinds
                ? "border-[#8fe388]/45 bg-[#0c1c18] text-[#8fe388]"
                : "border-[#27304c] bg-[#050814] text-[#687696]"
            }`}
          >
            Recent {settings.showRecentFinds ? "On" : "Off"}
          </button>
          <button
            type="button"
            onClick={() =>
              onSettingsChange({ showSessionNotes: !settings.showSessionNotes })
            }
            className={`h-9 rounded border px-3 text-left font-mono text-[10px] font-black uppercase tracking-[0.14em] transition ${
              settings.showSessionNotes
                ? "border-[#8fe388]/45 bg-[#0c1c18] text-[#8fe388]"
                : "border-[#27304c] bg-[#050814] text-[#687696]"
            }`}
          >
            Notes {settings.showSessionNotes ? "On" : "Off"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onSettingsChange({ showParty: !settings.showParty })}
            className={`h-9 rounded border px-3 text-left font-mono text-[10px] font-black uppercase tracking-[0.14em] transition ${
              settings.showParty
                ? "border-[#8fe388]/45 bg-[#0c1c18] text-[#8fe388]"
                : "border-[#27304c] bg-[#050814] text-[#687696]"
            }`}
          >
            Party {settings.showParty ? "On" : "Off"}
          </button>
          <div className="rounded border border-[#27304c] bg-[#050814] px-3 py-2 font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#53607c]">
            OBS Clean Ready
          </div>
        </div>

        <label className="grid gap-1">
          <span className="font-mono text-[9px] font-black uppercase tracking-[0.14em] text-[#687696]">
            Active hunt
          </span>
          <select
            value={settings.huntId}
            onChange={(event) =>
              onSettingsChange({ huntId: event.target.value })
            }
            className="h-9 rounded border border-[#27304c] bg-[#050814] px-2 text-xs font-bold text-[#f4f1ff] outline-none focus:border-[#8fe388]"
          >
            <option value="">Auto / none</option>
            {hunts.map((hunt) => (
              <option key={hunt.id} value={hunt.id}>
                {dexNumber(hunt.speciesId)} - {getGameById(hunt.gameId)?.name}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded border border-[#27304c] bg-[#050814]/70 p-2">
          <p className="mb-2 font-mono text-[9px] font-black uppercase tracking-[0.14em] text-[#687696]">
            Start shiny hunt
          </p>
          <div className="grid gap-2">
            <input
              value={huntTarget}
              onChange={(event) => setHuntTarget(event.target.value)}
              placeholder="Pokemon name or #"
              className="h-9 rounded border border-[#27304c] bg-[#030611] px-2 text-xs font-bold text-[#f4f1ff] outline-none placeholder:text-[#53607c] focus:border-[#f7c948]"
            />
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
              <select
                value={huntMethod}
                onChange={(event) =>
                  setHuntMethod(event.target.value as ShinyHuntMethod)
                }
                className="h-9 rounded border border-[#27304c] bg-[#030611] px-2 text-xs font-bold text-[#f4f1ff] outline-none focus:border-[#f7c948]"
              >
                {HUNT_METHOD_OPTIONS.map((method) => (
                  <option key={method} value={method}>
                    {METHOD_LABELS[method]}
                  </option>
                ))}
              </select>
              <select
                value={counterMode}
                onChange={(event) =>
                  setCounterMode(event.target.value as HuntCounterMode)
                }
                className="h-9 rounded border border-[#27304c] bg-[#030611] px-2 text-xs font-bold text-[#f4f1ff] outline-none focus:border-[#f7c948]"
              >
                {COUNTER_MODE_OPTIONS.map((mode) => (
                  <option key={mode} value={mode}>
                    {COUNTER_LABELS[mode]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={createHunt}
                disabled={!targetEntry}
                className="h-9 rounded border border-[#4c3d18] bg-[#1d1708] px-3 font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#f7c948] transition hover:bg-[#2a2108] disabled:cursor-not-allowed disabled:opacity-35"
              >
                Add
              </button>
            </div>
            {huntTarget && (
              <p className="font-mono text-[10px] text-[#687696]">
                {targetEntry
                  ? `Target: ${targetEntry.displayName} ${dexNumber(targetEntry.speciesId)}`
                  : "No matching Pokemon found."}
              </p>
            )}
          </div>
        </div>

        <label className="grid gap-1">
          <span className="font-mono text-[9px] font-black uppercase tracking-[0.14em] text-[#687696]">
            Party
          </span>
          <input
            value={settings.partyText}
            onChange={(event) =>
              onSettingsChange({ partyText: event.target.value })
            }
            placeholder="Pikachu, Gardevoir, #006"
            className="h-9 rounded border border-[#27304c] bg-[#050814] px-2 text-xs font-bold text-[#f4f1ff] outline-none placeholder:text-[#53607c] focus:border-[#8fe388]"
          />
        </label>

        <label className="grid gap-1">
          <span className="font-mono text-[9px] font-black uppercase tracking-[0.14em] text-[#687696]">
            Note
          </span>
          <textarea
            value={settings.note}
            onChange={(event) => onSettingsChange({ note: event.target.value })}
            rows={2}
            className="resize-none rounded border border-[#27304c] bg-[#050814] px-2 py-2 text-xs font-bold leading-5 text-[#f4f1ff] outline-none focus:border-[#8fe388]"
          />
        </label>

        <p className="font-mono text-[10px] leading-5 text-[#687696]">
          Use /stream/game?clean=1 in OBS to start without this setup panel.
        </p>
      </div>
    </div>
  );
}

export default function GameStreamOverlay() {
  const [settings, setSettings] = useState<GameOverlaySettings>(readSettings);
  const [timeStr, setTimeStr] = useState("");
  const [controlsHidden, setControlsHidden] = useState(readStartsClean);
  const { data: entries = [], isLoading } = useLivingDexEntries();

  const shinyHunts = usePokedexStore((state) => state.shinyHunts);
  const recentCatches = usePokedexStore((state) => state.recentCatches);
  const gameDex = usePokedexStore((state) => state.gameDex);
  const incrementShinyHunt = usePokedexStore(
    (state) => state.incrementShinyHunt,
  );
  const decrementShinyHunt = usePokedexStore(
    (state) => state.decrementShinyHunt,
  );
  const completeShinyHunt = usePokedexStore((state) => state.completeShinyHunt);
  const addShinyHunt = usePokedexStore((state) => state.addShinyHunt);

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const updateTime = () => {
      setTimeStr(
        new Intl.DateTimeFormat(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date()),
      );
    };
    updateTime();
    const id = window.setInterval(updateTime, 1000);
    return () => window.clearInterval(id);
  }, []);

  const entriesByKey = useMemo(() => {
    const map = new Map<string, LivingDexEntry>();
    for (const entry of entries) {
      map.set(entryKey(entry.speciesId, entry.formName), entry);
    }
    return map;
  }, [entries]);

  const activeHunts = useMemo(
    () => shinyHunts.filter((hunt) => !hunt.completedAt),
    [shinyHunts],
  );
  const activeHunt = settings.showHuntPanel
    ? (activeHunts.find((hunt) => hunt.id === settings.huntId) ??
      activeHunts[0] ??
      null)
    : null;
  const selectedGame = getGameById(settings.gameId);
  const displayedGame = selectedGame;
  const activeHuntGame = activeHunt ? getGameById(activeHunt.gameId) : null;
  const activeHuntEntry = activeHunt
    ? entriesByKey.get(entryKey(activeHunt.speciesId, activeHunt.formName))
    : undefined;
  const partyEntries = useMemo(
    () => findPartyEntries(entries, settings.partyText),
    [entries, settings.partyText],
  );
  const recentFinds = recentCatches.slice(0, 5);
  const currentGameFlags = gameDex[settings.gameId] ?? {};
  const gameOwned = Object.values(currentGameFlags).filter(
    (flags) => flags.owned,
  ).length;
  const shinyOwned = Object.values(currentGameFlags).filter(
    (flags) => flags.shiny || flags.shiny_alpha,
  ).length;

  const rightRailRows = (() => {
    const hunt = settings.showHuntPanel;
    const recent = settings.showRecentFinds;
    const notes = settings.showSessionNotes;
    // The flex-fill slot goes to Recent Finds if shown, otherwise Session Notes, otherwise Hunt Panel
    if (hunt && recent && notes) return "grid-rows-[auto_minmax(0,1fr)_auto]";
    if (hunt && recent)          return "grid-rows-[auto_minmax(0,1fr)]";
    if (hunt && notes)           return "grid-rows-[auto_minmax(0,1fr)]";
    if (recent && notes)         return "grid-rows-[minmax(0,1fr)_auto]";
    if (hunt)                    return "grid-rows-[minmax(0,1fr)]";
    if (recent)                  return "grid-rows-[minmax(0,1fr)]";
    if (notes)                   return "grid-rows-[minmax(0,1fr)]";
    return "grid-rows-[minmax(0,1fr)]";
  })();
  const pageRows = settings.showParty
    ? "grid-rows-[52px_minmax(0,1fr)_76px]"
    : "grid-rows-[52px_minmax(0,1fr)]";

  const updateSettings = (patch: Partial<GameOverlaySettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  };

  const createHunt = (
    entry: LivingDexEntry,
    method: ShinyHuntMethod,
    counterMode: HuntCounterMode,
  ) => {
    const id = addShinyHunt(
      entry.speciesId,
      entry.formName,
      settings.gameId,
      method,
      counterMode,
    );
    updateSettings({
      huntId: id,
      mode: "shiny-hunt",
      showHuntPanel: true,
      goal: `Shiny ${entry.displayName}`,
    });
  };

  if (isLoading) {
    return (
      <div className="grid h-screen place-items-center bg-transparent text-[#f4f1ff]">
        <div className="flex items-center gap-2 rounded border border-[#293152] bg-[#070914]/92 px-4 py-3 font-mono text-xs uppercase tracking-[0.2em] text-[#8fe388]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#8fe388]" />
          Loading game overlay
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        body {
          background: transparent !important;
        }
      `}</style>
      <div className="relative h-screen overflow-hidden bg-transparent p-3 text-[#f4f1ff]">
        {!controlsHidden && (
          <SetupDock
            settings={settings}
            hunts={activeHunts}
            entries={entries}
            onSettingsChange={updateSettings}
            onCreateHunt={createHunt}
            onClose={() => setControlsHidden(true)}
          />
        )}

        <div className={`grid h-full min-h-0 ${pageRows} gap-2`}>
          <header className="grid min-h-0 grid-cols-[360px_minmax(0,1fr)_360px] items-center rounded-lg border border-[#2f2750] bg-[#080b17]/90 px-4 shadow-[0_12px_38px_rgba(0,0,0,0.35)] backdrop-blur">
            <div className="flex min-w-0 items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/brand.svg"
                alt="Amanita"
                className="h-8 w-auto"
              />
              <div className="h-7 w-px bg-[#2f2750]" />
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-[#bda9ff]">
                  Research Terminal
                </p>
                <p className="truncate font-mono text-[9px] uppercase tracking-[0.18em] text-[#53607c]">
                  Live fieldwork overlay
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              <div className="flex items-center gap-2 rounded border border-[#27304c] bg-[#060915]/92 px-4 py-2">
                <MonitorPlay className="h-4 w-4 text-[#8fe388]" />
                <span className="font-mono text-sm font-black uppercase tracking-[0.16em] text-[#8fe388]">
                  Game Overlay Mode
                </span>
              </div>
              {controlsHidden && (
                <button
                  type="button"
                  onClick={() => setControlsHidden(false)}
                  className="grid h-8 w-8 place-items-center rounded border border-[#27304c] bg-[#060915]/92 text-[#8ca0c9] transition hover:border-[#8fe388] hover:text-[#8fe388]"
                  title="Open setup"
                  aria-label="Open setup"
                >
                  <Settings2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex min-w-0 items-center justify-end gap-4 font-mono text-[12px]">
              <div className="flex items-center gap-2 rounded border border-[#27304c] bg-[#060915]/92 px-3 py-1.5">
                <Gamepad2 className="h-4 w-4 text-[#bda9ff]" />
                <span className="text-[#8ca0c9]">GAME:</span>
                <span className="max-w-[160px] truncate font-black text-[#d7c8ff]">
                  {displayedGame?.name ?? settings.gameId}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[#8ca0c9]">
                <Clock3 className="h-4 w-4" />
                <time>{timeStr}</time>
              </div>
            </div>
          </header>

          <main className="grid min-h-0 grid-cols-[minmax(0,1fr)_390px] gap-2">
            <section className="relative min-h-0 overflow-hidden rounded-lg border border-[#8fe388]/28 bg-transparent shadow-[inset_0_0_40px_rgba(143,227,136,0.06)]">
              <div className="absolute left-3 top-3 h-12 w-12 border-l-2 border-t-2 border-[#8fe388]/75" />
              <div className="absolute right-3 top-3 h-12 w-12 border-r-2 border-t-2 border-[#8fe388]/75" />
              <div className="absolute bottom-3 left-3 h-12 w-12 border-b-2 border-l-2 border-[#8fe388]/75" />
              <div className="absolute bottom-3 right-3 h-12 w-12 border-b-2 border-r-2 border-[#8fe388]/75" />

              <div className="absolute left-5 top-5 rounded border border-[#27304c] bg-[#060915]/70 px-3 py-1.5 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#8ca0c9] backdrop-blur">
                Game Capture
              </div>

              <div className="absolute bottom-5 left-5 right-5 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-[#293152] bg-[#070914]/86 px-4 py-3 shadow-[0_18px_45px_rgba(0,0,0,0.38)] backdrop-blur">
                <span className="grid h-11 w-11 place-items-center rounded border border-[#8fe388]/40 bg-[#0c1c18] text-[#8fe388]">
                  <Swords className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#8fe388]">
                    Current Goal
                  </p>
                  <p className="truncate text-2xl font-black tracking-tight text-[#f4f1ff]">
                    {settings.goal || MODE_LABELS[settings.mode]}
                  </p>
                </div>
                <span className="rounded border border-[#27304c] bg-[#050814] px-3 py-2 font-mono text-[11px] font-black uppercase tracking-[0.14em] text-[#bda9ff]">
                  {MODE_LABELS[settings.mode]}
                </span>
              </div>
            </section>

            <aside className={`grid min-h-0 ${rightRailRows} gap-2`}>
              {settings.showHuntPanel && (
                <Panel
                  title="Active Hunt"
                  icon={<Sparkles className="h-4 w-4 text-[#f7c948]" />}
                >
                  {activeHunt && activeHuntEntry ? (
                    <div className="p-3">
                      <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3">
                        <div className="relative grid h-28 w-28 place-items-center rounded-xl border border-[#4c3d18] bg-[radial-gradient(circle_at_50%_30%,rgba(247,201,72,0.18),transparent_58%),#080b17]">
                          <PokemonSprite
                            entry={activeHuntEntry}
                            shiny
                            className="h-24 w-24"
                          />
                          <Sparkles className="absolute right-2 top-2 h-4 w-4 text-[#f7c948]" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-mono text-[11px] text-[#687696]">
                            {dexNumber(activeHuntEntry.speciesId)}
                          </p>
                          <h1 className="truncate text-2xl font-black leading-tight text-[#f4f1ff]">
                            {activeHuntEntry.displayName}
                          </h1>
                          <p className="mt-1 truncate text-xs font-bold text-[#8ca0c9]">
                            {activeHuntGame?.name ?? activeHunt.gameId} /{" "}
                            {METHOD_LABELS[activeHunt.method]}
                          </p>
                          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#687696]">
                            {formatElapsed(activeHunt.startedAt)} active
                          </p>
                        </div>
                      </div>

                      {settings.showHuntCount && activeHunt.count !== null && (
                        <div className="mt-3 grid grid-cols-[40px_1fr_40px] items-center gap-2 rounded-lg border border-[#27304c] bg-[#050814] p-2">
                          <button
                            type="button"
                            onClick={() => decrementShinyHunt(activeHunt.id)}
                            className="grid h-9 w-9 place-items-center rounded border border-[#27304c] text-[#8ca0c9] transition hover:border-[#f7c948] hover:text-[#f7c948]"
                            aria-label="Decrease hunt count"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <div className="text-center">
                            <p className="font-mono text-4xl font-black leading-none text-[#f7c948]">
                              {activeHunt.count.toLocaleString()}
                            </p>
                            <p className="mt-1 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#687696]">
                              {COUNTER_LABELS[activeHunt.counterMode]}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => incrementShinyHunt(activeHunt.id)}
                            className="grid h-9 w-9 place-items-center rounded border border-[#27304c] text-[#8ca0c9] transition hover:border-[#f7c948] hover:text-[#f7c948]"
                            aria-label="Increase hunt count"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      )}

                      {settings.showAutoCount && (
                        <EncounterAutoCounter
                          gameId={settings.gameId}
                          onEncounter={() => incrementShinyHunt(activeHunt.id)}
                        />
                      )}

                      {!controlsHidden && (
                        <button
                          type="button"
                          onClick={() => completeShinyHunt(activeHunt.id)}
                          className="mt-2 h-8 w-full rounded border border-[#4c3d18] bg-[#1d1708] font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#f7c948] transition hover:bg-[#2a2108]"
                        >
                          Mark shiny found
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid min-h-40 place-items-center p-4 text-center">
                      <div>
                        <Sparkles className="mx-auto h-8 w-8 text-[#53607c]" />
                        <p className="mt-2 text-sm font-black text-[#f4f1ff]">
                          No active shiny hunt
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[#687696]">
                          Start one from the setup panel when the hunt begins.
                        </p>
                      </div>
                    </div>
                  )}
                </Panel>
              )}

              {settings.showRecentFinds && (
                <Panel
                  title="Recent Finds"
                  icon={<CheckCircle2 className="h-4 w-4 text-[#8fe388]" />}
                  className="min-h-0"
                >
                  <div className="grid max-h-full gap-1.5 overflow-hidden p-2.5">
                    {recentFinds.length > 0 ? (
                      recentFinds.map((event) => (
                        <RecentFind
                          key={`${event.speciesId}-${event.formName ?? "base"}-${event.gameId}-${event.date}`}
                          event={event}
                          entry={findEntryForEvent(entriesByKey, event)}
                          gameName={selectedGame?.name ?? settings.gameId}
                        />
                      ))
                    ) : (
                      <p className="rounded border border-[#27304c] bg-[#050814] px-3 py-8 text-center text-xs font-bold text-[#53607c]">
                        No recent catches yet.
                      </p>
                    )}
                  </div>
                </Panel>
              )}

              {settings.showSessionNotes && (
                <Panel title="Session Notes">
                  <div className="p-3">
                    <p className="text-sm font-semibold leading-6 text-[#d7c8ff]">
                      {settings.note}
                    </p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div className="rounded border border-[#27304c] bg-[#050814] px-3 py-2">
                        <p className="font-mono text-[9px] font-black uppercase tracking-[0.16em] text-[#687696]">
                          Game Dex
                        </p>
                        <p className="mt-1 font-mono text-xl font-black text-[#8fe388]">
                          {gameOwned}
                        </p>
                      </div>
                      <div className="rounded border border-[#27304c] bg-[#050814] px-3 py-2">
                        <p className="font-mono text-[9px] font-black uppercase tracking-[0.16em] text-[#687696]">
                          Shinies
                        </p>
                        <p className="mt-1 font-mono text-xl font-black text-[#f7c948]">
                          {shinyOwned}
                        </p>
                      </div>
                      <div className="rounded border border-[#27304c] bg-[#050814] px-3 py-2">
                        <p className="font-mono text-[9px] font-black uppercase tracking-[0.16em] text-[#687696]">
                          Hunts
                        </p>
                        <p className="mt-1 font-mono text-xl font-black text-[#bda9ff]">
                          {activeHunts.length}
                        </p>
                      </div>
                    </div>
                  </div>
                </Panel>
              )}
            </aside>
          </main>

          {settings.showParty && (
            <footer className="grid min-h-0 grid-cols-[minmax(0,1fr)_280px] gap-2">
              <section className="flex min-w-0 items-center gap-2 rounded-lg border border-[#2f2750] bg-[#080b17]/90 px-3 shadow-[0_12px_38px_rgba(0,0,0,0.35)] backdrop-blur">
                <p className="mr-1 shrink-0 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#8fe388]">
                  Party
                </p>
                <div className="grid min-w-0 flex-1 grid-cols-6 gap-2">
                  {partyEntries.map((entry, index) => (
                    <div
                      key={
                        entry
                          ? entryKey(entry.speciesId, entry.formName)
                          : index
                      }
                      className="grid h-14 grid-cols-[46px_minmax(0,1fr)] items-center gap-2 rounded border border-[#27304c] bg-[#050814]/90 px-2"
                    >
                      <div className="relative grid h-11 w-11 place-items-center rounded bg-[#0d1324]">
                        {entry ? (
                          <>
                            <PokemonSprite entry={entry} className="h-10 w-10" />
                            <div className="absolute -bottom-1 -right-1">
                              <PokemonInfoButton
                                entry={entry}
                                gameName={selectedGame?.name ?? settings.gameId}
                              />
                            </div>
                          </>
                        ) : (
                          <span className="font-mono text-[10px] text-[#53607c]">
                            {index + 1}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-black text-[#f4f1ff]">
                          {entry?.displayName ?? "Open Slot"}
                        </p>
                        <p className="font-mono text-[9px] text-[#53607c]">
                          {entry ? dexNumber(entry.speciesId) : "READY"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-[#2f2750] bg-[#080b17]/90 px-4 py-2 shadow-[0_12px_38px_rgba(0,0,0,0.35)] backdrop-blur">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#687696]">
                  Amanita Live
                </p>
                <div className="mt-1 flex items-end justify-between gap-3">
                  <span className="font-mono text-2xl font-black text-[#8fe388]">
                    {activeHunts.length}
                  </span>
                  <span className="pb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8ca0c9]">
                    active hunt{activeHunts.length === 1 ? "" : "s"}
                  </span>
                </div>
              </section>
            </footer>
          )}
        </div>
      </div>
    </>
  );
}
