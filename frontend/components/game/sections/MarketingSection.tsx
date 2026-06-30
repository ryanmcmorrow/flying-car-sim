"use client";

import { Tooltip } from "@/components/game/Tooltip";
import type { MarketingSection as MarketingSectionType } from "@/types/decisions";

const CHANNEL_LABELS: Record<string, string> = {
  tv_online: "TV / ONLINE",
  radio: "RADIO",
  print: "PRINT",
  paid_search: "PAID SEARCH",
};

const CHANNEL_NOTES: Record<string, string> = {
  tv_online: "Reaches the widest audience — commuters, families, thrill-seekers. Strong for aspirational and luxury buyers.",
  radio: "Reaches practical, regional buyers — tradespeople, commuters, rural markets.",
  print: "Reaches affluent, high-consideration buyers who research big purchases. Enthusiast press and luxury lifestyle.",
  paid_search: "Reaches buyers actively shopping now — price-conscious, comparison-driven. Best for value segments.",
};

const EVENT_CATEGORIES = [
  { value: "regulatory_pro", label: "REGULATORY PRO — push friendly regs" },
  { value: "regulatory_anti", label: "REGULATORY ANTI — block rival regs" },
  { value: "economic", label: "ECONOMIC — macro demand influence" },
  { value: "technological", label: "TECHNOLOGICAL — tech adoption push" },
  { value: "competitive", label: "COMPETITIVE — weaken competitors" },
  { value: "environmental", label: "ENVIRONMENTAL — green positioning" },
  { value: "opportunity", label: "OPPORTUNITY — capture market window" },
];

const REGIONS = [
  "WEST_COAST",
  "NORTHEAST",
  "SOUTHEAST",
  "MIDWEST",
  "SOUTHWEST",
] as const;

type RegionKey = (typeof REGIONS)[number];

function fmtM(n: number) {
  return "$" + (n / 1_000_000).toFixed(1) + "M";
}

