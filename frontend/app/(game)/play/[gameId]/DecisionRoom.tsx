"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { TeamMemberRole } from "@/app/generated/prisma/client";
import type {
  VehicleSection,
  RdSection,
  ManufacturingSection,
  ProductionSection,
  MarketingSection,
  LobbyingSection,
  SectionKey,
} from "@/types/decisions";
import { ROLE_COLORS } from "@/lib/game-utils";
import type { MarketBriefing } from "@/lib/game-utils";
import { VehicleSection as VehicleSectionComp } from "@/components/game/sections/VehicleSection";
import { RdSection as RdSectionComp } from "@/components/game/sections/RdSection";
import { ManufacturingSection as ManufacturingSectionComp } from "@/components/game/sections/ManufacturingSection";
import { ProductionSection as ProductionSectionComp } from "@/components/game/sections/ProductionSection";
import { MarketingSection as MarketingSectionComp } from "@/components/game/sections/MarketingSection";
import { LobbyingSection as LobbyingSectionComp } from "@/components/game/sections/LobbyingSection";
import { ReadOnlySection } from "@/components/game/sections/ReadOnlySection";
import { SubmitPanel } from "@/components/game/SubmitPanel";
import { YEAR1_DEMAND_BY_TYPE } from "@/lib/engine/constants";

type SaveStatus = "saved" | "saving" | "unsaved" | "error";

const SEGMENT_INTEL = [
  { name: "COMPACT",    icon: "🚗", tagline: "Mass market workhorse",          color: "#39ff14", buyers: "Urban commuters, first-time buyers, budget professionals", pricing: "Price-sensitive — undercut rivals and grab share fast, but margins are thin.", tip: "High volume play. Compete hard on price, control costs." },
  { name: "SEDAN",      icon: "🚘", tagline: "Broad-appeal bread-and-butter",  color: "#00f5ff", buyers: "Families, professionals, suburban commuters",                pricing: "Moderately price-sensitive. A small premium is fine if quality justifies it.",   tip: "Balanced segment. Reward quality with a modest price bump." },
  { name: "SUV",        icon: "🚙", tagline: "Premium family hauler",          color: "#ffbe0b", buyers: "Affluent families, lifestyle buyers, safety-focused parents",  pricing: "Low price sensitivity — buyers expect to pay more. Discounting signals cheap.", tip: "Margin play. Don't race to the bottom — hold your price." },
  { name: "TRUCK",      icon: "🛻", tagline: "Utility niche, loyal buyers",    color: "#ff7c00", buyers: "Tradespeople, rural buyers — mostly Southeast and Midwest",    pricing: "Very low price sensitivity — utility-focused, brand-loyal buyers.",             tip: "Niche but sticky. Strong in rural regions. R&D on durability wins." },
  { name: "SPORTS CAR", icon: "🏎️", tagline: "Prestige — status over savings", color: "#ff006e", buyers: "Wealthy early adopters, status buyers, tech enthusiasts",      pricing: "Price is a signal of exclusivity. Charging more can increase demand.",           tip: "Prestige play. Invest in R&D and brand perception over raw volume." },
];

const REGION_INTEL = [
  { name: "WEST COAST",  icon: "🌴", color: "#00f5ff", strongest: "COMPACT, SEDAN, SPORTS CAR", note: "Largest market in Year 1. Buyers embrace new tech and pay premium for innovation." },
  { name: "NORTHEAST",   icon: "🏙️", color: "#c77dff", strongest: "COMPACT, SEDAN",              note: "Dense urban, wealthy commuters. Responds well to brand prestige." },
  { name: "SOUTHEAST",   icon: "🌿", color: "#39ff14", strongest: "TRUCK, SUV",                  note: "Truck demand far above national average. Practical, brand-loyal buyers. Underserved." },
  { name: "MIDWEST",     icon: "🌾", color: "#ffbe0b", strongest: "SEDAN, SUV, TRUCK",           note: "Balanced demand. Build here and skip the $1,500/unit shipping penalty." },
  { name: "SOUTHWEST",   icon: "🏜️", color: "#ff7c00", strongest: "SUV, SEDAN",                  note: "Smaller today but growing fastest. Early movers build installed base before rivals." },
];

