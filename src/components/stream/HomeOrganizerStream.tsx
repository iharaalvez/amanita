"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Gamepad2,
  LayoutGrid,
  ListChecks,
  RefreshCw,
  Search,
  Sprout,
  X,
} from "lucide-react";
import { useLivingDexEntries } from "@/hooks/usePokemon";
import { GENDER_DIFFERENCE_FORM_KEYS } from "@/config/cosmetic-forms";
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
  GameHomeBoxFormRule,
  HomeBoxLayoutProfile,
  LivingDexEntry,
} from "@/types/pokemon";

const BOX_SIZE = 30;
const COLS = 6;
const ROWS = BOX_SIZE / COLS;
const HOME_DEX_GAME_ID = "home";
const EMPTY_BOX: (SlotData | null)[] = [];
const UNSYNCED_PREVIEW_LAYOUT: HomeBoxLayoutProfile = {
  id: "stream-unsynced-preview",
  name: "Unsynced Preview",
  mode: "normal",
  showCosmeticForms: false,
  showGenderForms: false,
};

type SlotData = {
  entry: LivingDexEntry;
  isShiny: boolean;
  shinyAvailable: boolean;
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

type BoxStat = {
  total: number;
  owned: number;
};

function slotKey(slot: SlotData): string {
  return `${ownedKey(slot.entry.speciesId, slot.entry.formName)}-${slot.isShiny ? "shiny" : "normal"}`;
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
  record: { owned?: boolean; shiny_owned?: boolean } | undefined,
): boolean {
  if (slot.isShiny && !slot.shinyAvailable) return false;
  return slot.isShiny ? !!record?.shiny_owned : !!record?.owned;
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

function TemplateSlot({
  slot,
  slotNumber,
  highlighted,
  isSearchFocus,
}: {
  slot: SlotData | null;
  slotNumber: number;
  highlighted: boolean;
  isSearchFocus: boolean;
}) {
  const key = slot ? ownedKey(slot.entry.speciesId, slot.entry.formName) : "";
  const record = usePokedexStore((s) => (slot ? s.owned[key] : undefined));
  const markOwned = usePokedexStore((s) => s.markOwned);
  const clearOwnership = usePokedexStore((s) => s.clearOwnership);
  const markShinyOwned = usePokedexStore((s) => s.markShinyOwned);
  const clearShinyOwned = usePokedexStore((s) => s.clearShinyOwned);

  if (!slot) {
    return (
      <div className="min-h-0 rounded border border-[#192031]/60 bg-[#070914]/70" />
    );
  }

  const owned = isSlotOwned(slot, record);
  const sprite = spriteForSlot(slot);
  const female = isFemaleForm(slot.entry);
  const compactName = compactSlotName(slot.entry);
  const shinyUnavailable = slot.isShiny && !slot.shinyAvailable;

  const toggle = () => {
    if (shinyUnavailable) return;
    if (slot.isShiny) {
      if (owned) clearShinyOwned(slot.entry.speciesId, slot.entry.formName);
      else markShinyOwned(slot.entry.speciesId, slot.entry.formName);
      return;
    }

    if (owned) clearOwnership(slot.entry.speciesId, slot.entry.formName);
    else markOwned(slot.entry.speciesId, slot.entry.formName);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={`Slot ${slotNumber}: ${slot.entry.displayName}${
        shinyUnavailable ? " shiny unavailable" : owned ? " owned" : " missing"
      }`}
      className={`group relative grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded border px-1.5 py-1 text-left transition ${
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
        className={`absolute right-1 top-1 h-1.5 w-1.5 rounded-full ${
          shinyUnavailable
            ? "bg-[#53607c]"
            : owned
              ? "bg-[#8fe388]"
              : "bg-[#ff8f8f]"
        }`}
      />

      <div className="flex min-w-0 items-center justify-between gap-1 pr-2 font-mono text-[9px] leading-none">
        <span
          className={`truncate ${owned ? "text-[#8fe388]" : "text-[#75809c]"}`}
        >
          {dexNumber(slot.entry.speciesId)}
        </span>
        <span className="shrink-0 text-[#53607c]">
          {String(slotNumber).padStart(2, "0")}
        </span>
      </div>

      <div className="relative flex min-h-0 items-center justify-center py-0.5">
        {isSearchFocus && (
          <span className="absolute left-0 top-1 rounded bg-[#f7c948] px-1 font-mono text-[8px] font-black text-[#170f02]">
            FIND
          </span>
        )}
        <div className="absolute left-0 top-0 flex gap-0.5">
          {slot.isShiny && (
            <span
              className={`grid h-4 w-4 place-items-center rounded text-[10px] leading-none ${
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
              className="grid h-4 w-4 place-items-center rounded bg-[#241326] text-[11px] leading-none text-[#ff9ee8]"
              title="Female form"
            >
              ♀
            </span>
          )}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={sprite}
          alt={slot.entry.displayName}
          className={`h-full max-h-[56px] w-full object-contain transition ${
            owned
              ? "drop-shadow-[0_8px_12px_rgba(0,0,0,0.35)]"
              : shinyUnavailable
                ? "grayscale opacity-20"
                : "grayscale opacity-35"
          } ${isSearchFocus ? "scale-110" : "group-hover:scale-105"}`}
          loading="lazy"
        />
      </div>

      <div className="min-w-0 truncate text-center text-[11px] font-semibold leading-tight text-[#f3f0ff]">
        {compactName}
      </div>
    </button>
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLayoutId, setSelectedLayoutId] = useState("");
  const [isRefreshingLayouts, setIsRefreshingLayouts] = useState(false);
  const [layoutSyncMessage, setLayoutSyncMessage] = useState<string | null>(
    null,
  );
  const [, forceUpdate] = useState(0);
  const activeItemRef = useRef<HTMLButtonElement>(null);
  const boxScrollerRef = useRef<HTMLDivElement>(null);

  const storeOwned = usePokedexStore((s) => s.owned);
  const homeBoxLayouts = usePokedexStore((s) => s.homeBoxLayouts);
  const activeHomeBoxLayoutId = usePokedexStore((s) => s.activeHomeBoxLayoutId);
  const setProgressSnapshot = usePokedexStore((s) => s.setProgressSnapshot);
  const setActiveHomeBoxLayout = usePokedexStore(
    (s) => s.setActiveHomeBoxLayout,
  );

  const { data: allEntries, isLoading } = useLivingDexEntries();
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
  const layoutMode = activeHomeBoxLayout.mode;
  const layoutShowCosmeticForms = activeHomeBoxLayout.showCosmeticForms;
  const layoutShowGenderForms = activeHomeBoxLayout.showGenderForms;
  const isPairedMode = layoutMode === "paired";
  const isShinyMode = layoutMode === "shiny";

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

      setProgressSnapshot(snapshot);
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
    if (isPairedMode) {
      return filteredEntries.flatMap((entry) => [
        { entry, isShiny: false, shinyAvailable: true },
        ...(hasShinySlot(entry)
          ? [
              {
                entry,
                isShiny: true,
                shinyAvailable: isShinyTrackedEntry(entry),
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
      }));
    }
    return filteredEntries.map((entry) => ({
      entry,
      isShiny: false,
      shinyAvailable: true,
    }));
  }, [
    filteredEntries,
    hasShinySlot,
    isPairedMode,
    isShinyMode,
    isShinyTrackedEntry,
  ]);

  const boxes = useMemo(() => buildSlotBoxes(allSlots), [allSlots]);
  const totalBoxes = boxes.length;
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
        const owned = slots.filter((slot) =>
          isSlotOwned(
            slot,
            storeOwned[ownedKey(slot.entry.speciesId, slot.entry.formName)],
          ),
        ).length;
        return { total: trackableSlots.length, owned };
      }),
    [boxes, storeOwned],
  );

  const positionedSlots = useMemo<PositionedSlot[]>(
    () => currentBox.flatMap((slot, index) => (slot ? [{ slot, index }] : [])),
    [currentBox],
  );

  const missingInBox = useMemo(
    () =>
      positionedSlots.filter(
        ({ slot }) =>
          isSlotTrackable(slot) &&
          !isSlotOwned(
            slot,
            storeOwned[ownedKey(slot.entry.speciesId, slot.entry.formName)],
          ),
      ),
    [positionedSlots, storeOwned],
  );

  const trackableInBox = currentSlots.filter(isSlotTrackable);
  const ownedInBox = trackableInBox.length - missingInBox.length;
  const boxPct =
    trackableInBox.length > 0 ? (ownedInBox / trackableInBox.length) * 100 : 0;

  const totalOwned = useMemo(
    () =>
      allSlots.filter((slot) =>
        isSlotOwned(
          slot,
          storeOwned[ownedKey(slot.entry.speciesId, slot.entry.formName)],
        ),
      ).length,
    [allSlots, storeOwned],
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

  const highlightedKeys = useMemo(() => {
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
              .includes(normalizedNumber)
          );
        })
        .map(({ slot }) => slotKey(slot)),
    );
  }, [allPositionedSlots, searchNorm]);

  const searchResults = useMemo<SearchResult[]>(() => {
    if (!searchNorm) return [];
    return allPositionedSlots
      .filter(({ slot }) => highlightedKeys.has(slotKey(slot)))
      .slice(0, 8)
      .map(({ slot, boxIndex, slotIndex }) => ({
        slot,
        boxIndex,
        slotIndex,
        owned: isSlotOwned(
          slot,
          storeOwned[ownedKey(slot.entry.speciesId, slot.entry.formName)],
        ),
      }));
  }, [allPositionedSlots, highlightedKeys, searchNorm, storeOwned]);

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

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [safeIndex]);

  const entryByKey = useMemo(() => {
    const map = new Map<string, LivingDexEntry>();
    for (const entry of allEntries ?? []) {
      map.set(ownedKey(entry.speciesId, entry.formName), entry);
    }
    return map;
  }, [allEntries]);

  const recentlyPlaced = useMemo(() => {
    return Object.entries(storeOwned)
      .filter(([, record]) =>
        isShinyMode
          ? record.shiny_owned
          : isPairedMode
            ? record.owned || record.shiny_owned
            : record.owned,
      )
      .sort(([, a], [, b]) => {
        if (!a.updated_at && !b.updated_at) return 0;
        if (!a.updated_at) return 1;
        if (!b.updated_at) return -1;
        return b.updated_at.localeCompare(a.updated_at);
      })
      .slice(0, 8)
      .flatMap(([key, record]) => {
        const entry = entryByKey.get(key);
        if (!entry) return [];

        const slots: SlotData[] = [];
        if (!isShinyMode && record.owned) {
          slots.push({ entry, isShiny: false, shinyAvailable: true });
        }
        if (
          (isShinyMode || isPairedMode) &&
          record.shiny_owned &&
          isShinyTrackedEntry(entry)
        ) {
          slots.push({ entry, isShiny: true, shinyAvailable: true });
        }
        return slots;
      });
  }, [entryByKey, isPairedMode, isShinyMode, isShinyTrackedEntry, storeOwned]);

  const timeStr = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const prev = () => setBoxIndex((index) => Math.max(0, index - 1));
  const next = () =>
    setBoxIndex((index) => Math.min(totalBoxes - 1, index + 1));
  const scrollBoxNav = (direction: -1 | 1) => {
    boxScrollerRef.current?.scrollBy({
      left: direction * 360,
      behavior: "smooth",
    });
  };

  if (isLoading) {
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
                Home Organizer Mode
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
                  Pokemon HOME
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono text-sm font-black text-[#10131d]">
                <span>BOX {safeIndex + 1}</span>
                <span className="text-[#8b95a5]">/</span>
                <span>{totalBoxes}</span>
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

          <aside className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)_88px] gap-1.5">
            <section className="rounded-lg border border-[#2f2750] bg-[#090c18]/94 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-mono text-[12px] font-black uppercase tracking-[0.18em] text-[#8fe388]">
                    Current Box
                  </p>
                  <div className="mt-1.5 flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded border border-[#1d7aa2] bg-[#071627] text-[#67d9ff]">
                      <Sprout className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h1 className="font-mono text-4xl font-black leading-none text-[#d7c8ff]">
                        BOX {safeIndex + 1}
                      </h1>
                      <p className="mt-1 truncate text-sm text-[#9ca8c4]">
                        {activeHomeBoxLayout.name}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-[#687696]">
                        {activeHomeBoxLayout.mode}
                        {activeHomeBoxLayout.showCosmeticForms
                          ? " / forms"
                          : ""}
                        {activeHomeBoxLayout.showGenderForms ? " / gender" : ""}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="w-32 rounded border border-[#27304c] bg-[#060915] p-2.5">
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#8fe388]">
                    Progress
                  </p>
                  <p className="mt-1 font-mono text-2xl font-black">
                    {ownedInBox}
                    <span className="text-base font-normal text-[#7d89a8]">
                      {" "}
                      / {trackableInBox.length}
                    </span>
                  </p>
                  <div className="mt-2 h-2 overflow-hidden rounded bg-[#27304c]">
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
                matchCount={highlightedKeys.size}
              />
              <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
                <span className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#687696]">
                  Layout
                </span>
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
                <button
                  type="button"
                  onClick={refreshLayouts}
                  disabled={isRefreshingLayouts}
                  className="grid h-8 w-8 place-items-center rounded border border-[#27304c] bg-[#060915] text-[#8ca0c9] transition hover:border-[#8fe388] hover:text-[#8fe388] disabled:opacity-45"
                  title="Refresh HOME layouts from Supabase"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isRefreshingLayouts ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
              {homeBoxLayouts.length === 0 && (
                <p className="mt-2 font-mono text-[10px] text-[#687696]">
                  No saved HOME layouts in this browser source yet.
                </p>
              )}
              {layoutSyncMessage && (
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
                            B{boxIndex + 1} S{slotIndex + 1}
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

            <Panel
              title="Box Template"
              icon={<ListChecks className="h-4 w-4 text-[#8fe388]" />}
              compact
            >
              <div
                className="grid h-[calc(100%-32px)] gap-0.5 p-2"
                style={{
                  gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
                }}
              >
                {currentBox.map((slot, index) => (
                  <TemplateSlot
                    key={slot ? slotKey(slot) : `empty-${index}`}
                    slot={slot}
                    slotNumber={index + 1}
                    highlighted={!!slot && highlightedKeys.has(slotKey(slot))}
                    isSearchFocus={!!slot && highlightedKeys.has(slotKey(slot))}
                  />
                ))}
              </div>
            </Panel>

            <Panel
              title="Recent"
              icon={<CheckCircle2 className="h-4 w-4 text-[#8fe388]" />}
              className="min-h-0"
            >
              <div className="flex h-[calc(100%-40px)] items-center gap-2 overflow-hidden px-3">
                {recentlyPlaced.length === 0 ? (
                  <p className="font-mono text-xs text-[#53607c]">
                    No placements yet.
                  </p>
                ) : (
                  recentlyPlaced.slice(0, 5).map(({ entry, isShiny }) => {
                    const slot = {
                      entry,
                      isShiny,
                      shinyAvailable: !isShiny || isShinyTrackedEntry(entry),
                    };
                    return (
                      <div
                        key={slotKey(slot)}
                        className="flex min-w-0 shrink-0 items-center gap-1.5 rounded border border-[#27304c] bg-[#060915] px-2 py-1"
                      >
                        <MiniSprite slot={slot} />
                        <span className="max-w-[74px] truncate text-xs font-bold text-[#f4f1ff]">
                          {compactSlotName(entry)}
                          {isShiny && (
                            <span className="ml-1 text-[#f7c948]">★</span>
                          )}
                          {isFemaleForm(entry) && (
                            <span className="ml-1 text-[#ff9ee8]">♀</span>
                          )}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </Panel>
          </aside>
        </main>

        <footer className="grid min-h-0 grid-cols-[minmax(0,1fr)_170px] gap-2">
          <div className="grid min-w-0 grid-cols-[32px_minmax(0,1fr)_32px] items-center gap-1 rounded-lg border border-[#2f2750] bg-[#090b18]/92 px-1">
            <button
              type="button"
              onClick={() => scrollBoxNav(-1)}
              className="grid h-10 w-8 place-items-center rounded border border-[#1d253c] bg-[#060915] text-[#8ca0c9] transition hover:border-[#8fe388] hover:text-[#8fe388]"
              title="Scroll boxes left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div
              ref={boxScrollerRef}
              className="flex min-w-0 items-center gap-1 overflow-x-auto overflow-y-hidden px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {boxStats.map((stat, index) => {
                const pct = stat.total > 0 ? stat.owned / stat.total : 0;
                const isComplete = pct === 1 && stat.total > 0;
                const isCurrent = index === safeIndex;
                const hasMatch = searchNorm ? boxHasMatch[index] : false;
                return (
                  <button
                    key={index}
                    ref={isCurrent ? activeItemRef : undefined}
                    type="button"
                    onClick={() => setBoxIndex(index)}
                    title={`Box ${index + 1}: ${stat.owned}/${stat.total}`}
                    className={`grid h-10 w-10 shrink-0 grid-rows-[1fr_auto] rounded border px-1 py-1 transition ${
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
              onClick={() => scrollBoxNav(1)}
              className="grid h-10 w-8 place-items-center rounded border border-[#1d253c] bg-[#060915] text-[#8ca0c9] transition hover:border-[#8fe388] hover:text-[#8fe388]"
              title="Scroll boxes right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
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
