"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, RotateCcw, Shield, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { GAME_LIST } from "@/config/games";
import { isAllowedGameHomeBoxForm } from "@/config/game-home-box-forms";
import { useIsAdmin } from "@/hooks/useAdmin";
import { useGamePokedex } from "@/hooks/useGamePokedex";
import { useLivingDexEntries } from "@/hooks/usePokemon";
import { api } from "@/lib/api";
import {
  getCosmeticFormLabel,
  getDisplayNameWithoutFormLabel,
  getFormLabel,
} from "@/lib/forms";
import { isShinyLocked } from "@/config/pokemon-flags";
import type { GameHomeBoxFormRule, LivingDexEntry } from "@/types/pokemon";

const EMPTY_RULES: GameHomeBoxFormRule[] = [];
const MEGA_FORM_PATTERN = /(^|-)mega($|-)/;
const HOME_DEX_GAME_ID = "home";
const HOME_DEX_GAME_OPTION = {
  id: HOME_DEX_GAME_ID,
  name: "HOME Dex",
};

type SpeciesOption = {
  speciesId: number;
  entryNumber: number;
  name: string;
};

type FormRuleRow = {
  entry: LivingDexEntry;
  species: SpeciesOption;
  rule: GameHomeBoxFormRule | undefined;
  hasDbRules: boolean;
  allowed: boolean;
  showShiny: boolean;
  hardShinyLocked: boolean;
};

function formKey(formName: string | null): string {
  return formName ?? "base";
}

function formLabel(entry: LivingDexEntry): string {
  if (!entry.formName) return "Base";
  return (
    getFormLabel(entry.formName) ??
    getCosmeticFormLabel(entry.formName) ??
    entry.formName
  );
}

function baseDisplayName(entry: LivingDexEntry): string {
  const label = entry.formName ? formLabel(entry) : null;
  return getDisplayNameWithoutFormLabel(entry.displayName, label);
}

function isMegaForm(formName: string | null): boolean {
  return !!formName && MEGA_FORM_PATTERN.test(formName);
}