export function MarketingSection({
  value,
  competitors,
  onChange,
  disabled = false,
}: {
  value: MarketingSectionType;
  competitors: Array<{ teamId: string; brandName: string }>;
  onChange: (v: MarketingSectionType) => void;
  disabled?: boolean;
}) {
  const channelTotal = Object.values(value.channels).reduce((s, v) => s + v, 0);
  const overBudget = channelTotal > 100;
  const regionalTotal = value.regionalBudgetSplit
    ? REGIONS.reduce((s, r) => s + (value.regionalBudgetSplit![r] ?? 0), 0)
    : 100;

  function setChannel(key: keyof MarketingSectionType["channels"], val: number) {
    onChange({ ...value, channels: { ...value.channels, [key]: val } });
  }

  function setRegion(key: RegionKey, pct: number) {
    const split = value.regionalBudgetSplit ?? {
      WEST_COAST: 20,
      NORTHEAST: 20,
      SOUTHEAST: 20,
      MIDWEST: 20,
      SOUTHWEST: 20,
    };
    onChange({ ...value, regionalBudgetSplit: { ...split, [key]: pct } });
  }

  return (
    <div className="space-y-6">
      <h2
        className="pixel-heading"
        style={{ fontSize: "0.8rem", color: "var(--px-pink)" }}
      >
        MARKETING STRATEGY
      </h2>

      {/* Total Budget */}
      <div>
        <label className="pixel-label">TOTAL MARKETING BUDGET ($) <Tooltip text="Total dollars spent on marketing this year. This is your ceiling — channel allocation below cannot exceed it." /></label>
        <input
          type="number"
          min={0}
          value={value.totalBudget || ""}
          disabled={disabled}
          placeholder="e.g. 5000000"
          onChange={(e) =>
            onChange({ ...value, totalBudget: parseInt(e.target.value) || 0 })
          }
          className="pixel-input"
          style={{ maxWidth: 220 }}
        />
        <p style={{ color: "var(--px-gray)", fontFamily: "var(--font-pixel-body), monospace", fontSize: "0.8rem", marginTop: "0.4rem" }}>
          Traditional auto industry median: ~$8M/yr per model. Below $3M and you&apos;re invisible.
        </p>
      </div>

      {/* Brand ↔ Category slider */}
      {(() => {
        const total = value.totalBudget ?? 0;
        const split = value.categorySplit ?? 0;
        const catAmt = Math.round(total * split / 100);
        const brandAmt = total - catAmt;
        return (
          <div>
            <label className="pixel-label">
              SPEND MIX <Tooltip text="Slide toward CATEGORY to grow the total flying car market for everyone. Slide toward BRAND to win demand specifically for you. Both matter — category is a bet on the pie, brand is a bet on your slice." />
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.5rem" }}>
              <span style={{ fontFamily: "var(--font-pixel), monospace", fontSize: "0.45rem", color: "var(--px-cyan)", minWidth: 44, textAlign: "right" }}>BRAND</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={split}
                disabled={disabled}
                onChange={(e) => onChange({ ...value, categorySplit: parseInt(e.target.value) })}
                className="pixel-slider"
                style={{ flex: 1 }}
              />
              <span style={{ fontFamily: "var(--font-pixel), monospace", fontSize: "0.45rem", color: "var(--px-green)", minWidth: 60 }}>CATEGORY</span>
            </div>
            {total > 0 ? (
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.4rem", fontFamily: "var(--font-pixel-body), monospace", fontSize: "0.8rem" }}>
                <span style={{ color: "var(--px-cyan)" }}>${(brandAmt / 1_000_000).toFixed(1)}M brand</span>
                <span style={{ color: "var(--px-green)" }}>${(catAmt / 1_000_000).toFixed(1)}M market growth</span>
              </div>
            ) : (
              <p style={{ fontFamily: "var(--font-pixel-body), monospace", fontSize: "0.8rem", color: "var(--px-gray)", marginTop: "0.4rem" }}>Set a total budget above first.</p>
            )}
          </div>
        );
      })()}

      {/* Tone */}
      <div>
        <label className="pixel-label">Tone <Tooltip text="Positive ads build your own brand equity. Attack ads damage a rival's brand — pick a target below. Attack backfires if you spend less than them on marketing." /></label>
        <div className="flex gap-2">
          {(["positive", "attack"] as const).map((t) => (
            <button
              key={t}
              disabled={disabled}
              onClick={() => onChange({ ...value, tone: t })}
              className={`pixel-btn text-[0.45rem] px-4 py-2 ${
                value.tone === t
                  ? t === "attack"
                    ? "pixel-btn-pink"
                    : "pixel-btn-green"
                  : ""
              }`}
            >
              {t === "positive" ? "POSITIVE" : "ATTACK AD"}
            </button>
          ))}
        </div>
        {value.tone === "attack" && (
          <div className="mt-2">
            <label className="pixel-label">Target Competitor</label>
            <select
              className="pixel-select"
              style={{ maxWidth: 260 }}
              disabled={disabled}
              value={value.attackTargetTeamId ?? ""}
              onChange={(e) =>
                onChange({ ...value, attackTargetTeamId: e.target.value })
              }
            >
              <option value="">Select competitor...</option>
              {competitors.map((c) => (
                <option key={c.teamId} value={c.teamId}>
                  {c.brandName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Channel Allocation */}
      <div>
        <label className="pixel-label">BRAND CHANNEL ALLOCATION (%) <Tooltip text="How you split your brand spend across channels — each targets a different audience. Should total 100%. Category spend is always national/broad." /></label>
        {(() => {
          const brandBudget = Math.round(value.totalBudget * (100 - (value.categorySplit ?? 0)) / 100);
          return (
            <div className="space-y-3">
              {(Object.keys(value.channels) as Array<keyof typeof value.channels>).map((ch) => {
                const pct = value.channels[ch];
                const dollarEst = brandBudget > 0 ? Math.round(brandBudget * pct / 100) : 0;
                return (
                  <div key={ch}>
                    <div style={{ fontFamily: "var(--font-pixel)", fontSize: "0.42rem", color: "var(--px-cyan)", marginBottom: "0.2rem" }}>
                      {CHANNEL_LABELS[ch]}
                    </div>
                    <div style={{ fontFamily: "var(--font-pixel-body)", fontSize: "0.85rem", color: "var(--px-gray)", marginBottom: "0.25rem" }}>
                      {CHANNEL_NOTES[ch]}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={pct > 0 ? String(pct) : ""}
                        disabled={disabled}
                        placeholder="0"
                        onChange={(e) => setChannel(ch, Math.min(100, parseInt(e.target.value) || 0))}
                        className="pixel-input"
                        style={{ maxWidth: 100 }}
                      />
                      <span style={{ fontFamily: "var(--font-pixel-body)", fontSize: "0.85rem", color: "var(--px-gray)" }}>%</span>
                      {brandBudget > 0 && pct > 0 && (
                        <span style={{ fontFamily: "var(--font-pixel-body)", fontSize: "0.85rem", color: "var(--px-amber)" }}>
                          = {fmtM(dollarEst)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Channel total */}
        <div
          className="flex items-center justify-between mt-3 p-2"
          style={{ border: `2px solid ${overBudget ? "var(--px-pink)" : channelTotal === 100 ? "var(--px-green)" : "var(--px-amber)"}` }}
        >
          <span style={{ fontFamily: "var(--font-pixel)", fontSize: "0.45rem", color: overBudget ? "var(--px-pink)" : channelTotal === 100 ? "var(--px-green)" : "var(--px-amber)" }}>
            CHANNEL SPLIT
          </span>
          <span style={{ fontFamily: "var(--font-pixel)", fontSize: "0.55rem", color: overBudget ? "var(--px-pink)" : channelTotal === 100 ? "var(--px-green)" : "var(--px-amber)" }}>
            {channelTotal}% / 100%
          </span>
        </div>
      </div>

      {/* Regional Targeting */}
      <div>
        <label className="pixel-label">Regional Targeting <Tooltip text="National spreads your ad budget evenly across all 5 regions. Targeted lets you concentrate spend — great for defending a strong region or breaking into a new one." /></label>
        <div className="flex gap-2 mb-3">
          {(["national", "targeted"] as const).map((rt) => (
            <button
              key={rt}
              disabled={disabled}
              onClick={() => onChange({ ...value, regionalTargeting: rt })}
              className={`pixel-btn text-[0.45rem] px-4 py-2 ${
                value.regionalTargeting === rt ? "pixel-btn-pink" : ""
              }`}
            >
              {rt.toUpperCase()}
            </button>
          ))}
        </div>

        {value.regionalTargeting === "targeted" && (
          <div className="space-y-2">
            <p
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: "0.42rem",
                color: "var(--px-amber)",
                marginBottom: "0.5rem",
              }}
            >
              REGIONAL BUDGET SPLIT (%)
            </p>
            {REGIONS.map((region) => {
              const pct = value.regionalBudgetSplit?.[region] ?? 0;
              return (
                <div key={region} className="flex items-center gap-3">
                  <span
                    style={{
                      fontFamily: "var(--font-pixel)",
                      fontSize: "0.4rem",
                      color: "var(--px-cyan)",
                      width: 120,
                    }}
                  >
                    {region.replace("_", " ")}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={pct > 0 ? String(pct) : ""}
                    placeholder="0"
                    disabled={disabled}
                    onChange={(e) =>
                      setRegion(region, parseInt(e.target.value) || 0)
                    }
                    className="pixel-input"
                    style={{ width: 70 }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-pixel-body)",
                      fontSize: "1rem",
                      color: "var(--px-gray)",
                    }}
                  >
                    %
                  </span>
                </div>
              );
            })}
            <div
              className="flex items-center justify-between p-2 mt-1"
              style={{
                border: `2px solid ${
                  Math.abs(regionalTotal - 100) < 0.1
                    ? "var(--px-green)"
                    : "var(--px-pink)"
                }`,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-pixel)",
                  fontSize: "0.42rem",
                  color:
                    Math.abs(regionalTotal - 100) < 0.1
                      ? "var(--px-green)"
                      : "var(--px-pink)",
                }}
              >
                TOTAL
              </span>
              <span
                style={{
                  fontFamily: "var(--font-pixel)",
                  fontSize: "0.55rem",
                  color:
                    Math.abs(regionalTotal - 100) < 0.1
                      ? "var(--px-green)"
                      : "var(--px-pink)",
                }}
              >
                {regionalTotal}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