interface DecisionRoomProps {
  gameId: string;
  game: { id: string; code: string; currentRound: number; status: string; mode: string };
  round: {
    id: string;
    roundNumber: number;
    status: string;
    worldEvent: { title: string; description: string } | null;
    expiresAt: string | null;
  };
  team: { id: string; brandName: string; cash: string };
  myRole: TeamMemberRole;
  decision: {
    id: string;
    vehicleSection: VehicleSection;
    rdSection: RdSection;
    manufacturingSection: ManufacturingSection;
    productionSection: ProductionSection;
    marketingSection: MarketingSection;
    lobbyingSection: LobbyingSection;
    submittedAt: string | null;
  };
  rdUnlocks: string[];
  ownedExclusives?: Record<string, number>;
  competitorExclusives?: Record<string, number>;
  competitors: Array<{ teamId: string; brandName: string }>;
  briefing: MarketBriefing | null;
  totalFlyingDemand?: number;
  flyingMedians: Record<string, number> | null;
  inventoryItems: Array<{ modelName: string; vehicleType: string; unitCost: number; salePrice: number; unitsLeftInInventory: number; fromRound: number }> | null;
  currentFacilities: Array<{ region: string; size: string }>;
}


const ALL_TABS: { role: TeamMemberRole; label: string; icon: string }[] = [
  { role: "CTO", label: "CTO", icon: "🔬" },
  { role: "COO", label: "COO", icon: "🏭" },
  { role: "CFO", label: "CFO", icon: "💰" },
  { role: "CMO", label: "CMO", icon: "📣" },
  { role: "CEO", label: "CEO", icon: "🏛️" },
];

// Role → sections that player can edit
const ROLE_EDITABLE: Record<TeamMemberRole, SectionKey[]> = {
  CTO: ["vehicleSection", "rdSection"],
  CFO: ["productionSection"],
  CMO: ["marketingSection"],
  COO: ["manufacturingSection"],
  CEO: ["lobbyingSection"],
};

