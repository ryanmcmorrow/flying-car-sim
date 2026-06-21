"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RoleSlots } from "@/components/game/RoleSlots";
import type { TeamMemberRole } from "@/app/generated/prisma/client";
import { ROLE_COLORS } from "@/lib/game-utils";

interface TeamMember {
  id: string;
  role: string;
  userId: string;
  userName: string;
}

interface Team {
  id: string;
  brandName: string;
  cash: string;
  members: TeamMember[];
}

interface Round {
  id: string;
  roundNumber: number;
  status: string;
  worldEvent: Record<string, unknown> | null;
  openedAt: string | null;
  resolvedAt: string | null;
  submittedCount: number;
}

interface GameData {
  id: string;
  code: string;
  status: "LOBBY" | "ACTIVE" | "COMPLETED";
  currentRound: number;
  settings: Record<string, unknown>;
  teams: Team[];
  rounds: Round[];
}

interface StartResult {
  worldEvent: { id: string; title: string; description: string; effect: string };
  briefing: {
    totalFlyingCarDemand: number;
    demandByType: Record<string, number>;
    publicPerception: number;
    policyScore: number;
    economicCondition: string;
  };
}

interface Props {
  game: GameData;
}

export function FacilitatorLobbyClient({ game: initialGame }: Props) {
  const router = useRouter();
  const [game, setGame] = useState<GameData>(initialGame);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");
  const [startResult, setStartResult] = useState<StartResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState("");
  const [justResolved, setJustResolved] = useState<number | null>(null);

  const hasCEO = game.teams.some((t) =>
    t.members.some((m) => m.role === "CEO")
  );

  const currentRoundData = game.rounds.find(
    (r) => r.roundNumber === game.currentRound
  ) ?? null;

  const refreshGame = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/${game.id}`);
      if (res.ok) {
        const data = await res.json();
        setGame(data);
      }
    } catch {
      // silently ignore poll errors
    }
  }, [game.id]);

  // Poll every 3s in LOBBY or ACTIVE
  useEffect(() => {
    if (game.status === "COMPLETED") return;
    const interval = setInterval(refreshGame, 3000);
    return () => clearInterval(interval);
  }, [game.status, refreshGame]);

  async function handleStart() {
    setStartError("");
    setStarting(true);
    try {
      const res = await fetch(`/api/games/${game.id}/start`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setStartError(body.error ?? "START FAILED");
        return;
      }
      setStartResult(body);
      setGame((prev) => ({ ...prev, status: "ACTIVE" }));
      await refreshGame();
    } catch {
      setStartError("CONNECTION ERROR");
    } finally {
      setStarting(false);
    }
  }

  async function handleResolve() {
    setResolveError("");
    setResolving(true);
    const roundBeingResolved = game.currentRound;
    try {
      const res = await fetch(`/api/games/${game.id}/resolve`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setResolveError(body.error ?? "RESOLVE FAILED");
        return;
      }
      setJustResolved(roundBeingResolved);
      await refreshGame();
      if (body.gameComplete) {
        router.push(`/results/${game.id}/${roundBeingResolved}`);
      }
    } catch {
      setResolveError("CONNECTION ERROR");
    } finally {
      setResolving(false);
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(game.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const pxFont = "var(--font-pixel), monospace";
  const bodyFont = "var(--font-pixel-body), monospace";

  return (
    <div
      className="game-screen scanlines min-h-screen"
      style={{ fontFamily: bodyFont }}
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

      <div className="max-w-4xl mx-auto px-4 py-8 relative" style={{ zIndex: 1 }}>
        {/* Back */}
        <Link
          href="/facilitator"
          style={{ fontFamily: pxFont, fontSize: "0.45rem", color: "#4a4a6a", textDecoration: "none" }}
        >
          ← COMMAND CENTER
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mt-4 mb-6">
          <div>
            <h1 className="pixel-heading" style={{ fontSize: "0.85rem", lineHeight: 1.8 }}>
              {game.status === "LOBBY" ? "GAME LOBBY" : game.status === "ACTIVE" ? "GAME CONTROL" : "GAME COMPLETE"}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="pixel-heading" style={{ fontSize: "1.6rem", letterSpacing: "0.35em", color: "#ffbe0b" }}>
                {game.code}
              </span>
              <button
                onClick={copyCode}
                className="pixel-btn"
                style={{ fontSize: "0.4rem", padding: "0.3rem 0.6rem" }}
              >
                {copied ? "✓ COPIED" : "COPY"}
              </button>
              <span
                className={`pixel-badge ${game.status === "ACTIVE" ? "status-active" : game.status === "LOBBY" ? "status-lobby" : "status-completed"}`}
                style={{ fontSize: "0.45rem" }}
              >
                {game.status}
              </span>
            </div>
            <p style={{ fontSize: "1rem", color: "#888899", marginTop: "0.5rem" }}>
              Share the code above with your players to join at{" "}
              <span style={{ color: "#00f5ff" }}>flyingcarsim.app/join</span>
            </p>
          </div>

          {/* LOBBY: Start Game button */}
          {game.status === "LOBBY" && (
            <div className="text-right">
              {!hasCEO && (
                <p style={{ fontFamily: pxFont, fontSize: "0.42rem", color: "#ff006e", marginBottom: "0.5rem" }}>
                  ⚠ NEED CEO ON ≥1 TEAM
                </p>
              )}
              <button
                onClick={handleStart}
                disabled={starting || !hasCEO}
                className="pixel-btn pixel-btn-green"
                style={{ fontSize: "0.55rem" }}
              >
                {starting ? "STARTING..." : "▶ START GAME"}
              </button>
              {startError && (
                <p style={{ fontFamily: pxFont, fontSize: "0.42rem", color: "#ff006e", marginTop: "0.5rem" }}>
                  ❌ {startError}
                </p>
              )}
            </div>
          )}
        </div>

        <hr className="pixel-hr" />

        {/* Start result — world event + briefing */}
        {startResult && (
          <div className="pixel-transmission pixel-slide-in mb-6">
            <p style={{ fontFamily: pxFont, fontSize: "0.55rem", color: "#39ff14", marginBottom: "0.75rem" }}>
              ★ GAME STARTED — YEAR 1 WORLD EVENT ★
            </p>
            <p style={{ fontSize: "1.2rem", color: "#00f5ff", marginBottom: "0.25rem" }}>
              {startResult.worldEvent.title}
            </p>
            <p style={{ fontSize: "1rem", color: "#cccccc", marginBottom: "1rem" }}>
              {startResult.worldEvent.description}
            </p>
            <div style={{ borderTop: "2px solid #39ff14", paddingTop: "0.75rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "1rem" }}>
              <div><span style={{ color: "#888899" }}>TOTAL DEMAND:</span>{" "}<span style={{ color: "#ffbe0b" }}>{startResult.briefing.totalFlyingCarDemand.toLocaleString()}</span></div>
              <div><span style={{ color: "#888899" }}>ECONOMY:</span>{" "}<span style={{ color: "#39ff14", textTransform: "uppercase" }}>{startResult.briefing.economicCondition}</span></div>
              <div><span style={{ color: "#888899" }}>PUBLIC PERCEPTION:</span>{" "}<span style={{ color: "#00f5ff" }}>{startResult.briefing.publicPerception}%</span></div>
              <div><span style={{ color: "#888899" }}>POLICY SCORE:</span>{" "}<span style={{ color: "#ff006e" }}>{startResult.briefing.policyScore}</span></div>
            </div>
          </div>
        )}

        {/* ACTIVE: Round control panel */}
        {game.status === "ACTIVE" && currentRoundData && (
          <div className="mb-6">
            <div
              className="pixel-card mb-4"
              style={{ borderColor: "#00f5ff", boxShadow: "4px 4px 0 #003d4a" }}
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p style={{ fontFamily: pxFont, fontSize: "0.45rem", color: "#888", marginBottom: "0.25rem" }}>
                    CURRENT ROUND
                  </p>
                  <p style={{ fontFamily: pxFont, fontSize: "1rem", color: "#00f5ff" }}>
                    YEAR {game.currentRound} / 8
                  </p>
                </div>

                {/* Submission progress */}
                <div className="text-center">
                  <p style={{ fontFamily: pxFont, fontSize: "0.45rem", color: "#888", marginBottom: "0.25rem" }}>
                    TEAMS SUBMITTED
                  </p>
                  <p style={{ fontFamily: pxFont, fontSize: "1rem", color: currentRoundData.submittedCount === game.teams.length ? "#39ff14" : "#ffbe0b" }}>
                    {currentRoundData.submittedCount} / {game.teams.length}
                  </p>
                </div>

                {/* Round status */}
                <div className="text-center">
                  <p style={{ fontFamily: pxFont, fontSize: "0.45rem", color: "#888", marginBottom: "0.25rem" }}>
                    ROUND STATUS
                  </p>
                  <span
                    className={`pixel-badge ${currentRoundData.status === "RESOLVED" ? "status-completed" : currentRoundData.status === "OPEN" ? "status-active" : "status-lobby"}`}
                    style={{ fontSize: "0.45rem" }}
                  >
                    {currentRoundData.status}
                  </span>
                </div>

                {/* Resolve / Results */}
                <div className="flex flex-col gap-2 items-end">
                  {currentRoundData.status !== "RESOLVED" && (
                    <>
                      <button
                        onClick={handleResolve}
                        disabled={resolving}
                        className="pixel-btn pixel-btn-pink"
                        style={{ fontSize: "0.5rem" }}
                      >
                        {resolving ? "RESOLVING..." : "⚡ RESOLVE ROUND"}
                      </button>
                      {currentRoundData.submittedCount < game.teams.length && (
                        <p style={{ fontFamily: pxFont, fontSize: "0.38rem", color: "#ffbe0b" }}>
                          ⚠ {game.teams.length - currentRoundData.submittedCount} TEAM{game.teams.length - currentRoundData.submittedCount !== 1 ? "S" : ""} NOT YET SUBMITTED
                        </p>
                      )}
                      {resolveError && (
                        <p style={{ fontFamily: pxFont, fontSize: "0.4rem", color: "#ff006e" }}>
                          ❌ {resolveError}
                        </p>
                      )}
                    </>
                  )}
                  {(currentRoundData.status === "RESOLVED" || justResolved === game.currentRound - 1) && (
                    <Link
                      href={`/results/${game.id}/${justResolved ?? game.currentRound - 1}`}
                      className="pixel-btn pixel-btn-green"
                      style={{ fontSize: "0.5rem", textDecoration: "none", display: "inline-block" }}
                    >
                      📊 VIEW RESULTS
                    </Link>
                  )}
                </div>
              </div>

              {/* World event for current round */}
              {currentRoundData.worldEvent && (
                <div
                  className="mt-4 pt-4"
                  style={{ borderTop: "1px solid #333" }}
                >
                  <p style={{ fontFamily: pxFont, fontSize: "0.42rem", color: "#c77dff", marginBottom: "0.25rem" }}>
                    ACTIVE WORLD EVENT
                  </p>
                  <p style={{ fontSize: "1rem", color: "#fff" }}>
                    {String(currentRoundData.worldEvent.title ?? "")}
                  </p>
                  <p style={{ fontSize: "0.9rem", color: "#aaa", marginTop: "0.2rem" }}>
                    {String(currentRoundData.worldEvent.description ?? "")}
                  </p>
                </div>
              )}
            </div>

            {/* Past rounds */}
            {game.rounds.filter((r) => r.status === "RESOLVED").length > 0 && (
              <div>
                <p style={{ fontFamily: pxFont, fontSize: "0.45rem", color: "#4a4a6a", marginBottom: "0.5rem" }}>
                  PAST ROUNDS
                </p>
                <div className="flex flex-wrap gap-2">
                  {game.rounds
                    .filter((r) => r.status === "RESOLVED")
                    .map((r) => (
                      <Link
                        key={r.id}
                        href={`/results/${game.id}/${r.roundNumber}`}
                        className="pixel-btn"
                        style={{ fontSize: "0.42rem", textDecoration: "none" }}
                      >
                        YEAR {r.roundNumber} RESULTS →
                      </Link>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* COMPLETED */}
        {game.status === "COMPLETED" && (
          <div className="pixel-card pixel-card-green mb-6 text-center">
            <p className="pixel-heading" style={{ fontSize: "0.8rem", color: "var(--px-green)", marginBottom: "1rem" }}>
              ★ GAME COMPLETE ★
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {game.rounds
                .filter((r) => r.status === "RESOLVED")
                .map((r) => (
                  <Link
                    key={r.id}
                    href={`/results/${game.id}/${r.roundNumber}`}
                    className="pixel-btn pixel-btn-cyan"
                    style={{ fontSize: "0.45rem", textDecoration: "none" }}
                  >
                    YEAR {r.roundNumber}
                  </Link>
                ))}
            </div>
          </div>
        )}

        {/* Teams roster */}
        <div className="mt-6">
          <p className="pixel-heading mb-4" style={{ fontSize: "0.5rem", color: "#4a4a6a" }}>
            TEAM ROSTER ({game.teams.length} TEAM{game.teams.length !== 1 ? "S" : ""})
          </p>

          {game.teams.length === 0 ? (
            <div className="pixel-card text-center py-10" style={{ borderColor: "#4a4a6a" }}>
              <p className="pixel-heading" style={{ fontSize: "0.5rem", color: "#4a4a6a" }}>
                WAITING FOR PLAYERS...
              </p>
              <p style={{ color: "#4a4a6a", fontSize: "1rem", marginTop: "0.75rem" }}>
                Share the code <span style={{ color: "#ffbe0b" }}>{game.code}</span> to get started.
              </p>
              {game.status === "LOBBY" && (
                <span className="blink" style={{ display: "inline-block", marginTop: "1rem", fontFamily: pxFont, fontSize: "0.4rem", color: "#4a4a6a" }}>
                  ■ POLLING FOR PLAYERS...
                </span>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {game.teams.map((team) => {
                const hasCEOOnTeam = team.members.some((m) => m.role === "CEO");
                return (
                  <div
                    key={team.id}
                    className="pixel-card"
                    style={{ borderColor: hasCEOOnTeam ? "#39ff14" : "#ffbe0b", boxShadow: `4px 4px 0 ${hasCEOOnTeam ? "#1d8009" : "#7d5d00"}` }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="pixel-heading" style={{ fontSize: "0.75rem", color: "#ffffff" }}>
                          {team.brandName}
                        </span>
                        {!hasCEOOnTeam && (
                          <span style={{ fontFamily: pxFont, fontSize: "0.4rem", color: "#ff006e", marginLeft: "0.75rem" }}>
                            ⚠ NO CEO
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {game.status === "ACTIVE" && (
                          <span style={{ fontFamily: bodyFont, fontSize: "0.9rem", color: "#ffbe0b" }}>
                            ${(parseFloat(team.cash) / 1_000_000).toFixed(1)}M
                          </span>
                        )}
                        <span style={{ fontSize: "0.9rem", color: "#4a4a6a" }}>
                          {team.members.length}/5 MEMBERS
                        </span>
                      </div>
                    </div>

                    <RoleSlots
                      filledRoles={team.members.map((m) => ({ role: m.role as TeamMemberRole, userName: m.userName }))}
                      interactive={false}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Role legend */}
        <div className="mt-8 pixel-card" style={{ borderColor: "#4a4a6a", boxShadow: "none" }}>
          <p className="pixel-label mb-3">ROLE COLOR LEGEND</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(ROLE_COLORS).map(([role, color]) => (
              <span
                key={role}
                style={{ fontFamily: pxFont, fontSize: "0.45rem", color, border: `2px solid ${color}`, padding: "0.2rem 0.5rem" }}
              >
                {role}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
