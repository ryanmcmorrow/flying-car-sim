"use client";

import { getTechTreeUnlocks, TECH_TREE_DEF } from "@/lib/decision-utils";
import type { RdSection as RdSectionType } from "@/types/decisions";

const RECURRING_OPTIONS: {
  key: keyof RdSectionType["recurring"];
  label: string;
  cost: string;
  effect: string;
}[] = [
  { key: "marketingEffectiveness", label: "MARKETING EFFECTIVENESS", cost: "$3M/yr", effect: "Boosts ad ROI" },
  { key: "partDependability", label: "PART DEPENDABILITY", cost: "$5M/yr", effect: "Reduces defect risk" },
  { key: "pricingResearch", label: "PRICING RESEARCH", cost: "$1M/yr", effect: "Better demand forecast" },
  { key: "competitorResearch", label: "COMPETITOR RESEARCH", cost: "$2M/yr", effect: "See rival strategies" },
  { key: "marketResearch", label: "MARKET RESEARCH", cost: "$1.5M/yr", effect: "Segment intelligence" },
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

export function RdSection({
  value,
  existingUnlocks,
  onChange,
  disabled = false,
}: {
  value: RdSectionType;
  existingUnlocks: string[];
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
    const next = value.techTreeUnlocks.includes(key)
      ? value.techTreeUnlocks.filter((k) => k !== key)
      : [...value.techTreeUnlocks, key];
    onChange({ ...value, techTreeUnlocks: next });
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
          RECURRING INVESTMENTS
        </h2>
        <div className="space-y-2">
          {RECURRING_OPTIONS.map((opt) => {
            const checked = value.recurring[opt.key];
            return (
              <button
                key={opt.key}
                disabled={disabled}
                onClick={() => toggleRecurring(opt.key)}
                className={`w-full pixel-card flex items-center gap-3 text-left transition-none ${
                  checked ? "pixel-card-cyan" : ""
                }`}
                style={{
                  borderColor: checked ? "var(--px-cyan)" : "var(--px-gray)",
                  padding: "0.75rem 1rem",
                  cursor: disabled ? "default" : "pointer",
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    border: `2px solid ${checked ? "var(--px-cyan)" : "var(--px-gray)"}`,
                    background: checked ? "var(--px-cyan)" : "transparent",
                    flexShrink: 0,
                  }}
                />
                <div className="flex-1">
                  <div
                    style={{
                      fontFamily: "var(--font-pixel)",
                      fontSize: "0.5rem",
                      color: checked ? "var(--px-cyan)" : "var(--px-white)",
                    }}
                  >
                    {opt.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-pixel-body)",
                      fontSize: "0.9rem",
                      color: "var(--px-gray)",
                    }}
                  >
                    {opt.effect}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-pixel)",
                    fontSize: "0.5rem",
                    color: "var(--px-amber)",
                  }}
                >
                  {opt.cost}
                </div>
              </button>
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
          TECH TREE
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
                TIER {i + 1}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {nodes.map((node) => {
                  const isOwned = existingUnlocks.includes(node.key);
                  const isSelected = value.techTreeUnlocks.includes(node.key);

                  let borderColor = "var(--px-gray)";
                  let textColor = "var(--px-gray)";
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
                          marginTop: "0.25rem",
                        }}
                      >
                        {fmt(node.cost)}
                      </div>
                      {isOwned && (
                        <div
                          style={{
                            fontFamily: "var(--font-pixel)",
                            fontSize: "0.38rem",
                            color: "var(--px-green)",
                            marginTop: "0.2rem",
                          }}
                        >
                          UNLOCKED
                        </div>
                      )}
                      {isSelected && !isOwned && (
                        <div
                          style={{
                            fontFamily: "var(--font-pixel)",
                            fontSize: "0.38rem",
                            color: TIER_COLORS[node.tier],
                            marginTop: "0.2rem",
                          }}
                        >
                          INVESTING
                        </div>
                      )}
                      {!node.available && !isOwned && !isSelected && (
                        <div
                          style={{
                            fontFamily: "var(--font-pixel)",
                            fontSize: "0.35rem",
                            color: "var(--px-gray)",
                            marginTop: "0.2rem",
                          }}
                        >
                          REQUIRES: {node.prereqs.join(", ")}
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
