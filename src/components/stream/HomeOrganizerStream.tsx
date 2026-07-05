"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Gamepad2,
  Info,
  LayoutGrid,
  ListChecks,
  RefreshCw,
  Search,
  Sprout,
  X,
} from "lucide-react";
import { useLivingDexEntries, usePokemonEvolution } from "@/hooks/usePokemon";
import { useEncounters } from "@/hooks/useEncounters";
import { useGameHomeBoxDex } from "@/hooks/useGamePokedex";
import { GAME_LIST, getGameById } from "@/config/games";
import { GENDER_DIFFERENCE_FORM_KEYS } from "@/config/cosmetic-forms";
import { getFormLabel } from "@/lib/forms";
import { api } from "@/lib/api";
import { loadFromSupabase } from "@/lib/sync";
import { supabase } from "@/lib/supabase";
import {
  compareLivingDexEntries,
  isHomeTrackedEntry,
  isShinyTargetEntry,
} from "@/lib/livingDex";
import { ownedKey, usePokedexStore } from "@/store/pokedexStore";
import type {
  OrderingAssistDetection,
  OrderingAssistStoredEvent,
} from "@/lib/orderingAssist";
import { useOrderingAssist } from "@/hooks/useOrderingAssist";
import { AssistCalibration } from "@/components/stream/AssistCalibration";
import type {
  GameHomeBoxFormRule,
  GameHomeBoxEntry,
  GameDexFlags,
  HomeBoxLayoutProfile,
  LivingDexEntry,
} from "@/types/pokemon";

const BOX_SIZE = 30;
const COLS = 6;
const ROWS = BOX_SIZE / COLS;
const HOME_DEX_GAME_ID = "home";
const STRIP_PAGE_SIZE = 8;
const EMPTY_BOX: (SlotData | null)[] = [];
const DEFAULT_GAME_BOX_ID = "legends-za";
const EMPTY_GAME_FLAGS: Record<string, GameDexFlags> = {};
const UNSYNCED_PREVIEW_LAYOUT: HomeBoxLayoutProfile = {
  id: "stream-unsynced-preview",
  name: "Unsynced Preview",
  mode: "normal",
  showCosmeticForms: false,
  showGenderForms: false,
};

type BoxSource = "home" | "game";

type SlotData = {
  entry: LivingDexEntry;
  isShiny: boolean;
  shinyAvailable: boolean;
  source: BoxSource;
  gameId?: string;
  entryNumber?: number;
};

type PositionedSlot = {
  slot: SlotData;
  index: number;
};

type SearchResult = {
  slot: SlotData;
  boxIndex: number;
  slotIndex: number;
  owned: boolean;
};

type AssistMatch = SearchResult & {
  key: string;
};

type AssistGender = "male" | "female";

type BoxStat = {
  total: number;
  owned: number;
};

function slotKey(slot: SlotData): string {
  return `${slot.source}-${slot.gameId ?? "home"}-${ownedKey(slot.entry.speciesId, slot.entry.formName)}-${slot.isShiny ? "shiny" : "normal"}`;
}

function formRuleKey(formName: string | null): string {
  return formName ?? "base";
}

function buildRulesBySpecies(
  rules: readonly GameHomeBoxFormRule[],
): Map<number, Map<string, GameHomeBoxFormRule>> {
  const bySpecies = new Map<number, Map<string, GameHomeBoxFormRule>>();
  for (const rule of rules) {
    const formRules = bySpecies.get(rule.speciesId) ?? new Map();
    formRules.set(formRuleKey(rule.formName), rule);
    bySpecies.set(rule.speciesId, formRules);
  }
  return bySpecies;
}

function dexNumber(speciesId: number): string {
  return `#${String(speciesId).padStart(4, "0")}`;
}

function slotNumberLabel(slot: SlotData): string {
  if (slot.entryNumber !== undefined) {
    return `#${String(slot.entryNumber).padStart(3, "0")}`;
  }
  return dexNumber(slot.entry.speciesId);
}

function slotRangeNumber(slot: SlotData): number {
  return slot.entryNumber ?? slot.entry.speciesId;
}

function buildSlotBoxes(slots: SlotData[]): (SlotData | null)[][] {
  const total = Math.max(1, Math.ceil(slots.length / BOX_SIZE));
  return Array.from({ length: total }, (_, i) => {
    const chunk: (SlotData | null)[] = slots.slice(
      i * BOX_SIZE,
      (i + 1) * BOX_SIZE,
    );
    while (chunk.length < BOX_SIZE) chunk.push(null);
    return chunk;
  });
}

function isSlotOwned(
  slot: SlotData,
  record: { owned?: boolean; shiny?: boolean } | undefined,
  gameBoxed = false,
): boolean {
  if (slot.source === "game") return gameBoxed;
  if (slot.isShiny && !slot.shinyAvailable) return false;
  return slot.isShiny ? !!record?.shiny : !!record?.owned;
}

function isSlotTrackable(slot: SlotData): boolean {
  return !slot.isShiny || slot.shinyAvailable;
}

function spriteForSlot(slot: SlotData): string {
  return slot.isShiny && slot.shinyAvailable
    ? (slot.entry.shinySpriteUrl ?? slot.entry.spriteUrl)
    : slot.entry.spriteUrl;
}

function isFemaleForm(entry: LivingDexEntry): boolean {
  return (
    !!entry.formName &&
    GENDER_DIFFERENCE_FORM_KEYS.has(`${entry.speciesId}-${entry.formName}`)
  );
}

function compactSlotName(entry: LivingDexEntry): string {
  return isFemaleForm(entry)
    ? entry.displayName.replace(/\s+Female$/, "")
    : entry.displayName;
}

function normalizeAssistText(value: string): string {
  return value
    .toLowerCase()
    .replace(/♀/g, " female")
    .replace(/♂/g, " male")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slotMatchesAssistName(slot: SlotData, name: string): boolean {
  const target = normalizeAssistText(name);
  if (!target) return false;

  const displayName = normalizeAssistText(slot.entry.displayName);
  const compactName = normalizeAssistText(compactSlotName(slot.entry));
  return (
    displayName === target ||
    compactName === target ||
    displayName.startsWith(`${target} `) ||
    compactName.startsWith(`${target} `)
  );
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length];
}

function fuzzyNameDistance(slot: SlotData, name: string): number {
  const target = normalizeAssistText(name);
  if (!target) return Number.POSITIVE_INFINITY;
  const names = [
    normalizeAssistText(slot.entry.displayName),
    normalizeAssistText(compactSlotName(slot.entry)),
  ];
  return Math.min(
    ...names.map((candidate) => levenshteinDistance(candidate, target)),
  );
}

function fuzzyNameLimit(name: string): number {
  const length = normalizeAssistText(name).length;
  if (length >= 9) return 3;
  if (length >= 6) return 2;
  return 1;
}

function filterAssistMatchesByGender<T extends { slot: SlotData }>(
  matches: T[],
  gender: AssistGender | null,
): T[] {
  if (!gender) return matches;
  const hasFemaleVariant = matches.some(({ slot }) => isFemaleForm(slot.entry));
  if (!hasFemaleVariant) return matches;
  return matches.filter(({ slot }) =>
    gender === "female" ? isFemaleForm(slot.entry) : !isFemaleForm(slot.entry),
  );
}

const REGION_BADGE: Record<string, { letter: string; className: string }> = {
  Alolan: { letter: "A", className: "bg-[#2a1f08] text-[#f7a94a]" },
  Galarian: { letter: "G", className: "bg-[#1a1330] text-[#c084fc]" },
  Hisuian: { letter: "H", className: "bg-[#0d1f2d] text-[#67d9ff]" },
  Paldean: { letter: "P", className: "bg-[#1f0d0d] text-[#ff8f8f]" },
};

