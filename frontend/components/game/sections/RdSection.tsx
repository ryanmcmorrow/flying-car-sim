"use client";

import { Tooltip } from "@/components/game/Tooltip";
import { getTechTreeUnlocks, TECH_TREE_DEF } from "@/lib/decision-utils";
import type { RdSection as RdSectionType } from "@/types/decisions";

const RECURRING_OPTIONS: {
  key: keyof RdSectionType["recurring"];
  label: string;
  cost: string;
  effect: string;
  detail: string;
  needsTarget?: "competitor" | "vehicleType" | "region";
}[] = [
  {
    key: "marketingEffectiveness",
    label: "Marketing Effectiveness",
    cost: "$3M/yr",
    effect: "Higher ad ROI",
    detail: "Your marketing budget works harder — same spend generates more brand awareness and demand lift. Effect compounds with brand-targeted campaigns.",
  },
  {
    key: "partDependability",
    label: "Part Dependability",
    cost: "$5M/yr",
    effect: "Lower defect & recall risk",
    detail: "Ongoing QA investment reduces defect rates, lowers recall probability, and improves reliability scores across all your vehicle models.",
  },
  {
    key: "pricingResearch",
    label: "Pricing Research",
    cost: "$1M/yr",
    effect: "See the demand curve for a segment",
    detail: "In Results, see how demand in your chosen segment responds across the price range — where buyers start dropping off as price climbs. You read the curve; you decide where to sit on it.",
    needsTarget: "vehicleType",
  },
  {
    key: "competitorResearch",
    label: "Competitor Research",
    cost: "$2M/yr",
    effect: "Track a rival's prices & volumes",
    detail: "In Results, you'll see your chosen competitor's sale prices and units sold per model — know what you're up against before the next round.",
    needsTarget: "competitor",
  },
  {
    key: "marketResearch",
    label: "Regional Demand Signals",
    cost: "$1.5M/yr",
    effect: "Soft demand signals for one region/yr",
    detail: "Each round in Results, you'll see a qualitative HIGH / MEDIUM / LOW demand breakdown by vehicle type for your chosen region. Renew each year. For exact numbers, use Market Intelligence (one-time unlocks below).",
    needsTarget: "region",
  },
];

const RECURRING_COSTS: Record<keyof RdSectionType["recurring"], number> = {
  marketingEffectiveness: 3_000_000,
  partDependability: 5_000_000,
  pricingResearch: 1_000_000,
  competitorResearch: 2_000_000,
  marketResearch: 1_500_000,
};

const TIER_COLORS: Record<number, string> = {
  1: "var(--px-cyan)",
  2: "var(--px-green)",
  3: "var(--px-amber)",
  4: "var(--px-pink)",
};

function fmt(n: number) {
  return "$" + (n / 1_000_000).toFixed(0) + "M";
}

const INTEL_REGIONS = [
  { key: "intel_region_WEST_COAST", label: "WEST COAST", short: "WC" },
  { key: "intel_region_NORTHEAST",  label: "NORTHEAST",  short: "NE" },
  { key: "intel_region_SOUTHEAST",  label: "SOUTHEAST",  short: "SE" },
  { key: "intel_region_MIDWEST",    label: "MIDWEST",    short: "MW" },
  { key: "intel_region_SOUTHWEST",  label: "SOUTHWEST",  short: "SW" },
];
const INTEL_TYPES = [
  { key: "intel_type_COMPACT",    label: "COMPACT"     },
  { key: "intel_type_SEDAN",      label: "SEDAN"       },
  { key: "intel_type_SUV",        label: "SUV"         },
  { key: "intel_type_SPORTS_CAR", label: "SPORTS CAR"  },
  { key: "intel_type_TRUCK",      label: "TRUCK"       },
];
const INTEL_COST = 2_000_000;

