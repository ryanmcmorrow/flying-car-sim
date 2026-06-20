"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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
import type { MarketBriefing } from "@/lib/game-utils";
import { VehicleSection as VehicleSectionComp } from "@/components/game/sections/VehicleSection";
import { RdSection as RdSectionComp } from "@/components/game/sections/RdSection";
import { ManufacturingSection as ManufacturingSectionComp } from "@/components/game/sections/ManufacturingSection";
import { ProductionSection as ProductionSectionComp } from "@/components/game/sections/ProductionSection";
import { MarketingSection as MarketingSectionComp } from "@/components/game/sections/MarketingSection";
import { LobbyingSection as LobbyingSectionComp } from "@/components/game/sections/LobbyingSection";
import { ReadOnlySection } from "@/components/game/sections/ReadOnlySection";
import { SubmitPanel } from "@/components/game/SubmitPanel";

type SaveStatus = "saved" | "saving" | "unsaved" | "error";

interface DecisionRoomProps {
  gameId: string;
  game: { id: string; code: string; currentRound: number; status: string };
  round: {
    id: string;
    roundNumber: number;
    status: string;
    worldEvent: { title: string; description: string } | null;
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
  competitors: Array<{ teamId: string; brandName: string }>;
  briefing: MarketBriefing | null;
}

const ROLE_COLORS: Record<TeamMemberRole, string> = {
  CEO: "#ffbe0b",
  CFO: "#39ff14",
  CMO: "#ff006e",
  CTO: "#00f5ff",
  COO: "#c77dff",
};

const ALL_TABS: { role: TeamMemberRole; label: string }[] = [
  { role: "CEO", label: "CEO" },
  { role: "CFO", label: "CFO" },
  { role: "CMO", label: "CMO" },
  { role: "CTO", label: "CTO" },
  { role: "COO", label: "COO" },
];

// Role → sections that player can edit
const ROLE_EDITABLE: Record<TeamMemberRole, SectionKey[]> = {
  CTO: ["vehicleSection", "rdSection"],
  CFO: ["productionSection"],
  CMO: ["marketingSection"],
  COO: ["manufacturingSection"],
  CEO: ["lobbyingSection"],
};

// Tab → sections to show
const TAB_SECTIONS: Record<
  TeamMemberRole,
  { section: SectionKey; label: string }[]
> = {
  CEO: [{ section: "lobbyingSection", label: "LOBBYING" }],
  CFO: [{ section: "productionSection", label: "PRICING & ALLOCATION" }],
  CMO: [{ section: "marketingSection", label: "MARKETING" }],
  CTO: [
    { section: "vehicleSection", label: "VEHICLES" },
    { section: "rdSection", label: "R&D" },
  ],
  COO: [{ section: "manufacturingSection", label: "MANUFACTURING" }],
};

export function DecisionRoom({
  gameId,
  game,
  round,
  team,
  myRole,
  decision,
  rdUnlocks,
  competitors,
  briefing,
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

  const [activeTab, setActiveTab] = useState<TeamMemberRole>(myRole);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [savedAt, setSavedAt] = useState<Date | null>(null);

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

  // Save indicator text
  function getSaveLabel() {
    if (saveStatus === "saving") return "● SAVING...";
    if (saveStatus === "error") return "✗ SAVE FAILED — retry?";
    if (saveStatus === "saved" && savedAt) {
      const secondsAgo = Math.floor((Date.now() - savedAt.getTime()) / 1000);
      return `✓ SAVED ${secondsAgo < 5 ? "just now" : `${secondsAgo}s ago`}`;
    }
    if (saveStatus === "unsaved") return "● UNSAVED";
    return "✓ SAVED";
  }

  function getSaveColor() {
    if (saveStatus === "saving") return "var(--px-amber)";
    if (saveStatus === "error") return "var(--px-pink)";
    if (saveStatus === "unsaved") return "var(--px-amber)";
    return "var(--px-green)";
  }

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
            <div className="text-right">
              <p
                style={{
                  fontFamily: "var(--font-pixel)",
                  fontSize: "0.5rem",
                  color: "var(--px-gray)",
                }}
              >
                CASH BALANCE
              </p>
              <p
                style={{
                  fontFamily: "var(--font-pixel)",
                  fontSize: "0.75rem",
                  color: "var(--px-green)",
                }}
              >
                ${parseFloat(team.cash).toLocaleString()}
              </p>
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
                WORLD EVENT: {round.worldEvent.title}
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

          {/* Market briefing (round 1) */}
          {briefing && (
            <div className="mt-3 pixel-transmission">
              <p
                style={{
                  fontFamily: "var(--font-pixel)",
                  fontSize: "0.5rem",
                  color: "var(--px-green)",
                  marginBottom: "0.4rem",
                }}
              >
                YEAR 1 MARKET BRIEFING
              </p>
              <p>Total market demand: {briefing.totalFlyingCarDemand.toLocaleString()} units</p>
              <p>Economy: {briefing.economicCondition}</p>
              <p>Policy score: {briefing.policyScore}</p>
              <p style={{ fontSize: "0.85rem", color: "var(--px-gray)", marginTop: "0.25rem" }}>
                {briefing.npcLobbyingNote}
              </p>
            </div>
          )}
        </div>

        {/* Role Tabs */}
        <div>
          <div className="flex gap-1 flex-wrap">
            {ALL_TABS.map(({ role, label }) => {
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
                  {label}
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
                color: getSaveColor(),
              }}
            >
              {getSaveLabel()}
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
