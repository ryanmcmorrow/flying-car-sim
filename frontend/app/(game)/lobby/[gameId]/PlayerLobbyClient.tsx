"use client";

import { useState, useEffect, useCallback } from "react";
import { ROLE_DESCRIPTIONS, ROLE_COLORS } from "@/lib/game-utils";
import { Tooltip } from "@/components/game/Tooltip";
import { IntroScreen } from "@/components/game/IntroScreen";
import type { MarketBriefing } from "@/lib/game-utils";
import type { TeamMemberRole } from "@/app/generated/prisma/client";
import { SignOutButton } from "@/components/game/SignOutButton";
import { YEAR1_DEMAND_BY_TYPE } from "@/lib/engine/constants";

interface TeamMember {
  id: string;
  role: string;
  userId: string;
  userName: string;
}

interface LobbyTeam {
  id: string;
  brandName: string;
  members: { id: string; role: string; userName: string }[];
}

interface GameData {
  id: string;
  code: string;
  status: "LOBBY" | "ACTIVE" | "COMPLETED";
  currentRound: number;
  mode: string;
  roundDurationSeconds: number | null;
  isHost: boolean;
  settings: Record<string, unknown>;
  allTeams: LobbyTeam[];
  myTeam: {
    id: string;
    brandName: string;
    members: TeamMember[];
  };
  myRole: string;
  playerName: string;
}


interface Props {
  gameData: GameData;
}

function totalDemandLabel(n: number): { label: string; color: string } {
  if (n >= 70_000) return { label: "STRONG",   color: "#39ff14" };
  if (n >= 40_000) return { label: "MODERATE", color: "#ffbe0b" };
  if (n >= 20_000) return { label: "TIGHT",    color: "#ff7c00" };
  return                  { label: "SCARCE",   color: "#ff006e" };
}

function relativeSegmentLabel(rank: number): { label: string; color: string } {
  if (rank === 0) return { label: "HOTTEST",  color: "#39ff14" };
  if (rank === 1) return { label: "HIGH",     color: "#39ff14" };
  if (rank === 2) return { label: "MEDIUM",   color: "#ffbe0b" };
  if (rank === 3) return { label: "LOW",      color: "#ff7c00" };
  return                 { label: "NICHE",    color: "#8888aa" };
}