function TemplateSlot({
  slot,
  slotNumber,
  highlighted,
  isSearchFocus,
  progressScopeId,
  onMark,
}: {
  slot: SlotData | null;
  slotNumber: number;
  highlighted: boolean;
  isSearchFocus: boolean;
  progressScopeId?: string;
  onMark?: (slot: SlotData) => void;
}) {
  const key = slot ? ownedKey(slot.entry.speciesId, slot.entry.formName) : "";
  const record = usePokedexStore((s) =>
    slot && progressScopeId ? s.gameDex[progressScopeId]?.[key] : undefined,
  );
  const gameBoxed = usePokedexStore((s) =>
    slot?.source === "game" && slot.gameId
      ? !!s.gameHomeBoxes[slot.gameId]?.[key]
      : false,
  );
  const markHomeBoxLayoutSlot = usePokedexStore((s) => s.markHomeBoxLayoutSlot);
  const clearHomeBoxLayoutSlot = usePokedexStore(
    (s) => s.clearHomeBoxLayoutSlot,
  );
  const markInGameHomeBox = usePokedexStore((s) => s.markInGameHomeBox);
  const clearFromGameHomeBox = usePokedexStore((s) => s.clearFromGameHomeBox);

  if (!slot) {
    return (
      <div className="absolute inset-0 rounded border border-[#192031]/60 bg-[#070914]/70" />
    );
  }

  const owned = isSlotOwned(slot, record, gameBoxed);
  const sprite = spriteForSlot(slot);
  const female = isFemaleForm(slot.entry);
  const compactName = compactSlotName(slot.entry);
  const regionLabel = slot.entry.formName
    ? getFormLabel(slot.entry.formName)
    : "";
  const regionBadge = regionLabel ? REGION_BADGE[regionLabel] : null;
  const shinyUnavailable = slot.isShiny && !slot.shinyAvailable;

  const toggle = () => {
    if (slot.source === "game") {
      if (!slot.gameId) return;
      if (owned)
        clearFromGameHomeBox(
          slot.entry.speciesId,
          slot.gameId,
          slot.entry.formName,
        );
      else {
        markInGameHomeBox(
          slot.entry.speciesId,
          slot.gameId,
          slot.entry.formName,
        );
        onMark?.(slot);
      }
      return;
    }

    if (shinyUnavailable) return;
    if (!progressScopeId) return;
    if (slot.isShiny) {
      if (owned)
        clearHomeBoxLayoutSlot(
          progressScopeId,
          slot.entry.speciesId,
          slot.entry.formName,
          true,
        );
      else {
        markHomeBoxLayoutSlot(
          progressScopeId,
          slot.entry.speciesId,
          slot.entry.formName,
          true,
        );
        onMark?.(slot);
      }
      return;
    }

    if (owned)
      clearHomeBoxLayoutSlot(
        progressScopeId,
        slot.entry.speciesId,
        slot.entry.formName,
        false,
      );
    else {
      markHomeBoxLayoutSlot(
        progressScopeId,
        slot.entry.speciesId,
        slot.entry.formName,
        false,
      );
      onMark?.(slot);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={`Slot ${slotNumber}: ${slot.entry.displayName}${
        shinyUnavailable
          ? " shiny unavailable"
          : slot.source === "game"
            ? owned
              ? " boxed"
              : " missing from game box"
            : owned
              ? " owned"
              : " missing"
      }`}
      className={`group absolute inset-0 overflow-hidden rounded border text-left transition ${
        isSearchFocus
          ? "border-[#f7c948] bg-[#211a08] shadow-[0_0_18px_rgba(247,201,72,0.25)]"
          : highlighted
            ? "border-[#9f7aea] bg-[#161226]"
            : shinyUnavailable
              ? "border-[#293044] bg-[#070914]"
              : owned
                ? "border-[#2f7354] bg-[#07140f]"
                : "border-[#293044] bg-[#080b17]"
      }`}
    >
      <span
        className={`absolute right-1 top-1 z-20 h-1.5 w-1.5 rounded-full ${
          shinyUnavailable
            ? "bg-[#53607c]"
            : owned
              ? "bg-[#8fe388]"
              : "bg-[#ff8f8f]"
        }`}
      />

      <div className="absolute left-1 right-1 top-1 z-10 flex min-w-0 items-center justify-between gap-1 pr-2 font-mono text-[8px] leading-none">
        <span
          className={`truncate ${owned ? "text-[#8fe388]" : "text-[#75809c]"}`}
        >
          {slotNumberLabel(slot)}
        </span>
        <span className="shrink-0 text-[#53607c]">
          {String(slotNumber).padStart(2, "0")}
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-4 top-2.5 flex items-center justify-center px-0.5">
        {isSearchFocus && (
          <span className="absolute left-1 top-1 z-20 rounded bg-[#f7c948] px-1 font-mono text-[7px] font-black text-[#170f02]">
            FIND
          </span>
        )}
        <div className="absolute left-1 top-2.5 z-20 flex gap-0.5">
          {slot.isShiny && (
            <span
              className={`grid h-3.5 w-3.5 place-items-center rounded text-[9px] leading-none ${
                shinyUnavailable
                  ? "bg-[#151927] text-[#53607c]"
                  : "bg-[#2a2108] text-[#f7c948]"
              }`}
              title={shinyUnavailable ? "Shiny unavailable" : "Shiny slot"}
            >
              ★
            </span>
          )}
          {female && (
            <span
              className="grid h-3.5 w-3.5 place-items-center rounded bg-[#241326] text-[10px] leading-none text-[#ff9ee8]"
              title="Female form"
            >
              ♀
            </span>
          )}
          {regionBadge && (
            <span
              className={`grid h-3.5 w-3.5 place-items-center rounded font-mono text-[8px] font-black leading-none ${regionBadge.className}`}
              title={regionLabel}
            >
              {regionBadge.letter}
            </span>
          )}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={sprite}
          alt={slot.entry.displayName}
          className={`h-full max-h-[72px] w-full object-contain transition ${
            owned
              ? "drop-shadow-[0_8px_12px_rgba(0,0,0,0.35)]"
              : shinyUnavailable
                ? "grayscale opacity-20"
                : "grayscale opacity-35"
          } ${isSearchFocus ? "scale-125" : "scale-110 group-hover:scale-125"}`}
          loading="lazy"
        />
      </div>

      <div className="absolute bottom-1 left-1 right-4 z-10 truncate text-center text-[10px] font-black leading-none text-[#f3f0ff] drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
        {compactName}
      </div>
    </button>
  );
}

function TemplateInfoButton({
  entry,
  gameName,
}: {
  entry: LivingDexEntry;
  gameName: string;
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { data: encounters, isLoading } = useEncounters(
    open ? entry.speciesId : null,
  );
  const locations = (encounters ?? []).filter((loc) =>
    loc.games.includes(gameName),
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const POPOVER_WIDTH = 176;
  const POPOVER_MAX_HEIGHT = 160;
  const popoverStyle = (() => {
    if (!anchor) return null;
    const openUpward = anchor.bottom + POPOVER_MAX_HEIGHT > window.innerHeight;
    const left = Math.min(
      Math.max(4, anchor.right - POPOVER_WIDTH),
      window.innerWidth - POPOVER_WIDTH - 4,
    );
    return {
      left,
      width: POPOVER_WIDTH,
      ...(openUpward
        ? { bottom: window.innerHeight - anchor.top + 4 }
        : { top: anchor.bottom + 4 }),
    };
  })();

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!open) setAnchor(btnRef.current?.getBoundingClientRect() ?? null);
          setOpen((v) => !v);
        }}
        aria-label={`Where to find ${entry.displayName}`}
        title={`Where to find ${entry.displayName}`}
        className="absolute bottom-0.5 right-0.5 z-30 grid h-3.5 w-3.5 place-items-center rounded bg-[#0d2a35] text-[#67d9ff] shadow-[0_0_0_1px_rgba(0,0,0,0.4)] transition hover:bg-[#123847]"
      >
        <Info className="h-2.5 w-2.5" />
      </button>
      {open &&
        popoverStyle &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            style={{ position: "fixed", ...popoverStyle }}
            className="z-[9999] rounded-lg border border-[#27304c] bg-[#070914]/98 p-2 text-left shadow-[0_18px_45px_rgba(0,0,0,0.5)] backdrop-blur"
          >
            <p className="mb-1 truncate font-mono text-[8px] font-black uppercase tracking-[0.14em] text-[#67d9ff]">
              {entry.displayName} · {gameName}
            </p>
            {isLoading ? (
              <p className="font-mono text-[9px] text-[#53607c]">Loading…</p>
            ) : locations.length > 0 ? (
              <ul className="grid gap-1">
                {locations.map((loc) => (
                  <li
                    key={loc.location}
                    className="font-mono text-[9px] leading-tight text-[#d7c8ff]"
                  >
                    {loc.location}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-mono text-[9px] text-[#53607c]">
                No location data for this game.
              </p>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

function MiniSprite({
  slot,
  muted = false,
}: {
  slot: SlotData;
  muted?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={spriteForSlot(slot)}
      alt=""
      className={`h-8 w-8 shrink-0 object-contain ${muted ? "grayscale opacity-35" : ""}`}
      loading="lazy"
    />
  );
}

function Panel({
  title,
  icon,
  children,
  className = "",
  compact = false,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <section
      className={`overflow-hidden rounded-lg border border-[#293152] bg-[#090c18]/92 shadow-[0_18px_45px_rgba(0,0,0,0.35)] ${className}`}
    >
      <div
        className={`flex shrink-0 items-center gap-2 border-b border-[#1a2136] px-3 ${
          compact ? "h-8" : "h-10"
        }`}
      >
        {icon}
        <h2 className="font-mono text-[12px] font-black uppercase tracking-[0.18em] text-[#8fe388]">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function SearchBox({
  query,
  onQueryChange,
  matchCount,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  matchCount: number;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#53607c]" />
      <input
        type="text"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Find Pokemon"
        className="h-9 w-full rounded border border-[#1e2742] bg-[#060915] pl-8 pr-16 font-mono text-[12px] text-[#f4f1ff] placeholder:text-[#53607c] focus:border-[#9f7aea] focus:outline-none"
      />
      {query && (
        <button
          type="button"
          onClick={() => onQueryChange("")}
          className="absolute right-2 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded text-[#53607c] hover:bg-[#151b2d] hover:text-[#f4f1ff]"
          title="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {query && (
        <span className="absolute right-8 top-1/2 -translate-y-1/2 font-mono text-[9px] font-black text-[#f7c948]">
          {matchCount}
        </span>
      )}
    </div>
  );
}

export default function HomeOrganizerStream() {
  const [boxIndex, setBoxIndex] = useState(0);
  const [recentlyMarked, setRecentlyMarked] = useState<SlotData[]>([]);
  const [boxSource, setBoxSource] = useState<BoxSource>("home");
  const [selectedGameId, setSelectedGameId] = useState(DEFAULT_GAME_BOX_ID);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLayoutId, setSelectedLayoutId] = useState("");
  const [isRefreshingLayouts, setIsRefreshingLayouts] = useState(false);
  const [layoutSyncMessage, setLayoutSyncMessage] = useState<string | null>(
    null,
  );
  const [assistDetection, setAssistDetection] =
    useState<OrderingAssistDetection | null>(null);
  const [assistTargetName, setAssistTargetName] = useState("");
  const [assistTargetIsShiny, setAssistTargetIsShiny] = useState<
    boolean | null
  >(null);
  const [assistTargetGender, setAssistTargetGender] =
    useState<AssistGender | null>(null);
  const [assistSelectedKey, setAssistSelectedKey] = useState("");
  const [assistMessage, setAssistMessage] = useState("Waiting for assist.");
  const [assistResolving, setAssistResolving] = useState(false);
  const [assistJustMarked, setAssistJustMarked] = useState(false);
  const [assistEvoSpeciesId, setAssistEvoSpeciesId] = useState<number | null>(
    null,
  );
  const [assistCalibrating, setAssistCalibrating] = useState(false);
  const [assistCalibKey, setAssistCalibKey] = useState(0);
  const [, forceUpdate] = useState(0);
  const activeItemRef = useRef<HTMLButtonElement>(null);
  const processAssistEventRef = useRef<
    ((event: OrderingAssistStoredEvent) => void) | null
  >(null);
  const detectRef = useRef<
    (() => Promise<OrderingAssistDetection | null>) | null
  >(null);
  const assistClearTimerRef = useRef<number | null>(null);

  const assist = useOrderingAssist();
  const captureStatus = assist.status;
  const captureMessage = assist.message;

  const gameDex = usePokedexStore((s) => s.gameDex);
  const gameHomeBoxes = usePokedexStore((s) => s.gameHomeBoxes);
  const homeBoxLayouts = usePokedexStore((s) => s.homeBoxLayouts);
  const activeHomeBoxLayoutId = usePokedexStore((s) => s.activeHomeBoxLayoutId);
  const mergeProgressSnapshot = usePokedexStore((s) => s.mergeProgressSnapshot);
  const setActiveHomeBoxLayout = usePokedexStore(
    (s) => s.setActiveHomeBoxLayout,
  );
  const markHomeBoxLayoutSlot = usePokedexStore((s) => s.markHomeBoxLayoutSlot);
  const markInGameHomeBox = usePokedexStore((s) => s.markInGameHomeBox);

  const { data: allEntries, isLoading } = useLivingDexEntries();
  const gameBoxQuery = useGameHomeBoxDex(selectedGameId);
  const evolutionQuery = usePokemonEvolution(
    assistEvoSpeciesId ?? 0,
    assistEvoSpeciesId !== null,
  );
  const homeRulesQuery = useQuery({
    queryKey: ["game-home-box-form-rules", HOME_DEX_GAME_ID],
    queryFn: () =>
      api.getGameHomeBoxFormRules(HOME_DEX_GAME_ID).catch(() => []),
    staleTime: Infinity,
  });

  useEffect(() => {
    const id = window.setInterval(() => forceUpdate((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const homeRulesBySpecies = useMemo(
    () => buildRulesBySpecies(homeRulesQuery.data ?? []),
    [homeRulesQuery.data],
  );
  const selectableLayouts =
    homeBoxLayouts.length > 0 ? homeBoxLayouts : [UNSYNCED_PREVIEW_LAYOUT];
  const activeHomeBoxLayout =
    selectableLayouts.find((layout) => layout.id === selectedLayoutId) ??
    selectableLayouts.find((layout) => layout.id === activeHomeBoxLayoutId) ??
    selectableLayouts[0];
  const layoutProgressId = homeBoxLayouts.some(
    (layout) => layout.id === activeHomeBoxLayout.id,
  )
    ? activeHomeBoxLayout.id
    : "";
  const homeLayoutFlags = layoutProgressId
    ? (gameDex[layoutProgressId] ?? EMPTY_GAME_FLAGS)
    : EMPTY_GAME_FLAGS;
  const layoutMode = activeHomeBoxLayout.mode;
  const layoutShowCosmeticForms = activeHomeBoxLayout.showCosmeticForms;
  const layoutShowGenderForms = activeHomeBoxLayout.showGenderForms;
  const isPairedMode = layoutMode === "paired";
  const isShinyMode = layoutMode === "shiny";
  const selectedGame = getGameById(selectedGameId);
  const sourceName =
    boxSource === "game"
      ? (selectedGame?.name ?? selectedGameId)
      : activeHomeBoxLayout.name;
  const sourceMeta =
    boxSource === "game"
      ? "game dex boxes"
      : `${activeHomeBoxLayout.mode}${activeHomeBoxLayout.showCosmeticForms ? " / forms" : ""}${activeHomeBoxLayout.showGenderForms ? " / gender" : ""}`;
  const captureLabel = boxSource === "game" ? "Game Dex Boxes" : "Pokemon HOME";

  const getSlotOwned = useCallback(
    (slot: SlotData) =>
      isSlotOwned(
        slot,
        homeLayoutFlags[ownedKey(slot.entry.speciesId, slot.entry.formName)],
        slot.source === "game" && slot.gameId
          ? !!gameHomeBoxes[slot.gameId]?.[
              ownedKey(slot.entry.speciesId, slot.entry.formName)
            ]
          : false,
      ),
    [gameHomeBoxes, homeLayoutFlags],
  );

  const handleSourceChange = (source: BoxSource) => {
    setBoxSource(source);
    setBoxIndex(0);
    setSearchQuery("");
  };

  const handleGameChange = (gameId: string) => {
    setSelectedGameId(gameId);
    setBoxIndex(0);
    setSearchQuery("");
  };

  const handleLayoutChange = (layoutId: string) => {
    setSelectedLayoutId(layoutId);
    if (homeBoxLayouts.some((layout) => layout.id === layoutId)) {
      setActiveHomeBoxLayout(layoutId);
    }
    setBoxIndex(0);
  };

  const refreshLayouts = async () => {
    setIsRefreshingLayouts(true);
    setLayoutSyncMessage(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLayoutSyncMessage("No signed-in session in this browser source.");
        return;
      }

      const snapshot = await loadFromSupabase(user.id);
      if (!snapshot) {
        setLayoutSyncMessage("No remote progress snapshot found.");
        return;
      }

      mergeProgressSnapshot(snapshot);
      const layoutCount = snapshot.homeBoxLayouts?.length ?? 0;
      setLayoutSyncMessage(
        layoutCount > 0
          ? `Synced ${layoutCount} HOME layout${layoutCount === 1 ? "" : "s"}.`
          : "Synced, but no HOME layouts were found.",
      );
    } catch {
      setLayoutSyncMessage("Layout sync failed.");
    } finally {
      setIsRefreshingLayouts(false);
    }
  };

  const filteredEntries = useMemo(() => {
    if (!allEntries) return [];
    return [...allEntries]
      .filter((entry) => {
        if (
          !isHomeTrackedEntry(
            entry,
            layoutShowCosmeticForms,
            layoutShowGenderForms,
          )
        ) {
          return false;
        }
        const speciesRules = homeRulesBySpecies.get(entry.speciesId);
        if (!speciesRules?.size) return true;
        return !!speciesRules.get(formRuleKey(entry.formName))?.allowed;
      })
      .sort(compareLivingDexEntries);
  }, [
    allEntries,
    homeRulesBySpecies,
    layoutShowCosmeticForms,
    layoutShowGenderForms,
  ]);

  const isShinyTrackedEntry = useCallback(
    (entry: LivingDexEntry) => {
      const speciesRules = homeRulesBySpecies.get(entry.speciesId);
      const rule = speciesRules?.get(formRuleKey(entry.formName));
      if (rule) return rule.showShiny;
      return isShinyTargetEntry(entry);
    },
    [homeRulesBySpecies],
  );

  const hasShinySlot = useCallback(
    (entry: LivingDexEntry) => {
      const speciesRules = homeRulesBySpecies.get(entry.speciesId);
      if (!speciesRules?.size) return true;
      const rule = speciesRules.get(formRuleKey(entry.formName));
      return rule ? rule.showShiny : true;
    },
    [homeRulesBySpecies],
  );

  const allSlots = useMemo((): SlotData[] => {
    if (boxSource === "game") {
      return (gameBoxQuery.data ?? []).map((entry: GameHomeBoxEntry) => ({
        entry,
        isShiny: false,
        shinyAvailable: true,
        source: "game",
        gameId: selectedGameId,
        entryNumber: entry.entryNumber,
      }));
    }

    if (isPairedMode) {
      return filteredEntries.flatMap((entry) => [
        { entry, isShiny: false, shinyAvailable: true, source: "home" },
        ...(hasShinySlot(entry)
          ? [
              {
                entry,
                isShiny: true,
                shinyAvailable: isShinyTrackedEntry(entry),
                source: "home" as const,
              },
            ]
          : []),
      ]);
    }
    if (isShinyMode) {
      return filteredEntries.map((entry) => ({
        entry,
        isShiny: true,
        shinyAvailable: isShinyTrackedEntry(entry),
        source: "home",
      }));
    }
    return filteredEntries.map((entry) => ({
      entry,
      isShiny: false,
      shinyAvailable: true,
      source: "home",
    }));
  }, [
    boxSource,
    filteredEntries,
    gameBoxQuery.data,
    hasShinySlot,
    isPairedMode,
    isShinyMode,
    isShinyTrackedEntry,
    selectedGameId,
  ]);

  const boxes = useMemo(() => buildSlotBoxes(allSlots), [allSlots]);
  const totalBoxes = boxes.length;
  const boxLabels = useMemo(
    () =>
      boxes.map((box) => {
        const slots = box.filter((s): s is SlotData => s !== null);
        if (!slots.length) return "";
        const first = slotRangeNumber(slots[0]);
        const last = slotRangeNumber(slots[slots.length - 1]);
        return first === last ? `Dex ${first}` : `Dex ${first}–${last}`;
      }),
    [boxes],
  );
  const safeIndex = Math.min(boxIndex, Math.max(0, totalBoxes - 1));
  const currentBox = useMemo(
    () => boxes[safeIndex] ?? EMPTY_BOX,
    [boxes, safeIndex],
  );
  const currentSlots = useMemo(
    () => currentBox.filter((slot): slot is SlotData => slot !== null),
    [currentBox],
  );

  const boxStats = useMemo<BoxStat[]>(
    () =>
      boxes.map((box) => {
        const slots = box.filter((slot): slot is SlotData => slot !== null);
        const trackableSlots = slots.filter(isSlotTrackable);
        const owned = slots.filter(getSlotOwned).length;
        return { total: trackableSlots.length, owned };
      }),
    [boxes, getSlotOwned],
  );

  const positionedSlots = useMemo<PositionedSlot[]>(
    () => currentBox.flatMap((slot, index) => (slot ? [{ slot, index }] : [])),
    [currentBox],
  );

  const missingInBox = useMemo(
    () =>
      positionedSlots.filter(
        ({ slot }) => isSlotTrackable(slot) && !getSlotOwned(slot),
      ),
    [getSlotOwned, positionedSlots],
  );

  const trackableInBox = currentSlots.filter(isSlotTrackable);
  const ownedInBox = trackableInBox.length - missingInBox.length;
  const boxPct =
    trackableInBox.length > 0 ? (ownedInBox / trackableInBox.length) * 100 : 0;
  const boxRangeLabel = currentSlots.length
    ? `${slotRangeNumber(currentSlots[0])} to ${slotRangeNumber(currentSlots[currentSlots.length - 1])}`
    : "empty";

  const totalOwned = useMemo(
    () => allSlots.filter(getSlotOwned).length,
    [allSlots, getSlotOwned],
  );
  const totalTrackableSlots = allSlots.filter(isSlotTrackable).length;
  const overallPct =
    totalTrackableSlots > 0 ? (totalOwned / totalTrackableSlots) * 100 : 0;

  const searchNorm = searchQuery.trim().toLowerCase();
  const allPositionedSlots = useMemo(
    () =>
      boxes.flatMap((box, boxIndex) =>
        box.flatMap((slot, slotIndex) =>
          slot ? [{ slot, boxIndex, slotIndex }] : [],
        ),
      ),
    [boxes],
  );

  const assistMatches = useMemo<AssistMatch[]>(() => {
    if (!assistTargetName) return [];
    const shinyFiltered = allPositionedSlots.filter(({ slot }) => {
      if (assistTargetIsShiny === null) return true;
      return slot.isShiny === assistTargetIsShiny;
    });
    // Fall back to all slots when the layout has no shiny slots (e.g. standard mode)
    const shinyMatches =
      shinyFiltered.length > 0 ? shinyFiltered : allPositionedSlots;
    const exactMatches = shinyMatches.filter(({ slot }) =>
      slotMatchesAssistName(slot, assistTargetName),
    );
    const baseMatches =
      exactMatches.length > 0
        ? exactMatches
        : (() => {
            const scored = shinyMatches.map((match) => ({
              ...match,
              distance: fuzzyNameDistance(match.slot, assistTargetName),
            }));
            const best = Math.min(...scored.map((match) => match.distance));
            if (best > fuzzyNameLimit(assistTargetName)) return [];
            return scored.filter((match) => match.distance === best);
          })();
    return filterAssistMatchesByGender(baseMatches, assistTargetGender).map(
      ({ slot, boxIndex, slotIndex }) => ({
        slot,
        boxIndex,
        slotIndex,
        key: slotKey(slot),
        owned: getSlotOwned(slot),
      }),
    );
  }, [
    allPositionedSlots,
    assistTargetGender,
    assistTargetIsShiny,
    assistTargetName,
    getSlotOwned,
  ]);

  const assistHighlightedKeys = useMemo(
    () => new Set(assistMatches.map((match) => match.key)),
    [assistMatches],
  );
  const selectedAssistMatch =
    assistMatches.find((match) => match.key === assistSelectedKey) ??
    assistMatches[0] ??
    null;
  const assistMatchNeedsHome = (() => {
    if (!selectedAssistMatch || !layoutProgressId) return false;
    const key = ownedKey(
      selectedAssistMatch.slot.entry.speciesId,
      selectedAssistMatch.slot.entry.formName,
    );
    return !homeLayoutFlags[key]?.owned;
  })();
  const shouldShowAssistCandidates = assistMatches.length > 2;

  type AssistAdvice =
    | { type: "release" }
    | { type: "evolve"; into: SlotData[] };
  const assistAdvice = useMemo((): AssistAdvice | null => {
    if (!selectedAssistMatch?.owned) return null;
    if (!evolutionQuery.data) return { type: "release" };
    const speciesId = selectedAssistMatch.slot.entry.speciesId;
    const allStages = evolutionQuery.data.flat();
    // BFS collecting all reachable descendants, skipping evolutions that
    // require a gender the detected Pokémon doesn't have.
    // PokéAPI: requiredGender 1 = female-only, 2 = male-only.
    const sourceGender = assistTargetGender; // "female" | "male" | null
    const descendantIds = new Set<number>();
    const queue = [speciesId];
    while (queue.length) {
      const current = queue.shift()!;
      for (const stage of allStages) {
        if (stage.evolvesFromId !== current) continue;
        if (descendantIds.has(stage.id)) continue;
        if (sourceGender !== null && stage.requiredGender !== null) {
          const needsFemale = stage.requiredGender === 1;
          if (needsFemale && sourceGender !== "female") continue;
          if (!needsFemale && sourceGender !== "male") continue;
        }
        descendantIds.add(stage.id);
        queue.push(stage.id);
      }
    }
    if (!descendantIds.size) return { type: "release" };
    const isShinySource = selectedAssistMatch.slot.isShiny;
    const sourceFormName = selectedAssistMatch.slot.entry.formName;

    // Group unowned candidate slots by species so we can apply form priority.
    const candidatesBySpecies = new Map<number, SlotData[]>();
    for (const s of allSlots) {
      if (!descendantIds.has(s.entry.speciesId)) continue;
      if (s.isShiny !== isShinySource) continue;
      if (getSlotOwned(s)) continue;
      const bucket = candidatesBySpecies.get(s.entry.speciesId) ?? [];
      bucket.push(s);
      candidatesBySpecies.set(s.entry.speciesId, bucket);
    }

    // For each target species, pick the right form:
    //   base-form source  → prefer base form (null); fallback to all forms
    //                       (covers Rockruff → all three Lycanroc forms)
    //   regional source   → prefer matching form; fallback to base form
    // This prevents suggesting cap Pikachus when evolving a Pichu.
    const seen = new Set<string>();
    const missingEvoSlots: SlotData[] = [];
    for (const slots of candidatesBySpecies.values()) {
      let chosen: SlotData[];
      if (sourceFormName === null) {
        const base = slots.filter((s) => s.entry.formName === null);
        chosen = base.length > 0 ? base : slots;
      } else {
        const sameForm = slots.filter((s) => s.entry.formName === sourceFormName);
        const base = slots.filter((s) => s.entry.formName === null);
        chosen = sameForm.length > 0 ? sameForm : base.length > 0 ? base : slots;
      }
      for (const s of chosen) {
        const key = ownedKey(s.entry.speciesId, s.entry.formName);
        if (seen.has(key)) continue;
        seen.add(key);
        missingEvoSlots.push(s);
      }
    }

    return missingEvoSlots.length > 0
      ? { type: "evolve", into: missingEvoSlots }
      : { type: "release" };
  }, [allSlots, assistTargetGender, evolutionQuery.data, getSlotOwned, selectedAssistMatch]);

  const searchHighlightedKeys = useMemo(() => {
    if (!searchNorm) return new Set<string>();
    return new Set(
      allPositionedSlots
        .filter(({ slot }) => {
          const normalizedNumber = searchNorm.replace(/^#0*/, "");
          return (
            slot.entry.displayName.toLowerCase().includes(searchNorm) ||
            String(slot.entry.speciesId).startsWith(normalizedNumber) ||
            String(slot.entry.speciesId)
              .padStart(4, "0")
              .includes(normalizedNumber) ||
            (slot.entryNumber !== undefined &&
              String(slot.entryNumber).includes(normalizedNumber))
          );
        })
        .map(({ slot }) => slotKey(slot)),
    );
  }, [allPositionedSlots, searchNorm]);

  const highlightedKeys = useMemo(
    () => new Set([...searchHighlightedKeys, ...assistHighlightedKeys]),
    [assistHighlightedKeys, searchHighlightedKeys],
  );

  const searchResults = useMemo<SearchResult[]>(() => {
    if (!searchNorm) return [];
    return allPositionedSlots
      .filter(({ slot }) => searchHighlightedKeys.has(slotKey(slot)))
      .slice(0, 8)
      .map(({ slot, boxIndex, slotIndex }) => ({
        slot,
        boxIndex,
        slotIndex,
        owned: getSlotOwned(slot),
      }));
  }, [allPositionedSlots, getSlotOwned, searchHighlightedKeys, searchNorm]);

  const boxHasMatch = useMemo(
    () =>
      boxes.map((box) =>
        box.some((slot) => slot !== null && highlightedKeys.has(slotKey(slot))),
      ),
    [boxes, highlightedKeys],
  );

  const updateSearchQuery = (value: string) => {
    setSearchQuery(value);
    const normalized = value.trim().toLowerCase();
    if (!normalized) return;

    const firstMatch = allPositionedSlots.find(({ slot }) => {
      const nameMatch = slot.entry.displayName
        .toLowerCase()
        .includes(normalized);
      const numberMatch = String(slot.entry.speciesId).startsWith(
        normalized.replace(/^#0*/, ""),
      );
      return nameMatch || numberMatch;
    });
    if (firstMatch) setBoxIndex(firstMatch.boxIndex);
  };

  const resolveAssistMatches = useCallback(
    (
      name: string,
      isShiny: boolean | null,
      gender: AssistGender | null,
    ): AssistMatch[] => {
      const shinyFiltered = allPositionedSlots.filter(({ slot }) => {
        if (isShiny === null) return true;
        return slot.isShiny === isShiny;
      });
      // Fall back to all slots when the layout has no shiny slots (e.g. standard mode)
      const shinyMatches =
        shinyFiltered.length > 0 ? shinyFiltered : allPositionedSlots;
      const exactMatches = shinyMatches.filter(({ slot }) =>
        slotMatchesAssistName(slot, name),
      );
      const baseMatches =
        exactMatches.length > 0
          ? exactMatches
          : (() => {
              const scored = shinyMatches.map((match) => ({
                ...match,
                distance: fuzzyNameDistance(match.slot, name),
              }));
              const best = Math.min(...scored.map((match) => match.distance));
              if (best > fuzzyNameLimit(name)) return [];
              return scored.filter((match) => match.distance === best);
            })();
      return filterAssistMatchesByGender(baseMatches, gender).map(
        ({ slot, boxIndex, slotIndex }) => ({
          slot,
          boxIndex,
          slotIndex,
          key: slotKey(slot),
          owned: getSlotOwned(slot),
        }),
      );
    },
    [allPositionedSlots, getSlotOwned],
  );

  const chooseAssistMatch = useCallback((matches: AssistMatch[]) => {
    return matches.find((match) => !match.owned) ?? matches[0] ?? null;
  }, []);

  const confirmAssistName = useCallback(
    (name: string, isShiny: boolean | null, gender: AssistGender | null) => {
      if (assistClearTimerRef.current !== null) {
        window.clearTimeout(assistClearTimerRef.current);
        assistClearTimerRef.current = null;
      }
      const matches = resolveAssistMatches(name, isShiny, gender);
      setAssistTargetIsShiny(isShiny);
      setAssistTargetGender(gender);

      const selected = chooseAssistMatch(matches);
      if (!selected) {
        setAssistTargetName(name);
        setAssistSelectedKey("");
        setAssistMessage(`No destination found for ${name}.`);
        return;
      }

      const canonicalName = compactSlotName(selected.slot.entry);
      setAssistTargetName(canonicalName);
      setAssistSelectedKey(selected.key);
      setBoxIndex(selected.boxIndex);
      setAssistEvoSpeciesId(
        selected.owned ? selected.slot.entry.speciesId : null,
      );
      setAssistMessage(
        matches.length === 1
          ? `${canonicalName} -> ${boxLabels[selected.boxIndex] ?? `Box ${selected.boxIndex + 1}`}, Slot ${selected.slotIndex + 1}.`
          : `${canonicalName} has ${matches.length} possible slots.`,
      );
    },
    [boxLabels, chooseAssistMatch, resolveAssistMatches],
  );

  const markAssistSlot = useCallback(
    (match: AssistMatch): boolean => {
      const { slot } = match;
      if (!isSlotTrackable(slot)) return false;

      if (slot.source === "game") {
        if (!slot.gameId) return false;
        markInGameHomeBox(
          slot.entry.speciesId,
          slot.gameId,
          slot.entry.formName,
        );
        return true;
      }

      if (slot.isShiny) {
        if (!slot.shinyAvailable) return false;
        if (!layoutProgressId) return false;
        markHomeBoxLayoutSlot(
          layoutProgressId,
          slot.entry.speciesId,
          slot.entry.formName,
          true,
        );
        return true;
      }

      if (!layoutProgressId) return false;
      markHomeBoxLayoutSlot(
        layoutProgressId,
        slot.entry.speciesId,
        slot.entry.formName,
        false,
      );
      return true;
    },
    [layoutProgressId, markHomeBoxLayoutSlot, markInGameHomeBox],
  );

  const markSelectedAssistTarget = useCallback(
    (fallbackDetection?: OrderingAssistDetection | null) => {
      const fallbackName = fallbackDetection?.name ?? assistTargetName;
      const fallbackIsShiny =
        fallbackDetection?.isShiny !== undefined
          ? (fallbackDetection.isShiny ?? null)
          : assistTargetIsShiny;
      const fallbackGender =
        fallbackDetection?.gender !== undefined
          ? (fallbackDetection.gender ?? null)
          : assistTargetGender;
      const matches =
        assistMatches.length > 0
          ? assistMatches
          : fallbackName
            ? resolveAssistMatches(
                fallbackName,
                fallbackIsShiny,
                fallbackGender,
              )
            : [];
      const selected =
        matches.find((match) => match.key === assistSelectedKey) ??
        chooseAssistMatch(matches);

      if (!selected) {
        setAssistMessage("No confirmed assist target to mark.");
        return;
      }

      const marked = markAssistSlot(selected);
      if (marked) {
        setRecentlyMarked((prev) => [selected.slot, ...prev].slice(0, 8));
        setAssistJustMarked(true);
      }
      setAssistSelectedKey(selected.key);
      setBoxIndex(selected.boxIndex);
      setAssistMessage(
        marked
          ? `Marked ${compactSlotName(selected.slot.entry)} in ${boxLabels[selected.boxIndex] ?? `Box ${selected.boxIndex + 1}`}, Slot ${selected.slotIndex + 1}.`
          : `${compactSlotName(selected.slot.entry)} cannot be marked from this slot.`,
      );
      if (marked) {
        if (assistClearTimerRef.current !== null) {
          window.clearTimeout(assistClearTimerRef.current);
        }
        assistClearTimerRef.current = window.setTimeout(() => {
          setAssistTargetName("");
          setAssistTargetIsShiny(null);
          setAssistTargetGender(null);
          setAssistSelectedKey("");
          setAssistResolving(false);
          setAssistJustMarked(false);
          setAssistEvoSpeciesId(null);
          assistClearTimerRef.current = null;
        }, 1100);
      }
    },
    [
      assistMatches,
      assistSelectedKey,
      assistTargetGender,
      assistTargetIsShiny,
      assistTargetName,
      boxLabels,
      chooseAssistMatch,
      markAssistSlot,
      resolveAssistMatches,
    ],
  );

  const processAssistEvent = useCallback(
    (event: OrderingAssistStoredEvent) => {
      if (event.type === "detected" && event.detection) {
        setAssistDetection(event.detection);
        setAssistResolving(true);
        setAssistMessage("Resolving detected Pokemon.");
        return;
      }

      if (event.type === "confirm-current") {
        const name = event.detection?.name ?? assistDetection?.name;
        const isShiny =
          event.detection?.isShiny !== undefined
            ? (event.detection.isShiny ?? null)
            : (assistDetection?.isShiny ?? null);
        const gender =
          event.detection?.gender !== undefined
            ? (event.detection.gender ?? null)
            : (assistDetection?.gender ?? null);
        if (!name) {
          setAssistMessage("Nothing detected to confirm.");
          return;
        }
        setAssistDetection(event.detection ?? assistDetection);
        setAssistResolving(false);
        confirmAssistName(name, isShiny, gender);
        return;
      }

      if (event.type === "mark-ordered") {
        setAssistResolving(false);
        markSelectedAssistTarget(event.detection);
        return;
      }

      if (event.type === "clear") {
        if (assistClearTimerRef.current !== null) {
          window.clearTimeout(assistClearTimerRef.current);
          assistClearTimerRef.current = null;
        }
        setAssistTargetName("");
        setAssistTargetIsShiny(null);
        setAssistTargetGender(null);
        setAssistSelectedKey("");
        setAssistResolving(false);
        setAssistJustMarked(false);
        setAssistEvoSpeciesId(null);
        setAssistMessage("Assist target cleared.");
        return;
      }
    },
    [assistDetection, confirmAssistName, markSelectedAssistTarget],
  );

  useLayoutEffect(() => {
    processAssistEventRef.current = processAssistEvent;
    detectRef.current = assist.detect;
  });

  useEffect(() => {
    if (captureStatus !== "ready") return;
    const { detectKey, markKey, clearKey } = assist.config;

    const handleKeyDown = async (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      if (e.key === detectKey) {
        e.preventDefault();
        const detection = await detectRef.current?.();
        processAssistEventRef.current?.({
          id: Date.now(),
          type: "confirm-current",
          detection: detection ?? undefined,
          createdAt: new Date().toISOString(),
        });
        return;
      }

      if (e.key === markKey) {
        e.preventDefault();
        processAssistEventRef.current?.({
          id: Date.now(),
          type: "mark-ordered",
          createdAt: new Date().toISOString(),
        });
        return;
      }

      if (e.key === clearKey) {
        e.preventDefault();
        processAssistEventRef.current?.({
          id: Date.now(),
          type: "clear",
          createdAt: new Date().toISOString(),
        });
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [captureStatus, assist.config]);

  useEffect(() => {
    return () => {
      if (assistClearTimerRef.current !== null) {
        window.clearTimeout(assistClearTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [safeIndex]);

  const timeStr = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const [stripStartBase, setStripStart] = useState(0);

  // The strip's own bounds only depend on how many boxes exist, so the
  // page arrows can scroll it freely in either direction.
  const stripStartMax = Math.max(0, totalBoxes - STRIP_PAGE_SIZE);
  const stripStart = Math.max(0, Math.min(stripStartBase, stripStartMax));
  const stripEnd = Math.min(stripStart + STRIP_PAGE_SIZE, totalBoxes);

  // Separately, snap the strip back into view whenever the selected box
  // moves outside the currently visible page (e.g. via search or jump nav).
  useEffect(() => {
    setStripStart((current) => {
      if (safeIndex < current) return safeIndex;
      if (safeIndex > current + STRIP_PAGE_SIZE - 1) {
        return Math.max(0, safeIndex - STRIP_PAGE_SIZE + 1);
      }
      return current;
    });
  }, [safeIndex]);
  const visibleBoxStats = boxStats.slice(stripStart, stripEnd);

  const prev = () => setBoxIndex((index) => Math.max(0, index - 1));
  const next = () =>
    setBoxIndex((index) => Math.min(totalBoxes - 1, index + 1));

  if (isLoading || (boxSource === "game" && gameBoxQuery.isLoading)) {
    return (
      <div className="grid h-screen place-items-center bg-[#070914]">
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-[#8fe388]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#8fe388]" />
          Loading Amanita terminal
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[radial-gradient(circle_at_20%_0%,rgba(159,122,234,0.16),transparent_28%),linear-gradient(135deg,#050710_0%,#0a1020_48%,#070914_100%)] p-3 text-[#f4f1ff]">
      {assistCalibrating && (
        <AssistCalibration
          key={assistCalibKey}
          getFrameCanvas={assist.getFrameCanvas}
          captureFrame={assist.captureFrame}
          config={assist.config}
          onSave={(cfg) => {
            assist.setConfig(cfg);
            setAssistCalibKey((k) => k + 1);
          }}
          onClose={() => setAssistCalibrating(false)}
        />
      )}
      <div className="grid h-full min-h-0 grid-rows-[52px_minmax(0,1fr)_56px] gap-2">
        <header className="grid min-h-0 grid-cols-[360px_minmax(0,1fr)_360px] items-center rounded-lg border border-[#2f2750] bg-[#090b18]/92 px-4 shadow-[0_12px_38px_rgba(0,0,0,0.35)]">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src="/brand/brand.svg"
              alt="Amanita"
              width={152}
              height={34}
              className="h-8 w-auto"
              priority
            />
            <div className="h-7 w-px bg-[#2f2750]" />
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-[#bda9ff]">
                Research Terminal
              </p>
              <p className="truncate font-mono text-[9px] uppercase tracking-[0.18em] text-[#53607c]">
                GPS for Pokemon HOME sorting
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={prev}
              disabled={safeIndex === 0}
              className="grid h-8 w-8 place-items-center rounded border border-[#27304c] bg-[#070a15] text-[#8ca0c9] transition hover:border-[#8fe388] hover:text-[#8fe388] disabled:opacity-30"
              title="Previous box"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 rounded border border-[#27304c] bg-[#060915] px-4 py-2">
              <LayoutGrid className="h-4 w-4 text-[#8fe388]" />
              <span className="font-mono text-sm font-black uppercase tracking-[0.16em] text-[#8fe388]">
                BOX {safeIndex + 1}
              </span>
              <span className="font-mono text-sm text-[#53607c]">of</span>
              <span className="font-mono text-sm font-black uppercase tracking-[0.16em] text-[#8ca0c9]">
                {totalBoxes}
              </span>
            </div>
            <button
              type="button"
              onClick={next}
              disabled={safeIndex === totalBoxes - 1}
              className="grid h-8 w-8 place-items-center rounded border border-[#27304c] bg-[#070a15] text-[#8ca0c9] transition hover:border-[#8fe388] hover:text-[#8fe388] disabled:opacity-30"
              title="Next box"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex min-w-0 items-center justify-end gap-4 font-mono text-[12px]">
            <div className="flex items-center gap-2 rounded border border-[#27304c] bg-[#060915] px-3 py-1.5">
              <Gamepad2 className="h-4 w-4 text-[#bda9ff]" />
              <span className="text-[#8ca0c9]">TRAINER:</span>
              <span className="font-black text-[#d7c8ff]">MOONRACCOON</span>
            </div>
            <div className="flex items-center gap-2 text-[#8ca0c9]">
              <Clock3 className="h-4 w-4" />
              <time>{timeStr}</time>
            </div>
          </div>
        </header>

        <main className="grid min-h-0 grid-cols-[minmax(0,1fr)_430px] gap-2">
          <section className="min-h-0 overflow-hidden rounded-lg border border-[#2f2750] bg-[#060813]/88 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
            <div className="flex h-11 items-center justify-between border-b border-[#1a2136] bg-[#f5f7f1] px-4 text-[#10131d]">
              <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded border-2 border-[#ff8a00] text-[#ff8a00]">
                  <Gamepad2 className="h-4 w-4" />
                </div>
                <span className="text-lg font-black uppercase tracking-wide text-[#ff8a00]">
                  {captureLabel}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#8b95a5]">
                <LayoutGrid className="h-3 w-3" />
                <span>Box Guide Mode</span>
              </div>
            </div>
            <div className="relative h-[calc(100%-44px)] bg-[#03050d]/35">
              <div className="absolute inset-3 rounded border border-[#8fe388]/30 bg-transparent shadow-[inset_0_0_42px_rgba(143,227,136,0.08)]" />
              <div className="absolute left-3 top-3 h-9 w-9 border-l-2 border-t-2 border-[#8fe388]/70" />
              <div className="absolute right-3 top-3 h-9 w-9 border-r-2 border-t-2 border-[#8fe388]/70" />
              <div className="absolute bottom-3 left-3 h-9 w-9 border-b-2 border-l-2 border-[#8fe388]/70" />
              <div className="absolute bottom-3 right-3 h-9 w-9 border-b-2 border-r-2 border-[#8fe388]/70" />
              <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded border border-[#27304c] bg-[#060915]/92 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[#8ca0c9]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#8fe388]" />
                HOME window
              </div>
            </div>
          </section>

          <aside className="grid min-h-0 grid-rows-[auto_auto_auto_minmax(0,1fr)_56px] gap-1.5">
            <section className="rounded-lg border border-[#2f2750] bg-[#090c18]/94 px-3 py-2 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
              <div className="grid grid-cols-[minmax(0,1fr)_118px] items-center gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded border border-[#1d7aa2] bg-[#071627] text-[#67d9ff]">
                    <Sprout className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h1 className="truncate font-mono text-xl font-black leading-tight text-[#d7c8ff]">
                      Box {safeIndex + 1} - {boxRangeLabel}
                    </h1>
                    <p className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-[#687696]">
                      {sourceName} / {sourceMeta}
                    </p>
                  </div>
                </div>
                <div className="min-w-0 rounded border border-[#27304c] bg-[#060915] px-2 py-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-mono text-[9px] font-black uppercase tracking-[0.14em] text-[#8fe388]">
                      Progress
                    </p>
                    <p className="font-mono text-sm font-black">
                      {ownedInBox}
                      <span className="text-[11px] font-normal text-[#7d89a8]">
                        /{trackableInBox.length}
                      </span>
                    </p>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded bg-[#27304c]">
                    <div
                      className="h-full rounded bg-[#8fe388] transition-all duration-500"
                      style={{ width: `${boxPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-[#2f2750] bg-[#090c18]/94 p-2.5">
              <SearchBox
                query={searchQuery}
                onQueryChange={updateSearchQuery}
                matchCount={searchHighlightedKeys.size}
              />
              <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
                <span className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#687696]">
                  Source
                </span>
                <select
                  value={boxSource}
                  onChange={(event) =>
                    handleSourceChange(event.target.value as BoxSource)
                  }
                  className="h-8 min-w-0 rounded border border-[#27304c] bg-[#060915] px-2 font-mono text-[11px] font-black text-[#d7c8ff] outline-none transition focus:border-[#8fe388]"
                >
                  <option value="home">HOME layouts</option>
                  <option value="game">Game National / DLC boxes</option>
                </select>
                <button
                  type="button"
                  onClick={refreshLayouts}
                  disabled={isRefreshingLayouts || boxSource !== "home"}
                  className="grid h-8 w-8 place-items-center rounded border border-[#27304c] bg-[#060915] text-[#8ca0c9] transition hover:border-[#8fe388] hover:text-[#8fe388] disabled:opacity-45"
                  title={
                    boxSource === "home"
                      ? "Refresh HOME layouts from Supabase"
                      : "Game boxes load from app data"
                  }
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isRefreshingLayouts ? "animate-spin" : ""}`}
                  />
                </button>
              </div>

              <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
                <span className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#687696]">
                  {boxSource === "home" ? "Layout" : "Dex"}
                </span>
                {boxSource === "home" ? (
                  <select
                    value={activeHomeBoxLayout.id}
                    onChange={(event) => handleLayoutChange(event.target.value)}
                    className="h-8 min-w-0 rounded border border-[#27304c] bg-[#060915] px-2 font-mono text-[11px] font-black text-[#d7c8ff] outline-none transition focus:border-[#8fe388]"
                  >
                    {selectableLayouts.map((layout) => (
                      <option key={layout.id} value={layout.id}>
                        {layout.name} - {layout.mode}
                        {layout.showCosmeticForms ? " + forms" : ""}
                        {layout.showGenderForms ? " + gender" : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={selectedGameId}
                    onChange={(event) => handleGameChange(event.target.value)}
                    className="h-8 min-w-0 rounded border border-[#27304c] bg-[#060915] px-2 font-mono text-[11px] font-black text-[#d7c8ff] outline-none transition focus:border-[#8fe388]"
                  >
                    {GAME_LIST.map((game) => (
                      <option key={game.id} value={game.id}>
                        {game.dlcOf ? "DLC - " : ""}
                        {game.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {boxSource === "home" && homeBoxLayouts.length === 0 && (
                <p className="mt-2 font-mono text-[10px] text-[#687696]">
                  No saved HOME layouts in this browser source yet.
                </p>
              )}
              {boxSource === "home" && layoutSyncMessage && (
                <p className="mt-1 font-mono text-[10px] text-[#8ca0c9]">
                  {layoutSyncMessage}
                </p>
              )}
              {searchNorm && (
                <div className="mt-2 grid gap-1.5">
                  {searchResults.length > 0 ? (
                    searchResults
                      .slice(0, 3)
                      .map(({ slot, boxIndex, slotIndex, owned }) => (
                        <button
                          key={`${slotKey(slot)}-${boxIndex}-${slotIndex}`}
                          type="button"
                          onClick={() => setBoxIndex(boxIndex)}
                          className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded border border-[#27304c] bg-[#060915] px-2 py-1.5 text-left transition hover:border-[#f7c948]"
                        >
                          <MiniSprite slot={slot} muted={!owned} />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-black text-[#f4f1ff]">
                              {compactSlotName(slot.entry)}
                              {slot.isShiny && (
                                <span className="ml-1 font-mono text-[9px] text-[#f7c948]">
                                  ★
                                </span>
                              )}
                              {isFemaleForm(slot.entry) && (
                                <span className="ml-1 font-mono text-[9px] text-[#ff9ee8]">
                                  ♀
                                </span>
                              )}
                            </p>
                            <p className="font-mono text-[9px] text-[#687696]">
                              {slot.isShiny && !slot.shinyAvailable
                                ? "unavailable"
                                : owned
                                  ? "marked"
                                  : "missing"}
                            </p>
                          </div>
                          <p className="text-right font-mono text-[10px] font-black text-[#f7c948]">
                            {boxLabels[boxIndex] ?? `B${boxIndex + 1}`} S
                            {slotIndex + 1}
                          </p>
                        </button>
                      ))
                  ) : (
                    <p className="rounded border border-[#27304c] bg-[#060915] px-2 py-2 font-mono text-[10px] text-[#687696]">
                      No slot in this layout matches that search.
                    </p>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-lg border border-[#2f2750] bg-[#090c18]/94 p-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      captureStatus === "ready"
                        ? "bg-[#8fe388]"
                        : captureStatus === "detecting" ||
                            captureStatus === "initializing-ocr"
                          ? "bg-[#f7c948] animate-pulse"
                          : captureStatus === "requesting"
                            ? "bg-[#8ca0c9] animate-pulse"
                            : "bg-[#53607c]"
                    }`}
                  />
                  <p className="font-mono text-[11px] font-black uppercase tracking-[0.18em] text-[#8fe388]">
                    Ordering Assist
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#687696]">
                    {captureStatus === "ready"
                      ? "Ready"
                      : captureStatus === "detecting"
                        ? "Detecting"
                        : captureStatus === "initializing-ocr"
                          ? "Loading OCR"
                          : captureStatus === "requesting"
                            ? "Waiting"
                            : captureStatus === "error"
                              ? "Error"
                              : ""}
                  </span>
                  {captureStatus === "ready" ||
                  captureStatus === "detecting" ||
                  captureStatus === "initializing-ocr" ? (
                    <button
                      type="button"
                      onClick={assist.stopCapture}
                      className="rounded border border-[#ff8f8f] bg-[#120914] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-[#ff8f8f] transition hover:bg-[#2a0820]"
                    >
                      Stop
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void assist.startCapture()}
                      disabled={captureStatus === "requesting"}
                      className="rounded border border-[#8fe388] bg-[#07140f] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-[#8fe388] transition hover:bg-[#0e2519] disabled:opacity-50"
                    >
                      Start
                    </button>
                  )}
                </div>
              </div>

              {captureStatus !== "idle" && (
                <>
                  {/* Assist status message from hook (stream/OCR state) */}
                  {captureStatus !== "ready" && (
                    <p className="mt-1.5 truncate font-mono text-[9px] text-[#8ca0c9]">
                      {captureMessage}
                    </p>
                  )}

                  <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded border border-[#27304c] bg-[#060915] px-2 py-1.5">
                    <div className="min-w-0">
                      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#687696]">
                        {assistTargetName ? "Target" : "Detected"}
                      </p>
                      <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                        {selectedAssistMatch ? (
                          <MiniSprite
                            slot={selectedAssistMatch.slot}
                            muted={selectedAssistMatch.owned}
                          />
                        ) : null}
                        {assistResolving && !assistTargetName && (
                          <div className="flex items-center gap-1.5 text-sm font-black text-[#8ca0c9]">
                            <span>Resolving</span>
                            <span className="flex gap-0.5">
                              <span className="h-1 w-1 animate-bounce rounded-full bg-[#8ca0c9] [animation-delay:-0.2s]" />
                              <span className="h-1 w-1 animate-bounce rounded-full bg-[#8ca0c9] [animation-delay:-0.1s]" />
                              <span className="h-1 w-1 animate-bounce rounded-full bg-[#8ca0c9]" />
                            </span>
                          </div>
                        )}
                        <p
                          className={`truncate text-sm font-black ${
                            assistResolving && !assistTargetName
                              ? "hidden"
                              : assistTargetName
                                ? "text-[#f7c948]"
                                : "text-[#f4f1ff]"
                          }`}
                        >
                          {assistTargetName ||
                            assistDetection?.name ||
                            "No signal"}
                          {(selectedAssistMatch?.slot.isShiny ||
                            (!assistTargetName &&
                              assistDetection?.isShiny)) && (
                            <span className="ml-1 text-[#f7c948]">★</span>
                          )}
                          {selectedAssistMatch &&
                            isFemaleForm(selectedAssistMatch.slot.entry) && (
                              <span className="ml-1 text-[#ff9ee8]">♀</span>
                            )}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {selectedAssistMatch && (
                        <span className="font-mono text-[10px] font-black text-[#f7c948]">
                          {boxLabels[selectedAssistMatch.boxIndex] ??
                            `B${selectedAssistMatch.boxIndex + 1}`}{" "}
                          S{selectedAssistMatch.slotIndex + 1}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => markSelectedAssistTarget(null)}
                        disabled={!selectedAssistMatch}
                        className="grid h-7 w-7 place-items-center rounded border border-[#27304c] bg-[#07140f] text-[#8fe388] transition hover:border-[#8fe388] disabled:opacity-35"
                        title="Mark ordered"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          processAssistEvent({
                            id: -1,
                            type: "clear",
                            createdAt: new Date().toISOString(),
                          })
                        }
                        disabled={!assistTargetName}
                        className="grid h-7 w-7 place-items-center rounded border border-[#27304c] bg-[#120914] text-[#ff8f8f] transition hover:border-[#ff8f8f] disabled:opacity-35"
                        title="Clear assist target"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-2 truncate font-mono text-[10px] text-[#8ca0c9]">
                    {assistMessage}
                  </p>

                  {assistAdvice && !assistJustMarked && (
                    <p
                      className={`mt-1 font-mono text-[10px] font-black ${
                        assistAdvice.type === "evolve"
                          ? "text-[#67d9ff]"
                          : "text-[#ff8f8f]"
                      }`}
                    >
                      {assistAdvice.type === "release"
                        ? "✕ Already marked"
                        : `→ Evolve into ${assistAdvice.into.map((s) => compactSlotName(s.entry)).join(" / ")}`}
                    </p>
                  )}
                  {assistAdvice?.type === "release" && !assistJustMarked && assistMatchNeedsHome && (
                    <p className="mt-1 font-mono text-[10px] font-black text-[#ff8c42]">
                      → Move to HOME before releasing!
                    </p>
                  )}

                  {/* Hotkey hint — only shown when ready */}
                  {captureStatus === "ready" && (
                    <p className="mt-1 font-mono text-[8px] text-[#53607c]">
                      {assist.config.detectKey} detect · {assist.config.markKey}{" "}
                      mark · {assist.config.clearKey} clear
                    </p>
                  )}

                  {/* Calibrate button */}
                  <button
                    type="button"
                    onClick={() => setAssistCalibrating(true)}
                    className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#53607c] transition hover:text-[#8ca0c9]"
                  >
                    ▼ Calibrate regions
                  </button>

                  {shouldShowAssistCandidates && (
                    <div className="mt-2 grid gap-1">
                      {assistMatches.slice(0, 4).map((match) => {
                        const selected = match.key === assistSelectedKey;
                        return (
                          <button
                            key={`${match.key}-${match.boxIndex}-${match.slotIndex}`}
                            type="button"
                            onClick={() => {
                              setAssistSelectedKey(match.key);
                              setBoxIndex(match.boxIndex);
                            }}
                            className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded border px-2 py-1 text-left transition ${
                              selected
                                ? "border-[#f7c948] bg-[#1a1405]"
                                : "border-[#27304c] bg-[#060915] hover:border-[#9f7aea]"
                            }`}
                          >
                            <MiniSprite slot={match.slot} muted={match.owned} />
                            <span className="truncate text-[11px] font-black text-[#f4f1ff]">
                              {compactSlotName(match.slot.entry)}
                              {match.slot.isShiny && (
                                <span className="ml-1 text-[#f7c948]">★</span>
                              )}
                              {isFemaleForm(match.slot.entry) && (
                                <span className="ml-1 text-[#ff9ee8]">♀</span>
                              )}
                            </span>
                            <span className="font-mono text-[10px] font-black text-[#f7c948]">
                              {boxLabels[match.boxIndex] ??
                                `B${match.boxIndex + 1}`}{" "}
                              S{match.slotIndex + 1}
                            </span>
                          </button>
                        );
                      })}
                      {assistMatches.length > 4 && (
                        <p className="font-mono text-[9px] text-[#687696]">
                          +{assistMatches.length - 4} more candidates
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </section>

            <Panel
              title="Box Template"
              icon={<ListChecks className="h-4 w-4 text-[#8fe388]" />}
              compact
            >
              <div
                className="grid h-[calc(100%-32px)] gap-px p-1.5"
                style={{
                  gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
                }}
              >
                {currentBox.map((slot, index) => (
                  <div key={slot ? slotKey(slot) : `empty-${index}`} className="relative min-h-0">
                    <TemplateSlot
                      slot={slot}
                      slotNumber={index + 1}
                      highlighted={!!slot && highlightedKeys.has(slotKey(slot))}
                      isSearchFocus={!!slot && highlightedKeys.has(slotKey(slot))}
                      progressScopeId={layoutProgressId || undefined}
                      onMark={(s) =>
                        setRecentlyMarked((prev) => [s, ...prev].slice(0, 8))
                      }
                    />
                    {slot && slot.source === "game" && slot.gameId && (
                      <TemplateInfoButton
                        entry={slot.entry}
                        gameName={getGameById(slot.gameId)?.name ?? slot.gameId}
                      />
                    )}
                  </div>
                ))}
              </div>
            </Panel>

            <div className="grid min-w-0 grid-cols-[32px_minmax(0,1fr)_32px] items-center gap-1 rounded-lg border border-[#2f2750] bg-[#090b18]/92 px-1">
              <button
                type="button"
                onClick={() =>
                  setStripStart((s) =>
                    Math.max(0, s - Math.ceil(STRIP_PAGE_SIZE / 2)),
                  )
                }
                disabled={stripStart === 0}
                className="grid h-10 w-8 place-items-center rounded border border-[#1d253c] bg-[#060915] text-[#8ca0c9] transition hover:border-[#8fe388] hover:text-[#8fe388] disabled:opacity-30"
                title="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex min-w-0 items-center justify-between gap-1 px-1">
                {visibleBoxStats.map((stat, pageIndex) => {
                  const index = stripStart + pageIndex;
                  const pct = stat.total > 0 ? stat.owned / stat.total : 0;
                  const isComplete = pct === 1 && stat.total > 0;
                  const isCurrent = index === safeIndex;
                  const hasMatch = searchNorm ? boxHasMatch[index] : false;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setBoxIndex(index)}
                      title={`Box ${index + 1}: ${stat.owned}/${stat.total}`}
                      className={`grid h-10 flex-1 grid-rows-[1fr_auto] rounded border px-1 py-1 transition ${
                        isCurrent
                          ? "border-[#8fe388] bg-[#102819]"
                          : hasMatch
                            ? "border-[#f7c948] bg-[#1a1405]"
                            : "border-[#1d253c] bg-[#060915] hover:border-[#9f7aea]"
                      }`}
                    >
                      <span
                        className={`font-mono text-[12px] font-black leading-none ${
                          isCurrent
                            ? "text-[#8fe388]"
                            : hasMatch
                              ? "text-[#f7c948]"
                              : isComplete
                                ? "text-[#8fe388]"
                                : "text-[#687696]"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="h-1 overflow-hidden rounded bg-[#202840]">
                        <span
                          className={`block h-full rounded ${
                            hasMatch
                              ? "bg-[#f7c948]"
                              : isComplete
                                ? "bg-[#8fe388]"
                                : "bg-[#67d9ff]"
                          }`}
                          style={{ width: `${pct * 100}%` }}
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() =>
                  setStripStart((s) =>
                    Math.min(
                      totalBoxes - STRIP_PAGE_SIZE,
                      s + Math.ceil(STRIP_PAGE_SIZE / 2),
                    ),
                  )
                }
                disabled={stripEnd === totalBoxes}
                className="grid h-10 w-8 place-items-center rounded border border-[#1d253c] bg-[#060915] text-[#8ca0c9] transition hover:border-[#8fe388] hover:text-[#8fe388] disabled:opacity-30"
                title="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </aside>
        </main>

        <footer className="grid min-h-0 grid-cols-[minmax(0,1fr)_170px] gap-2">
          <div className="flex min-w-0 items-center gap-3 rounded-lg border border-[#2f2750] bg-[#090b18]/92 px-4">
            <div className="flex items-center gap-1.5 shrink-0">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#8fe388]" />
              <span className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#687696]">
                Recent
              </span>
            </div>
            <div className="h-5 w-px bg-[#1d253c]" />
            <div className="flex min-w-0 items-center gap-2 overflow-hidden">
              {recentlyMarked.length === 0 ? (
                <p className="font-mono text-xs text-[#53607c]">
                  No placements in this session yet.
                </p>
              ) : (
                recentlyMarked.slice(0, 5).map((slot, i) => (
                  <div
                    key={`${slotKey(slot)}-${i}`}
                    className="flex min-w-0 shrink-0 items-center gap-1.5 rounded border border-[#27304c] bg-[#060915] px-2 py-1"
                  >
                    <MiniSprite slot={slot} />
                    <span className="max-w-[74px] truncate text-xs font-bold text-[#f4f1ff]">
                      {compactSlotName(slot.entry)}
                      {slot.isShiny && (
                        <span className="ml-1 text-[#f7c948]">★</span>
                      )}
                      {isFemaleForm(slot.entry) && (
                        <span className="ml-1 text-[#ff9ee8]">♀</span>
                      )}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-lg border border-[#2f2750] bg-[#090b18]/92 px-4 py-2">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#687696]">
              Project
            </p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <span className="font-mono text-lg font-black text-[#8fe388]">
                {overallPct.toFixed(1)}%
              </span>
              <span className="font-mono text-[11px] text-[#8ca0c9]">
                {totalOwned} / {totalTrackableSlots}
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
