"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ── Helper: aggregate byRegion data across all model results ────────────────
type RegionKey = "WEST_COAST" | "NORTHEAST" | "SOUTHEAST" | "MIDWEST" | "SOUTHWEST";

const EMPTY_REGION = () => ({ allocated: 0, sold: 0 });

function aggregateRegions(modelResults: TeamResultData["modelResults"]) {
  const out: Record<RegionKey, { allocated: number; sold: number }> = {
    WEST_COAST: EMPTY_REGION(),
    NORTHEAST: EMPTY_REGION(),
    SOUTHEAST: EMPTY_REGION(),
    MIDWEST: EMPTY_REGION(),
    SOUTHWEST: EMPTY_REGION(),
  };
  for (const m of modelResults ?? []) {
    for (const r of m.byRegion ?? []) {
      const k = r.region as RegionKey;
      if (out[k]) { out[k].allocated += r.allocated; out[k].sold += r.sold; }
    }
  }
  return out;
}

// ── US Region Map ───────────────────────────────────────────────────────────
const REGION_CELLS: Array<{ id: RegionKey; label: string; x: number; y: number; w: number; h: number }> = [
  { id: "WEST_COAST", label: "WEST\nCOAST",  x: 0,   y: 0,   w: 74,  h: 220 },
  { id: "MIDWEST",    label: "MIDWEST",       x: 78,  y: 0,   w: 204, h: 130 },
  { id: "NORTHEAST",  label: "NORTHEAST",     x: 286, y: 0,   w: 134, h: 130 },
  { id: "SOUTHWEST",  label: "SOUTHWEST",     x: 78,  y: 134, w: 164, h: 86  },
  { id: "SOUTHEAST",  label: "SOUTHEAST",     x: 246, y: 134, w: 174, h: 86  },
];