export function PlayerLobbyClient({ gameData: initial }: Props) {
  const introKey = `intro-seen-${initial.id}`;
  // sessionStorage is unavailable during SSR — use effect to check after mount
  const [showIntro, setShowIntro] = useState(false);
  useEffect(() => {
    if (!sessionStorage.getItem(introKey)) setShowIntro(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [gameData, setGameData] = useState<GameData>(initial);
  const [showTransmission, setShowTransmission] = useState(
    initial.status === "ACTIVE"
  );

  const briefing = gameData.settings.year1Briefing as MarketBriefing | undefined;

  const myRoleColor =
    ROLE_COLORS[gameData.myRole as TeamMemberRole] ?? "#00f5ff";
  const myRoleDesc =
    ROLE_DESCRIPTIONS[gameData.myRole as TeamMemberRole] ?? "";

  const refreshGame = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/${gameData.id}`);
      if (!res.ok) return;
      const data = await res.json();

      // Find my team again from updated data
      let updatedTeam = null;
      for (const team of data.teams) {
        const match = team.members.find(
          (m: TeamMember) => m.userId === gameData.myTeam.members.find(
            (me: TeamMember) => me.userId === m.userId
          )?.userId
        );
        if (match) {
          updatedTeam = team;
          break;
        }
      }

      setGameData((prev) => ({
        ...prev,
        status: data.status,
        currentRound: data.currentRound,
        settings: data.settings,
        allTeams: data.teams ?? prev.allTeams,
        myTeam: updatedTeam ?? prev.myTeam,
      }));

      if (data.status === "ACTIVE" && !showTransmission) {
        setShowTransmission(true);
      }
    } catch {
      // silently ignore poll errors
    }
  }, [gameData.id, gameData.myTeam.members, showTransmission]);

  useEffect(() => {
    if (gameData.status !== "LOBBY") return;
    const interval = setInterval(refreshGame, 3000);
    return () => clearInterval(interval);
  }, [gameData.status, refreshGame]);

  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");
  const [kicking, setKicking] = useState<string | null>(null);

  async function handleKick(teamId: string) {
    setKicking(teamId);
    try {
      await fetch(`/api/games/${gameData.id}/kick?teamId=${teamId}`, { method: "DELETE" });
      await refreshGame();
    } finally {
      setKicking(null);
    }
  }

  async function handleStart() {
    setStartError("");
    setStarting(true);
    try {
      const res = await fetch(`/api/games/${gameData.id}/start`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) { setStartError(body.error ?? "START FAILED"); return; }
      await refreshGame();
    } catch {
      setStartError("CONNECTION ERROR");
    } finally {
      setStarting(false);
    }
  }

  // Extract world event from first round if available
  const worldEvent = (gameData.settings as Record<string, unknown>).worldEvent as { title: string; description: string } | undefined;

  if (showIntro) {
    return (
      <IntroScreen
        onContinue={() => {
          sessionStorage.setItem(introKey, "1");
          setShowIntro(false);
        }}
      />
    );
  }

  return (
    <div
      className="game-screen scanlines min-h-screen"
      style={{ fontFamily: "var(--font-pixel-body), monospace" }}
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(0,245,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        className="max-w-2xl mx-auto px-4 py-8 relative"
        style={{ zIndex: 1 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-2">
          {gameData.isHost ? (
            <a href={`/facilitator/${gameData.id}`} style={{ fontFamily: "var(--font-pixel), monospace", fontSize: "0.42rem", color: "#00f5ff", border: "2px solid #00f5ff", padding: "0.2rem 0.5rem", textDecoration: "none" }}>
              ⚙ FACILITATOR VIEW
            </a>
          ) : <div />}
          <SignOutButton className="pixel-btn" style={{ fontSize: "0.4rem", background: "transparent", color: "#8888aa", border: "2px solid #8888aa", boxShadow: "none" }} />
        </div>
        <div className="text-center mb-8">
          <h1
            className="pixel-heading"
            style={{ fontSize: "0.85rem", lineHeight: 1.8 }}
          >
            GAME LOBBY
          </h1>
          <div className="mt-2 flex items-center justify-center gap-3">
            <span
              className="pixel-heading"
              style={{ fontSize: "1.4rem", letterSpacing: "0.35em", color: "#ffbe0b" }}
            >
              {gameData.code}
            </span>
            <span
              className={`pixel-badge ${gameData.status === "ACTIVE" ? "status-active" : "status-lobby"}`}
              style={{ fontSize: "0.45rem" }}
            >
              {gameData.status}
            </span>
          </div>
        </div>

        {/* Player info card */}
        <div
          className="pixel-card mb-6"
          style={{
            borderColor: myRoleColor,
            boxShadow: `4px 4px 0 ${myRoleColor}55`,
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="pixel-label">Founder</p>
              <p style={{ fontSize: "1.3rem", color: "#ffffff" }}>
                {gameData.playerName}
              </p>
            </div>
            <div className="text-right">
              <p className="pixel-label">Corporation</p>
              <p style={{ fontSize: "1.3rem", color: "#ffbe0b" }}>
                {gameData.myTeam.brandName}
              </p>
            </div>
          </div>

          <div
            className="mt-4 p-3"
            style={{
              border: `2px solid ${myRoleColor}`,
              background: `${myRoleColor}11`,
            }}
          >
            {gameData.mode === "PARTY" ? (
              <>
                <p style={{ fontFamily: "var(--font-pixel), monospace", fontSize: "0.55rem", color: "#ff006e", marginBottom: "0.3rem" }}>
                  ⚡ SOLO FOUNDER — FULL EXEC TEAM
                </p>
                <p style={{ fontSize: "1rem", color: "#cccccc" }}>You control all departments: vehicles, R&D, manufacturing, pricing, marketing, and lobbying.</p>
              </>
            ) : (
              <>
                <p style={{ fontFamily: "var(--font-pixel), monospace", fontSize: "0.55rem", color: myRoleColor, marginBottom: "0.3rem" }}>
                  YOUR ROLE: {gameData.myRole}
                </p>
                <p style={{ fontSize: "1rem", color: "#cccccc" }}>{myRoleDesc}</p>
              </>
            )}
          </div>
        </div>

        {/* Market Overview */}
        <div className="pixel-card mb-6" style={{ borderColor: "var(--px-amber)" }}>
          <p style={{ fontFamily: "var(--font-pixel), monospace", fontSize: "0.55rem", color: "var(--px-amber)", marginBottom: "0.75rem" }}>
            YEAR 1 MARKET PROJECTION
          </p>
          {(() => {
            const n = Math.max(1, gameData.allTeams.length);
            const estFlying = Math.round(YEAR1_DEMAND_BY_TYPE.COMPACT * n / 4 * (1 + YEAR1_DEMAND_BY_TYPE.SEDAN / YEAR1_DEMAND_BY_TYPE.COMPACT + YEAR1_DEMAND_BY_TYPE.SUV / YEAR1_DEMAND_BY_TYPE.COMPACT + YEAR1_DEMAND_BY_TYPE.SPORTS_CAR / YEAR1_DEMAND_BY_TYPE.COMPACT + YEAR1_DEMAND_BY_TYPE.TRUCK / YEAR1_DEMAND_BY_TYPE.COMPACT));
            const flyingK = Math.round(estFlying / 1000);
            return (
              <div className="flex gap-3 mb-4">
                <div style={{ flex: 1, textAlign: "center", padding: "0.5rem", background: "rgba(255,190,11,0.05)", border: "1px solid rgba(255,190,11,0.2)" }}>
                  <p style={{ fontFamily: "var(--font-pixel), monospace", fontSize: "0.38rem", color: "var(--px-gray)" }}>TOTAL MARKET</p>
                  <p style={{ fontFamily: "var(--font-pixel), monospace", fontSize: "0.7rem", color: "#ffffff", marginTop: "0.2rem" }}>18.3M</p>
                  <p style={{ fontFamily: "var(--font-pixel-body), monospace", fontSize: "0.82rem", color: "var(--px-gray)" }}>vehicles / yr</p>
                </div>
                <div style={{ flex: 1, textAlign: "center", padding: "0.5rem", background: "rgba(0,245,255,0.05)", border: "1px solid rgba(0,245,255,0.2)" }}>
                  <p style={{ fontFamily: "var(--font-pixel), monospace", fontSize: "0.38rem", color: "var(--px-cyan)" }}>FLYING CARS</p>
                  <p style={{ fontFamily: "var(--font-pixel), monospace", fontSize: "0.7rem", color: "var(--px-cyan)", marginTop: "0.2rem" }}>~{flyingK}K</p>
                  <p style={{ fontFamily: "var(--font-pixel-body), monospace", fontSize: "0.82rem", color: "var(--px-gray)" }}>units / yr</p>
                </div>
                <div style={{ flex: 1, textAlign: "center", padding: "0.5rem", background: "rgba(136,136,170,0.05)", border: "1px solid rgba(136,136,170,0.2)" }}>
                  <p style={{ fontFamily: "var(--font-pixel), monospace", fontSize: "0.38rem", color: "var(--px-gray)" }}>COMPETITORS</p>
                  <p style={{ fontFamily: "var(--font-pixel), monospace", fontSize: "0.7rem", color: "#ffffff", marginTop: "0.2rem" }}>{gameData.allTeams.length}</p>
                  <p style={{ fontFamily: "var(--font-pixel-body), monospace", fontSize: "0.82rem", color: "var(--px-gray)" }}>teams in game</p>
                </div>
              </div>
            );
          })()}
          <p style={{ fontFamily: "var(--font-pixel), monospace", fontSize: "0.38rem", color: "var(--px-gray)", marginBottom: "0.5rem" }}>
            FLYING CAR DEMAND BY SEGMENT
          </p>
          {([
            { label: "Compact",    demand: YEAR1_DEMAND_BY_TYPE.COMPACT },
            { label: "Sedan",      demand: YEAR1_DEMAND_BY_TYPE.SEDAN },
            { label: "SUV",        demand: YEAR1_DEMAND_BY_TYPE.SUV },
            { label: "Sports Car", demand: YEAR1_DEMAND_BY_TYPE.SPORTS_CAR },
            { label: "Truck",      demand: YEAR1_DEMAND_BY_TYPE.TRUCK },
          ]).map(({ label, demand }, idx) => {
            const seg = relativeSegmentLabel(idx);
            return (
              <div key={label} className="flex items-center gap-2 mb-2">
                <span style={{ fontFamily: "var(--font-pixel-body), monospace", fontSize: "0.85rem", color: "#cccccc", minWidth: "78px" }}>
                  {label}
                </span>
                <div style={{ flex: 1, height: "6px", background: "#1a1a2e" }}>
                  <div style={{ width: `${(demand / YEAR1_DEMAND_BY_TYPE.COMPACT) * 100}%`, height: "100%", background: "var(--px-cyan)", opacity: 0.6 }} />
                </div>
                <span style={{ fontFamily: "var(--font-pixel-body), monospace", fontSize: "0.85rem", color: seg.color, minWidth: "60px", textAlign: "right" }}>
                  {seg.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Team roster */}
        <div className="pixel-card mb-6" style={{ borderColor: "#8888aa" }}>
          <p className="pixel-label mb-3">
            TEAM ROSTER — {gameData.myTeam.brandName}
          </p>
          <div className="space-y-2">
            {gameData.myTeam.members.map((m) => {
              const roleColor = ROLE_COLORS[m.role as TeamMemberRole] ?? "#8888aa";
              const isMe = m.userId === gameData.myTeam.members.find(
                (me) => me.role === gameData.myRole
              )?.userId;
              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.4rem 0.5rem",
                    border: isMe ? `2px solid ${roleColor}` : "2px solid transparent",
                    background: isMe ? `${roleColor}11` : "transparent",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-pixel), monospace",
                      fontSize: "0.5rem",
                      color: roleColor,
                      minWidth: "3rem",
                    }}
                  >
                    {m.role}
                  </span>
                  <span style={{ fontSize: "1.1rem", color: "#cccccc" }}>
                    {m.userName}
                    {isMe && (
                      <span style={{ color: roleColor, marginLeft: "0.5rem", fontSize: "0.85rem" }}>
                        ← YOU
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status section */}
        {gameData.status === "LOBBY" && gameData.isHost && (
          <>
            {/* All parties roster with kick buttons */}
            <div className="pixel-card mb-4" style={{ borderColor: "#8888aa" }}>
              <p className="pixel-label mb-3">ALL PARTIES IN LOBBY ({gameData.allTeams.length})</p>
              {gameData.allTeams.length === 0 ? (
                <p style={{ fontSize: "1rem", color: "#8888aa" }}>No players yet. Share the game code!</p>
              ) : (
                <div className="space-y-2">
                  {gameData.allTeams.map((t) => (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.4rem 0.5rem", border: "2px solid #2a2a3a" }}>
                      <div>
                        <span style={{ fontFamily: "var(--font-pixel), monospace", fontSize: "0.5rem", color: "#ffbe0b" }}>{t.brandName}</span>
                        <span style={{ fontSize: "0.9rem", color: "#9999bb", marginLeft: "0.5rem" }}>
                          {t.members.map((m) => m.userName).join(", ")}
                        </span>
                      </div>
                      {t.id !== gameData.myTeam.id && (
                        <button
                          type="button"
                          onClick={() => handleKick(t.id)}
                          disabled={kicking === t.id}
                          style={{ fontFamily: "var(--font-pixel), monospace", fontSize: "0.4rem", color: "#ff006e", border: "2px solid #ff006e", background: "transparent", padding: "0.2rem 0.4rem", cursor: "pointer" }}
                        >
                          {kicking === t.id ? "..." : "KICK"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Launch controls */}
            <div className="pixel-card text-center py-6" style={{ borderColor: "#ff006e", boxShadow: "4px 4px 0 #7d0030" }}>
              <p className="pixel-heading mb-3" style={{ fontSize: "0.55rem", color: "#ff006e" }}>⚡ HOST CONTROLS</p>
              <p style={{ fontSize: "1rem", color: "#888899", marginBottom: "1.5rem" }}>
                {gameData.roundDurationSeconds
                  ? `Everyone in? Hit launch to start the ${Math.round(gameData.roundDurationSeconds / 60)}-minute round timer.`
                  : "Everyone in? Hit launch to start the game."}
              </p>
              {startError && (
                <p style={{ fontFamily: "var(--font-pixel), monospace", fontSize: "0.45rem", color: "#ff006e", marginBottom: "1rem" }}>❌ {startError}</p>
              )}
              <button onClick={handleStart} disabled={starting} className="pixel-btn pixel-btn-pink" style={{ fontSize: "0.55rem" }}>
                {starting ? "LAUNCHING..." : "⚡ LAUNCH GAME"}
              </button>
            </div>
          </>
        )}

        {gameData.status === "LOBBY" && !gameData.isHost && (
          <div
            className="pixel-card text-center py-6"
            style={{ borderColor: "#ffbe0b", boxShadow: "4px 4px 0 #7d5d00" }}
          >
            <p className="pixel-heading mb-4" style={{ fontSize: "0.55rem", color: "#ffbe0b" }}>Waiting for host</p>
            <p style={{ fontSize: "1.1rem", color: "#888899", marginBottom: "1.5rem" }}>
              The host will launch the game when everyone is ready. Hang tight, founder.
            </p>
            <span className="blink" style={{ fontFamily: "var(--font-pixel), monospace", fontSize: "0.45rem", color: "#8888aa" }}>
              ■ POLLING FOR GAME START...
            </span>
          </div>
        )}

        {/* GAME ACTIVE — Show Year 1 Briefing */}
        {gameData.status === "ACTIVE" && showTransmission && briefing && (
          <div className="pixel-transmission pixel-slide-in">
            <p
              style={{
                fontFamily: "var(--font-pixel), monospace",
                fontSize: "0.5rem",
                color: "#39ff14",
                marginBottom: "0.5rem",
                animation: "blink 1s steps(1) infinite",
              }}
            >
              ▶ INCOMING TRANSMISSION — YEAR 1 MARKET BRIEFING
            </p>

            {worldEvent && (
              <div
                style={{
                  borderBottom: "2px solid #39ff14",
                  paddingBottom: "0.75rem",
                  marginBottom: "0.75rem",
                }}
              >
                <p style={{ fontSize: "1.2rem", color: "#00f5ff" }}>
                  🌍 {worldEvent.title}
                </p>
                <p style={{ fontSize: "1rem", color: "#aaaaaa" }}>
                  {worldEvent.description}
                </p>
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.5rem",
                fontSize: "1rem",
              }}
            >
              <div>
                <span style={{ color: "#888899" }}>TOTAL DEMAND: <Tooltip text="How large the overall flying car market is this year." /></span>
                <br />
                <span style={{ color: totalDemandLabel(briefing.totalFlyingCarDemand).color, fontSize: "1.2rem" }}>
                  {totalDemandLabel(briefing.totalFlyingCarDemand).label}
                </span>
              </div>
              <div>
                <span style={{ color: "#888899" }}>ECONOMY: <Tooltip text="STABLE = normal demand. GROWTH = +15% demand boost (boom times). RECESSION = -20% demand (only the strong survive)." /></span>
                <br />
                <span style={{ color: "#39ff14", textTransform: "uppercase", fontSize: "1.2rem" }}>
                  {briefing.economicCondition}
                </span>
              </div>
              <div>
                <span style={{ color: "#888899" }}>PUBLIC PERCEPTION: <Tooltip text="% of the general public open to buying a flying car. Higher % means a bigger potential market. Invest in lobbying and marketing to grow this over time." /></span>
                <br />
                <span style={{ color: "#00f5ff", fontSize: "1.2rem" }}>
                  {briefing.publicPerception}%
                </span>
              </div>
              <div>
                <span style={{ color: "#888899" }}>POLICY SCORE: <Tooltip text="Shared industry policy score. Higher = more favourable regulations. Below 0 = hostile policy environment. The traditional auto lobby drains -3 pts/year automatically." /></span>
                <br />
                <span style={{ color: "#ff006e", fontSize: "1.2rem" }}>
                  {briefing.policyScore}
                </span>
              </div>
            </div>

            <div
              style={{
                marginTop: "1rem",
                borderTop: "2px solid #39ff14",
                paddingTop: "0.75rem",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-pixel)",
                  fontSize: "0.42rem",
                  color: "#9999bb",
                  lineHeight: 1.8,
                }}
              >
                SEGMENT DEMAND BREAKDOWN <Tooltip text="Relative demand ranking across vehicle types. Build for the hottest segment or find a niche. Exact numbers unlock via Market Analytics (R&D)." />
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.25rem",
                  marginTop: "0.5rem",
                  fontSize: "0.95rem",
                }}
              >
                {(() => {
                  const entries = Object.entries(briefing.demandByType) as [string, number][];
                  const sorted = [...entries].sort(([,a], [,b]) => b - a);
                  const rankMap = new Map(sorted.map(([key], i) => [key, i]));
                  return entries.map(([type, demand]) => {
                    const rank = rankMap.get(type) ?? 4;
                    const seg = relativeSegmentLabel(rank);
                    return (
                      <div key={type}>
                        <span style={{ color: "#8888aa", textTransform: "uppercase" }}>{type}: </span>
                        <span style={{ color: seg.color }}>{seg.label}</span>
                      </div>
                    );
                  });
                })()}
              </div>
              {briefing.npcLobbyingNote && (
                <p
                  style={{
                    marginTop: "0.75rem",
                    fontSize: "0.9rem",
                    color: "#ff006e",
                    fontFamily: "var(--font-pixel-body), monospace",
                  }}
                >
                  ⚠ {briefing.npcLobbyingNote}
                </p>
              )}
            </div>

            <p
              style={{
                marginTop: "1rem",
                fontFamily: "var(--font-pixel), monospace",
                fontSize: "0.45rem",
                color: "#39ff14",
              }}
            >
              TRANSMISSION END — GOOD LUCK FOUNDER
            </p>

            <a
              href={`/play/${gameData.id}`}
              className="pixel-btn pixel-btn-green"
              style={{ display: "block", textAlign: "center", marginTop: "1.5rem", fontSize: "0.55rem" }}
            >
              ▶ ENTER DECISION ROOM
            </a>
          </div>
        )}

        {gameData.status === "ACTIVE" && !briefing && (
          <div
            className="pixel-card text-center py-6"
            style={{ borderColor: "#39ff14" }}
          >
            <p
              className="pixel-heading"
              style={{ fontSize: "0.55rem", color: "#39ff14" }}
            >
              GAME ACTIVE — ROUND {gameData.currentRound}
            </p>
            <a
              href={`/play/${gameData.id}`}
              className="pixel-btn pixel-btn-green"
              style={{ display: "inline-block", marginTop: "1.25rem", fontSize: "0.55rem" }}
            >
              ▶ ENTER DECISION ROOM
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
