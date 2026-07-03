"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Map, X } from "lucide-react";
import { PokemonSprite } from "@/components/pokemon/PokemonSprite";
import {
  DYNAMAX_ADVENTURE_LEGENDARIES,
  getLegendarySpriteUrl,
  type DynamaxLegendary,
} from "@/config/dynamax-adventures";
import {
  getAttackingEffectiveness,
  TYPE_COLORS,
  TYPES,
  type PokemonType,
} from "@/lib/typeChart";

const VERSION_LABEL: Record<"sword" | "shield", string> = {
  sword: "Sword",
  shield: "Shield",
};

const VERSION_COLOR: Record<"sword" | "shield", string> = {
  sword: "#60a5fa",
  shield: "#f472b6",
};

type EffectivenessEntry = { type: PokemonType; multiplier: number };

function buildEffectivenessList(
  legendary: DynamaxLegendary,
): EffectivenessEntry[] {
  const effectiveness = getAttackingEffectiveness(legendary.types.filter(
    (t): t is PokemonType => !!t,
  ));
  return TYPES.map((type) => ({ type, multiplier: effectiveness[type] })).sort(
    (a, b) => b.multiplier - a.multiplier,
  );
}

export default function DynamaxAdventuresPage() {
  const [selectedTypes, setSelectedTypes] = useState<PokemonType[]>([]);
  const [selectedId, setSelectedId] = useState<number>(
    DYNAMAX_ADVENTURE_LEGENDARIES[0].speciesId,
  );

  const toggleType = (type: PokemonType) => {
    setSelectedTypes((prev) => {
      if (prev.includes(type)) return prev.filter((t) => t !== type);
      // Max 2 types — drop the first if already at cap
      if (prev.length >= 2) return [prev[1], type];
      return [...prev, type];
    });
  };

  const filteredLegendaries = useMemo(() => {
    if (selectedTypes.length === 0) return DYNAMAX_ADVENTURE_LEGENDARIES;
    return DYNAMAX_ADVENTURE_LEGENDARIES.filter((l) => {
      const types = l.types.filter((t): t is PokemonType => !!t);
      return selectedTypes.every((t) => types.includes(t));
    });
  }, [selectedTypes]);

  // Auto-select when narrowed to one result
  useEffect(() => {
    if (filteredLegendaries.length === 1) {
      setSelectedId(filteredLegendaries[0].speciesId);
    }
  }, [filteredLegendaries]);

  const selected =
    DYNAMAX_ADVENTURE_LEGENDARIES.find((l) => l.speciesId === selectedId) ??
    DYNAMAX_ADVENTURE_LEGENDARIES[0];

  const selectedEffectiveness = useMemo(
    () => buildEffectivenessList(selected),
    [selected],
  );

  const bestAttacking = selectedEffectiveness.filter((e) => e.multiplier > 1);
  const worstAttacking = selectedEffectiveness
    .filter((e) => e.multiplier < 1)
    .sort((a, b) => a.multiplier - b.multiplier);

  return (
    <div className="min-h-full bg-[#11111b] px-4 py-6 text-[#f8f0df] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* ── Header ── */}
        <header className="mb-6">
          <Link
            href="/tools"
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#554a70] transition-colors hover:text-[#f8f0df]"
          >
            ← Tools
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[#8b5cf6]">
                <Map className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Sword / Shield Tool
                </span>
              </div>
              <h1 className="text-3xl font-black tracking-tight">
                Dynamax Adventures
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-[#8f8799]">
                Pick your target legendary to see which rental types to grab
                first — and which to avoid — for the run.
              </p>
            </div>
          </div>
        </header>

        {/* ── Two-column layout ── */}
        <div className="grid items-start gap-5 xl:grid-cols-[1fr_380px]">
          {/* ── Legendary grid ── */}
          <div>
            <div className="mb-3 rounded-lg border border-[#302a43] bg-[#151421] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#554a70]">
                  Filter by legendary type
                  {selectedTypes.length > 0 && (
                    <span className="ml-2 text-[#8b5cf6]">
                      ({selectedTypes.length} selected)
                    </span>
                  )}
                </p>
                {selectedTypes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedTypes([])}
                    className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold text-[#554a70] transition hover:text-[#f8f0df]"
                  >
                    <X className="h-2.5 w-2.5" />
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {TYPES.map((type) => {
                  const active = selectedTypes.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleType(type)}
                      className="rounded px-2 py-1 text-[10px] font-black uppercase tracking-wide transition"
                      style={{
                        backgroundColor: active
                          ? TYPE_COLORS[type]
                          : `${TYPE_COLORS[type]}22`,
                        color: active ? "#fff" : TYPE_COLORS[type],
                        border: `1px solid ${active ? TYPE_COLORS[type] : `${TYPE_COLORS[type]}44`}`,
                        opacity: !active && selectedTypes.length >= 2 ? 0.4 : 1,
                      }}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredLegendaries.map((legendary) => (
                <LegendaryCard
                  key={legendary.speciesId}
                  legendary={legendary}
                  selected={legendary.speciesId === selectedId}
                  onSelect={() => setSelectedId(legendary.speciesId)}
                />
              ))}
            </div>

            {filteredLegendaries.length === 0 && (
              <p className="rounded-xl border border-dashed border-[#302a43] py-10 text-center text-xs font-semibold text-[#554a70]">
                No legendaries have{" "}
                {selectedTypes.map((t, i) => (
                  <span key={t}>
                    {i > 0 && " + "}
                    <span style={{ color: TYPE_COLORS[t] }}>{t}</span>
                  </span>
                ))}{" "}
                typing.
              </p>
            )}
          </div>

          {/* ── Sticky matchup panel ── */}
          <aside className="space-y-4 xl:sticky xl:top-4">
            <div className="overflow-hidden rounded-xl border border-[#302a43] bg-[#151421]">
              <div className="flex items-center gap-3 border-b border-[#302a43] px-4 py-3.5">
                <PokemonSprite
                  src={getLegendarySpriteUrl(selected.speciesId)}
                  alt={selected.name}
                  width={48}
                  height={48}
                />
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#8b5cf6]">
                    Target
                  </p>
                  <h2 className="truncate text-lg font-black">
                    {selected.name}
                  </h2>
                </div>
              </div>

              <div className="space-y-4 p-4">
                <div className="flex flex-wrap gap-1.5">
                  {selected.types
                    .filter((t): t is PokemonType => !!t)
                    .map((type) => (
                      <TypeBadge key={type} type={type} />
                    ))}
                  {selected.version && (
                    <span
                      className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide"
                      style={{
                        backgroundColor: `${VERSION_COLOR[selected.version]}20`,
                        color: VERSION_COLOR[selected.version],
                        border: `1px solid ${VERSION_COLOR[selected.version]}40`,
                      }}
                    >
                      {VERSION_LABEL[selected.version]} only
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#b9ec86]">
                    Bring these types
                  </h3>
                  {bestAttacking.length === 0 ? (
                    <p className="text-xs font-semibold text-[#554a70]">
                      Nothing hits {selected.name} for extra damage.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {bestAttacking.map(({ type, multiplier }) => (
                        <TypeBadge
                          key={type}
                          type={type}
                          suffix={`${multiplier}×`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#f87171]">
                    Avoid these types
                  </h3>
                  {worstAttacking.length === 0 ? (
                    <p className="text-xs font-semibold text-[#554a70]">
                      No resistances or immunities to worry about.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {worstAttacking.map(({ type, multiplier }) => (
                        <TypeBadge
                          key={type}
                          type={type}
                          suffix={`${multiplier}×`}
                          dim
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function LegendaryCard({
  legendary,
  selected,
  onSelect,
}: {
  legendary: DynamaxLegendary;
  selected: boolean;
  onSelect: () => void;
}) {
  const best = useMemo(() => {
    const effectiveness = getAttackingEffectiveness(
      legendary.types.filter((t): t is PokemonType => !!t),
    );
    return TYPES.map((type) => ({ type, multiplier: effectiveness[type] }))
      .filter((e) => e.multiplier > 1)
      .sort((a, b) => b.multiplier - a.multiplier)
      .slice(0, 3);
  }, [legendary]);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-colors ${
        selected
          ? "border-[#8b5cf6]/60 bg-[#1f1b3a]"
          : "border-[#302a43] bg-[#151421] hover:border-[#8b5cf6]/40"
      }`}
    >
      <div className="flex w-full items-center gap-2.5">
        <PokemonSprite
          src={getLegendarySpriteUrl(legendary.speciesId)}
          alt={legendary.name}
          width={40}
          height={40}
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-black text-[#f8f0df]">
            {legendary.name}
          </h3>
          <div className="mt-1 flex flex-wrap gap-1">
            {legendary.types
              .filter((t): t is PokemonType => !!t)
              .map((type) => (
                <span
                  key={type}
                  className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white/90"
                  style={{ backgroundColor: TYPE_COLORS[type] }}
                >
                  {type}
                </span>
              ))}
          </div>
        </div>
        {legendary.version && (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide"
            style={{
              backgroundColor: `${VERSION_COLOR[legendary.version]}20`,
              color: VERSION_COLOR[legendary.version],
            }}
          >
            {VERSION_LABEL[legendary.version]}
          </span>
        )}
      </div>

      {best.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {best.map(({ type, multiplier }) => (
            <span
              key={type}
              className="rounded-full px-1.5 py-0.5 text-[9px] font-bold text-[#aaa2ba]"
              style={{
                backgroundColor: `${TYPE_COLORS[type]}20`,
                border: `1px solid ${TYPE_COLORS[type]}40`,
              }}
            >
              {type} {multiplier}×
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

function TypeBadge({
  type,
  suffix,
  dim,
}: {
  type: PokemonType;
  suffix?: string;
  dim?: boolean;
}) {
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white/90"
      style={{ backgroundColor: TYPE_COLORS[type], opacity: dim ? 0.55 : 1 }}
    >
      {type}
      {suffix ? ` · ${suffix}` : ""}
    </span>
  );
}