export default function AdminGameFormsPage() {
  const queryClient = useQueryClient();
  const { isAdmin, isLoading: profileLoading } = useIsAdmin();
  const [gameId, setGameId] = useState("legends-za");
  const [search, setSearch] = useState("");

  const { data: livingEntries, isLoading: livingLoading } =
    useLivingDexEntries();
  const isHomeDexRules = gameId === HOME_DEX_GAME_ID;
  const { data: gameDex, isLoading: gameDexLoading } = useGamePokedex(gameId, {
    enabled: !isHomeDexRules,
  });
  const rulesQuery = useQuery({
    queryKey: ["game-home-box-form-rules", gameId],
    queryFn: () => api.getGameHomeBoxFormRules(gameId),
    enabled: isAdmin,
  });

  const upsertRule = useMutation({
    mutationFn: (
      rule: Omit<GameHomeBoxFormRule, "id" | "updatedBy" | "updatedAt">,
    ) => api.upsertGameHomeBoxFormRule(rule),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["game-home-box-form-rules", gameId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["game-home-box-dex", gameId],
        }),
      ]);
    },
  });

  const resetRules = useMutation({
    mutationFn: (speciesId: number) =>
      api.deleteGameHomeBoxFormRules(gameId, speciesId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["game-home-box-form-rules", gameId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["game-home-box-dex", gameId],
        }),
      ]);
    },
  });

  const rules = rulesQuery.data ?? EMPTY_RULES;
  const speciesOptions = useMemo(() => {
    const livingBySpecies = new Map<number, LivingDexEntry>();
    for (const entry of livingEntries ?? []) {
      if (!entry.formName) livingBySpecies.set(entry.speciesId, entry);
    }

    if (isHomeDexRules) {
      return Array.from(livingBySpecies.values())
        .map((entry) => ({
          speciesId: entry.speciesId,
          entryNumber: entry.speciesId,
          name: entry.displayName,
        }))
        .sort((a, b) => a.entryNumber - b.entryNumber);
    }

    return (gameDex ?? [])
      .map((entry) => {
        const livingEntry = livingBySpecies.get(entry.speciesId);
        return {
          speciesId: entry.speciesId,
          entryNumber: entry.entryNumber,
          name: livingEntry?.displayName ?? entry.displayName,
        };
      })
      .filter((entry, index, list) => {
        const firstIndex = list.findIndex(
          (item) => item.speciesId === entry.speciesId,
        );
        return firstIndex === index;
      })
      .sort((a, b) => a.entryNumber - b.entryNumber);
  }, [gameDex, isHomeDexRules, livingEntries]);

  const speciesById = useMemo(
    () =>
      new Map(speciesOptions.map((species) => [species.speciesId, species])),
    [speciesOptions],
  );

  const formsBySpecies = useMemo(() => {
    const bySpecies = new Map<number, LivingDexEntry[]>();
    for (const entry of livingEntries ?? []) {
      if (!speciesById.has(entry.speciesId)) continue;
      if (isMegaForm(entry.formName)) continue;
      const entries = bySpecies.get(entry.speciesId) ?? [];
      entries.push(entry);
      bySpecies.set(entry.speciesId, entries);
    }

    for (const entries of bySpecies.values()) {
      entries.sort(
        (a, b) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
          a.displayName.localeCompare(b.displayName),
      );
    }

    return bySpecies;
  }, [livingEntries, speciesById]);

  const rulesBySpecies = useMemo(() => {
    const bySpecies = new Map<number, Map<string, GameHomeBoxFormRule>>();
    for (const rule of rules) {
      if (isMegaForm(rule.formName)) continue;
      const formRules = bySpecies.get(rule.speciesId) ?? new Map();
      formRules.set(formKey(rule.formName), rule);
      bySpecies.set(rule.speciesId, formRules);
    }
    return bySpecies;
  }, [rules]);

  const allRows = useMemo<FormRuleRow[]>(() => {
    return speciesOptions.flatMap((species) => {
      const forms = formsBySpecies.get(species.speciesId) ?? [];
      const formRules = rulesBySpecies.get(species.speciesId);
      const hasDbRules = !!formRules?.size;

      return forms.map((entry) => {
        const rule = formRules?.get(formKey(entry.formName));
        return {
          entry,
          species,
          rule,
          hasDbRules,
          allowed: hasDbRules
            ? !!rule?.allowed
            : isHomeDexRules ||
              isAllowedGameHomeBoxForm(gameId, entry.speciesId, entry.formName),
          showShiny: rule ? rule.showShiny : true,
          hardShinyLocked: isShinyLocked(entry.speciesId, entry.formName),
        };
      });
    });
  }, [formsBySpecies, gameId, isHomeDexRules, rulesBySpecies, speciesOptions]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allRows;
    const numericQuery = q.replace(/^#0*/, "");

    return allRows.filter(({ entry, species, allowed, rule, hasDbRules }) => {
      const sourceLabel = rule ? "db rule" : "fallback";
      const statusLabel = allowed ? "allowed" : "hidden";
      return (
        species.name.toLowerCase().includes(q) ||
        baseDisplayName(entry).toLowerCase().includes(q) ||
        formLabel(entry).toLowerCase().includes(q) ||
        sourceLabel.includes(q) ||
        statusLabel.includes(q) ||
        (hasDbRules && "custom".includes(q)) ||
        String(entry.speciesId).includes(numericQuery) ||
        String(species.entryNumber).includes(numericQuery)
      );
    });
  }, [allRows, search]);

  const saveFullSpeciesRuleSet = async (
    target: LivingDexEntry,
    patch: { allowed?: boolean; showShiny?: boolean },
  ) => {
    const speciesForms = formsBySpecies.get(target.speciesId) ?? [];
    const formRules = rulesBySpecies.get(target.speciesId);
    const hasDbRules = !!formRules?.size;
    const operations = speciesForms.map((entry) => {
      const existingRule = formRules?.get(formKey(entry.formName));
      const isTarget = entry.formName === target.formName;
      return upsertRule.mutateAsync({
        gameId,
        speciesId: entry.speciesId,
        formName: entry.formName,
        allowed:
          isTarget && patch.allowed !== undefined
            ? patch.allowed
            : hasDbRules
              ? !!existingRule?.allowed
              : isHomeDexRules ||
                isAllowedGameHomeBoxForm(
                  gameId,
                  entry.speciesId,
                  entry.formName,
                ),
        showShiny:
          isTarget && patch.showShiny !== undefined
            ? patch.showShiny
            : (existingRule?.showShiny ?? true),
        notes: isTarget
          ? "Edited from admin form rules UI."
          : (existingRule?.notes ?? null),
      });
    });
    await Promise.all(operations);
  };

  if (profileLoading) {
    return <AdminShell>Checking admin access...</AdminShell>;
  }

  if (!isAdmin) {
    return (
      <AdminShell>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
          Admin access required.
        </div>
      </AdminShell>
    );
  }

  const loading =
    livingLoading ||
    (!isHomeDexRules && gameDexLoading) ||
    rulesQuery.isLoading;
  const dbRuleSpeciesCount = rulesBySpecies.size;
  const allowedCount = allRows.filter((row) => row.allowed).length;

  return (
    <AdminShell>
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-violet-50 text-violet-500 dark:bg-violet-950/40 dark:text-violet-300">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-950 dark:text-white">
            Game Form Rules
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Control which forms appear in each game&apos;s National Dex Boxes.
            Choose HOME Dex to hide forms from the global HOME Boxes.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="grid gap-3 lg:grid-cols-[260px_1fr_auto] lg:items-end">
            <div>
              <label
                htmlFor="admin-game"
                className="mb-1 block text-xs font-black uppercase tracking-widest text-gray-400"
              >
                Game
              </label>
              <select
                id="admin-game"
                value={gameId}
                onChange={(event) => setGameId(event.target.value)}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                {[HOME_DEX_GAME_OPTION, ...GAME_LIST].map((game) => (
                  <option key={game.id} value={game.id}>
                    {game.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="species-search"
                className="mb-1 block text-xs font-black uppercase tracking-widest text-gray-400"
              >
                Search
              </label>
              <input
                id="species-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search Pokemon, form, status, source, or number"
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center lg:min-w-72">
              <Metric label="Forms" value={allRows.length} />
              <Metric label="Allowed" value={allowedCount} />
              <Metric label="Custom" value={dbRuleSpeciesCount} />
            </div>
          </div>
        </section>

        {loading ? (
          <div className="h-64 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
        ) : filteredRows.length === 0 ? (
          <EmptyState message="No forms match that search." />
        ) : (
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col gap-1 border-b border-gray-100 p-4 dark:border-gray-800 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-gray-950 dark:text-white">
                  All Form Rules
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Showing {filteredRows.length} of {allRows.length} editable
                  forms for this game.
                </p>
              </div>
              {rulesQuery.isFetching && (
                <span className="text-xs font-bold uppercase tracking-wide text-violet-500">
                  Syncing...
                </span>
              )}
            </div>

            <div className="hidden max-h-[70vh] overflow-auto lg:block">
              <table className="w-full min-w-[920px] table-fixed border-collapse text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:border-gray-800 dark:bg-gray-900">
                    <th className="w-[10%] px-4 py-2 text-left">Dex</th>
                    <th className="w-[22%] px-4 py-2 text-left">Pokemon</th>
                    <th className="w-[20%] px-4 py-2 text-left">Form</th>
                    <th className="w-[10%] px-4 py-2 text-left">Status</th>
                    <th className="w-[16%] px-4 py-2 text-left">Shiny</th>
                    <th className="w-[10%] px-4 py-2 text-left">Source</th>
                    <th className="w-[12%] px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredRows.map((row) => (
                    <FormRuleTableRow
                      key={`${row.entry.speciesId}:${formKey(row.entry.formName)}`}
                      row={row}
                      disabled={upsertRule.isPending || resetRules.isPending}
                      onToggle={() =>
                        void saveFullSpeciesRuleSet(row.entry, {
                          allowed: !row.allowed,
                        })
                      }
                      onShinyToggle={() =>
                        void saveFullSpeciesRuleSet(row.entry, {
                          showShiny: !row.showShiny,
                        })
                      }
                      onLockToggle={() => {
                        const isOverridden =
                          row.hardShinyLocked && !!row.rule && row.showShiny;
                        if (isOverridden) {
                          resetRules.mutate(row.entry.speciesId);
                        } else {
                          void saveFullSpeciesRuleSet(row.entry, {
                            showShiny: true,
                          });
                        }
                      }}
                      onReset={() => resetRules.mutate(row.entry.speciesId)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-800 lg:hidden">
              {filteredRows.map((row) => (
                <FormRuleMobileRow
                  key={`${row.entry.speciesId}:${formKey(row.entry.formName)}`}
                  row={row}
                  disabled={upsertRule.isPending || resetRules.isPending}
                  onToggle={() =>
                    void saveFullSpeciesRuleSet(row.entry, {
                      allowed: !row.allowed,
                    })
                  }
                  onShinyToggle={() =>
                    void saveFullSpeciesRuleSet(row.entry, {
                      showShiny: !row.showShiny,
                    })
                  }
                  onLockToggle={() => {
                    const isOverridden =
                      row.hardShinyLocked && !!row.rule && row.showShiny;
                    if (isOverridden) {
                      resetRules.mutate(row.entry.speciesId);
                    } else {
                      void saveFullSpeciesRuleSet(row.entry, {
                        showShiny: true,
                      });
                    }
                  }}
                  onReset={() => resetRules.mutate(row.entry.speciesId)}
                />
              ))}
            </div>

            {upsertRule.isError && (
              <ErrorBanner message="Could not save this rule. Check admin permissions and migration status." />
            )}
            {resetRules.isError && (
              <ErrorBanner message="Could not reset these rules. Check admin permissions." />
            )}
          </section>
        )}
      </div>
    </AdminShell>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-5 pb-10">
      <Link
        href="/settings"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Settings
      </Link>
      {children}
    </div>
  );
}

function FormRuleTableRow({
  row,
  disabled,
  onToggle,
  onShinyToggle,
  onLockToggle,
  onReset,
}: {
  row: FormRuleRow;
  disabled: boolean;
  onToggle: () => void;
  onShinyToggle: () => void;
  onLockToggle: () => void;
  onReset: () => void;
}) {
  const lockOverridden = row.hardShinyLocked && !!row.rule && row.showShiny;
  return (
    <tr className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40">
      <td className="px-4 py-3 align-middle">
        <span className="text-xs font-bold tabular-nums text-gray-500 dark:text-gray-400">
          #{String(row.species.entryNumber).padStart(3, "0")}
        </span>
      </td>
      <td className="px-4 py-3 align-middle">
        <p className="truncate font-black text-gray-950 dark:text-white">
          {baseDisplayName(row.entry)}
        </p>
        <p className="mt-0.5 text-xs tabular-nums text-gray-400">
          Nat. #{String(row.entry.speciesId).padStart(4, "0")}
        </p>
      </td>
      <td className="px-4 py-3 align-middle">
        <span className="inline-flex max-w-full rounded-full bg-gray-100 px-2 py-1 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          <span className="truncate">{formLabel(row.entry)}</span>
        </span>
      </td>
      <td className="px-4 py-3 align-middle">
        <StatusPill allowed={row.allowed} />
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="flex flex-wrap gap-1">
          <ShinyPill
            showShiny={row.showShiny}
            disabled={disabled || !row.allowed}
            onClick={onShinyToggle}
          />
          {row.hardShinyLocked && (
            <LockPill
              isOverridden={lockOverridden}
              disabled={disabled}
              onClick={onLockToggle}
            />
          )}
        </div>
      </td>
      <td className="px-4 py-3 align-middle">
        <SourcePill rule={row.rule} hasDbRules={row.hasDbRules} />
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="flex justify-end gap-4">
          {row.hasDbRules && (
            <ResetButton disabled={disabled} onClick={onReset} compact />
          )}
          <RuleToggleButton
            allowed={row.allowed}
            disabled={disabled}
            onClick={onToggle}
          />
        </div>
      </td>
    </tr>
  );
}

function FormRuleMobileRow({
  row,
  disabled,
  onToggle,
  onShinyToggle,
  onLockToggle,
  onReset,
}: {
  row: FormRuleRow;
  disabled: boolean;
  onToggle: () => void;
  onShinyToggle: () => void;
  onLockToggle: () => void;
  onReset: () => void;
}) {
  const lockOverridden = row.hardShinyLocked && !!row.rule && row.showShiny;
  return (
    <div className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tabular-nums text-gray-400">
            #{String(row.species.entryNumber).padStart(3, "0")}
          </span>
          <h3 className="truncate text-sm font-black text-gray-950 dark:text-white">
            {baseDisplayName(row.entry)}
          </h3>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-300">
            {formLabel(row.entry)}
          </span>
          <StatusPill allowed={row.allowed} compact />
          <ShinyPill
            showShiny={row.showShiny}
            disabled={disabled || !row.allowed}
            onClick={onShinyToggle}
            compact
          />
          {row.hardShinyLocked && (
            <LockPill
              isOverridden={lockOverridden}
              disabled={disabled}
              onClick={onLockToggle}
              compact
            />
          )}
          <SourcePill rule={row.rule} hasDbRules={row.hasDbRules} compact />
        </div>
      </div>

      <div className="flex gap-2 sm:justify-end">
        {row.hasDbRules && (
          <ResetButton disabled={disabled} onClick={onReset} />
        )}
        <RuleToggleButton
          allowed={row.allowed}
          disabled={disabled}
          onClick={onToggle}
        />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
      <p className="text-sm font-black tabular-nums text-gray-950 dark:text-white">
        {value}
      </p>
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
        {label}
      </p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm font-semibold text-gray-500 dark:border-gray-800 dark:text-gray-400">
      {message}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="m-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
      {message}
    </div>
  );
}

function StatusPill({
  allowed,
  compact = false,
}: {
  allowed: boolean;
  compact?: boolean;
}) {
  return (
    <span
      className={`inline-flex rounded-full font-bold ${
        compact
          ? "px-2 py-0.5 text-[10px] uppercase tracking-wide"
          : "px-2 py-1 text-xs"
      } ${
        allowed
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
      }`}
    >
      {allowed ? "Allowed" : "Hidden"}
    </span>
  );
}

function ShinyPill({
  showShiny,
  disabled,
  onClick,
  compact = false,
}: {
  showShiny: boolean;
  disabled: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={
        showShiny
          ? "Shiny tracked — click to disable"
          : "Shiny slot removed — click to restore"
      }
      className={`inline-flex items-center gap-1 rounded-full font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        compact
          ? "px-2 py-0.5 text-[10px] uppercase tracking-wide"
          : "px-2 py-1 text-xs"
      } ${
        showShiny
          ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:hover:bg-yellow-900/50"
          : "bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:hover:bg-gray-700"
      }`}
    >
      <span>✦</span>
      {showShiny ? "Shiny" : "No shiny"}
    </button>
  );
}

function LockPill({
  isOverridden,
  disabled,
  onClick,
  compact = false,
}: {
  isOverridden: boolean;
  disabled: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={
        isOverridden
          ? "Shiny lock overridden — click to revert to locked"
          : "Shiny is hardcoded locked — click to override"
      }
      className={`inline-flex items-center gap-1 rounded-full font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        compact
          ? "px-2 py-0.5 text-[10px] uppercase tracking-wide"
          : "px-2 py-1 text-xs"
      } ${
        isOverridden
          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
          : "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50"
      }`}
    >
      {isOverridden ? "🔓" : "🔒"}
      {isOverridden ? "Unlocked" : "Locked"}
    </button>
  );
}

function SourcePill({
  rule,
  hasDbRules,
  compact = false,
}: {
  rule: GameHomeBoxFormRule | undefined;
  hasDbRules: boolean;
  compact?: boolean;
}) {
  const label = rule ? "DB rule" : hasDbRules ? "Hidden by DB" : "Fallback";
  return (
    <span
      className={`inline-flex rounded-full font-bold ${
        compact
          ? "px-2 py-0.5 text-[10px] uppercase tracking-wide"
          : "px-2 py-1 text-xs"
      } ${
        rule
          ? "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
          : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300"
      }`}
    >
      {label}
    </span>
  );
}

function ResetButton({
  disabled,
  onClick,
  compact = false,
}: {
  disabled: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title="Reset this species to fallback rules"
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-bold text-gray-600 transition-colors hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-red-800 dark:hover:text-red-300 ${
        compact ? "h-9 w-9 px-0" : "h-9 px-3 text-xs"
      }`}
    >
      <RotateCcw className="h-4 w-4" />
      {!compact && "Reset"}
    </button>
  );
}

function RuleToggleButton({
  allowed,
  disabled,
  onClick,
}: {
  allowed: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={allowed ? "Hide this form" : "Allow this form"}
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-4 text-xs font-black transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        allowed
          ? "border-red-200 bg-white text-red-600 hover:border-red-300 hover:bg-red-50 dark:border-red-900/70 dark:bg-gray-900 dark:text-red-300 dark:hover:bg-red-950/30"
          : "border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-900/70 dark:bg-gray-900 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
      }`}
    >
      {allowed ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
      {allowed ? "Hide" : "Allow"}
    </button>
  );
}
