"use client";

import type { MarketingSection as MarketingSectionType } from "@/types/decisions";

const CHANNEL_MINIMUMS: Record<string, number> = {
  tv_online: 2_000_000,
  radio: 500_000,
  print: 300_000,
  paid_search: 800_000,
};

const CHANNEL_LABELS: Record<string, string> = {
  tv_online: "TV / ONLINE",
  radio: "RADIO",
  print: "PRINT",
  paid_search: "PAID SEARCH",
};

const CHANNEL_NOTES: Record<string, string> = {
  tv_online: "Best for brand awareness — min $2M",
  radio: "Local market boost — min $500K",
  print: "Print/outdoor reach — min $300K",
  paid_search: "Best for compact/sedan demand — min $800K",
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
  const overBudget = channelTotal > value.totalBudget && value.totalBudget > 0;
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
        <label className="pixel-label">TOTAL MARKETING BUDGET ($)</label>
        <input
          type="number"
          min={0}
          value={value.totalBudget || ""}
          disabled={disabled}
          placeholder="Enter total budget..."
          onChange={(e) =>
            onChange({ ...value, totalBudget: parseInt(e.target.value) || 0 })
          }
          className="pixel-input"
          style={{ maxWidth: 220 }}
        />
      </div>

      {/* Messaging Type */}
      <div>
        <label className="pixel-label">MESSAGING TYPE</label>
        <div className="flex gap-2">
          {(["category", "brand"] as const).map((mt) => (
            <button
              key={mt}
              disabled={disabled}
              onClick={() => onChange({ ...value, messagingType: mt })}
              className={`pixel-btn text-[0.45rem] px-4 py-2 ${
                value.messagingType === mt ? "pixel-btn-pink" : ""
              }`}
            >
              {mt === "category" ? "CATEGORY" : "BRAND"}
            </button>
          ))}
        </div>
        <p
          style={{
            fontFamily: "var(--font-pixel-body)",
            fontSize: "0.9rem",
            color: "var(--px-gray)",
            marginTop: "0.25rem",
          }}
        >
          {value.messagingType === "category"
            ? "Grow the whole flying car market — benefits all teams"
            : "Promote YOUR brand specifically — targeted reach"}
        </p>
      </div>

      {/* Tone */}
      <div>
        <label className="pixel-label">TONE</label>
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
            <label className="pixel-label">TARGET COMPETITOR</label>
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
        <label className="pixel-label">CHANNEL ALLOCATION ($)</label>
        <div className="space-y-3">
          {(Object.keys(value.channels) as Array<keyof typeof value.channels>).map(
            (ch) => {
              const v2 = value.channels[ch];
              const min = CHANNEL_MINIMUMS[ch];
              const tooLow = v2 > 0 && v2 < min;
              return (
                <div key={ch}>
                  <div
                    style={{
                      fontFamily: "var(--font-pixel)",
                      fontSize: "0.42rem",
                      color: "var(--px-cyan)",
                      marginBottom: "0.2rem",
                    }}
                  >
                    {CHANNEL_LABELS[ch]}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-pixel-body)",
                      fontSize: "0.85rem",
                      color: "var(--px-gray)",
                      marginBottom: "0.25rem",
                    }}
                  >
                    {CHANNEL_NOTES[ch]}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={v2 || ""}
                      disabled={disabled}
                      placeholder="0"
                      onChange={(e) =>
                        setChannel(ch, parseInt(e.target.value) || 0)
                      }
                      className="pixel-input"
                      style={{ maxWidth: 160 }}
                    />
                    {tooLow && (
                      <span
                        style={{
                          fontFamily: "var(--font-pixel)",
                          fontSize: "0.38rem",
                          color: "var(--px-pink)",
                        }}
                      >
                        MIN {fmtM(min)}
                      </span>
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>

        {/* Channel total vs budget */}
        <div
          className="flex items-center justify-between mt-3 p-2"
          style={{
            border: `2px solid ${overBudget ? "var(--px-pink)" : "var(--px-amber)"}`,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "0.45rem",
              color: overBudget ? "var(--px-pink)" : "var(--px-amber)",
            }}
          >
            CHANNELS vs BUDGET
          </span>
          <span
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "0.55rem",
              color: overBudget ? "var(--px-pink)" : "var(--px-green)",
            }}
          >
            {fmtM(channelTotal)} / {fmtM(value.totalBudget)}
          </span>
        </div>
      </div>

      {/* Regional Targeting */}
      <div>
        <label className="pixel-label">REGIONAL TARGETING</label>
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
                    value={pct}
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