export function DecisionRoom({
  gameId,
  game,
  round,
  team,
  myRole,
  decision,
  rdUnlocks,
  ownedExclusives = {},
  competitorExclusives = {},
  competitors,
  briefing,
  totalFlyingDemand,
  flyingMedians,
  inventoryItems,
  currentFacilities,
}: DecisionRoomProps) {
  // All section states
  const [vehicleSection, setVehicleSection] = useState<VehicleSection>(
    decision.vehicleSection
  );
  const [rdSection, setRdSection] = useState<RdSection>(decision.rdSection);
  const [manufacturingSection, setManufacturingSection] =
    useState<ManufacturingSection>(decision.manufacturingSection);
  const [productionSection, setProductionSection] = useState<ProductionSection>(
    decision.productionSection
  );
  const [marketingSection, setMarketingSection] = useState<MarketingSection>(
    decision.marketingSection
  );
  const [lobbyingSection, setLobbyingSection] = useState<LobbyingSection>(
    decision.lobbyingSection
  );
  const [submittedAt, setSubmittedAt] = useState<string | null>(
    decision.submittedAt
  );

  // CEO can edit all sections, so walk them through the workflow starting at CTO.
  // Other roles open directly on their own tab.
  const [activeTab, setActiveTab] = useState<TeamMemberRole>(
    myRole === "CEO" || !myRole ? "CTO" : myRole as TeamMemberRole
  );
  const router = useRouter();

  // Poll until round resolves then redirect to results.
  // Always active in Party Mode (timer can resolve without submit); otherwise only after submit.
  useEffect(() => {
    if (!submittedAt && game.mode !== "PARTY") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/play/${gameId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.round?.status === "RESOLVED") {
          if (data.game?.status === "COMPLETED") {
            router.push(`/results/${gameId}/final`);
          } else {
            router.push(`/results/${gameId}/${data.round.roundNumber}`);
          }
        }
      } catch {
        // ignore poll errors
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [submittedAt, gameId, game.mode, router]);
  // Countdown timer for PARTY mode
  const [secondsLeft, setSecondsLeft] = useState<number | null>(() => {
    if (!round.expiresAt) return null;
    return Math.max(0, Math.floor((new Date(round.expiresAt).getTime() - Date.now()) / 1000));
  });
  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) return;
    const t = setInterval(() => {
      const s = Math.max(0, Math.floor((new Date(round.expiresAt!).getTime() - Date.now()) / 1000));
      setSecondsLeft(s);
    }, 1000);
    return () => clearInterval(t);
  }, [round.expiresAt, secondsLeft]);

  const [briefOpen, setBriefOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  // Ticking clock so the "saved Xs ago" label stays current without calling
  // Date.now() during render (which is impure).
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (saveStatus !== "saved" || !savedAt) return;
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [saveStatus, savedAt]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaves = useRef<Map<SectionKey, unknown>>(new Map());

  // Auto-save on section change
  const scheduleSave = useCallback(
    (section: SectionKey, data: unknown) => {
      pendingSaves.current.set(section, data);
      setSaveStatus("unsaved");

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setSaveStatus("saving");
        const entries: [SectionKey, unknown][] = [];
        pendingSaves.current.forEach((v: unknown, k: SectionKey) => entries.push([k, v]));
        pendingSaves.current.clear();

        for (const [sec, dat] of entries) {
          try {
            const res = await fetch(`/api/play/${gameId}/decision`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ section: sec, data: dat }),
            });
            if (!res.ok) {
              const body = await res.json();
              console.error("Save failed:", body);
              setSaveStatus("error");
              return;
            }
          } catch {
            setSaveStatus("error");
            return;
          }
        }
        setSaveStatus("saved");
        setSavedAt(new Date());
      }, 800);
    },
    [gameId]
  );

  // Section change handlers — only schedule saves for editable sections
  const canEdit = (sec: SectionKey): boolean => {
    if (submittedAt) return false;
    if (myRole === "CEO") return true;
    return ROLE_EDITABLE[myRole]?.includes(sec) ?? false;
  };

  function handleVehicleChange(v: VehicleSection) {
    setVehicleSection(v);
    if (canEdit("vehicleSection")) scheduleSave("vehicleSection", v);
  }
  function handleRdChange(v: RdSection) {
    setRdSection(v);
    if (canEdit("rdSection")) scheduleSave("rdSection", v);
  }
  function handleMfgChange(v: ManufacturingSection) {
    setManufacturingSection(v);
    if (canEdit("manufacturingSection")) scheduleSave("manufacturingSection", v);
  }
  function handleProdChange(v: ProductionSection) {
    setProductionSection(v);
    if (canEdit("productionSection")) scheduleSave("productionSection", v);
  }
  function handleMktChange(v: MarketingSection) {
    setMarketingSection(v);
    if (canEdit("marketingSection")) scheduleSave("marketingSection", v);
  }
  function handleLobbyChange(v: LobbyingSection) {
    setLobbyingSection(v);
    if (canEdit("lobbyingSection")) scheduleSave("lobbyingSection", v);
  }

  // Submit handler
  async function handleSubmit() {
    const res = await fetch(`/api/play/${gameId}/submit`, {
      method: "POST",
    });
    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.error ?? "Submit failed");
    }
    setSubmittedAt(new Date().toISOString());
  }

  const saveLabel =
    saveStatus === "saving" ? "● SAVING..." :
    saveStatus === "error" ? "✗ SAVE FAILED — retry?" :
    saveStatus === "saved" && savedAt
      ? `✓ SAVED ${Math.floor((nowMs - savedAt.getTime()) / 1000) < 5 ? "just now" : `${Math.floor((nowMs - savedAt.getTime()) / 1000)}s ago`}`
    : saveStatus === "unsaved" ? "● UNSAVED" : "✓ SAVED";
  const saveColor =
    saveStatus === "saving" || saveStatus === "unsaved" ? "var(--px-amber)" :
    saveStatus === "error" ? "var(--px-pink)" : "var(--px-green)";

  const isLocked = !!submittedAt;

  // Current section data map
  const sectionData: Record<SectionKey, unknown> = {
    vehicleSection,
    rdSection,
    manufacturingSection,
    productionSection,
    marketingSection,
    lobbyingSection,
  };

  return (
    <div className="game-screen scanlines">
      {/* Locked overlay */}
      {isLocked && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            className="pixel-card pixel-card-green"
            style={{ pointerEvents: "none", textAlign: "center" }}
          >
            <p
              className="pixel-heading"
              style={{ fontSize: "1.2rem", color: "var(--px-green)" }}
            >
              DECISIONS LOCKED
            </p>
            <p
              style={{
                fontFamily: "var(--font-pixel-body)",
                fontSize: "1.1rem",
                color: "var(--px-gray)",
                marginTop: "0.5rem",
              }}
            >
              Waiting for all teams to submit...
            </p>
          </div>
        </div>
      )}

      {/* Market Brief modal */}
      {briefOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, overflowY: "auto", padding: "2rem 1rem" }}
          onClick={(e) => { if (e.target === e.currentTarget) setBriefOpen(false); }}
        >
          <div style={{ maxWidth: "720px", margin: "0 auto" }}>
            <div className="pixel-card" style={{ marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontFamily: "var(--font-pixel)", fontSize: "0.75rem", color: "var(--px-cyan)" }}>📋 MARKET INTELLIGENCE BRIEF</h2>
                <button onClick={() => setBriefOpen(false)} style={{ fontFamily: "var(--font-pixel)", fontSize: "0.5rem", color: "var(--px-pink)", border: "2px solid var(--px-pink)", background: "transparent", padding: "0.2rem 0.5rem", cursor: "pointer" }}>✕ CLOSE</button>
              </div>
            </div>

            <h3 style={{ fontFamily: "var(--font-pixel)", fontSize: "0.55rem", color: "var(--px-amber)", marginBottom: "0.75rem" }}>VEHICLE SEGMENTS</h3>
            <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1.5rem" }}>
              {SEGMENT_INTEL.map((seg) => (
                <div key={seg.name} className="pixel-card" style={{ borderColor: seg.color }}>
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "1.8rem" }}>{seg.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: "0.75rem", alignItems: "baseline", marginBottom: "0.3rem" }}>
                        <span style={{ fontFamily: "var(--font-pixel)", fontSize: "0.5rem", color: seg.color }}>{seg.name}</span>
                        <span style={{ fontFamily: "var(--font-pixel-body)", fontSize: "0.85rem", color: "var(--px-gray)" }}>{seg.tagline}</span>
                      </div>
                      <p style={{ fontFamily: "var(--font-pixel-body)", fontSize: "0.85rem", color: "#cccccc", marginBottom: "0.3rem" }}><span style={{ color: "var(--px-gray)" }}>Buyers: </span>{seg.buyers}</p>
                      <p style={{ fontFamily: "var(--font-pixel-body)", fontSize: "0.85rem", color: "#cccccc", marginBottom: "0.3rem" }}><span style={{ color: "var(--px-gray)" }}>Pricing: </span>{seg.pricing}</p>
                      <p style={{ fontFamily: "var(--font-pixel-body)", fontSize: "0.85rem", color: "var(--px-amber)" }}>💡 {seg.tip}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <h3 style={{ fontFamily: "var(--font-pixel)", fontSize: "0.55rem", color: "var(--px-amber)", marginBottom: "0.75rem" }}>REGIONS</h3>
            <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1.5rem" }}>
              {REGION_INTEL.map((reg) => (
                <div key={reg.name} className="pixel-card" style={{ borderColor: reg.color }}>
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "1.8rem" }}>{reg.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: "0.75rem", alignItems: "baseline", marginBottom: "0.3rem" }}>
                        <span style={{ fontFamily: "var(--font-pixel)", fontSize: "0.5rem", color: reg.color }}>{reg.name}</span>
                        <span style={{ fontFamily: "var(--font-pixel-body)", fontSize: "0.85rem", color: "var(--px-gray)" }}>Best for: {reg.strongest}</span>
                      </div>
                      <p style={{ fontFamily: "var(--font-pixel-body)", fontSize: "0.85rem", color: "#cccccc" }}>{reg.note}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="pixel-card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <h1
                className="pixel-heading"
                style={{ fontSize: "0.85rem", color: "var(--px-cyan)" }}
              >
                YEAR {game.currentRound} · ROUND {round.roundNumber}
              </h1>
              <p
                style={{
                  fontFamily: "var(--font-pixel)",
                  fontSize: "0.5rem",
                  color: ROLE_COLORS[myRole],
                  marginTop: "0.25rem",
                }}
              >
                {myRole} — {team.brandName}
              </p>
            </div>
            {secondsLeft !== null && (
              <div className="text-center px-4">
                <p style={{ fontFamily: "var(--font-pixel)", fontSize: "0.42rem", color: "var(--px-gray)" }}>Time left</p>
                <p style={{
                  fontFamily: "var(--font-pixel)",
                  fontSize: "1.1rem",
                  color: secondsLeft <= 60 ? "var(--px-pink)" : secondsLeft <= 120 ? "var(--px-amber)" : "var(--px-cyan)",
                  animation: secondsLeft <= 30 ? "pixel-blink 0.5s step-end infinite" : undefined,
                }}>
                  {secondsLeft <= 0 ? "TIME'S UP" : `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`}
                </p>
              </div>
            )}
            <div className="text-right flex flex-col items-end gap-2">
              <div>
                <p style={{ fontFamily: "var(--font-pixel)", fontSize: "0.5rem", color: "var(--px-gray)" }}>Cash balance</p>
                <p style={{ fontFamily: "var(--font-pixel)", fontSize: "0.75rem", color: "var(--px-green)" }}>
                  ${parseFloat(team.cash).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setBriefOpen(true)}
                style={{
                  fontFamily: "var(--font-pixel)",
                  fontSize: "0.38rem",
                  color: "var(--px-cyan)",
                  border: "2px solid var(--px-cyan)",
                  background: "transparent",
                  padding: "0.2rem 0.5rem",
                  cursor: "pointer",
                }}
              >
                📋 MARKET BRIEF
              </button>
              {round.roundNumber > 1 && (
                <a
                  href={`/results/${gameId}/${round.roundNumber - 1}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: "var(--font-pixel)",
                    fontSize: "0.38rem",
                    color: "var(--px-amber)",
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                >
                  ↗ ROUND {round.roundNumber - 1} REPORT
                </a>
              )}
            </div>
          </div>

          <hr className="pixel-hr" />

          {/* World Event */}
          {round.worldEvent ? (
            <div className="pixel-transmission">
              <p
                style={{
                  fontFamily: "var(--font-pixel)",
                  fontSize: "0.55rem",
                  color: "var(--px-green)",
                  marginBottom: "0.5rem",
                }}
              >
                World event: {round.worldEvent.title}
              </p>
              <p style={{ fontSize: "1.1rem" }}>{round.worldEvent.description}</p>
            </div>
          ) : (
            <p
              style={{
                fontFamily: "var(--font-pixel-body)",
                fontSize: "1rem",
                color: "var(--px-gray)",
              }}
            >
              No world event this round.
            </p>
          )}

          {/* Market overview — always shown; precision gated behind market_analytics */}
          {(() => {
            const hasMarketAnalytics = rdUnlocks.includes("market_analytics");
            const segmentDemand = briefing?.demandByType as Record<string, number> | undefined;
            const SEGMENTS = [
              { key: "COMPACT",    label: "Compact" },
              { key: "SEDAN",      label: "Sedan" },
              { key: "SUV",        label: "SUV" },
              { key: "SPORTS_CAR", label: "Sports Car" },
              { key: "TRUCK",      label: "Truck" },
            ];
            const maxDemand = YEAR1_DEMAND_BY_TYPE.COMPACT;
            const totalFlying = totalFlyingDemand ?? briefing?.totalFlyingCarDemand ?? 300_000;
            function qualLabel(demand: number) {
              if (demand >= 80_000) return { label: "VERY HIGH", color: "var(--px-green)" };
              if (demand >= 50_000) return { label: "HIGH",      color: "var(--px-green)" };
              if (demand >= 30_000) return { label: "MEDIUM",    color: "var(--px-amber)" };
              if (demand >= 15_000) return { label: "LOW",        color: "var(--px-pink)" };
              return                       { label: "MINIMAL",    color: "var(--px-gray)" };
            }
            return (
              <div className="mt-3 pixel-transmission">
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <p style={{ fontFamily: "var(--font-pixel)", fontSize: "0.5rem", color: "var(--px-green)" }}>
                    EST. FLYING CAR MARKET
                  </p>
                  <span style={{ fontFamily: "var(--font-pixel-body)", fontSize: "0.85rem", color: "var(--px-cyan)" }}>
                    ~{Math.round(totalFlying / 10_000) * 10}K est. total demand
                  </span>
                </div>
                {round.worldEvent && (
                  <p style={{ fontFamily: "var(--font-pixel-body)", fontSize: "0.8rem", color: "var(--px-amber)", marginBottom: "0.4rem" }}>
                    ⚠ World event above may shift these figures.
                  </p>
                )}
                {SEGMENTS.map(({ key, label }) => {
                  const demand = segmentDemand?.[key] ?? YEAR1_DEMAND_BY_TYPE[key as keyof typeof YEAR1_DEMAND_BY_TYPE];
                  const { label: ql, color: qc } = qualLabel(demand);
                  return (
                    <div key={key} className="flex items-center gap-2 mb-2">
                      <span style={{ fontFamily: "var(--font-pixel-body)", fontSize: "0.85rem", color: "#cccccc", minWidth: "78px" }}>
                        {label}
                      </span>
                      <div style={{ flex: 1, height: "6px", background: "#1a1a2e" }}>
                        <div style={{ width: `${(demand / maxDemand) * 100}%`, height: "100%", background: hasMarketAnalytics ? "var(--px-cyan)" : qc, opacity: 0.6 }} />
                      </div>
                      {hasMarketAnalytics ? (
                        <span style={{ fontFamily: "var(--font-pixel-body)", fontSize: "0.85rem", color: "var(--px-amber)", minWidth: "40px", textAlign: "right" }}>
                          ~{Math.round(demand / 10_000) * 10}K
                        </span>
                      ) : (
                        <span style={{ fontFamily: "var(--font-pixel)", fontSize: "0.35rem", color: qc, minWidth: "55px", textAlign: "right" }}>
                          {ql}
                        </span>
                      )}
                    </div>
                  );
                })}
                {!hasMarketAnalytics && (
                  <p style={{ fontFamily: "var(--font-pixel-body)", fontSize: "0.8rem", color: "var(--px-gray)", marginTop: "0.4rem" }}>
                    Unlock <span style={{ color: "var(--px-cyan)" }}>Market Analytics</span> (R&amp;D) for precise demand figures.
                  </p>
                )}
              </div>
            );
          })()}
        </div>

        {/* Role Tabs */}
        <div>
          <div className="flex gap-1 flex-wrap">
            {ALL_TABS.map(({ role, label, icon }) => {
              const color = ROLE_COLORS[role];
              const isActive = activeTab === role;
              const isMyRole = role === myRole;
              return (
                <button
                  key={role}
                  onClick={() => setActiveTab(role)}
                  style={{
                    fontFamily: "var(--font-pixel)",
                    fontSize: "0.5rem",
                    padding: "0.5rem 1rem",
                    border: `3px solid ${color}`,
                    background: isActive ? color : "var(--px-bg-2)",
                    color: isActive ? "var(--px-bg)" : color,
                    cursor: "pointer",
                    letterSpacing: "0.05em",
                    position: "relative",
                  }}
                >
                  <span style={{ marginRight: "0.3rem" }}>{icon}</span>{label}
                  {isMyRole && (
                    <span
                      style={{
                        position: "absolute",
                        top: -6,
                        right: -6,
                        width: 10,
                        height: 10,
                        background: color,
                        border: "2px solid var(--px-bg)",
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Save indicator */}
          <div className="mt-2 flex items-center justify-end">
            <span
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: "0.42rem",
                color: saveColor,
              }}
            >
              {saveLabel}
            </span>
          </div>
        </div>

        {/* Section content */}
        <div className="pixel-card">
          {/* CTO Tab */}
          {activeTab === "CTO" && (
            <div className="space-y-8">
              {canEdit("vehicleSection") ? (
                <VehicleSectionComp
                  value={vehicleSection}
                  onChange={handleVehicleChange}
                  disabled={isLocked}
                />
              ) : (
                <div>
                  <h3
                    className="pixel-heading mb-3"
                    style={{ fontSize: "0.7rem", color: "var(--px-cyan)" }}
                  >
                    VEHICLES (READ-ONLY)
                  </h3>
                  <ReadOnlySection section="vehicleSection" data={vehicleSection} />
                </div>
              )}

              <hr className="pixel-hr" />

              {canEdit("rdSection") ? (
                <RdSectionComp
                  value={rdSection}
                  existingUnlocks={rdUnlocks}
                  ownedExclusives={ownedExclusives}
                  competitorExclusives={competitorExclusives}
                  competitors={competitors}
                  onChange={handleRdChange}
                  disabled={isLocked}
                />
              ) : (
                <div>
                  <h3
                    className="pixel-heading mb-3"
                    style={{ fontSize: "0.7rem", color: "var(--px-cyan)" }}
                  >
                    R&D (READ-ONLY)
                  </h3>
                  <ReadOnlySection section="rdSection" data={rdSection} />
                </div>
              )}
            </div>
          )}

          {/* COO Tab */}
          {activeTab === "COO" && (
            canEdit("manufacturingSection") ? (
              <ManufacturingSectionComp
                value={manufacturingSection}
                currentFacilities={currentFacilities}
                vehicleModels={vehicleSection.models}
                onChange={handleMfgChange}
                disabled={isLocked}
              />
            ) : (
              <div>
                <h3
                  className="pixel-heading mb-3"
                  style={{ fontSize: "0.7rem", color: "var(--px-cyan)" }}
                >
                  MANUFACTURING (READ-ONLY)
                </h3>
                <ReadOnlySection
                  section="manufacturingSection"
                  data={manufacturingSection}
                />
              </div>
            )
          )}

          {/* CFO Tab */}
          {activeTab === "CFO" && (
            canEdit("productionSection") ? (
              <ProductionSectionComp
                value={productionSection}
                vehicleModels={vehicleSection.models}
                currentFacilities={currentFacilities}
                flyingMedians={flyingMedians}
                inventoryItems={inventoryItems}
                onChange={handleProdChange}
                disabled={isLocked}
              />
            ) : (
              <div>
                <h3
                  className="pixel-heading mb-3"
                  style={{ fontSize: "0.7rem", color: "var(--px-cyan)" }}
                >
                  PRICING & ALLOCATION (READ-ONLY)
                </h3>
                <ReadOnlySection
                  section="productionSection"
                  data={productionSection}
                  currentFacilities={currentFacilities}
                />
              </div>
            )
          )}

          {/* CMO Tab */}
          {activeTab === "CMO" && (
            canEdit("marketingSection") ? (
              <MarketingSectionComp
                value={marketingSection}
                competitors={competitors}
                onChange={handleMktChange}
                disabled={isLocked}
              />
            ) : (
              <div>
                <h3
                  className="pixel-heading mb-3"
                  style={{ fontSize: "0.7rem", color: "var(--px-cyan)" }}
                >
                  MARKETING (READ-ONLY)
                </h3>
                <ReadOnlySection
                  section="marketingSection"
                  data={marketingSection}
                />
              </div>
            )
          )}

          {/* CEO Tab */}
          {activeTab === "CEO" && (
            canEdit("lobbyingSection") ? (
              <LobbyingSectionComp
                value={lobbyingSection}
                onChange={handleLobbyChange}
                disabled={isLocked}
                currentPolicyScore={briefing?.policyScore ?? 0}
              />
            ) : (
              <div>
                <h3
                  className="pixel-heading mb-3"
                  style={{ fontSize: "0.7rem", color: "var(--px-cyan)" }}
                >
                  LOBBYING (READ-ONLY)
                </h3>
                <ReadOnlySection
                  section="lobbyingSection"
                  data={lobbyingSection}
                />
              </div>
            )
          )}
        </div>

        {/* Submit panel — CEO only */}
        {myRole === "CEO" && (
          <SubmitPanel
            decisionData={sectionData}
            onSubmit={handleSubmit}
            submittedAt={submittedAt}
          />
        )}

        {/* Non-CEO submitted status */}
        {myRole !== "CEO" && submittedAt && (
          <div className="pixel-card pixel-card-green text-center">
            <p
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: "0.55rem",
                color: "var(--px-green)",
              }}
            >
              DECISIONS SUBMITTED — waiting for round resolution
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