function USRegionMap({ regions, total }: {
  regions: Record<RegionKey, { allocated: number; sold: number }>;
  total: number;
}) {
  const px = "var(--font-pixel), monospace";
  const body = "var(--font-pixel-body), monospace";
  return (
    <div>
      <p style={{ fontFamily: px, fontSize: "0.42rem", color: "#8888aa", marginBottom: "0.4rem" }}>
        YOUR REGIONAL SHIPMENTS
      </p>
      <svg
        viewBox="0 0 424 224"
        style={{ width: "100%", display: "block", imageRendering: "pixelated" }}
        shapeRendering="crispEdges"
      >
        <rect x="0" y="0" width="424" height="224" fill="#06060f" />
        {REGION_CELLS.map((r) => {
          const d = regions[r.id];
          const pct = total > 0 ? d.allocated / total : 0;
          const hasLeftover = d.allocated > d.sold && d.sold > 0;
          const isEmpty = d.allocated === 0;
          const fill = isEmpty
            ? "#0a0a18"
            : hasLeftover
            ? `rgba(255,190,11,${0.1 + pct * 0.55})`
            : `rgba(0,245,255,${0.1 + pct * 0.65})`;
          const stroke = isEmpty ? "#1a1a30" : hasLeftover ? "#ffbe0b" : "#00f5ff";
          const textCol = isEmpty ? "#2a2a4a" : hasLeftover ? "#ffbe0b" : "#ffffff";
          const cx = r.x + r.w / 2;
          const cy = r.y + r.h / 2;
          const lines = r.label.split("\n");
          return (
            <g key={r.id}>
              <rect x={r.x + 2} y={r.y + 2} width={r.w - 4} height={r.h - 4} fill={fill} stroke={stroke} strokeWidth="2" />
              {lines.map((line, i) => (
                <text key={i} x={cx} y={cy - (lines.length === 2 ? 10 - i * 12 : 6)} textAnchor="middle" fontSize="7" fontFamily={px} fill={textCol}>
                  {line}
                </text>
              ))}
              {!isEmpty && (
                <>
                  <text x={cx} y={cy + (lines.length === 2 ? 12 : 10)} textAnchor="middle" fontSize="10" fontFamily={px} fill={hasLeftover ? "#ffbe0b" : "#00f5ff"}>
                    {Math.round(pct * 100)}%
                  </text>
                  <text x={cx} y={cy + (lines.length === 2 ? 25 : 23)} textAnchor="middle" fontSize="6" fontFamily={body} fill="#9999bb">
                    {d.sold.toLocaleString()} sold
                  </text>
                </>
              )}
              {isEmpty && (
                <text x={cx} y={cy + 6} textAnchor="middle" fontSize="6" fontFamily={px} fill="#2a2a4a">NO STOCK</text>
              )}
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", gap: "1rem", marginTop: "0.35rem" }}>
        <span style={{ fontFamily: body, fontSize: "0.8rem", color: "#00f5ff" }}>■ shipped</span>
        <span style={{ fontFamily: body, fontSize: "0.8rem", color: "#ffbe0b" }}>■ leftover stock</span>
        <span style={{ fontFamily: body, fontSize: "0.8rem", color: "#2a2a4a" }}>■ no shipment</span>
      </div>
    </div>
  );
}

// ── Per-model regional breakdown ──────────────────────────────────────────────
const REGION_LABELS: Record<RegionKey, string> = {
  WEST_COAST: "WEST COAST",
  NORTHEAST:  "NORTHEAST",
  SOUTHEAST:  "SOUTHEAST",
  MIDWEST:    "MIDWEST",
  SOUTHWEST:  "SOUTHWEST",
};

function ModelRegionMap({ byRegion }: { byRegion: NonNullable<TeamResultData["modelResults"]>[number]["byRegion"] }) {
  const byKey: Partial<Record<RegionKey, (typeof byRegion)[number]>> = {};
  for (const r of byRegion) byKey[r.region as RegionKey] = r;
  const px = "var(--font-pixel), monospace";
  const body = "var(--font-pixel-body), monospace";

  return (
    <div>
      <svg viewBox="0 0 424 224" style={{ width: "100%", display: "block", imageRendering: "pixelated" }} shapeRendering="crispEdges">
        <rect x="0" y="0" width="424" height="224" fill="#06060f" />
        {REGION_CELLS.map((cell) => {
          const r = byKey[cell.id];
          const sold = r?.sold ?? 0;
          const allocated = r?.allocated ?? 0;
          const demanded = r?.demanded ?? 0;
          const hasFactory = r?.hasFactory ?? true;
          const shipping = r?.shippingCostHere ?? 0;
          const isEmpty = allocated === 0;
          const sellThrough = allocated > 0 ? sold / allocated : 0;

          // Color: green = sold out/full, amber = leftover stock, pink = shipping cost, dark = not shipped
          const fill = isEmpty
            ? "#0a0a18"
            : shipping > 0
            ? `rgba(255,0,110,${0.08 + sellThrough * 0.3})`
            : sellThrough >= 0.95
            ? `rgba(57,255,20,${0.12 + sellThrough * 0.25})`
            : `rgba(255,190,11,${0.1 + sellThrough * 0.3})`;
          const stroke = isEmpty
            ? "#1a1a30"
            : shipping > 0
            ? "#ff006e"
            : sellThrough >= 0.95
            ? "#39ff14"
            : "#ffbe0b";

          const labelLines = cell.label.split("\n");
          const midX = cell.x + cell.w / 2;
          const midY = cell.y + cell.h / 2;

          return (
            <g key={cell.id}>
              <rect x={cell.x} y={cell.y} width={cell.w} height={cell.h} fill={fill} stroke={stroke} strokeWidth={2} />
              {!isEmpty && (
                <>
                  {labelLines.map((line, i) => (
                    <text key={i} x={midX} y={midY - 22 + i * 12} textAnchor="middle"
                      fill="#ffffff" style={{ fontFamily: px, fontSize: "8px" }}>{line}</text>
                  ))}
                  <text x={midX} y={midY + 4} textAnchor="middle"
                    fill={stroke} style={{ fontFamily: px, fontSize: "8px" }}>
                    {sold.toLocaleString()}
                  </text>
                  <text x={midX} y={midY + 16} textAnchor="middle"
                    fill="#888" style={{ fontFamily: body, fontSize: "8px" }}>
                    of {demanded.toLocaleString()} dem
                  </text>
                  {!hasFactory && (
                    <text x={midX} y={midY + 28} textAnchor="middle"
                      fill="#ff006e" style={{ fontFamily: px, fontSize: "6px" }}>
                      ⚠ SHIP
                    </text>
                  )}
                </>
              )}
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", gap: "1rem", marginTop: "0.3rem", flexWrap: "wrap" }}>
        <span style={{ fontFamily: body, fontSize: "0.8rem", color: "#39ff14" }}>■ sold out</span>
        <span style={{ fontFamily: body, fontSize: "0.8rem", color: "#ffbe0b" }}>■ leftover</span>
        <span style={{ fontFamily: body, fontSize: "0.8rem", color: "#ff006e" }}>■ shipping cost</span>
        <span style={{ fontFamily: body, fontSize: "0.8rem", color: "#2a2a4a" }}>■ not shipped</span>
      </div>
    </div>
  );
}

function RegionBreakdownTable({ byRegion, pricingResearchSegment }: { byRegion: NonNullable<TeamResultData["modelResults"]>[number]["byRegion"]; pricingResearchSegment?: string }) {
  const active = byRegion.filter((r) => r.allocated > 0);
  if (!active.length) return null;
  const px = "var(--font-pixel), monospace";
  const body = "var(--font-pixel-body), monospace";
  const fmt = (n: number) => n >= 1_000_000 ? `$${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `$${(n/1_000).toFixed(0)}K` : `$${n}`;
  const showClearing = !!pricingResearchSegment;

  return (
    <div style={{ marginTop: "0.75rem", overflowX: "auto" }}>
      <p style={{ fontFamily: px, fontSize: "0.38rem", color: "#8888aa", marginBottom: "0.4rem" }}>Regional breakdown</p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: body, fontSize: "0.85rem" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #1a1a30" }}>
            {["Region", "Factory", "Allocated", "Demanded", "Sold", "Eff. price", "Shipping",
              ...(showClearing ? ["Market price"] : [])
            ].map((h) => (
              <th key={h} style={{ fontFamily: px, fontSize: "0.32rem", color: h === "Market price" ? "#ffbe0b" : "#8888aa", padding: "0.3rem 0.5rem", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {active.map((r) => {
            const sellThrough = r.allocated > 0 ? r.sold / r.allocated : 0;
            const soldColor = sellThrough >= 0.95 ? "#39ff14" : sellThrough >= 0.6 ? "#ffbe0b" : "#ff006e";
            const shipping = r.shippingCostHere ?? 0;
            const cp = r.clearingPrice ?? 0;
            const yourPrice = r.effectivePrice;
            const cpDiff = cp > 0 ? cp - yourPrice : 0;
            return (
              <tr key={r.region} style={{ borderBottom: "1px solid #0d0d1a" }}>
                <td style={{ padding: "0.3rem 0.5rem", color: "#fff", whiteSpace: "nowrap" }}>
                  {REGION_LABELS[r.region as RegionKey] ?? r.region}
                </td>
                <td style={{ padding: "0.3rem 0.5rem", whiteSpace: "nowrap" }}>
                  {r.hasFactory !== false
                    ? <span style={{ color: "#39ff14", fontFamily: px, fontSize: "0.32rem" }}>✓ local</span>
                    : <span style={{ color: "#ff006e", fontFamily: px, fontSize: "0.32rem" }}>⚠ +$1.5K</span>}
                </td>
                <td style={{ padding: "0.3rem 0.5rem", color: "#ccc" }}>{r.allocated.toLocaleString()}</td>
                <td style={{ padding: "0.3rem 0.5rem", color: "#ccc" }}>{r.demanded.toLocaleString()}</td>
                <td style={{ padding: "0.3rem 0.5rem", color: soldColor, fontWeight: "bold" }}>{r.sold.toLocaleString()}</td>
                <td style={{ padding: "0.3rem 0.5rem", color: "#ccc" }}>{fmt(r.effectivePrice)}</td>
                <td style={{ padding: "0.3rem 0.5rem", color: shipping > 0 ? "#ff006e" : "#39ff14" }}>
                  {shipping > 0 ? `−${fmt(shipping)}` : "—"}
                </td>
                {showClearing && (
                  <td style={{ padding: "0.3rem 0.5rem", whiteSpace: "nowrap" }}>
                    {cp === 0
                      ? <span style={{ color: "#8888aa" }}>demand-limited</span>
                      : <>
                          <span style={{ color: "#ffbe0b" }}>{fmt(cp)}</span>
                          {" "}
                          <span style={{ color: cpDiff > 0 ? "#39ff14" : "#ff006e", fontSize: "0.75rem" }}>
                            ({cpDiff > 0 ? "+" : ""}{fmt(cpDiff)})
                          </span>
                        </>
                    }
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {showClearing && (
        <p style={{ fontFamily: px, fontSize: "0.3rem", color: "#8888aa", marginTop: "0.3rem" }}>
          Market price = price that would have cleared your exact production. Green = you underpriced, red = overpriced.
        </p>
      )}
    </div>
  );
}

// ── Production efficiency bars (per model) ─────────────────────────────────
function ProductionBars({ modelResults }: { modelResults: TeamResultData["modelResults"] }) {
  const models = modelResults ?? [];
  if (!models.length) return null;
  const maxVal = Math.max(1, ...models.flatMap((m) => [m.unitsProduced, m.unitsSold]));
  const px = "var(--font-pixel), monospace";
  const body = "var(--font-pixel-body), monospace";
  return (
    <div>
      <p style={{ fontFamily: px, fontSize: "0.42rem", color: "#8888aa", marginBottom: "0.5rem" }}>Production vs sales</p>
      {models.map((m) => (
        <div key={m.modelId} style={{ marginBottom: "0.75rem" }}>
          <div style={{ fontFamily: px, fontSize: "0.4rem", color: "#00f5ff", marginBottom: "0.25rem" }}>
            {m.modelName} · {m.vehicleType}
          </div>
          {[
            { label: "MADE", value: m.unitsProduced, color: "#8888aa" },
            { label: "SOLD", value: m.unitsSold,     color: "#39ff14" },
            { label: "LEFT", value: m.unitsLeftInInventory, color: "#ffbe0b" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.15rem" }}>
              <span style={{ fontFamily: px, fontSize: "0.35rem", color: "#8888aa", width: 28, flexShrink: 0 }}>{label}</span>
              <div style={{ flex: 1, height: 10, background: "#0a0a18", position: "relative" }}>
                <div style={{ position: "absolute", top: 0, left: 0, height: "100%", background: color, width: `${(value / maxVal) * 100}%` }} />
              </div>
              <span style={{ fontFamily: body, fontSize: "0.8rem", color, width: 36, textAlign: "right", flexShrink: 0 }}>
                {fmtUnits(value)}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Revenue comparison across leaderboard ──────────────────────────────────
function RevenueChart({ leaderboard, myBrandName }: {
  leaderboard: IndustrySnapshotData["leaderboard"];
  myBrandName: string;
}) {
  const maxRev = Math.max(1, ...leaderboard.map((e) => e.revenue));
  const px = "var(--font-pixel), monospace";
  const body = "var(--font-pixel-body), monospace";
  return (
    <div>
      <p style={{ fontFamily: px, fontSize: "0.42rem", color: "#8888aa", marginBottom: "0.5rem" }}>Revenue comparison</p>
      {[...leaderboard].sort((a, b) => b.revenue - a.revenue).map((entry) => {
        const isMe = entry.brandName === myBrandName;
        return (
          <div key={entry.teamId} style={{ marginBottom: "0.5rem" }}>
            <div style={{ fontFamily: body, fontSize: "0.85rem", color: isMe ? "#ffbe0b" : "#888899", marginBottom: "0.15rem" }}>
              #{entry.rank} {entry.brandName}{isMe ? " ←" : ""}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <div style={{ flex: 1, height: 12, background: "#0a0a18" }}>
                <div style={{ height: "100%", background: isMe ? "#ffbe0b" : "#8888aa", width: `${(entry.revenue / maxRev) * 100}%` }} />
              </div>
              <span style={{ fontFamily: body, fontSize: "0.8rem", color: isMe ? "#ffbe0b" : "#39ff14", width: 52, textAlign: "right", flexShrink: 0 }}>
                {fmt(entry.revenue)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface TeamResultData {
  decisions?: {
    totalRdSpend: number;
    totalMarketingSpend: number;
    totalLobbyingSpend: number;
    rdUnlocksPurchased: string[];
    spaceSizeUsed: string;
    spaceOwnership: string;
    spaceAnnualCost: number;
    pricingResearchSegment?: string;
    competitorIntel?: {
      brandName: string;
      marketShare: number;
      models: Array<{ modelName: string; vehicleType: string; salePrice: number; unitsSold: number; unitsProduced: number }>;
    };
    marketIntel?: {
      region: string;
      demandByType: Record<string, number>;
    };
  };
  revenue?: {
    sales: number;
    repairs: number;
    total: number;
  };
  costs?: {
    cogs: number;
    shipping?: number;
    engineeringFees: number;
    spaceCost: number;
    rdSpend: number;
    marketingSpend: number;
    lobbyingSpend: number;
    inventoryCarrying: number;
    total: number;
  };
  netCashChange?: number;
  priorCash?: string;
  newCash?: string;
  brandPerceptionStart?: number;
  brandPerceptionEnd?: number;
  brandPerceptionDelta?: {
    total: number;
    marketingEffect: number;
    qualityEffect: number;
    recallPenalty: number;
    innovationEffect: number;
    industrySpillover: number;
    eventEffect: number;
  };
  modelResults?: Array<{
    modelId: string;
    modelName: string;
    vehicleType: string;
    unitCost: number;
    salePrice: number;
    unitsProduced: number;
    unitsSold: number;
    unitsDemanded: number;
    unitsLeftInInventory: number;
    revenue: number;
    cogs: number;
    shippingCosts?: number;
    repairRevenue: number;
    reliabilityScore: number;
    fleetRepairRate: number;
    recallTier: string;
    unmetDemand: number;
    unmetDemandGrossProfit: number;
    byRegion: Array<{
      region: string;
      allocated: number;
      demanded: number;
      sold: number;
      effectivePrice: number;
      glutDiscount: number;
      hasFactory?: boolean;
      shippingCostHere?: number;
      clearingPrice?: number;
    }>;
  }>;
  scarcityImpacts?: {
    supplyChainPenalty: number;
    crowdingApplied: string[];
    talentWarPenalty: number;
    glutByRegion: Record<string, number>;
  };
  marketShareByType?: Record<string, number>;
}

interface IndustrySnapshotData {
  roundNumber: number;
  worldEvent?: {
    title: string;
    headline: string;
    description: string;
    category: string;
  };
  policyScore: number;
  publicPerception: number;
  totalFlyingCarDemand: number;
  totalTraditionalDemand: number;
  demandByType: Record<string, number>;
  leaderboard: Array<{
    teamId: string;
    brandName: string;
    revenue: number;
    unitsSold: number;
    marketShare: number;
    cashBalance: string;
    brandPerception: number;
    rank: number;
  }>;
  segmentCrowding: Record<string, number>;
  averagePricesByType: Record<string, number>;
  publicRdAchievements: Array<{
    teamId: string;
    brandName: string;
    unlockKey: string;
    unlockDisplayName: string;
  }>;
  recalls: Array<{
    teamId: string;
    brandName: string;
    vehicleType: string;
    tier: string;
  }>;
  scarcityEvents: string[];
}

interface RoundReportProps {
  gameId: string;
  roundNumber: number;
  totalRounds: number;
  latestRound: number;
  brandName: string;
  myRole: string | null;
  isFacilitator: boolean;
  teamResult: Record<string, unknown> | null;
  industrySnapshot: Record<string, unknown>;
  allTeamResults?: Array<{
    teamId: string;
    brandName: string;
    teamResult: unknown;
  }>;
  rdUnlocks?: string[];
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) {
    return `$${(n / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(n) >= 1_000) {
    return `$${(n / 1_000).toFixed(0)}K`;
  }
  return `$${n.toLocaleString()}`;
}

function fmtUnits(n: number): string {
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function DeltaBadge({ value }: { value: number }) {
  const color = value > 0 ? "#39ff14" : value < 0 ? "#ff006e" : "#888";
  const arrow = value > 0 ? "▲" : value < 0 ? "▼" : "─";
  return (
    <span style={{ color, fontFamily: "var(--font-pixel-body)", fontSize: "1rem" }}>
      {arrow} {value > 0 ? "+" : ""}{value.toFixed(1)}
    </span>
  );
}

function BrandMeter({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, (value + 100) / 2));
  const color =
    value > 20 ? "#39ff14" : value > 0 ? "#ffbe0b" : "#ff006e";
  return (
    <div className="flex items-center gap-2">
      <div
        className="relative h-3 rounded-full overflow-hidden"
        style={{ width: 120, background: "#333" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span
        style={{
          fontFamily: "var(--font-pixel-body)",
          color,
          fontSize: "1rem",
        }}
      >
        {value > 0 ? "+" : ""}{value.toFixed(0)}
      </span>
    </div>
  );
}

// ── Trade Publication Narrative ─────────────────────────────────────────────
function TradeReport({ snap, roundNumber }: { snap: IndustrySnapshotData; roundNumber: number }) {
  const px = "var(--font-pixel), monospace";
  const body = "var(--font-pixel-body), monospace";

  type Blurb = { headline: string; body: string; tag: string };
  const blurbs: Blurb[] = [];

  // Demand overview
  const demand = snap.totalFlyingCarDemand;
  const totalMarket = demand + snap.totalTraditionalDemand;
  const shareOfMarket = totalMarket > 0 ? ((demand / totalMarket) * 100).toFixed(1) : "0.0";
  const demandK = Math.round(demand / 1000);
  const demandVerb = demand >= 450_000 ? "surges past" : demand >= 300_000 ? "grows to" : demand >= 180_000 ? "holds at" : "slides to";
  const demandComment = demand >= 400_000
    ? "Analysts describe growth as ahead of consensus forecasts."
    : demand <= 200_000
    ? "Analysts warn continued softness may trigger capacity cutbacks across the sector."
    : "The category continues its measured expansion as consumer adoption broadens.";
  blurbs.push({
    tag: "MARKET",
    headline: `U.S. Flying Car Market ${demandVerb} ${demandK.toLocaleString()}K Units in Year ${roundNumber}`,
    body: `Total flying car sales ${demandVerb} ${demandK.toLocaleString()}K units, representing ${shareOfMarket}% of the broader U.S. vehicle market. ${demandComment}`,
  });

  // Segment crowding
  const crowded = Object.entries(snap.segmentCrowding ?? {}).filter(([, n]) => (n as number) >= 3);
  if (crowded.length > 0) {
    const names = crowded.map(([type, n]) => `${type.replace(/_/g, " ").toLowerCase()} (${n} brands)`).join(", ");
    blurbs.push({
      tag: "COMPETITION",
      headline: `Competitive Crowding Flagged in ${crowded.length > 1 ? "Multiple Segments" : crowded[0][0].replace(/_/g, " ")}`,
      body: `Analyst firms have flagged competitive density above threshold in the ${names} segment${crowded.length > 1 ? "s" : ""}. When multiple brands chase the same buyers, marketing budgets cancel and price pressure intensifies across the board.`,
    });
  }

  // Public R&D achievements
  for (const ach of snap.publicRdAchievements ?? []) {
    blurbs.push({
      tag: "R&D",
      headline: `${ach.brandName} Publicly Debuts ${ach.unlockDisplayName}`,
      body: `${ach.brandName} has demonstrated ${ach.unlockDisplayName} capability, becoming one of the first manufacturers in the sector to do so. Industry observers say the milestone may influence competitor technology roadmaps.`,
    });
  }

  // Recalls
  for (const recall of snap.recalls ?? []) {
    const severity = recall.tier === "major" ? "Major" : recall.tier === "minor" ? "Minor" : "Voluntary";
    blurbs.push({
      tag: "SAFETY",
      headline: `${recall.brandName} Issues ${severity} Recall — ${recall.vehicleType.replace(/_/g, " ")} Line Affected`,
      body: `${recall.brandName} has notified the NHTSA of a ${severity.toLowerCase()} recall affecting its ${recall.vehicleType.replace(/_/g, " ").toLowerCase()} range. The company says affected units will receive a remedy via service appointment or over-the-air update where possible.`,
    });
  }

  // Scarcity events
  for (const e of snap.scarcityEvents ?? []) {
    blurbs.push({ tag: "INDUSTRY", headline: "Industry Cost Pressures Emerge This Year", body: e });
  }

  // Policy close
  const policyDir = snap.policyScore >= 5 ? "Supportive" : snap.policyScore >= -5 ? "Neutral" : "Restrictive";
  blurbs.push({
    tag: "POLICY",
    headline: `Regulatory Climate Remains ${policyDir} for Flying Cars`,
    body: `The policy index stands at ${snap.policyScore > 0 ? "+" : ""}${snap.policyScore}. ${snap.policyScore >= 5 ? "A favourable regulatory posture continues to reduce barriers to adoption." : snap.policyScore >= -5 ? "Regulators remain broadly neutral, with outcome-sensitive debates ongoing in Congress." : "An increasingly restrictive posture from regulators signals rising mandatory compliance costs."} Industry public perception: ${snap.publicPerception >= 0 ? "+" : ""}${snap.publicPerception}.`,
  });

  const items = blurbs.slice(0, 6);

  return (
    <div className="mb-6" style={{ border: "2px solid #2a2a4a", background: "#05050e" }}>
      <div style={{ borderBottom: "2px solid #2a2a4a", padding: "0.4rem 0.75rem", display: "flex", alignItems: "baseline", gap: "1rem" }}>
        <span style={{ fontFamily: px, fontSize: "0.5rem", color: "var(--px-cyan)", letterSpacing: "0.12em" }}>
          AERIAL AUTOMOTIVE NEWS
        </span>
        <span style={{ fontFamily: body, fontSize: "0.85rem", color: "#8888aa" }}>
          Year {roundNumber} Industry Report
        </span>
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ padding: "0.55rem 0.75rem", borderBottom: i < items.length - 1 ? "1px solid #1a1a2e" : "none" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.15rem" }}>
            <span style={{ fontFamily: px, fontSize: "0.3rem", color: "#8888aa", flexShrink: 0 }}>
              [{item.tag}]
            </span>
            <span style={{ fontFamily: px, fontSize: "0.38rem", color: "var(--px-white)", lineHeight: 1.5 }}>
              {item.headline}
            </span>
          </div>
          <p style={{ fontFamily: body, fontSize: "0.9rem", color: "#8888aa", lineHeight: 1.5, margin: 0 }}>
            {item.body}
          </p>
        </div>
      ))}
    </div>
  );
}

type TabKey = "pl" | "vehicles" | "market";

export function RoundReport({
  gameId,
  roundNumber,
  totalRounds,
  latestRound,
  brandName,
  isFacilitator,
  teamResult: teamResultRaw,
  industrySnapshot: industrySnapshotRaw,
  allTeamResults,
  rdUnlocks = [],
}: RoundReportProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("pl");
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  const tr = teamResultRaw as unknown as TeamResultData | null;
  const snap = industrySnapshotRaw as unknown as IndustrySnapshotData;
  const demandByTypeByRegion = (snap as unknown as { demandByTypeByRegion?: Record<string, Record<string, number>> }).demandByTypeByRegion ?? {};

  const worldEvent = snap.worldEvent;
  const isLastRound = roundNumber >= totalRounds;

  const netCash = tr?.netCashChange ?? 0;
  const netCashColor = netCash >= 0 ? "#39ff14" : "#ff006e";

  const pxFont = "var(--font-pixel)";
  const bodyFont = "var(--font-pixel-body)";

  return (
    <div
      className="game-screen scanlines min-h-screen p-4"
      style={{ fontFamily: pxFont }}
    >
      {/* Header */}
      <div className="mb-4 pb-4" style={{ borderBottom: "2px solid var(--px-amber)" }}>
        <div className="flex justify-between items-start flex-wrap gap-2">
          <div>
            <h1
              className="pixel-heading mb-1"
              style={{ fontSize: "0.8rem", color: "var(--px-amber)" }}
            >
              YEAR {roundNumber} RESULTS
            </h1>
            <p style={{ fontFamily: bodyFont, fontSize: "1.25rem", color: "var(--px-cyan)" }}>
              {brandName}
            </p>
          </div>
          <div
            className="pixel-badge"
            style={{ color: "var(--px-amber)" }}
          >
            ROUND {roundNumber}/{totalRounds}
          </div>
        </div>
      </div>

      {/* Round navigation */}
      <div className="flex gap-2 mb-6">
        {roundNumber > 1 && (
          <button
            onClick={() => router.push(`/results/${gameId}/${roundNumber - 1}`)}
            className="pixel-btn pixel-btn-amber"
            style={{ fontFamily: pxFont, fontSize: "0.45rem" }}
          >
            ← YEAR {roundNumber - 1}
          </button>
        )}
        <div style={{ flex: 1 }} />
        {roundNumber < latestRound - 1 && (
          <button
            onClick={() => router.push(`/results/${gameId}/${roundNumber + 1}`)}
            className="pixel-btn"
            style={{ fontFamily: pxFont, fontSize: "0.45rem" }}
          >
            YEAR {roundNumber + 1} →
          </button>
        )}
        {roundNumber === latestRound - 1 && (
          <button
            onClick={() => router.push(`/play/${gameId}`)}
            className="pixel-btn pixel-btn-green"
            style={{ fontFamily: pxFont, fontSize: "0.45rem" }}
          >
            BACK TO DECISIONS →
          </button>
        )}
      </div>

      {/* ── Game over CTA (last round only) — full standings live on /final ── */}
      {isLastRound && (
        <div
          style={{
            textAlign: "center",
            padding: "1.5rem",
            border: "4px solid var(--px-amber)",
            background: "rgba(255,190,11,0.05)",
            marginBottom: "1.5rem",
          }}
        >
          <p
            style={{
              fontFamily: pxFont, fontSize: "1.4rem", color: "var(--px-amber)",
              animation: "pixel-blink 1s step-end infinite",
              letterSpacing: "0.1em", marginBottom: "0.75rem",
            }}
          >
            ★ GAME OVER ★
          </p>
          <button
            onClick={() => router.push(`/results/${gameId}/final`)}
            className="pixel-btn pixel-btn-amber"
            style={{ fontFamily: pxFont, fontSize: "0.55rem", padding: "0.75rem 1.25rem" }}
          >
            🏆 VIEW FINAL STANDINGS →
          </button>
        </div>
      )}

      {/* ── Visual analytics ── */}
      {tr && (() => {
        const regionData = aggregateRegions(tr.modelResults);
        const totalAllocated = Object.values(regionData).reduce((s, r) => s + r.allocated, 0);
        return (
          <div className="mb-6 space-y-4">
            {/* Map */}
            <div className="pixel-card" style={{ borderColor: "var(--px-cyan)", padding: "1rem" }}>
              <USRegionMap regions={regionData} total={totalAllocated} />
            </div>
            {/* Charts row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div className="pixel-card" style={{ borderColor: "#8888aa", padding: "1rem" }}>
                <ProductionBars modelResults={tr.modelResults} />
              </div>
              <div className="pixel-card" style={{ borderColor: "#8888aa", padding: "1rem" }}>
                <RevenueChart leaderboard={snap.leaderboard} myBrandName={brandName} />
              </div>
            </div>
          </div>
        );
      })()}

      {/* World Event */}
      {worldEvent && (
        <div
          className="mb-6 p-4 border-2"
          style={{
            borderColor: "#c77dff",
            background: "rgba(199, 125, 255, 0.08)",
          }}
        >
          <p
            className="text-xs mb-2"
            style={{ color: "#c77dff", fontFamily: pxFont }}
          >
            WORLD EVENT
          </p>
          <p
            className="mb-2"
            style={{
              color: "#fff",
              fontFamily: bodyFont,
              fontSize: "1.1rem",
              fontWeight: "bold",
            }}
          >
            {worldEvent.headline}
          </p>
          <p style={{ fontFamily: bodyFont, color: "#ccc", fontSize: "1rem" }}>
            {worldEvent.description}
          </p>
        </div>
      )}

      {/* Industry Trade Report */}
      <TradeReport snap={snap} roundNumber={roundNumber} />

      {/* Policy + Perception */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="border border-gray-700 p-3">
          <p className="text-xs text-gray-400 mb-1" style={{ fontFamily: pxFont }}>
            POLICY SCORE
          </p>
          <p style={{ fontFamily: bodyFont, fontSize: "1.2rem", color: "#ffbe0b" }}>
            {snap.policyScore > 0 ? "+" : ""}{snap.policyScore}
          </p>
          <p style={{ fontFamily: bodyFont, fontSize: "0.75rem", color: "#8888aa", marginTop: "0.2rem" }}>
            {snap.policyScore >= 10 ? "Strong tailwind — +12–30% demand boost"
              : snap.policyScore >= 5 ? "Mild tailwind — +5–12% demand boost"
              : snap.policyScore >= 0 ? "Neutral — no regulatory impact on demand"
              : snap.policyScore >= -5 ? "Headwind — ~4–7% demand reduction this round"
              : snap.policyScore >= -10 ? "Strong headwind — ~7–15% demand reduction"
              : "Hostile climate — severe demand suppression"}
          </p>
        </div>
        <div className="border border-gray-700 p-3">
          <p className="text-xs text-gray-400 mb-1" style={{ fontFamily: pxFont }}>
            INDUSTRY PERCEPTION
          </p>
          <p style={{ fontFamily: bodyFont, fontSize: "1.2rem", color: "#00f5ff" }}>
            {snap.publicPerception > 0 ? "+" : ""}{Math.round(snap.publicPerception)}
          </p>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="mb-6 border border-gray-700 p-4">
        <p className="text-xs text-yellow-400 mb-3" style={{ fontFamily: pxFont }}>
          INDUSTRY LEADERBOARD
        </p>
        <div className="space-y-2">
          {snap.leaderboard.map((entry) => (
            <div
              key={entry.teamId}
              className="flex justify-between items-center py-1 border-b border-gray-800"
            >
              <div className="flex items-center gap-3">
                <span style={{ color: "#888", fontFamily: bodyFont, fontSize: "1rem", minWidth: 20 }}>
                  #{entry.rank}
                </span>
                <span style={{ fontFamily: bodyFont, fontSize: "1rem", color: entry.rank === 1 ? "#ffbe0b" : "#fff" }}>
                  {entry.brandName}
                </span>
              </div>
              <div className="flex gap-4 text-right">
                <span style={{ fontFamily: bodyFont, fontSize: "1rem", color: "#39ff14" }}>
                  {fmt(entry.revenue)}
                </span>
                <span style={{ fontFamily: bodyFont, fontSize: "1rem", color: "#888" }}>
                  {fmtUnits(entry.unitsSold)} units
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Results Tabs (only for players) */}
      {tr && (
        <div className="mb-6">
          <p className="text-xs text-cyan-400 mb-3" style={{ fontFamily: pxFont }}>
            YOUR RESULTS
          </p>

          {/* Tabs */}
          <div className="flex gap-1 mb-4">
            {(["pl", "vehicles", "market"] as TabKey[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-3 py-1 text-xs border transition-colors"
                style={{
                  fontFamily: pxFont,
                  fontSize: "0.55rem",
                  borderColor: activeTab === tab ? "#00f5ff" : "#444",
                  color: activeTab === tab ? "#00f5ff" : "#888",
                  background: activeTab === tab ? "rgba(0,245,255,0.08)" : "transparent",
                }}
              >
                {tab === "pl" ? "P&L" : tab === "vehicles" ? "VEHICLES" : "MARKET"}
              </button>
            ))}
          </div>

          {/* P&L Tab */}
          {activeTab === "pl" && (
            <div className="space-y-4">
              {/* Revenue */}
              <div className="border border-gray-700 p-4">
                <p className="text-xs text-gray-400 mb-3" style={{ fontFamily: pxFont }}>
                  REVENUE
                </p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span style={{ fontFamily: bodyFont, color: "#ccc", fontSize: "1rem" }}>
                      Sales
                    </span>
                    <span style={{ fontFamily: bodyFont, color: "#39ff14", fontSize: "1rem" }}>
                      {fmt(tr.revenue?.sales ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ fontFamily: bodyFont, color: "#ccc", fontSize: "1rem" }}>
                      Repairs
                    </span>
                    <span style={{ fontFamily: bodyFont, color: "#39ff14", fontSize: "1rem" }}>
                      {fmt(tr.revenue?.repairs ?? 0)}
                    </span>
                  </div>
                  <div
                    className="flex justify-between pt-2 border-t border-gray-600"
                  >
                    <span style={{ fontFamily: bodyFont, color: "#fff", fontSize: "1rem", fontWeight: "bold" }}>
                      Total Revenue
                    </span>
                    <span style={{ fontFamily: bodyFont, color: "#39ff14", fontSize: "1.1rem", fontWeight: "bold" }}>
                      {fmt(tr.revenue?.total ?? 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Costs */}
              <div className="border border-gray-700 p-4">
                <p className="text-xs text-gray-400 mb-3" style={{ fontFamily: pxFont }}>
                  COSTS
                </p>
                <div className="space-y-1">
                  {([
                    ["COGS", tr.costs?.cogs ?? 0],
                    ...(tr.costs?.shipping ? [["Cross-Region Shipping ⚠", tr.costs.shipping]] : []),
                    ["R&D", tr.costs?.rdSpend ?? 0],
                    ["Marketing", tr.costs?.marketingSpend ?? 0],
                    ["Lobbying", tr.costs?.lobbyingSpend ?? 0],
                    ["Facilities", tr.costs?.spaceCost ?? 0],
                    ["Engineering", tr.costs?.engineeringFees ?? 0],
                    ["Inventory Carry", tr.costs?.inventoryCarrying ?? 0],
                  ] as [string, number][]).map(([label, amount]) => (
                    <div key={label as string} className="flex justify-between">
                      <span style={{ fontFamily: bodyFont, color: "#ccc", fontSize: "1rem" }}>
                        {label}
                      </span>
                      <span style={{ fontFamily: bodyFont, color: "#ff006e", fontSize: "1rem" }}>
                        {fmt(amount as number)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t border-gray-600">
                    <span style={{ fontFamily: bodyFont, color: "#fff", fontSize: "1rem", fontWeight: "bold" }}>
                      Total Costs
                    </span>
                    <span style={{ fontFamily: bodyFont, color: "#ff006e", fontSize: "1.1rem", fontWeight: "bold" }}>
                      {fmt(tr.costs?.total ?? 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Net + Cash */}
              <div className="border-2 p-4" style={{ borderColor: netCashColor }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs" style={{ fontFamily: pxFont, color: "#888" }}>
                    NET THIS ROUND
                  </span>
                  <span
                    style={{
                      fontFamily: bodyFont,
                      fontSize: "1.3rem",
                      color: netCashColor,
                      fontWeight: "bold",
                    }}
                  >
                    {netCash >= 0 ? "+" : ""}{fmt(netCash)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ fontFamily: pxFont, color: "#888" }}>
                    CASH BALANCE
                  </span>
                  <span style={{ fontFamily: bodyFont, fontSize: "1rem", color: "#ffbe0b" }}>
                    {fmt(parseFloat(tr.priorCash ?? "0"))} →{" "}
                    <strong>{fmt(parseFloat(tr.newCash ?? "0"))}</strong>
                  </span>
                </div>
              </div>

              {/* Brand */}
              <div className="border border-gray-700 p-4">
                <p className="text-xs text-gray-400 mb-3" style={{ fontFamily: pxFont }}>
                  BRAND PERCEPTION
                </p>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontFamily: bodyFont, color: "#ccc", fontSize: "1rem" }}>
                    {tr.brandPerceptionStart ?? 0} → {tr.brandPerceptionEnd ?? 0}
                  </span>
                  <DeltaBadge value={tr.brandPerceptionDelta?.total ?? 0} />
                </div>
                <BrandMeter value={tr.brandPerceptionEnd ?? 0} />
                {tr.brandPerceptionDelta && (
                  <div className="mt-3 space-y-1">
                    {[
                      ["Marketing", tr.brandPerceptionDelta.marketingEffect],
                      ["Quality", tr.brandPerceptionDelta.qualityEffect],
                      ["Recall", tr.brandPerceptionDelta.recallPenalty],
                      ["Innovation", tr.brandPerceptionDelta.innovationEffect],
                      ["Spillover", tr.brandPerceptionDelta.industrySpillover],
                      ["Event", tr.brandPerceptionDelta.eventEffect],
                    ]
                      .filter(([, v]) => (v as number) !== 0)
                      .map(([label, val]) => (
                        <div key={label as string} className="flex justify-between">
                          <span style={{ fontFamily: bodyFont, color: "#888", fontSize: "0.9rem" }}>
                            {label}
                          </span>
                          <DeltaBadge value={val as number} />
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Vehicles Tab */}
          {activeTab === "vehicles" && (
            <div className="space-y-4">
              {(tr.modelResults ?? []).map((mr) => (
                <div key={mr.modelId} className="border border-gray-700 p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p
                        className="text-xs"
                        style={{ fontFamily: pxFont, color: "#00f5ff" }}
                      >
                        {mr.modelName}
                      </p>
                      <p style={{ fontFamily: bodyFont, color: "#888", fontSize: "0.9rem" }}>
                        {mr.vehicleType} · {fmt(mr.salePrice)}/unit
                      </p>
                    </div>
                    {mr.recallTier !== "none" && (
                      <span
                        className="px-2 py-1 text-xs border"
                        style={{
                          fontFamily: pxFont,
                          fontSize: "0.45rem",
                          borderColor: "#ff006e",
                          color: "#ff006e",
                          background: "rgba(255,0,110,0.1)",
                        }}
                      >
                        {mr.recallTier.toUpperCase()} RECALL
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1" style={{ fontFamily: pxFont, fontSize: "0.45rem" }}>
                        PRODUCED
                      </p>
                      <p style={{ fontFamily: bodyFont, fontSize: "1.1rem" }}>
                        {fmtUnits(mr.unitsProduced)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1" style={{ fontFamily: pxFont, fontSize: "0.45rem" }}>
                        DEMANDED
                      </p>
                      <p style={{ fontFamily: bodyFont, fontSize: "1.1rem" }}>
                        {fmtUnits(mr.unitsDemanded)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1" style={{ fontFamily: pxFont, fontSize: "0.45rem" }}>
                        SOLD
                      </p>
                      <p style={{ fontFamily: bodyFont, fontSize: "1.1rem", color: "#39ff14" }}>
                        {fmtUnits(mr.unitsSold)}
                      </p>
                    </div>
                  </div>

                  {mr.unitsLeftInInventory > 0 && (
                    <div
                      className="p-2 mb-3"
                      style={{ background: "rgba(255,190,11,0.1)", borderLeft: "2px solid #ffbe0b" }}
                    >
                      <p style={{ fontFamily: bodyFont, color: "#ffbe0b", fontSize: "0.95rem" }}>
                        {fmtUnits(mr.unitsLeftInInventory)} UNITS IN INVENTORY
                      </p>
                    </div>
                  )}

                  {mr.unmetDemand > 0 && (
                    <div
                      className="p-2 mb-3"
                      style={{ background: "rgba(199,125,255,0.1)", borderLeft: "2px solid #c77dff" }}
                    >
                      <p style={{ fontFamily: bodyFont, color: "#c77dff", fontSize: "0.95rem" }}>
                        LEFT {fmtUnits(mr.unmetDemand)} UNITS ON TABLE
                        {mr.unmetDemandGrossProfit > 0 && (
                          <span className="ml-2 text-sm">
                            ({fmt(mr.unmetDemandGrossProfit)} lost profit)
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between text-sm mb-4">
                    <span style={{ fontFamily: bodyFont, color: "#888", fontSize: "0.9rem" }}>
                      Unit Cost: {fmt(mr.unitCost)}
                    </span>
                    <span style={{ fontFamily: bodyFont, color: "#888", fontSize: "0.9rem" }}>
                      Reliability: {mr.reliabilityScore.toFixed(2)}×
                    </span>
                  </div>

                  {/* Per-region map + table */}
                  {(mr.byRegion ?? []).some((r) => r.allocated > 0) && (
                    <>
                      <ModelRegionMap byRegion={mr.byRegion ?? []} />
                      <RegionBreakdownTable
                        byRegion={mr.byRegion ?? []}
                        pricingResearchSegment={
                          tr.decisions?.pricingResearchSegment === mr.vehicleType
                            ? mr.vehicleType
                            : undefined
                        }
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Market Tab */}
          {activeTab === "market" && (
            <div className="space-y-4">

              {/* Market demand — qualitative labels only (exact numbers are gated behind research) */}
              <div className="border-2 border-cyan-500 p-4" style={{ background: "rgba(0,245,255,0.04)" }}>
                <p className="text-xs mb-1" style={{ fontFamily: pxFont, color: "#00f5ff" }}>
                  📊 MARKET SIGNALS THIS YEAR
                </p>
                <p style={{ fontFamily: bodyFont, fontSize: "0.85rem", color: "#8888aa", marginBottom: "0.75rem" }}>
                  Invest in Pricing Research or Market Research to get precise estimates before you commit.
                </p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <span style={{ fontFamily: pxFont, fontSize: "0.42rem", color: "#888" }}>Overall market</span>
                    {(() => {
                      const d = snap.totalFlyingCarDemand;
                      const { label, color } = d >= 400_000 ? { label: "VERY STRONG", color: "#39ff14" }
                        : d >= 250_000 ? { label: "STRONG", color: "#39ff14" }
                        : d >= 150_000 ? { label: "MODERATE", color: "#ffbe0b" }
                        : { label: "WEAK", color: "#ff006e" };
                      return <p style={{ fontFamily: bodyFont, fontSize: "1.1rem", color }}>{label}</p>;
                    })()}
                  </div>
                  <div>
                    <span style={{ fontFamily: pxFont, fontSize: "0.42rem", color: "#888" }}>Public perception</span>
                    <p style={{ fontFamily: bodyFont, fontSize: "1.1rem", color: "#00f5ff" }}>
                      {snap.publicPerception}%
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  {Object.entries(snap.demandByType ?? {}).sort(([,a],[,b]) => (b as number) - (a as number)).map(([vt, demand]) => {
                    const n = demand as number;
                    const { label, color } = n >= 80_000 ? { label: "VERY HIGH", color: "#39ff14" }
                      : n >= 50_000 ? { label: "HIGH", color: "#39ff14" }
                      : n >= 30_000 ? { label: "MEDIUM", color: "#ffbe0b" }
                      : n >= 15_000 ? { label: "LOW", color: "#ff006e" }
                      : { label: "MINIMAL", color: "#8888aa" };
                    const total = snap.totalFlyingCarDemand;
                    const intelKey = `intel_type_${vt}`;
                    const hasIntel = rdUnlocks.includes(intelKey) || isFacilitator;
                    return (
                      <div key={vt}>
                        <div className="flex items-center gap-3">
                          <span style={{ fontFamily: bodyFont, color: "#ccc", fontSize: "0.95rem", minWidth: 110 }}>
                            {vt.replace("_", " ")}
                          </span>
                          <div className="relative flex-1" style={{ height: 10, background: "#1a1a2e" }}>
                            <div style={{
                              position: "absolute", top: 0, left: 0, height: "100%",
                              width: `${Math.round((n / total) * 100)}%`,
                              background: color,
                            }} />
                          </div>
                          <span style={{ fontFamily: bodyFont, color, fontSize: "0.95rem", minWidth: 70, textAlign: "right" }}>
                            {hasIntel ? n.toLocaleString() : label}
                          </span>
                          {!hasIntel && (
                            <span style={{ fontFamily: pxFont, fontSize: "0.32rem", color: "#8888aa" }} title={`Buy intel_type_${vt} in R&D to see exact numbers`}>🔒</span>
                          )}
                        </div>
                        {/* Regional breakdown if region intel owned */}
                        {hasIntel && demandByTypeByRegion[vt] && (
                          <div style={{ display: "flex", gap: "0.5rem", marginLeft: 110, marginTop: "0.15rem", flexWrap: "wrap" }}>
                            {Object.entries(demandByTypeByRegion[vt]).map(([region, d]) => {
                              const rIntelKey = `intel_region_${region}`;
                              const rHasIntel = rdUnlocks.includes(rIntelKey) || isFacilitator;
                              return (
                                <span key={region} style={{ fontFamily: bodyFont, fontSize: "0.8rem", color: "#666" }}>
                                  {region.replace("_", " ").slice(0, 2)}: {rHasIntel ? (d as number).toLocaleString() : "?"}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p style={{ fontFamily: pxFont, fontSize: "0.32rem", color: "#2a2a4a", marginTop: "0.5rem" }}>
                  🔒 = unlock SEGMENT or REGION INTEL in R&D tab to reveal exact numbers
                </p>
              </div>

              {/* Market Research: exact region demand (paid) */}
              {tr?.decisions?.marketIntel && (
                <div className="border-2 p-4" style={{ borderColor: "#39ff14", background: "rgba(57,255,20,0.04)" }}>
                  <p className="text-xs mb-1" style={{ fontFamily: pxFont, color: "#39ff14" }}>
                    🔬 MARKET RESEARCH · {tr.decisions.marketIntel.region.replace("_", " ")}
                  </p>
                  <p style={{ fontFamily: bodyFont, fontSize: "0.85rem", color: "#8888aa", marginBottom: "0.75rem" }}>
                    Exact buyer demand in this region this year, by segment.
                  </p>
                  <div className="space-y-1">
                    {Object.entries(tr.decisions.marketIntel.demandByType)
                      .sort(([, a], [, b]) => b - a)
                      .map(([vt, d]) => (
                        <div key={vt} className="flex items-center justify-between" style={{ borderBottom: "1px solid #0d0d1a", padding: "0.2rem 0" }}>
                          <span style={{ fontFamily: bodyFont, fontSize: "0.95rem", color: "#ccc" }}>{vt.replace("_", " ")}</span>
                          <span style={{ fontFamily: bodyFont, fontSize: "0.95rem", color: "#39ff14" }}>{d.toLocaleString()} units</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Competitor Research: tracked rival deep-dive (paid) */}
              {tr?.decisions?.competitorIntel && (
                <div className="border-2 p-4" style={{ borderColor: "#b15bff", background: "rgba(177,91,255,0.05)" }}>
                  <p className="text-xs mb-1" style={{ fontFamily: pxFont, color: "#b15bff" }}>
                    🎯 RIVAL INTEL · {tr.decisions.competitorIntel.brandName}
                  </p>
                  <p style={{ fontFamily: bodyFont, fontSize: "0.85rem", color: "#8888aa", marginBottom: "0.75rem" }}>
                    {(tr.decisions.competitorIntel.marketShare * 100).toFixed(1)}% market share · per-model pricing &amp; output below.
                  </p>
                  {tr.decisions.competitorIntel.models.length === 0 ? (
                    <p style={{ fontFamily: bodyFont, fontSize: "0.9rem", color: "#666" }}>They shipped no models this year.</p>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: bodyFont, fontSize: "0.9rem" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid #1a1a30" }}>
                          {["Model", "Type", "Price", "Built", "Sold"].map((h) => (
                            <th key={h} style={{ fontFamily: pxFont, fontSize: "0.32rem", color: "#8888aa", padding: "0.3rem 0.4rem", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tr.decisions.competitorIntel.models.map((m, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid #0d0d1a" }}>
                            <td style={{ padding: "0.3rem 0.4rem", color: "#fff" }}>{m.modelName}</td>
                            <td style={{ padding: "0.3rem 0.4rem", color: "#888" }}>{m.vehicleType.replace("_", " ")}</td>
                            <td style={{ padding: "0.3rem 0.4rem", color: "#ffbe0b" }}>{fmt(m.salePrice)}</td>
                            <td style={{ padding: "0.3rem 0.4rem", color: "#ccc" }}>{m.unitsProduced.toLocaleString()}</td>
                            <td style={{ padding: "0.3rem 0.4rem", color: "#39ff14" }}>{m.unitsSold.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Competitor intel */}
              <div className="border-2 p-4" style={{ borderColor: "#ff006e", background: "rgba(255,0,110,0.03)" }}>
                <p className="text-xs mb-1" style={{ fontFamily: pxFont, color: "#ff006e" }}>
                  🕵️ COMPETITOR STANDINGS
                </p>
                <p style={{ fontFamily: bodyFont, fontSize: "0.85rem", color: "#8888aa", marginBottom: "0.75rem" }}>
                  Invest in Competitor Research for deeper rival intel in future rounds.
                </p>
                <div className="space-y-3">
                  {snap.leaderboard.map((entry) => (
                    <div key={entry.teamId} className="border border-gray-800 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span style={{ fontFamily: pxFont, fontSize: "0.4rem", color: "#888" }}>#{entry.rank}</span>
                          <span style={{ fontFamily: bodyFont, fontSize: "1rem", color: entry.brandName === brandName ? "#ffbe0b" : "#fff" }}>
                            {entry.brandName}{entry.brandName === brandName ? " (YOU)" : ""}
                          </span>
                        </div>
                        <span style={{ fontFamily: bodyFont, fontSize: "1rem", color: "#39ff14" }}>
                          {fmt(entry.revenue)}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span style={{ fontFamily: pxFont, fontSize: "0.38rem", color: "#8888aa" }}>Units sold</span>
                          <p style={{ fontFamily: bodyFont, fontSize: "0.95rem" }}>{fmtUnits(entry.unitsSold)}</p>
                        </div>
                        <div>
                          <span style={{ fontFamily: pxFont, fontSize: "0.38rem", color: "#8888aa" }}>Market share</span>
                          <p style={{ fontFamily: bodyFont, fontSize: "0.95rem", color: "#00f5ff" }}>
                            {(entry.marketShare * 100).toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <span style={{ fontFamily: pxFont, fontSize: "0.38rem", color: "#8888aa" }}>Brand</span>
                          <p style={{ fontFamily: bodyFont, fontSize: "0.95rem", color: entry.brandPerception > 0 ? "#39ff14" : "#ff006e" }}>
                            {entry.brandPerception > 0 ? "+" : ""}{entry.brandPerception.toFixed(0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Market Share */}
              <div className="border border-gray-700 p-4">
                <p className="text-xs text-gray-400 mb-3" style={{ fontFamily: pxFont }}>
                  MARKET SHARE BY TYPE
                </p>
                <div className="space-y-2">
                  {Object.entries(tr.marketShareByType ?? {}).map(
                    ([vt, share]) => (
                      <div key={vt} className="flex items-center gap-3">
                        <span
                          style={{
                            fontFamily: bodyFont,
                            color: "#ccc",
                            fontSize: "1rem",
                            minWidth: 100,
                          }}
                        >
                          {vt.replace("_", " ")}
                        </span>
                        <div
                          className="relative h-3 rounded-full overflow-hidden flex-1"
                          style={{ background: "#222" }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.round((share as number) * 100)}%`,
                              background: "#00f5ff",
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontFamily: bodyFont,
                            color: "#00f5ff",
                            fontSize: "1rem",
                            minWidth: 45,
                            textAlign: "right",
                          }}
                        >
                          {Math.round((share as number) * 100)}%
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Avg prices */}
              <div className="border border-gray-700 p-4">
                <p className="text-xs text-gray-400 mb-3" style={{ fontFamily: pxFont }}>
                  INDUSTRY AVG PRICES
                </p>
                <div className="space-y-1">
                  {Object.entries(snap.averagePricesByType ?? {}).map(
                    ([vt, price]) => (
                      <div key={vt} className="flex justify-between">
                        <span style={{ fontFamily: bodyFont, color: "#ccc", fontSize: "1rem" }}>
                          {vt.replace("_", " ")}
                        </span>
                        <span style={{ fontFamily: bodyFont, color: "#ffbe0b", fontSize: "1rem" }}>
                          {fmt(price as number)}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Scarcity events */}
              {snap.scarcityEvents && snap.scarcityEvents.length > 0 && (
                <div className="border border-yellow-400 p-4">
                  <p className="text-xs text-yellow-400 mb-3" style={{ fontFamily: pxFont }}>
                    MARKET CONDITIONS
                  </p>
                  <div className="space-y-2">
                    {snap.scarcityEvents.map((ev, i) => (
                      <p
                        key={i}
                        style={{ fontFamily: bodyFont, color: "#ffbe0b", fontSize: "0.95rem" }}
                      >
                        {ev}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* R&D Achievements */}
              {snap.publicRdAchievements && snap.publicRdAchievements.length > 0 && (
                <div className="border border-cyan-400 p-4">
                  <p className="text-xs text-cyan-400 mb-3" style={{ fontFamily: pxFont }}>
                    R&D BREAKTHROUGHS THIS ROUND
                  </p>
                  <div className="space-y-2">
                    {snap.publicRdAchievements.map((ach, i) => (
                      <p
                        key={i}
                        style={{ fontFamily: bodyFont, color: "#00f5ff", fontSize: "0.95rem" }}
                      >
                        {ach.brandName}: <strong>{ach.unlockDisplayName}</strong>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Recalls */}
              {snap.recalls && snap.recalls.length > 0 && (
                <div className="border border-red-500 p-4">
                  <p className="text-xs text-red-400 mb-3" style={{ fontFamily: pxFont }}>
                    INDUSTRY RECALLS
                  </p>
                  <div className="space-y-1">
                    {snap.recalls.map((r, i) => (
                      <p
                        key={i}
                        style={{ fontFamily: bodyFont, color: "#ff006e", fontSize: "0.95rem" }}
                      >
                        {r.brandName} — {r.vehicleType}{" "}
                        <span className="uppercase">({r.tier})</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Scarcity impacts */}
              {tr.scarcityImpacts && (
                <div className="border border-gray-700 p-4">
                  <p className="text-xs text-gray-400 mb-3" style={{ fontFamily: pxFont }}>
                    YOUR SCARCITY IMPACTS
                  </p>
                  <div className="space-y-1">
                    {tr.scarcityImpacts.supplyChainPenalty > 0 && (
                      <p style={{ fontFamily: bodyFont, color: "#ffbe0b", fontSize: "0.95rem" }}>
                        Supply chain: +{fmt(tr.scarcityImpacts.supplyChainPenalty)}/unit
                      </p>
                    )}
                    {tr.scarcityImpacts.talentWarPenalty > 0 && (
                      <p style={{ fontFamily: bodyFont, color: "#ffbe0b", fontSize: "0.95rem" }}>
                        Talent war: -{(tr.scarcityImpacts.talentWarPenalty * 100).toFixed(0)}% R&D efficiency
                      </p>
                    )}
                    {tr.scarcityImpacts.crowdingApplied.length > 0 && (
                      <p style={{ fontFamily: bodyFont, color: "#ffbe0b", fontSize: "0.95rem" }}>
                        Segment crowding: {tr.scarcityImpacts.crowdingApplied.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Facilitator view: all team summaries */}
      {isFacilitator && allTeamResults && (
        <div className="mb-6">
          <p className="text-xs text-yellow-400 mb-3" style={{ fontFamily: pxFont }}>
            ALL TEAM RESULTS
          </p>
          <div className="space-y-3">
            {allTeamResults.map((t) => {
              const r = t.teamResult as TeamResultData;
              const teamNet = r?.netCashChange ?? 0;
              const teamNetColor = teamNet >= 0 ? "#39ff14" : "#ff006e";
              const isExpanded = expandedTeams.has(t.teamId);
              const brandDelta = r?.brandPerceptionDelta;
              return (
                <div key={t.teamId} className="border border-gray-600">
                  {/* Collapse header — always visible */}
                  <button
                    onClick={() => setExpandedTeams((prev) => {
                      const next = new Set(prev);
                      next.has(t.teamId) ? next.delete(t.teamId) : next.add(t.teamId);
                      return next;
                    })}
                    className="w-full flex items-center justify-between p-3"
                    style={{ background: "transparent", border: "none", cursor: "pointer" }}
                  >
                    <span style={{ fontFamily: bodyFont, color: "#00f5ff", fontSize: "1rem" }}>{t.brandName}</span>
                    <div className="flex items-center gap-4">
                      <span style={{ fontFamily: bodyFont, color: "#39ff14", fontSize: "0.9rem" }}>
                        Rev {fmt(r?.revenue?.total ?? 0)}
                      </span>
                      <span style={{ fontFamily: bodyFont, color: teamNetColor, fontSize: "0.9rem" }}>
                        Net {teamNet >= 0 ? "+" : ""}{fmt(teamNet)}
                      </span>
                      <span style={{ fontFamily: bodyFont, color: "#ffbe0b", fontSize: "0.9rem" }}>
                        Cash {fmt(parseFloat(r?.newCash ?? "0"))}
                      </span>
                      <span style={{ fontFamily: "var(--font-pixel)", fontSize: "0.5rem", color: "#8888aa" }}>
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-3" style={{ borderTop: "1px solid #333" }}>
                      {/* P&L */}
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <p style={{ fontFamily: pxFont, fontSize: "0.42rem", color: "#8888aa", marginBottom: "0.4rem" }}>REVENUE</p>
                          <div className="space-y-1">
                            {([["Sales", r?.revenue?.sales ?? 0], ["Repairs", r?.revenue?.repairs ?? 0]] as [string, number][]).map(([lbl, amt]) => (
                              <div key={lbl} className="flex justify-between">
                                <span style={{ fontFamily: bodyFont, color: "#ccc", fontSize: "0.9rem" }}>{lbl}</span>
                                <span style={{ fontFamily: bodyFont, color: "#39ff14", fontSize: "0.9rem" }}>{fmt(amt)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between pt-1" style={{ borderTop: "1px solid #444" }}>
                              <span style={{ fontFamily: bodyFont, color: "#fff", fontSize: "0.9rem", fontWeight: "bold" }}>Total</span>
                              <span style={{ fontFamily: bodyFont, color: "#39ff14", fontSize: "0.9rem", fontWeight: "bold" }}>{fmt(r?.revenue?.total ?? 0)}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p style={{ fontFamily: pxFont, fontSize: "0.42rem", color: "#8888aa", marginBottom: "0.4rem" }}>COSTS</p>
                          <div className="space-y-1">
                            {([
                              ["COGS", r?.costs?.cogs ?? 0],
                              ["R&D", r?.costs?.rdSpend ?? 0],
                              ["Marketing", r?.costs?.marketingSpend ?? 0],
                              ["Lobbying", r?.costs?.lobbyingSpend ?? 0],
                              ["Facilities", r?.costs?.spaceCost ?? 0],
                              ["Engineering", r?.costs?.engineeringFees ?? 0],
                              ["Inv. Carry", r?.costs?.inventoryCarrying ?? 0],
                            ] as [string, number][]).filter(([, amt]) => amt > 0).map(([lbl, amt]) => (
                              <div key={lbl} className="flex justify-between">
                                <span style={{ fontFamily: bodyFont, color: "#ccc", fontSize: "0.9rem" }}>{lbl}</span>
                                <span style={{ fontFamily: bodyFont, color: "#ff006e", fontSize: "0.9rem" }}>{fmt(amt)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between pt-1" style={{ borderTop: "1px solid #444" }}>
                              <span style={{ fontFamily: bodyFont, color: "#fff", fontSize: "0.9rem", fontWeight: "bold" }}>Total</span>
                              <span style={{ fontFamily: bodyFont, color: "#ff006e", fontSize: "0.9rem", fontWeight: "bold" }}>{fmt(r?.costs?.total ?? 0)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Brand + model summary */}
                      {brandDelta && (
                        <div className="flex items-center gap-3">
                          <span style={{ fontFamily: pxFont, fontSize: "0.38rem", color: "#8888aa" }}>BRAND</span>
                          <span style={{ fontFamily: bodyFont, color: "#fff", fontSize: "0.9rem" }}>
                            {r?.brandPerceptionStart ?? 0} → {r?.brandPerceptionEnd ?? 0}
                          </span>
                          <span style={{ fontFamily: bodyFont, color: brandDelta.total >= 0 ? "#39ff14" : "#ff006e", fontSize: "0.9rem" }}>
                            ({brandDelta.total >= 0 ? "+" : ""}{brandDelta.total.toFixed(1)})
                          </span>
                        </div>
                      )}
                      {r?.modelResults && r.modelResults.length > 0 && (
                        <div>
                          <p style={{ fontFamily: pxFont, fontSize: "0.38rem", color: "#8888aa", marginBottom: "0.3rem" }}>VEHICLES</p>
                          <div className="space-y-1">
                            {r.modelResults.map((m) => (
                              <div key={m.modelId} className="flex justify-between items-center">
                                <span style={{ fontFamily: bodyFont, color: "#00f5ff", fontSize: "0.85rem" }}>{m.modelName}</span>
                                <div className="flex gap-3">
                                  <span style={{ fontFamily: bodyFont, color: "#ccc", fontSize: "0.85rem" }}>{fmtUnits(m.unitsSold)}/{fmtUnits(m.unitsProduced)} sold</span>
                                  <span style={{ fontFamily: bodyFont, color: "#39ff14", fontSize: "0.85rem" }}>{fmt(m.revenue)}</span>
                                  {m.recallTier !== "none" && (
                                    <span style={{ fontFamily: bodyFont, color: "#ff006e", fontSize: "0.85rem" }}>⚠ {m.recallTier}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Continue Button */}
      <div className="mt-8 flex justify-center">
        {!isLastRound ? (
          <button
            onClick={() => router.push(`/play/${gameId}?from=results`)}
            className="pixel-btn pixel-btn-green"
            style={{ fontFamily: pxFont, fontSize: "0.55rem" }}
          >
            ▶ CONTINUE TO NEXT ROUND
          </button>
        ) : (
          <button
            onClick={() => router.push(`/game`)}
            className="pixel-btn pixel-btn-amber"
            style={{ fontFamily: pxFont, fontSize: "0.5rem" }}
          >
            ← BACK TO DASHBOARD
          </button>
        )}
      </div>
    </div>
  );
}
