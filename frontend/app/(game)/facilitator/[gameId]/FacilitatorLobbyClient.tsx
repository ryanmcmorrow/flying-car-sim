"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RoleSlots } from "@/components/game/RoleSlots";
import type { TeamMemberRole } from "@/app/generated/prisma/client";
import { ROLE_COLORS, ALL_ROLES } from "@/lib/game-utils";
import { SignOutButton } from "@/components/game/SignOutButton";
import { parseJSON } from "@/lib/api";

const pxFont = "var(--font-pixel), monospace";
const bodyFont = "var(--font-pixel-body), monospace";

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
  mode: string;
  settings: Record<string, unknown>;
  teams: Team[];
  rounds: Round[];
}

interface Props {
  game: GameData;
  myUserId: string;
}


export function FacilitatorLobbyClient({ game: initialGame, myUserId }: Props) {
  const router = useRouter();
  const [game, setGame] = useState<GameData>(initialGame);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");
  const [startResult, setStartResult] = useState<{ worldEvent: { title: string; description: string }; briefing: { totalFlyingCarDemand: number; economicCondition: string; publicPerception: number; policyScore: number } } | null>(null);
  const [copied, setCopied] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState("");
  const [justResolved, setJustResolved] = useState<number | null>(null);
  const [kicking, setKicking] = useState<string | null>(null);

  // Facilitator-as-player join state (classroom mode)
  const [joinBrand, setJoinBrand] = useState("");
  const [joinRole, setJoinRole] = useState<string>("CEO");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  const isAlreadyPlayer = game.teams.some((t) =>
    t.members.some((m) => m.userId === myUserId)
  );

  async function handleJoinAsPlayer() {
    setJoinError("");
    setJoining(true);
    try {
      const res = await fetch(`/api/games/${game.id}/host-join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandName: joinBrand, role: joinRole }),
      });
      const body = await parseJSON(res);
      if (!res.ok) { setJoinError(body.error as string ?? `HTTP ${res.status}`); return; }
      setJoinBrand("");
      await refreshGame();
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Network error");
    } finally {
      setJoining(false);
    }
  }

  async function handleKick(teamId: string) {
    setKicking(teamId);
    try {
      await fetch(`/api/games/${game.id}/kick?teamId=${teamId}`, { method: "DELETE" });
      await refreshGame();
    } finally {
      setKicking(null);
    }
  }

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
      const body = await parseJSON(res);
      if (!res.ok) { setStartError(body.error as string ?? `HTTP ${res.status}`); return; }
      setStartResult(body as typeof startResult);
      setGame((prev) => ({ ...prev, status: "ACTIVE" }));
      await refreshGame();
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Network error");
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
      const body = await parseJSON(res);
      if (!res.ok) { setResolveError(body.error as string ?? `HTTP ${res.status}`); return; }
      setJustResolved(roundBeingResolved);
      await refreshGame();
      if (body.gameComplete) {
        router.push(`/results/${game.id}/final`);
      }
    } catch (err) {
      setResolveError(err instanceof Error ? err.message : "Network error");
    } finally {
      setResolving(false);
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(game.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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
        {/* Back + Sign out */}
        <div className="flex items-center justify-between">
          <Link
            href="/facilitator"
            style={{ fontFamily: pxFont, fontSize: "0.45rem", color: "#8888aa", textDecoration: "none" }}
          >
            ← COMMAND CENTER
          </Link>
          <SignOutButton className="pixel-btn" style={{ fontSize: "0.4rem", background: "transparent", color: "#8888aa", border: "2px solid #8888aa", boxShadow: "none" }} />
        </div>

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
              <span
                className="pixel-badge"
                style={{ fontSize: "0.45rem", borderColor: game.mode === "PARTY" ? "#ff006e" : "#c77dff", color: game.mode === "PARTY" ? "#ff006e" : "#c77dff" }}
              >
                {game.mode === "PARTY" ? "🎉 PARTY" : "🏫 CLASSROOM"}
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

        {/* Classroom: facilitator join as player (lobby only, if not yet a member) */}
        {game.status === "LOBBY" && game.mode === "CLASSROOM" && !isAlreadyPlayer && (
          <div className="pixel-card mb-6" style={{ borderColor: "#ff006e", boxShadow: "4px 4px 0 #4a0020" }}>
            <p style={{ fontFamily: pxFont, fontSize: "0.55rem", color: "#ff006e", marginBottom: "0.25rem" }}>
              ⚡ JOIN AS A PLAYER
            </p>
            <p style={{ fontFamily: bodyFont, fontSize: "0.9rem", color: "#888899", marginBottom: "1rem" }}>
              Optional — create your own team and play alongside students.
            </p>
            {joinError && (
              <div className="mb-3" style={{ border: "2px solid #ff006e", background: "#1a000d", padding: "0.5rem", fontFamily: pxFont, fontSize: "0.45rem", color: "#ff006e" }}>
                ❌ {joinError}
              </div>
            )}
            <div className="mb-4">
              <label className="pixel-label mb-1 block">Your brand name</label>
              <input
                type="text"
                value={joinBrand}
                onChange={(e) => setJoinBrand(e.target.value)}
                placeholder="e.g. SKYFORGE"
                maxLength={30}
                className="pixel-input w-full"
              />
            </div>
            <div className="mb-4">
              <label className="pixel-label mb-2 block">Your role</label>
              <div className="flex flex-wrap gap-2">
                {ALL_ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setJoinRole(r)}
                    style={{ border: "2px solid", borderColor: joinRole === r ? "#ff006e" : "#8888aa", background: joinRole === r ? "#ff006e22" : "#0a0a1a", padding: "0.4rem 0.75rem", cursor: "pointer", fontFamily: pxFont, fontSize: "0.42rem", color: joinRole === r ? "#ff006e" : "#888899" }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleJoinAsPlayer}
              disabled={joining || joinBrand.trim().length < 2}
              className="pixel-btn pixel-btn-pink"
              style={{ fontSize: "0.5rem" }}
            >
              {joining ? "JOINING..." : "⚡ JOIN & PLAY"}
            </button>
          </div>
        )}

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
              <div><span style={{ color: "#888899" }}>Total demand:</span>{" "}<span style={{ color: "#ffbe0b" }}>{startResult.briefing.totalFlyingCarDemand.toLocaleString()}</span></div>
              <div><span style={{ color: "#888899" }}>Economy:</span>{" "}<span style={{ color: "#39ff14", textTransform: "uppercase" }}>{startResult.briefing.economicCondition}</span></div>
              <div><span style={{ color: "#888899" }}>Public perception:</span>{" "}<span style={{ color: "#00f5ff" }}>{startResult.briefing.publicPerception}%</span></div>
              <div><span style={{ color: "#888899" }}>Policy score:</span>{" "}<span style={{ color: "#ff006e" }}>{startResult.briefing.policyScore}</span></div>
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

                {/* Play link — shown when facilitator is also a player */}
                {isAlreadyPlayer && (
                  <div>
                    <a
                      href={`/play/${game.id}`}
                      className="pixel-btn pixel-btn-green"
                      style={{ fontSize: "0.5rem", display: "inline-block" }}
                    >
                      ▶ PLAY YOUR TURN
                    </a>
                  </div>
                )}

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
                <p style={{ fontFamily: pxFont, fontSize: "0.45rem", color: "#8888aa", marginBottom: "0.5rem" }}>
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
            <Link
              href={`/results/${game.id}/final`}
              className="pixel-btn pixel-btn-amber inline-block mb-4"
              style={{ fontSize: "0.55rem", textDecoration: "none", padding: "0.75rem 1.25rem" }}
            >
              🏆 FINAL STANDINGS →
            </Link>
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
          <p className="pixel-heading mb-4" style={{ fontSize: "0.5rem", color: "#8888aa" }}>
            TEAM ROSTER ({game.teams.length} TEAM{game.teams.length !== 1 ? "S" : ""})
          </p>

          {game.teams.length === 0 ? (
            <div className="pixel-card text-center py-10" style={{ borderColor: "#8888aa" }}>
              <p className="pixel-heading" style={{ fontSize: "0.5rem", color: "#8888aa" }}>
                WAITING FOR PLAYERS...
              </p>
              <p style={{ color: "#8888aa", fontSize: "1rem", marginTop: "0.75rem" }}>
                Share the code <span style={{ color: "#ffbe0b" }}>{game.code}</span> to get started.
              </p>
              {game.status === "LOBBY" && (
                <span className="blink" style={{ display: "inline-block", marginTop: "1rem", fontFamily: pxFont, fontSize: "0.4rem", color: "#8888aa" }}>
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
                        <span style={{ fontSize: "0.9rem", color: "#8888aa" }}>
                          {team.members.length}/5 MEMBERS
                        </span>
                        {game.status === "LOBBY" && (
                          <button
                            type="button"
                            onClick={() => handleKick(team.id)}
                            disabled={kicking === team.id}
                            style={{ fontFamily: pxFont, fontSize: "0.4rem", color: "#ff006e", border: "2px solid #ff006e", background: "transparent", padding: "0.2rem 0.5rem", cursor: "pointer" }}
                          >
                            {kicking === team.id ? "..." : "KICK"}
                          </button>
                        )}
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
        <div className="mt-8 pixel-card" style={{ borderColor: "#8888aa", boxShadow: "none" }}>
          <p className="pixel-label mb-3">Role color legend</p>
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
