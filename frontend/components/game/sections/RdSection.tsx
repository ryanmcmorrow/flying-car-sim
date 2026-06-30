"use client";

import { Tooltip } from "@/components/game/Tooltip";
import { getTechTreeUnlocks, TECH_TREE_DEF, type TechNode } from "@/lib/decision-utils";
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
];

const RECURRING_COSTS: Record<keyof RdSectionType["recurring"], number> = {
  marketingEffectiveness: 3_000_000,
  partDependability: 5_000_000,
  pricingResearch: 1_000_000,
  competitorResearch: 2_000_000,
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

  // Group nodes by tree, sorted by tier — for vertical chain layout
  const mainTrees = ["mfg", "aero", "power", "market"] as const;
  const byTree: Record<string, TechNode[]> = {};
  for (const node of techNodes.filter((n) => n.tree !== "segment")) {
    (byTree[node.tree] ??= []).push(node);
    byTree[node.tree].sort((a, b) => a.tier - b.tier);
  }
  const segmentNodes = techNodes.filter((n) => n.tree === "segment");

  const TREE_META: Record<string, { label: string; color: string }> = {
    mfg:    { label: "MANUFACTURING",  color: "var(--px-cyan)"  },
    aero:   { label: "AERODYNAMICS",   color: "var(--px-green)" },
    power:  { label: "POWER / GREEN",  color: "var(--px-amber)" },
    market: { label: "MARKET INTEL",   color: "var(--px-pink)"  },
  };

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

      {/* Tech Tree — vertical chains, one column per research path */}
      <div>
        <h2
          className="pixel-heading mb-3"
          style={{ fontSize: "0.75rem", color: "var(--px-cyan)" }}
        >
          Tech Tree <Tooltip text="One-time investments that permanently unlock capabilities. Each path must be researched in order — you can't skip tiers. You may advance one tier per path per year, but you can invest in multiple paths at once. Once unlocked, you own it forever." />
        </h2>

        {/* 4 vertical chains side-by-side */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem", alignItems: "start" }}>
          {mainTrees.map((tree) => {
            const meta = TREE_META[tree];
            const nodes = byTree[tree] ?? [];
            return (
              <div key={tree}>
                {/* Tree header */}
                <div style={{
                  fontFamily: "var(--font-pixel)",
                  fontSize: "0.38rem",
                  color: meta.color,
                  letterSpacing: "0.08em",
                  textAlign: "center",
                  marginBottom: "0.4rem",
                  paddingBottom: "0.25rem",
                  borderBottom: `2px solid ${meta.color}`,
                }}>
                  {meta.label}
                </div>

                {nodes.map((node, idx) => {
                  const isOwned = existingUnlocks.includes(node.key);
                  const isSelected = value.techTreeUnlocks.includes(node.key);

                  let borderColor = "var(--px-gray)";
                  let textColor = "#666";
                  if (isOwned) {
                    borderColor = "var(--px-green)";
                    textColor = "var(--px-green)";
                  } else if (isSelected) {
                    borderColor = meta.color;
                    textColor = meta.color;
                  } else if (node.available) {
                    borderColor = meta.color;
                    textColor = "var(--px-white)";
                  }

                  return (
                    <div key={node.key}>
                      <button
                        disabled={disabled || isOwned || (!node.available && !isSelected)}
                        onClick={() => !isOwned && toggleTechUnlock(node.key)}
                        style={{
                          display: "block",
                          width: "100%",
                          border: `2px solid ${borderColor}`,
                          background: isOwned
                            ? "rgba(57,255,20,0.05)"
                            : isSelected
                            ? "rgba(0,245,255,0.08)"
                            : node.available
                            ? "var(--px-bg-2)"
                            : "rgba(0,0,0,0.3)",
                          padding: "0.5rem",
                          cursor: isOwned || (!node.available && !isSelected) || disabled ? "default" : "pointer",
                          textAlign: "left",
                        }}
                      >
                        {/* Tier badge */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.2rem" }}>
                          <div style={{ fontFamily: "var(--font-pixel)", fontSize: "0.42rem", color: textColor, lineHeight: 1.3 }}>
                            {node.name}
                          </div>
                          <div style={{ fontFamily: "var(--font-pixel)", fontSize: "0.3rem", color: "#555", flexShrink: 0, marginLeft: "0.2rem" }}>
                            T{node.tier}
                          </div>
                        </div>
                        <div style={{ fontFamily: "var(--font-pixel-body)", fontSize: "0.85rem", color: isOwned || isSelected ? "var(--px-amber)" : "#888", marginBottom: "0.2rem" }}>
                          {fmt(node.cost)}
                        </div>
                        <div style={{ fontFamily: "var(--font-pixel-body)", fontSize: "0.75rem", color: isOwned ? "#666" : isSelected ? "var(--px-cyan)" : node.available ? "#aaaacc" : "#555", lineHeight: 1.4 }}>
                          {node.desc}
                        </div>

                        {isOwned && (
                          <div style={{ fontFamily: "var(--font-pixel)", fontSize: "0.35rem", color: "var(--px-green)", marginTop: "0.25rem" }}>
                            ✓ UNLOCKED
                          </div>
                        )}
                        {isOwned && ownedExclusives[node.key] && (
                          <div style={{ fontFamily: "var(--font-pixel)", fontSize: "0.3rem", color: "var(--px-cyan)", marginTop: "0.1rem", padding: "0.1rem 0.25rem", border: "1px solid var(--px-cyan)", background: "rgba(0,245,255,0.07)", display: "inline-block" }}>
                            EXCLUSIVE Yr {ownedExclusives[node.key]}
                          </div>
                        )}
                        {isSelected && !isOwned && (
                          <div style={{ fontFamily: "var(--font-pixel)", fontSize: "0.35rem", color: meta.color, marginTop: "0.25rem" }}>
                            ▶ INVESTING...
                          </div>
                        )}
                        {!isOwned && !isSelected && competitorExclusives[node.key] && (
                          <div style={{ fontFamily: "var(--font-pixel)", fontSize: "0.3rem", color: "var(--px-amber)", marginTop: "0.1rem", padding: "0.1rem 0.25rem", border: "1px solid var(--px-amber)", background: "rgba(255,190,11,0.07)", display: "inline-block" }}>
                            ⚠ RIVAL HOLDS Yr {competitorExclusives[node.key]}
                          </div>
                        )}
                        {!node.available && !isOwned && !isSelected && (
                          <div style={{ fontFamily: "var(--font-pixel)", fontSize: "0.3rem", color: "#666", marginTop: "0.15rem" }}>
                            🔒 {node.prereqs.map((p: string) => TECH_TREE_DEF.find((n) => n.key === p)?.name ?? p).join(" + ")}
                          </div>
                        )}
                      </button>

                      {/* Chain connector between nodes */}
                      {idx < nodes.length - 1 && (
                        <div style={{ textAlign: "center", color: isOwned ? "var(--px-green)" : "#444", fontSize: "0.7rem", lineHeight: 1, padding: "0.15rem 0", userSelect: "none" }}>
                          ▼
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Segment Platform Investments — separate section below the main chains */}
        {segmentNodes.length > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <div style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "0.38rem",
              color: "#b48cde",
              letterSpacing: "0.08em",
              marginBottom: "0.4rem",
              paddingBottom: "0.25rem",
              borderBottom: "2px solid #b48cde",
            }}>
              SEGMENT PLATFORMS — pick at most one per year, permanently yours
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.4rem" }}>
              {segmentNodes.map((node) => {
                const isOwned = existingUnlocks.includes(node.key);
                const isSelected = value.techTreeUnlocks.includes(node.key);
                const segColor = "#b48cde";

                let borderColor = "var(--px-gray)";
                let textColor = "#666";
                if (isOwned) { borderColor = "var(--px-green)"; textColor = "var(--px-green)"; }
                else if (isSelected) { borderColor = segColor; textColor = segColor; }
                else if (node.available) { borderColor = segColor; textColor = "var(--px-white)"; }

                return (
                  <button
                    key={node.key}
                    disabled={disabled || isOwned || (!node.available && !isSelected)}
                    onClick={() => !isOwned && toggleTechUnlock(node.key)}
                    style={{
                      display: "block",
                      width: "100%",
                      border: `2px solid ${borderColor}`,
                      background: isOwned ? "rgba(57,255,20,0.05)" : isSelected ? "rgba(180,140,222,0.1)" : node.available ? "var(--px-bg-2)" : "rgba(0,0,0,0.3)",
                      padding: "0.5rem",
                      cursor: isOwned || (!node.available && !isSelected) || disabled ? "default" : "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontFamily: "var(--font-pixel)", fontSize: "0.38rem", color: textColor, lineHeight: 1.3, marginBottom: "0.15rem" }}>
                      {node.name}
                    </div>
                    <div style={{ fontFamily: "var(--font-pixel-body)", fontSize: "0.8rem", color: isOwned || isSelected ? "var(--px-amber)" : "#888", marginBottom: "0.15rem" }}>
                      {fmt(node.cost)}
                    </div>
                    <div style={{ fontFamily: "var(--font-pixel-body)", fontSize: "0.72rem", color: isOwned ? "#666" : isSelected ? segColor : node.available ? "#aaaacc" : "#555", lineHeight: 1.35 }}>
                      {node.desc}
                    </div>
                    {isOwned && <div style={{ fontFamily: "var(--font-pixel)", fontSize: "0.32rem", color: "var(--px-green)", marginTop: "0.2rem" }}>✓ UNLOCKED</div>}
                    {isSelected && !isOwned && <div style={{ fontFamily: "var(--font-pixel)", fontSize: "0.32rem", color: segColor, marginTop: "0.2rem" }}>▶ INVESTING...</div>}
                    {!isOwned && !isSelected && competitorExclusives[node.key] && (
                      <div style={{ fontFamily: "var(--font-pixel)", fontSize: "0.28rem", color: "var(--px-amber)", marginTop: "0.1rem", padding: "0.1rem 0.2rem", border: "1px solid var(--px-amber)", background: "rgba(255,190,11,0.07)", display: "inline-block" }}>
                        ⚠ RIVAL HOLDS Yr {competitorExclusives[node.key]}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
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