function MarketIntelSection({
  value,
  existingUnlocks,
  onChange,
  disabled,
}: {
  value: RdSectionType;
  existingUnlocks: string[];
  onChange: (v: RdSectionType) => void;
  disabled: boolean;
}) {
  const hasAnalytics = existingUnlocks.includes("market_analytics") || value.techTreeUnlocks.includes("market_analytics");
  const purchases = value.intelPurchases ?? [];

  function toggle(key: string) {
    if (purchases.includes(key)) {
      onChange({ ...value, intelPurchases: purchases.filter((k) => k !== key) });
    } else {
      onChange({ ...value, intelPurchases: [...purchases, key] });
    }
  }

  const px = "var(--font-pixel), monospace";
  const body = "var(--font-pixel-body), monospace";

  return (
    <div>
      <h2 className="pixel-heading mb-1" style={{ fontSize: "0.65rem", color: "var(--px-amber)" }}>
        Market Intelligence — Exact Numbers <Tooltip text="One-time $2M purchases that permanently unlock precise demand figures in Results (not qualitative signals — real numbers). Region intel: exact demand by vehicle type for one region. Type intel: exact total demand for one vehicle type across all regions. Requires Market Analytics tech unlock. Pay once, revealed forever." />
      </h2>
      {!hasAnalytics ? (
        <div className="pixel-card" style={{ borderColor: "var(--px-gray)", padding: "0.75rem" }}>
          <p style={{ fontFamily: px, fontSize: "0.38rem", color: "var(--px-gray)" }}>
            🔒 REQUIRES: Market Analytics (Tier 1 tech tree)
          </p>
          <p style={{ fontFamily: body, fontSize: "0.9rem", color: "var(--px-gray)", marginTop: "0.2rem" }}>
            Unlock Market Analytics first to access demand intelligence subscriptions.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Region intel */}
          <div>
            <p style={{ fontFamily: px, fontSize: "0.38rem", color: "var(--px-gray)", marginBottom: "0.3rem" }}>
              REGIONAL INTEL — reveals demand for all vehicle types in that region ($2M each, permanent)
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {INTEL_REGIONS.map(({ key, label }) => {
                const owned = existingUnlocks.includes(key);
                const selected = purchases.includes(key);
                return (
                  <button key={key} disabled={disabled || owned}
                    onClick={() => !owned && toggle(key)}
                    style={{
                      fontFamily: px, fontSize: "0.38rem", padding: "0.35rem 0.6rem",
                      border: `2px solid ${owned ? "var(--px-green)" : selected ? "var(--px-amber)" : "var(--px-gray)"}`,
                      color: owned ? "var(--px-green)" : selected ? "var(--px-amber)" : "var(--px-gray)",
                      background: owned ? "rgba(57,255,20,0.06)" : selected ? "rgba(255,190,11,0.08)" : "transparent",
                      cursor: owned || disabled ? "default" : "pointer",
                    }}
                  >
                    {owned ? "✓ " : selected ? "● " : "🔒 "}{label}{!owned && !selected ? ` $2M` : ""}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Type intel */}
          <div>
            <p style={{ fontFamily: px, fontSize: "0.38rem", color: "var(--px-gray)", marginBottom: "0.3rem" }}>
              SEGMENT INTEL — reveals total demand for that vehicle type across all regions ($2M each, permanent)
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {INTEL_TYPES.map(({ key, label }) => {
                const owned = existingUnlocks.includes(key);
                const selected = purchases.includes(key);
                return (
                  <button key={key} disabled={disabled || owned}
                    onClick={() => !owned && toggle(key)}
                    style={{
                      fontFamily: px, fontSize: "0.38rem", padding: "0.35rem 0.6rem",
                      border: `2px solid ${owned ? "var(--px-green)" : selected ? "var(--px-amber)" : "var(--px-gray)"}`,
                      color: owned ? "var(--px-green)" : selected ? "var(--px-amber)" : "var(--px-gray)",
                      background: owned ? "rgba(57,255,20,0.06)" : selected ? "rgba(255,190,11,0.08)" : "transparent",
                      cursor: owned || disabled ? "default" : "pointer",
                    }}
                  >
                    {owned ? "✓ " : selected ? "● " : "🔒 "}{label}{!owned && !selected ? ` $2M` : ""}
                  </button>
                );
              })}
            </div>
          </div>

          {purchases.length > 0 && (
            <p style={{ fontFamily: px, fontSize: "0.38rem", color: "var(--px-amber)" }}>
              ● {purchases.length} intel subscription{purchases.length > 1 ? "s" : ""} selected → ${(purchases.length * INTEL_COST / 1_000_000).toFixed(0)}M added to R&D spend
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const VEHICLE_TYPES = [
  { key: "COMPACT",    label: "COMPACT"    },
  { key: "SEDAN",      label: "SEDAN"      },
  { key: "SUV",        label: "SUV"        },
  { key: "SPORTS_CAR", label: "SPORTS CAR" },
  { key: "TRUCK",      label: "TRUCK"      },
];

const REGIONS_LIST = [
  { key: "WEST_COAST", label: "WEST COAST" },
  { key: "NORTHEAST",  label: "NORTHEAST"  },
  { key: "SOUTHEAST",  label: "SOUTHEAST"  },
  { key: "MIDWEST",    label: "MIDWEST"    },
  { key: "SOUTHWEST",  label: "SOUTHWEST"  },
];

export function RdSection({
  value,
  existingUnlocks,
  ownedExclusives = {},
  competitorExclusives = {},
  competitors = [],
  onChange,
  disabled = false,
}: {
  value: RdSectionType;
  existingUnlocks: string[];
  ownedExclusives?: Record<string, number>;
  competitorExclusives?: Record<string, number>;
  competitors?: Array<{ teamId: string; brandName: string }>;
  onChange: (v: RdSectionType) => void;
  disabled?: boolean;
}) {
  const techNodes = getTechTreeUnlocks(existingUnlocks, value.techTreeUnlocks);

  const recurringTotal = (
    Object.keys(value.recurring) as Array<keyof RdSectionType["recurring"]>
  ).reduce(
    (sum, k) => sum + (value.recurring[k] ? RECURRING_COSTS[k] : 0),
    0
  );

  const techTotal = value.techTreeUnlocks.reduce((sum, key) => {
    const node = TECH_TREE_DEF.find((n) => n.key === key);
    return sum + (node?.cost ?? 0);
  }, 0);

  const totalRdSpend = recurringTotal + techTotal;

  function toggleRecurring(key: keyof RdSectionType["recurring"]) {
    onChange({
      ...value,
      recurring: { ...value.recurring, [key]: !value.recurring[key] },
    });
  }

  function toggleTechUnlock(key: string) {
    if (value.techTreeUnlocks.includes(key)) {
      onChange({ ...value, techTreeUnlocks: value.techTreeUnlocks.filter((k) => k !== key) });
      return;
    }
    // One unlock per tree per round — replace any existing selection from the SAME tree,
    // but keep selections from other trees.
    const tree = TECH_TREE_DEF.find((n) => n.key === key)?.tree;
    const kept = value.techTreeUnlocks.filter(
      (k) => TECH_TREE_DEF.find((n) => n.key === k)?.tree !== tree
    );
    onChange({ ...value, techTreeUnlocks: [...kept, key] });
  }

  // Group tech nodes by tier
  const byTier = [1, 2, 3, 4].map((tier) =>
    techNodes.filter((n) => n.tier === tier)
  );

  return (
    <div className="space-y-6">
      {/* Recurring Investments */}
      <div>
        <h2
          className="pixel-heading mb-3"
          style={{ fontSize: "0.75rem", color: "var(--px-cyan)" }}
        >
          Recurring Investments <Tooltip text="Annual programs billed every year you keep them active. They improve long-term capabilities but are ongoing cash commitments." />
        </h2>
        <div className="space-y-2">
          {RECURRING_OPTIONS.map((opt) => {
            const checked = value.recurring[opt.key];
            const targets = value.recurringTargets ?? {};
            const currentTarget = targets[opt.key as keyof typeof targets] ?? "";

            const targetOptions =
              opt.needsTarget === "competitor" ? competitors.map((c) => ({ key: c.teamId, label: c.brandName }))
              : opt.needsTarget === "vehicleType" ? VEHICLE_TYPES
              : opt.needsTarget === "region" ? REGIONS_LIST
              : [];

            return (
              <div key={opt.key} className={`pixel-card ${checked ? "pixel-card-cyan" : ""}`}
                style={{ borderColor: checked ? "var(--px-cyan)" : "var(--px-gray)", padding: "0.75rem 1rem" }}
              >
                {/* Header row */}
                <button
                  disabled={disabled}
                  onClick={() => toggleRecurring(opt.key)}
                  className="w-full flex items-center gap-3 text-left"
                  style={{ cursor: disabled ? "default" : "pointer", background: "transparent", border: "none" }}
                >
                  <div style={{
                    width: 16, height: 16, flexShrink: 0,
                    border: `2px solid ${checked ? "var(--px-cyan)" : "var(--px-gray)"}`,
                    background: checked ? "var(--px-cyan)" : "transparent",
                  }} />
                  <div className="flex-1">
                    <div style={{ fontFamily: "var(--font-pixel)", fontSize: "0.5rem", color: checked ? "var(--px-cyan)" : "var(--px-white)" }}>
                      {opt.label}
                    </div>
                    <div style={{ fontFamily: "var(--font-pixel-body)", fontSize: "0.85rem", color: "var(--px-gray)", marginTop: "0.1rem" }}>
                      {opt.effect}
                    </div>
                  </div>
                  <div style={{ fontFamily: "var(--font-pixel)", fontSize: "0.5rem", color: "var(--px-amber)", flexShrink: 0 }}>
                    {opt.cost}
                  </div>
                </button>

                {/* Detail description */}
                <p style={{ fontFamily: "var(--font-pixel-body)", fontSize: "0.85rem", color: checked ? "var(--px-white)" : "#888", marginTop: "0.4rem", lineHeight: 1.4 }}>
                  {opt.detail}
                </p>

                {/* Target picker (shown when checked and there are options) */}
                {checked && opt.needsTarget && targetOptions.length > 0 && (
                  <div style={{ marginTop: "0.5rem" }}>
                    <p style={{ fontFamily: "var(--font-pixel)", fontSize: "0.35rem", color: "var(--px-amber)", marginBottom: "0.25rem" }}>
                      {opt.needsTarget === "competitor" ? "▶ Which rival?" : opt.needsTarget === "vehicleType" ? "▶ Which segment?" : "▶ Which region?"}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                      {targetOptions.map((t) => {
                        const active = currentTarget === t.key;
                        return (
                          <button key={t.key} disabled={disabled}
                            onClick={() => {
                              const next = { ...targets, [opt.key]: active ? "" : t.key };
                              onChange({ ...value, recurringTargets: next });
                            }}
                            style={{
                              fontFamily: "var(--font-pixel)", fontSize: "0.35rem", padding: "0.25rem 0.5rem",
                              border: `2px solid ${active ? "var(--px-amber)" : "var(--px-gray)"}`,
                              color: active ? "var(--px-amber)" : "var(--px-gray)",
                              background: active ? "rgba(255,190,11,0.1)" : "transparent",
                              cursor: disabled ? "default" : "pointer",
                            }}
                          >{t.label}</button>
                        );
                      })}
                    </div>
                    {!currentTarget && (
                      <p style={{ fontFamily: "var(--font-pixel)", fontSize: "0.32rem", color: "var(--px-pink)", marginTop: "0.2rem" }}>
                        ⚠ Select a target to activate this research
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tech Tree */}
      <div>
        <h2
          className="pixel-heading mb-3"
          style={{ fontSize: "0.75rem", color: "var(--px-cyan)" }}
        >
          Tech Tree <Tooltip text="One-time investments that permanently unlock capabilities. Higher tiers require lower-tier nodes first. You may research one tier per tree each round — invest across multiple trees at once, but not two tiers of the same tree. Once unlocked, you own it forever." />
        </h2>
        <div className="space-y-4">
          {byTier.map((nodes, i) => (
            <div key={i + 1}>
              <div
                style={{
                  fontFamily: "var(--font-pixel)",
                  fontSize: "0.45rem",
                  color: TIER_COLORS[i + 1],
                  marginBottom: "0.5rem",
                  letterSpacing: "0.1em",
                }}
              >
                Tier {i + 1}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {nodes.map((node) => {
                  const isOwned = existingUnlocks.includes(node.key);
                  const isSelected = value.techTreeUnlocks.includes(node.key);

                  let borderColor = "var(--px-gray)";
                  let textColor = "#777";
                  if (isOwned) {
                    borderColor = "var(--px-green)";
                    textColor = "var(--px-green)";
                  } else if (isSelected) {
                    borderColor = TIER_COLORS[node.tier];
                    textColor = TIER_COLORS[node.tier];
                  } else if (node.available) {
                    borderColor = "var(--px-cyan)";
                    textColor = "var(--px-white)";
                  }

                  return (
                    <button
                      key={node.key}
                      disabled={disabled || isOwned || (!node.available && !isSelected)}
                      onClick={() => !isOwned && toggleTechUnlock(node.key)}
                      style={{
                        border: `3px solid ${borderColor}`,
                        background: isSelected
                          ? "rgba(0,245,255,0.08)"
                          : "var(--px-bg-2)",
                        padding: "0.6rem",
                        cursor:
                          isOwned || (!node.available && !isSelected) || disabled
                            ? "default"
                            : "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "var(--font-pixel)",
                          fontSize: "0.42rem",
                          color: textColor,
                          lineHeight: 1.4,
                        }}
                      >
                        {node.name}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-pixel-body)",
                          fontSize: "0.85rem",
                          color: "var(--px-amber)",
                          marginTop: "0.2rem",
                        }}
                      >
                        {fmt(node.cost)}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-pixel-body)",
                          fontSize: "0.8rem",
                          color: isOwned ? "var(--px-gray)" : isSelected ? "var(--px-cyan)" : "#aaaacc",
                          marginTop: "0.3rem",
                          lineHeight: 1.45,
                        }}
                      >
                        {node.desc}
                      </div>
                      {isOwned && (
                        <div style={{ fontFamily: "var(--font-pixel)", fontSize: "0.38rem", color: "var(--px-green)", marginTop: "0.2rem" }}>
                          ✓ Unlocked
                        </div>
                      )}
                      {isOwned && ownedExclusives[node.key] && (
                        <div style={{ fontFamily: "var(--font-pixel)", fontSize: "0.32rem", color: "var(--px-cyan)", marginTop: "0.15rem", padding: "0.15rem 0.3rem", border: "1px solid var(--px-cyan)", background: "rgba(0,245,255,0.07)" }}>
                          🔒 EXCLUSIVE — Yr {ownedExclusives[node.key]}
                        </div>
                      )}
                      {isSelected && !isOwned && (
                        <div style={{ fontFamily: "var(--font-pixel)", fontSize: "0.38rem", color: TIER_COLORS[node.tier], marginTop: "0.2rem" }}>
                          Investing...
                        </div>
                      )}
                      {!isOwned && !isSelected && competitorExclusives[node.key] && (
                        <div style={{ fontFamily: "var(--font-pixel)", fontSize: "0.32rem", color: "var(--px-amber)", marginTop: "0.15rem", padding: "0.15rem 0.3rem", border: "1px solid var(--px-amber)", background: "rgba(255,190,11,0.07)" }}>
                          ⚠ RIVAL HOLDS — until Yr {competitorExclusives[node.key]}
                        </div>
                      )}
                      {!node.available && !isOwned && !isSelected && !competitorExclusives[node.key] && (
                        <div style={{ fontFamily: "var(--font-pixel)", fontSize: "0.35rem", color: "#9999bb", marginTop: "0.2rem" }}>
                          Needs: {node.prereqs.map((p) => TECH_TREE_DEF.find((n) => n.key === p)?.name ?? p).join(", ")}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Market Intelligence */}
      <MarketIntelSection
        value={value}
        existingUnlocks={existingUnlocks}
        onChange={onChange}
        disabled={disabled}
      />

      {/* Total R&D Spend */}
      <div
        className="pixel-border p-3 flex items-center justify-between"
        style={{ borderColor: "var(--px-amber)" }}
      >
        <span
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: "0.55rem",
            color: "var(--px-amber)",
          }}
        >
          TOTAL R&D SPEND
        </span>
        <span
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: "0.75rem",
            color: "var(--px-amber)",
          }}
        >
          ${(totalRdSpend / 1_000_000).toFixed(1)}M
        </span>
      </div>
    </div>
  );
}
