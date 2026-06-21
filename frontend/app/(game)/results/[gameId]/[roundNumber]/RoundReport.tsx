"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TeamResultData {
  decisions?: {
    totalRdSpend: number;
    totalMarketingSpend: number;
    totalLobbyingSpend: number;
    rdUnlocksPurchased: string[];
    spaceSizeUsed: string;
    spaceOwnership: string;
    spaceAnnualCost: number;
  };
  revenue?: {
    sales: number;
    repairs: number;
    total: number;
  };
  costs?: {
    cogs: number;
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

type TabKey = "pl" | "vehicles" | "market";

export function RoundReport({
  gameId,
  roundNumber,
  totalRounds,
  brandName,
  isFacilitator,
  teamResult: teamResultRaw,
  industrySnapshot: industrySnapshotRaw,
  allTeamResults,
}: RoundReportProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("pl");

  const tr = teamResultRaw as unknown as TeamResultData | null;
  const snap = industrySnapshotRaw as unknown as IndustrySnapshotData;

  const worldEvent = snap.worldEvent;
  const isLastRound = roundNumber >= totalRounds;

  const netCash = tr?.netCashChange ?? 0;
  const netCashColor = netCash >= 0 ? "#39ff14" : "#ff006e";

  const pxFont = "var(--font-pixel)";
  const bodyFont = "var(--font-pixel-body)";

  return (
    <div
      className="min-h-screen bg-black text-white p-4"
      style={{ fontFamily: pxFont }}
    >
      {/* Header */}
      <div className="mb-6 border-b-2 border-yellow-400 pb-4">
        <div className="flex justify-between items-start flex-wrap gap-2">
          <div>
            <h1
              className="text-yellow-400 text-xs mb-1"
              style={{ fontFamily: pxFont }}
            >
              YEAR {roundNumber} RESULTS
            </h1>
            <p style={{ fontFamily: bodyFont, fontSize: "1.25rem", color: "#00f5ff" }}>
              {brandName}
            </p>
          </div>
          <div
            className="text-xs px-3 py-1 border border-yellow-400"
            style={{ color: "#ffbe0b", fontFamily: bodyFont, fontSize: "1rem" }}
          >
            ROUND {roundNumber}/{totalRounds}
          </div>
        </div>
      </div>

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

      {/* Policy + Perception */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="border border-gray-700 p-3">
          <p className="text-xs text-gray-400 mb-1" style={{ fontFamily: pxFont }}>
            POLICY SCORE
          </p>
          <p style={{ fontFamily: bodyFont, fontSize: "1.2rem", color: "#ffbe0b" }}>
            {snap.policyScore > 0 ? "+" : ""}{snap.policyScore}
          </p>
        </div>
        <div className="border border-gray-700 p-3">
          <p className="text-xs text-gray-400 mb-1" style={{ fontFamily: pxFont }}>
            INDUSTRY PERCEPTION
          </p>
          <p style={{ fontFamily: bodyFont, fontSize: "1.2rem", color: "#00f5ff" }}>
            {snap.publicPerception > 0 ? "+" : ""}{snap.publicPerception}
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
                  {[
                    ["COGS", tr.costs?.cogs ?? 0],
                    ["R&D", tr.costs?.rdSpend ?? 0],
                    ["Marketing", tr.costs?.marketingSpend ?? 0],
                    ["Lobbying", tr.costs?.lobbyingSpend ?? 0],
                    ["Space", tr.costs?.spaceCost ?? 0],
                    ["Engineering", tr.costs?.engineeringFees ?? 0],
                    ["Inventory Carry", tr.costs?.inventoryCarrying ?? 0],
                  ].map(([label, amount]) => (
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

                  <div className="flex justify-between text-sm">
                    <span style={{ fontFamily: bodyFont, color: "#888", fontSize: "0.9rem" }}>
                      Unit Cost: {fmt(mr.unitCost)}
                    </span>
                    <span style={{ fontFamily: bodyFont, color: "#888", fontSize: "0.9rem" }}>
                      Reliability: {mr.reliabilityScore.toFixed(2)}×
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Market Tab */}
          {activeTab === "market" && (
            <div className="space-y-4">
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
        <div className="mb-6 border border-yellow-400 p-4">
          <p className="text-xs text-yellow-400 mb-3" style={{ fontFamily: pxFont }}>
            ALL TEAM RESULTS (FACILITATOR)
          </p>
          {allTeamResults.map((t) => {
            const r = t.teamResult as TeamResultData;
            return (
              <div key={t.teamId} className="mb-3 border-b border-gray-700 pb-3">
                <p style={{ fontFamily: bodyFont, color: "#00f5ff", fontSize: "1rem" }}>
                  {t.brandName}
                </p>
                <div className="flex gap-6 mt-1">
                  <span style={{ fontFamily: bodyFont, color: "#39ff14", fontSize: "0.95rem" }}>
                    Rev: {fmt(r?.revenue?.total ?? 0)}
                  </span>
                  <span style={{ fontFamily: bodyFont, color: netCashColor, fontSize: "0.95rem" }}>
                    Net: {fmt(r?.netCashChange ?? 0)}
                  </span>
                  <span style={{ fontFamily: bodyFont, color: "#ffbe0b", fontSize: "0.95rem" }}>
                    Cash: {fmt(parseFloat(r?.newCash ?? "0"))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Continue Button */}
      <div className="mt-8 flex justify-center">
        {!isLastRound ? (
          <button
            onClick={() => router.push(`/play/${gameId}`)}
            className="px-8 py-4 text-xs border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black transition-colors"
            style={{ fontFamily: pxFont }}
          >
            CONTINUE TO NEXT ROUND →
          </button>
        ) : (
          <button
            onClick={() => router.push(`/facilitator`)}
            className="px-8 py-4 text-xs border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black transition-colors"
            style={{ fontFamily: pxFont }}
          >
            FINAL LEADERBOARD
          </button>
        )}
      </div>
    </div>
  );
}
