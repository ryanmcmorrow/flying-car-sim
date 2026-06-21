"use client";

import { useState, useEffect, useCallback } from "react";
import { ROLE_DESCRIPTIONS, ROLE_COLORS } from "@/lib/game-utils";
import type { MarketBriefing } from "@/lib/game-utils";
import type { TeamMemberRole } from "@/app/generated/prisma/client";

interface TeamMember {
  id: string;
  role: string;
  userId: string;
  userName: string;
}

interface GameData {
  id: string;
  code: string;
  status: "LOBBY" | "ACTIVE" | "COMPLETED";
  currentRound: number;
  mode: string;
  isHost: boolean;
  settings: Record<string, unknown>;
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

export function PlayerLobbyClient({ gameData: initial }: Props) {
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
              <p className="pixel-label">PILOT</p>
              <p style={{ fontSize: "1.3rem", color: "#ffffff" }}>
                {gameData.playerName}
              </p>
            </div>
            <div className="text-right">
              <p className="pixel-label">CORPORATION</p>
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
            <p
              style={{
                fontFamily: "var(--font-pixel), monospace",
                fontSize: "0.55rem",
                color: myRoleColor,
                marginBottom: "0.3rem",
              }}
            >
              YOUR ROLE: {gameData.myRole}
            </p>
            <p style={{ fontSize: "1rem", color: "#cccccc" }}>{myRoleDesc}</p>
          </div>
        </div>

        {/* Team roster */}
        <div className="pixel-card mb-6" style={{ borderColor: "#4a4a6a" }}>
          <p className="pixel-label mb-3">
            TEAM ROSTER — {gameData.myTeam.brandName}
          </p>
          <div className="space-y-2">
            {gameData.myTeam.members.map((m) => {
              const roleColor = ROLE_COLORS[m.role as TeamMemberRole] ?? "#4a4a6a";
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
          <div className="pixel-card text-center py-6" style={{ borderColor: "#ff006e", boxShadow: "4px 4px 0 #7d0030" }}>
            <p className="pixel-heading mb-3" style={{ fontSize: "0.55rem", color: "#ff006e" }}>🎉 PARTY HOST CONTROLS</p>
            <p style={{ fontSize: "1rem", color: "#888899", marginBottom: "1.5rem" }}>
              Everyone in? Hit launch to start the 8-minute round timer.
            </p>
            {startError && (
              <p style={{ fontFamily: "var(--font-pixel), monospace", fontSize: "0.45rem", color: "#ff006e", marginBottom: "1rem" }}>❌ {startError}</p>
            )}
            <button onClick={handleStart} disabled={starting} className="pixel-btn pixel-btn-pink" style={{ fontSize: "0.55rem" }}>
              {starting ? "LAUNCHING..." : "⚡ LAUNCH GAME"}
            </button>
          </div>
        )}

        {gameData.status === "LOBBY" && !gameData.isHost && (
          <div
            className="pixel-card text-center py-6"
            style={{ borderColor: "#ffbe0b", boxShadow: "4px 4px 0 #7d5d00" }}
          >
            <p className="pixel-heading mb-4" style={{ fontSize: "0.55rem", color: "#ffbe0b" }}>WAITING FOR HOST</p>
            <p style={{ fontSize: "1.1rem", color: "#888899", marginBottom: "1.5rem" }}>
              The host will launch the game when everyone is ready. Hang tight, pilot.
            </p>
            <span className="blink" style={{ fontFamily: "var(--font-pixel), monospace", fontSize: "0.45rem", color: "#4a4a6a" }}>
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
                <span style={{ color: "#888899" }}>TOTAL DEMAND:</span>
                <br />
                <span style={{ color: "#ffbe0b", fontSize: "1.2rem" }}>
                  {briefing.totalFlyingCarDemand.toLocaleString()} UNITS
                </span>
              </div>
              <div>
                <span style={{ color: "#888899" }}>ECONOMY:</span>
                <br />
                <span style={{ color: "#39ff14", textTransform: "uppercase", fontSize: "1.2rem" }}>
                  {briefing.economicCondition}
                </span>
              </div>
              <div>
                <span style={{ color: "#888899" }}>PUBLIC PERCEPTION:</span>
                <br />
                <span style={{ color: "#00f5ff", fontSize: "1.2rem" }}>
                  {briefing.publicPerception}%
                </span>
              </div>
              <div>
                <span style={{ color: "#888899" }}>POLICY SCORE:</span>
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
                  color: "#666677",
                  lineHeight: 1.8,
                }}
              >
                SEGMENT DEMAND BREAKDOWN
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
                {Object.entries(briefing.demandByType).map(([type, demand]) => (
                  <div key={type}>
                    <span style={{ color: "#4a4a6a", textTransform: "uppercase" }}>
                      {type}:{" "}
                    </span>
                    <span style={{ color: "#cccccc" }}>
                      {demand.toLocaleString()}
                    </span>
                  </div>
                ))}
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
              TRANSMISSION END — GOOD LUCK PILOT
            </p>
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
            <p style={{ fontSize: "1.1rem", color: "#888899", marginTop: "0.75rem" }}>
              Await your facilitator's instructions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
