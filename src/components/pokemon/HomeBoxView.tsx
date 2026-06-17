"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLivingDexEntries } from "@/hooks/usePokemon";
import {
  usePokedexStore,
  ownedKey,
  type HomeBoxMode,
} from "@/store/pokedexStore";
import {
  compareLivingDexEntries,
  getOwnedEntryCount,
  getShinyEntryCount,
  getSpeciesOwnedCount,
  isHomeTrackedEntry,
  isLivingDexSpecies,
  isShinyTargetEntry,
} from "@/lib/livingDex";
import { BoxSlot } from "./BoxSlot";
import { HomeIcon, SparkleIcon, XIcon } from "@/components/ui";
import { api } from "@/lib/api";
import type { GameHomeBoxFormRule, LivingDexEntry } from "@/types/pokemon";
import { MonitorPlay, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { loadFromSupabase } from "@/lib/sync";
import { supabase } from "@/lib/supabase";

const BOX_SIZE = 30;
const HOME_DEX_GAME_ID = "home";
type HomeStatusFilter = "all" | "shiny" | "missing" | "owned";
type HomeBoxSlot = {
  entry: LivingDexEntry;
  isShiny: boolean;
};
type HomeFilterOption = {
  value: HomeStatusFilter;
  label: string;
  count: number;
  activeClass: string;
};

const HOME_MODE_OPTIONS: {
  value: HomeBoxMode;
  label: string;
  description: string;
}[] = [
  { value: "normal", label: "Normal", description: "Only normal sprites" },
  { value: "shiny", label: "Shiny only", description: "Only shiny sprites" },
  {
    value: "paired",
    label: "Paired",
    description: "Normal + shiny side by side",
  },
];

function buildBoxes(entries: LivingDexEntry[]): (LivingDexEntry | null)[][] {
  const totalBoxes = Math.ceil(entries.length / BOX_SIZE);
  return Array.from({ length: totalBoxes }, (_, index) => {
    const chunk: (LivingDexEntry | null)[] = entries.slice(
      index * BOX_SIZE,
      (index + 1) * BOX_SIZE,
    );
    while (chunk.length < BOX_SIZE) chunk.push(null);
    return chunk;
  });
}

function buildSlotBoxes(slots: HomeBoxSlot[]): (HomeBoxSlot | null)[][] {
  const totalBoxes = Math.ceil(slots.length / BOX_SIZE);
  return Array.from({ length: totalBoxes }, (_, index) => {
    const chunk: (HomeBoxSlot | null)[] = slots.slice(
      index * BOX_SIZE,
      (index + 1) * BOX_SIZE,
    );
    while (chunk.length < BOX_SIZE) chunk.push(null);
    return chunk;
  });
}

function getEntryKey(entry: LivingDexEntry): string {
  return `${entry.speciesId}-${entry.formName ?? "base"}`;
}

function getSlotKey(slot: HomeBoxSlot): string {
  return `${getEntryKey(slot.entry)}-${slot.isShiny ? "shiny" : "normal"}`;
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

// ─── Confirm delete modal ────────────────────────────────────────────────────

function ConfirmDeleteModal({
  layoutName,
  onConfirm,
  onClose,
}: {
  layoutName: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/40">
          <Trash2 className="h-5 w-5 text-red-500" />
        </div>
        <h2 className="text-base font-black text-gray-950 dark:text-white">
          Delete layout?
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          <span className="font-bold text-gray-700 dark:text-gray-200">
            {layoutName}
          </span>{" "}
          will be permanently deleted. This cannot be undone.
        </p>
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 flex-1 rounded-lg border border-gray-200 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-9 flex-1 rounded-lg bg-red-500 text-sm font-black text-white transition-colors hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create / Edit modals ────────────────────────────────────────────────────

type LayoutFormState = {
  name: string;
  mode: HomeBoxMode;
  showCosmeticForms: boolean;
  showGenderForms: boolean;
};

function LayoutModal({
  title,
  initial,
  onSave,
  onClose,
}: {
  title: string;
  initial: LayoutFormState;
  onSave: (values: LayoutFormState) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<LayoutFormState>(initial);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-black text-gray-950 dark:text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-gray-600 dark:text-gray-400">
              Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              maxLength={40}
              placeholder="My HOME Layout"
              className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* Mode */}
          <div>
            <p className="mb-1.5 text-xs font-bold text-gray-600 dark:text-gray-400">
              Mode
            </p>
            <div className="space-y-1.5">
              {HOME_MODE_OPTIONS.map(({ value, label, description }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, mode: value }))}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                    form.mode === value
                      ? "border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/40"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                  }`}
                >
                  <span
                    className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 transition-colors ${
                      form.mode === value
                        ? "border-blue-500 bg-blue-500"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-gray-900 dark:text-white">
                      {label}
                    </span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      {description}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Form variants */}
          <div>
            <p className="mb-1.5 text-xs font-bold text-gray-600 dark:text-gray-400">
              Include variants
            </p>
            <div className="space-y-1.5">
              {[
                {
                  key: "showCosmeticForms" as const,
                  label: "Cosmetic forms",
                  description: "Vivillon, Furfrou, etc.",
                },
                {
                  key: "showGenderForms" as const,
                  label: "Gender differences",
                  description: "Meowstic, Indeedee, etc.",
                },
              ].map(({ key, label, description }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, [key]: !f[key] }))}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2.5 text-left transition-colors hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:border-gray-700 dark:hover:border-gray-600"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-gray-900 dark:text-white">
                      {label}
                    </span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      {description}
                    </span>
                  </span>
                  <span
                    className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                      form[key] ? "bg-teal-500" : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                        form[key] ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 flex-1 rounded-lg border border-gray-200 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(form)}
            disabled={!form.name.trim()}
            className="h-9 flex-1 rounded-lg bg-green-500 text-sm font-black text-white transition-colors hover:bg-green-600 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

type Props = {
  onSelect: (speciesId: number, formName: string | null) => void;
};

export function HomeBoxView({ onSelect }: Props) {
  const { data, isLoading, error } = useLivingDexEntries();
  const homeRulesQuery = useQuery({
    queryKey: ["game-home-box-form-rules", HOME_DEX_GAME_ID],
    queryFn: () =>
      api.getGameHomeBoxFormRules(HOME_DEX_GAME_ID).catch(() => []),
    staleTime: Infinity,
  });
  const [statusFilter, setStatusFilter] = useState<HomeStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const ownedRecords = usePokedexStore((s) => s.owned);
  const showCosmeticForms = usePokedexStore((s) => s.showCosmeticForms);
  const showGenderForms = usePokedexStore((s) => s.showGenderForms);
  const homeBoxMode = usePokedexStore((s) => s.homeBoxMode);
  const homeBoxLayouts = usePokedexStore((s) => s.homeBoxLayouts);
  const activeHomeBoxLayoutId = usePokedexStore((s) => s.activeHomeBoxLayoutId);
  const setActiveHomeBoxLayout = usePokedexStore(
    (s) => s.setActiveHomeBoxLayout,
  );
  const createHomeBoxLayout = usePokedexStore((s) => s.createHomeBoxLayout);
  const updateHomeBoxLayout = usePokedexStore((s) => s.updateHomeBoxLayout);
  const removeHomeBoxLayout = usePokedexStore((s) => s.removeHomeBoxLayout);
  const setProgressSnapshot = usePokedexStore((s) => s.setProgressSnapshot);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const snapshot = await loadFromSupabase(user.id);
      if (snapshot) setProgressSnapshot(snapshot);
    } finally {
      setRefreshing(false);
    }
  };

  const isShinyOnlyMode = homeBoxMode === "shiny";
  const isPairedMode = homeBoxMode === "paired";
  const activeStatusFilter =
    isShinyOnlyMode && statusFilter === "shiny" ? "owned" : statusFilter;

  const homeRulesBySpecies = useMemo(
    () => buildRulesBySpecies(homeRulesQuery.data ?? []),
    [homeRulesQuery.data],
  );

  const isTrackedHomeEntry = useCallback(
    (entry: LivingDexEntry) => {
      if (!isHomeTrackedEntry(entry, showCosmeticForms, showGenderForms)) {
        return false;
      }
      const speciesRules = homeRulesBySpecies.get(entry.speciesId);
      if (!speciesRules?.size) return true;
      return !!speciesRules.get(formRuleKey(entry.formName))?.allowed;
    },
    [homeRulesBySpecies, showCosmeticForms, showGenderForms],
  );

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

  const summary = useMemo(() => {
    const entries = (data ?? []).filter(isTrackedHomeEntry);
    const shinyTargetEntries = entries.filter(isShinyTrackedEntry);
    const baseEntries = (data ?? []).filter(isLivingDexSpecies);
    const owned = getOwnedEntryCount(entries, ownedRecords);
    const shiny = getShinyEntryCount(shinyTargetEntries, ownedRecords);
    const baseOwned = getSpeciesOwnedCount(baseEntries, ownedRecords);
    return {
      owned,
      shiny,
      total: entries.length,
      shinyTotal: shinyTargetEntries.length,
      shinySlotTotal: entries.length,
      shinyLocked: entries.length - shinyTargetEntries.length,
      baseOwned,
      baseTotal: baseEntries.length,
      includesForms: entries.length !== baseEntries.length,
    };
  }, [data, ownedRecords, isTrackedHomeEntry, isShinyTrackedEntry]);

  const activeHomeBoxLayout =
    homeBoxLayouts.find((l) => l.id === activeHomeBoxLayoutId) ??
    homeBoxLayouts[0] ??
    null;

  const handleCreate = (values: LayoutFormState) => {
    createHomeBoxLayout(
      values.name,
      values.mode,
      values.showCosmeticForms,
      values.showGenderForms,
    );
    setShowCreateModal(false);
  };

  const handleEdit = (values: LayoutFormState) => {
    if (!activeHomeBoxLayoutId) return;
    updateHomeBoxLayout(activeHomeBoxLayoutId, {
      name: values.name,
      mode: values.mode,
      showCosmeticForms: values.showCosmeticForms,
      showGenderForms: values.showGenderForms,
    });
    setShowEditModal(false);
  };

  if (error) {
    return (
      <div className="py-20 text-center text-red-500">
        Failed to load Pokémon data. Check your connection and try again.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-2 pb-8 sm:px-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-96 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700"
            />
          ))}
        </div>
      </div>
    );
  }

  const filteredData = (data ?? []).filter(isTrackedHomeEntry);
  const orderedEntries = [...filteredData].toSorted(compareLivingDexEntries);
  const pairedSlots: HomeBoxSlot[] = orderedEntries.flatMap((entry) => [
    { entry, isShiny: false },
    ...(hasShinySlot(entry) ? [{ entry, isShiny: true }] : []),
  ]);
  const boxes = buildBoxes(orderedEntries);
  const pairedBoxes = buildSlotBoxes(pairedSlots);

  const q = search.trim().toLowerCase();
  const matchingKeys = new Set(
    orderedEntries
      .filter((entry) => {
        const record = ownedRecords[ownedKey(entry.speciesId, entry.formName)];
        const shinyTarget = isShinyTrackedEntry(entry);
        const shinyOwned = !!record?.shiny_owned;
        const modeOwned = isShinyOnlyMode ? shinyOwned : record?.owned;
        if (isShinyOnlyMode && !shinyTarget && activeStatusFilter !== "all")
          return false;
        if (activeStatusFilter === "shiny" && (!shinyTarget || !shinyOwned))
          return false;
        if (activeStatusFilter === "owned" && !modeOwned) return false;
        if (activeStatusFilter === "missing" && modeOwned) return false;
        if (!q) return true;
        const nameMatch = entry.displayName.toLowerCase().includes(q);
        const numMatch = String(entry.speciesId).startsWith(
          q.replace(/^#0*/, ""),
        );
        return nameMatch || numMatch;
      })
      .map(getEntryKey),
  );
  const matchingSlotKeys = new Set(
    pairedSlots
      .filter((slot) => {
        const record =
          ownedRecords[ownedKey(slot.entry.speciesId, slot.entry.formName)];
        const shinyTarget = isShinyTrackedEntry(slot.entry);
        const shinyOwned = !!record?.shiny_owned;
        const entryMatchesQuery =
          !q || matchingKeys.has(getEntryKey(slot.entry));
        if (!entryMatchesQuery) return false;
        if (activeStatusFilter === "shiny")
          return slot.isShiny && shinyTarget && shinyOwned;
        if (activeStatusFilter === "owned")
          return slot.isShiny ? shinyOwned : !!record?.owned;
        if (activeStatusFilter === "missing")
          return slot.isShiny ? shinyTarget && !shinyOwned : !record?.owned;
        return true;
      })
      .map(getSlotKey),
  );
  const hasActiveFilter = q.length > 0 || activeStatusFilter !== "all";
  const visibleBoxes = !hasActiveFilter
    ? boxes.map((box, boxIndex) => ({ box, boxIndex }))
    : boxes.flatMap((box, boxIndex) =>
        box.some((entry) =>
          entry ? matchingKeys.has(getEntryKey(entry)) : false,
        )
          ? [{ box, boxIndex }]
          : [],
      );
  const visiblePairedBoxes = !hasActiveFilter
    ? pairedBoxes.map((box, boxIndex) => ({ box, boxIndex }))
    : pairedBoxes.flatMap((box, boxIndex) =>
        box.some((slot) =>
          slot ? matchingSlotKeys.has(getSlotKey(slot)) : false,
        )
          ? [{ box, boxIndex }]
          : [],
      );

  const displayedSlotTotal = isShinyOnlyMode
    ? summary.shinyTotal
    : isPairedMode
      ? summary.total + summary.shinyTotal
      : summary.total;
  const displayedOwnedTotal = isShinyOnlyMode
    ? summary.shiny
    : isPairedMode
      ? summary.owned + summary.shiny
      : summary.owned;
  const completionPct =
    displayedSlotTotal > 0
      ? Math.min(100, (displayedOwnedTotal / displayedSlotTotal) * 100)
      : 0;

  const allFilterOptions: HomeFilterOption[] = [
    {
      value: "all",
      label: isShinyOnlyMode
        ? "Shiny slots"
        : isPairedMode
          ? "All slots"
          : "All species",
      count: isShinyOnlyMode
        ? summary.shinySlotTotal
        : isPairedMode
          ? summary.total + summary.shinySlotTotal
          : summary.total,
      activeClass:
        "bg-[#62b6ff] text-[#061016]",
    },
    {
      value: "owned",
      label: isShinyOnlyMode ? "Shiny owned" : "Owned",
      count: isShinyOnlyMode
        ? summary.shiny
        : isPairedMode
          ? summary.owned + summary.shiny
          : summary.owned,
      activeClass: isShinyOnlyMode
        ? "bg-[#f8d85a] text-[#151006]"
        : "bg-[#82ee88] text-[#061016]",
    },
    {
      value: "missing",
      label: isShinyOnlyMode ? "Missing shiny" : "Missing",
      count: isShinyOnlyMode
        ? summary.shinyTotal - summary.shiny
        : isPairedMode
          ? summary.total + summary.shinyTotal - summary.owned - summary.shiny
          : summary.total - summary.owned,
      activeClass:
        "bg-[#3f3860] text-[#f8f0df]",
    },
    {
      value: "shiny",
      label: "Shiny",
      count: summary.shiny,
      activeClass: "bg-[#f8d85a] text-[#151006]",
    },
  ];
  const filterOptions = allFilterOptions.filter(
    ({ value }) => !(isShinyOnlyMode && value === "shiny"),
  );

  const editInitial: LayoutFormState = {
    name: activeHomeBoxLayout?.name ?? "",
    mode: activeHomeBoxLayout?.mode ?? "normal",
    showCosmeticForms: activeHomeBoxLayout?.showCosmeticForms ?? false,
    showGenderForms: activeHomeBoxLayout?.showGenderForms ?? false,
  };

  return (
    <div className="mx-auto max-w-7xl px-3 pb-8 sm:px-4">
      {/* Header */}
      <header className="mb-4 overflow-hidden rounded-lg border border-[#302a43] bg-[#151421]">
        <div className="grid gap-4 bg-[radial-gradient(circle_at_12%_0%,rgba(130,238,136,0.16),transparent_34%),linear-gradient(135deg,rgba(48,42,67,0.72),rgba(16,19,31,0.92))] p-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#82ee88]/15 text-[#82ee88] ring-1 ring-[#82ee88]/25">
              <HomeIcon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#82ee88]">
                Box Library
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-[#f8f0df] sm:text-3xl">
                HOME Boxes
              </h1>
              <p className="mt-1 text-sm leading-6 text-[#aaa2ba]">
                Your Living Dex arranged in 30-slot boxes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 lg:min-w-96">
            <div className="rounded-lg border border-[#302a43] bg-[#0d1220]/70 px-3 py-2">
              <p className="text-base font-black tabular-nums text-[#82ee88] sm:text-lg">
                {displayedOwnedTotal}/{displayedSlotTotal}
              </p>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#9189a4]">
                Owned
              </p>
            </div>
            <div className="rounded-lg border border-[#302a43] bg-[#0d1220]/70 px-3 py-2">
              <p className="text-base font-black tabular-nums text-[#f8f0df] sm:text-lg">
                {summary.baseOwned}/{summary.baseTotal}
              </p>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#9189a4]">
                Species Dex
              </p>
            </div>
            <div className="rounded-lg border border-[#302a43] bg-[#0d1220]/70 px-3 py-2">
              <p className="flex items-center gap-1 text-base font-black tabular-nums text-[#f8d85a] sm:text-lg">
                <SparkleIcon className="h-4 w-4" />
                {summary.shiny}
              </p>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#9189a4]">
                Shiny
              </p>
            </div>
          </div>
        </div>
        <div className="h-2 overflow-hidden bg-[#0d1220]">
          <div
            className="h-full bg-[#82ee88] transition-all duration-700"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </header>

      {homeBoxLayouts.length === 0 ? (
        <section className="rounded-lg border border-dashed border-[#302a43] bg-[#151421]/80 px-4 py-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#82ee88]/15 text-[#82ee88] ring-1 ring-[#82ee88]/25">
            <HomeIcon className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-black text-[#f8f0df]">
            Create your first HOME box layout
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-[#aaa2ba]">
            Choose how this account is organised once, then switch between saved
            layouts when you use another HOME account or box strategy.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#82ee88] px-4 text-sm font-black text-[#061016] transition-colors hover:bg-[#a5f2a9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#82ee88]"
          >
            <Plus className="h-4 w-4" />
            New layout
          </button>
        </section>
      ) : (
        <>
          {/* Controls */}
          <div className="mb-3 space-y-2.5 rounded-lg border border-[#302a43] bg-[#151421]/90 p-2.5 backdrop-blur sm:px-4">
            {/* Row 1: layout selector + search + action buttons */}
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 min-[560px]:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto]">
              <label htmlFor="home-layout" className="sr-only">
                HOME layout
              </label>
              <select
                id="home-layout"
                value={activeHomeBoxLayoutId}
                onChange={(e) => setActiveHomeBoxLayout(e.target.value)}
                className="h-9 min-w-0 rounded-full border border-[#302a43] bg-[#0d1220] pl-3 pr-9 text-xs font-bold text-[#f8f0df] focus:outline-none focus:ring-2 focus:ring-[#62b6ff]"
              >
                {homeBoxLayouts.map((layout) => (
                  <option key={layout.id} value={layout.id}>
                    {layout.name}
                  </option>
                ))}
              </select>

              <div className="relative order-3 col-span-2 min-[560px]:order-none min-[560px]:col-span-1">
                <label htmlFor="home-search" className="sr-only">
                  Search Pokémon
                </label>
                <input
                  id="home-search"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="h-9 w-full rounded-full border border-[#302a43] bg-[#0d1220] pl-3 pr-7 text-xs text-[#f8f0df] placeholder:text-[#554a70] focus:outline-none focus:ring-2 focus:ring-[#62b6ff]"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                )}
              </div>

              <div className="order-2 flex items-center justify-end gap-1.5 min-[560px]:order-none">
                <Link
                  href="/stream"
                  aria-label="Open stream overlay"
                  title="Stream overlay"
                  className="grid h-9 w-9 place-items-center rounded-full bg-[#2a1948] text-[#c4b5fd] transition-colors hover:bg-[#34215a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5cf6]"
                >
                  <MonitorPlay className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  aria-label="Refresh from server"
                  title="Refresh"
                  className="grid h-9 w-9 place-items-center rounded-full border border-[#302a43] bg-[#0d1220] text-[#9189a4] transition-colors hover:bg-[#1d2637] hover:text-[#f8f0df] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62b6ff]"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  aria-label="New HOME layout"
                  title="New layout"
                  className="grid h-9 w-9 place-items-center rounded-full border border-[#302a43] bg-[#0d1220] text-[#9189a4] transition-colors hover:bg-[#1d2637] hover:text-[#f8f0df] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62b6ff]"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  aria-label="Edit current layout"
                  title="Edit layout"
                  className="grid h-9 w-9 place-items-center rounded-full border border-[#302a43] bg-[#0d1220] text-[#9189a4] transition-colors hover:bg-[#1d2637] hover:text-[#f8f0df] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62b6ff]"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  aria-label="Delete current layout"
                  title="Delete layout"
                  className="grid h-9 w-9 place-items-center rounded-full border border-[#302a43] bg-[#0d1220] text-[#9189a4] transition-colors hover:bg-[#2a1720] hover:text-[#fca5a5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fca5a5]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Row 2: filter pills + layout badge */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {filterOptions.map(({ value, label, count, activeClass }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatusFilter(value)}
                    aria-pressed={activeStatusFilter === value}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                      activeStatusFilter === value
                        ? activeClass
                        : "border border-[#302a43] bg-[#0d1220] text-[#aaa2ba] hover:bg-[#1d2637] hover:text-[#f8f0df]"
                    }`}
                  >
                    <span>{label}</span>
                    <span
                      className={`tabular-nums text-[10px] ${activeStatusFilter === value ? "opacity-80" : "opacity-60"}`}
                    >
                      {count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Active layout badge showing mode */}
              {activeHomeBoxLayout && (
                <span className="shrink-0 rounded-full border border-[#302a43] bg-[#0d1220] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#9189a4]">
                  {activeHomeBoxLayout.mode}
                  {activeHomeBoxLayout.showCosmeticForms ? " · forms" : ""}
                  {activeHomeBoxLayout.showGenderForms ? " · gender" : ""}
                </span>
              )}
            </div>

            {summary.includesForms &&
              (isShinyOnlyMode || isPairedMode) &&
              summary.shinyLocked > 0 && (
                <p className="text-[10px] font-medium leading-snug text-[#9189a4] sm:text-[11px]">
                  Shiny targets exclude{" "}
                  <span className="tabular-nums text-slate-400">
                    {summary.shinyLocked}
                  </span>{" "}
                  locked forms.
                </p>
              )}
          </div>

          {/* Box grid */}
          <div className="grid grid-cols-1 gap-2 sm:gap-3 lg:grid-cols-2">
            {isPairedMode &&
              visiblePairedBoxes.map(({ box, boxIndex }) => {
                const nonNull = box.filter((s): s is HomeBoxSlot => s !== null);
                const first =
                  nonNull[0]?.entry.speciesId ?? boxIndex * BOX_SIZE + 1;
                const last =
                  nonNull[nonNull.length - 1]?.entry.speciesId ??
                  (boxIndex + 1) * BOX_SIZE;
                return (
                  <section
                    key={`p-${boxIndex}`}
                    className="scroll-mt-14 rounded-lg border border-blue-100 bg-blue-50/40 p-1.5 dark:border-blue-900/40 dark:bg-blue-950/20 sm:rounded-xl sm:p-3"
                  >
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-500 dark:text-blue-400 sm:mb-2">
                      {first}–{last}
                    </p>
                    <div className="grid grid-cols-6 gap-0.5 sm:gap-1">
                      {box.map((slot, slotIndex) => {
                        const dimmed =
                          hasActiveFilter &&
                          slot !== null &&
                          !matchingSlotKeys.has(getSlotKey(slot));
                        return (
                          <div
                            key={slotIndex}
                            className={`transition-opacity duration-150 ${dimmed ? "opacity-20" : ""}`}
                          >
                            <BoxSlot
                              entry={slot?.entry ?? null}
                              onSelect={onSelect}
                              isShinySlot={slot?.isShiny ?? false}
                              shinyLocked={
                                slot?.isShiny && slot.entry
                                  ? !isShinyTrackedEntry(slot.entry)
                                  : undefined
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            {!isPairedMode &&
              visibleBoxes.flatMap(({ box, boxIndex }) => {
                const nonNull = box.filter(
                  (e): e is LivingDexEntry => e !== null,
                );
                const first = nonNull[0]?.speciesId ?? boxIndex * BOX_SIZE + 1;
                const last =
                  nonNull[nonNull.length - 1]?.speciesId ??
                  (boxIndex + 1) * BOX_SIZE;
                const renderGrid = (isShiny: boolean) =>
                  box.map((entry, slotIndex) => {
                    const slotKey = entry ? getEntryKey(entry) : null;
                    const dimmed =
                      hasActiveFilter &&
                      slotKey !== null &&
                      !matchingKeys.has(slotKey);
                    return (
                      <div
                        key={slotIndex}
                        className={`transition-opacity duration-150 ${dimmed ? "opacity-20" : ""}`}
                      >
                        <BoxSlot
                          entry={entry}
                          onSelect={onSelect}
                          isShinySlot={isShiny}
                          shinyLocked={
                            isShiny && entry
                              ? !isShinyTrackedEntry(entry)
                              : undefined
                          }
                        />
                      </div>
                    );
                  });

                const normalBox = (
                  <section
                    key={`n-${boxIndex}`}
                    className="scroll-mt-14 rounded-lg border border-gray-100 bg-gray-50 p-1.5 dark:border-gray-700/50 dark:bg-gray-800/60 sm:rounded-xl sm:p-3"
                  >
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 sm:mb-2">
                      {first}–{last}
                    </p>
                    <div className="grid grid-cols-6 gap-0.5 sm:gap-1">
                      {renderGrid(false)}
                    </div>
                  </section>
                );

                if (homeBoxMode === "normal") return [normalBox];

                const shinyBox = (
                  <section
                    key={`s-${boxIndex}`}
                    className="scroll-mt-14 rounded-lg border border-yellow-200/60 bg-yellow-50/30 p-1.5 dark:border-yellow-900/40 dark:bg-yellow-950/20 sm:rounded-xl sm:p-3"
                  >
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-yellow-500 dark:text-yellow-600 sm:mb-2">
                      ✦ {first}–{last}
                    </p>
                    <div className="grid grid-cols-6 gap-0.5 sm:gap-1">
                      {renderGrid(true)}
                    </div>
                  </section>
                );

                if (homeBoxMode === "shiny") return [shinyBox];
                return [normalBox, shinyBox];
              })}
            {(isPairedMode
              ? visiblePairedBoxes.length
              : visibleBoxes.length) === 0 && (
              <div className="col-span-full py-12 text-center text-sm text-gray-400">
                No Pokémon match this HOME view.
              </div>
            )}
          </div>
        </>
      )}

      {showDeleteModal && activeHomeBoxLayout && (
        <ConfirmDeleteModal
          layoutName={activeHomeBoxLayout.name}
          onConfirm={() => {
            removeHomeBoxLayout(activeHomeBoxLayoutId);
            setShowDeleteModal(false);
          }}
          onClose={() => setShowDeleteModal(false)}
        />
      )}
      {showCreateModal && (
        <LayoutModal
          title="New HOME layout"
          initial={{
            name: "",
            mode: "normal",
            showCosmeticForms: false,
            showGenderForms: false,
          }}
          onSave={handleCreate}
          onClose={() => setShowCreateModal(false)}
        />
      )}
      {showEditModal && activeHomeBoxLayout && (
        <LayoutModal
          title="Edit layout"
          initial={editInitial}
          onSave={handleEdit}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}
