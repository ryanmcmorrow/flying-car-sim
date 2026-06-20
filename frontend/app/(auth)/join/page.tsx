"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { RoleSlots } from "@/components/game/RoleSlots";
import type { TeamMemberRole } from "@/app/generated/prisma/client";
import { ALL_ROLES } from "@/lib/game-utils";

type Step = 1 | 2 | 3;

interface GameInfo {
  id: string;
  code: string;
  status: string;
  teams: {
    id: string;
    brandName: string;
    members: { role: TeamMemberRole; userName: string }[];
  }[];
}

export default function JoinPage() {
  const [step, setStep] = useState<Step>(1);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);

  const [playerName, setPlayerName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [selectedRole, setSelectedRole] = useState<TeamMemberRole | null>(null);
  const [formError, setFormError] = useState("");

  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);

  // ── Step 1: Validate Game Code ──

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCodeError("");
    setLoading(true);

    const upper = code.toUpperCase().trim();
    if (upper.length !== 6) {
      setCodeError("CODE MUST BE 6 CHARACTERS");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/games/lookup?code=${upper}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setCodeError(body.error ?? "GAME NOT FOUND");
        setLoading(false);
        return;
      }
      const data: GameInfo = await res.json();
      setGameInfo(data);
      setStep(2);
    } catch {
      setCodeError("CONNECTION ERROR — TRY AGAIN");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2/3: Find taken roles for the brand being joined ──

  function getTakenRolesForBrand(): TeamMemberRole[] {
    if (!gameInfo || !brandName.trim()) return [];
    const team = gameInfo.teams.find(
      (t) => t.brandName.toLowerCase() === brandName.trim().toLowerCase()
    );
    return team ? team.members.map((m) => m.role) : [];
  }

  function getExistingTeamMembers() {
    if (!gameInfo || !brandName.trim()) return [];
    const team = gameInfo.teams.find(
      (t) => t.brandName.toLowerCase() === brandName.trim().toLowerCase()
    );
    return team ? team.members : [];
  }

  function isExistingTeam(): boolean {
    if (!gameInfo || !brandName.trim()) return false;
    return gameInfo.teams.some(
      (t) => t.brandName.toLowerCase() === brandName.trim().toLowerCase()
    );
  }

  const takenRoles = getTakenRolesForBrand();
  const availableRoles = ALL_ROLES.filter((r) => !takenRoles.includes(r));

  // ── Step 3: Join ──

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!playerName.trim()) {
      setFormError("ENTER YOUR NAME");
      return;
    }
    if (!brandName.trim() || brandName.trim().length < 2) {
      setFormError("BRAND NAME MUST BE 2+ CHARACTERS");
      return;
    }
    if (!selectedRole) {
      setFormError("SELECT A ROLE");
      return;
    }
    if (takenRoles.includes(selectedRole)) {
      setFormError("THAT ROLE IS ALREADY TAKEN ON THIS TEAM");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/games/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: gameInfo!.code,
          playerName: playerName.trim(),
          brandName: brandName.trim(),
          role: selectedRole,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        setFormError(body.error ?? "JOIN FAILED");
        setLoading(false);
        return;
      }

      // Sign in with the ephemeral credentials returned
      const signInResult = await signIn("credentials", {
        email: body.email,
        password: body.ephemeralPassword,
        redirect: false,
      });

      if (signInResult?.error) {
        setFormError("SIGN-IN FAILED — CONTACT FACILITATOR");
        setLoading(false);
        return;
      }

      setJoined(true);
      // Redirect to player lobby
      window.location.href = body.redirectTo;
    } catch {
      setFormError("CONNECTION ERROR — TRY AGAIN");
    } finally {
      setLoading(false);
    }
  }

  if (joined) {
    return (
      <div className="game-screen flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p
            className="pixel-heading"
            style={{ fontSize: "0.8rem", color: "#39ff14" }}
          >
            ACCESS GRANTED
          </p>
          <p
            style={{
              fontFamily: "var(--font-pixel-body), monospace",
              fontSize: "1.2rem",
              color: "#00f5ff",
            }}
          >
            Loading lobby...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="game-screen scanlines min-h-screen py-8"
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
        className="max-w-lg mx-auto px-4 relative"
        style={{ zIndex: 1 }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className="pixel-heading"
            style={{ fontSize: "1.2rem", lineHeight: 1.8 }}
          >
            JOIN GAME
            <span className="blink" style={{ color: "#ff006e" }}>
              _
            </span>
          </h1>
          {/* Step indicator */}
          <div className="flex justify-center gap-2 mt-4">
            {([1, 2, 3] as Step[]).map((s) => (
              <span
                key={s}
                style={{
                  fontFamily: "var(--font-pixel), monospace",
                  fontSize: "0.45rem",
                  padding: "0.2rem 0.5rem",
                  border: "2px solid",
                  borderColor: step >= s ? "#00f5ff" : "#4a4a6a",
                  color: step >= s ? "#00f5ff" : "#4a4a6a",
                  background: step === s ? "#00f5ff22" : "transparent",
                }}
              >
                {s === 1 ? "ENTER CODE" : s === 2 ? "YOUR INFO" : "CONFIRM"}
              </span>
            ))}
          </div>
        </div>

        {/* ── STEP 1: Enter Code ── */}
        {step === 1 && (
          <div className="pixel-card pixel-slide-in">
            <p
              className="pixel-heading mb-4"
              style={{ fontSize: "0.55rem", color: "#ffbe0b" }}
            >
              ▶ STEP 1: ENTER GAME CODE
            </p>
            <p
              style={{ fontSize: "1.1rem", color: "#888899", marginBottom: "1.5rem" }}
            >
              Ask your facilitator for the 6-character game code.
            </p>

            {codeError && (
              <div
                className="mb-4 p-3"
                style={{
                  border: "2px solid #ff006e",
                  background: "#1a000d",
                  fontFamily: "var(--font-pixel), monospace",
                  fontSize: "0.5rem",
                  color: "#ff006e",
                }}
              >
                ❌ {codeError}
              </div>
            )}

            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div>
                <label className="pixel-label">GAME CODE</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.toUpperCase().slice(0, 6))
                  }
                  placeholder="ABCDEF"
                  maxLength={6}
                  required
                  className="pixel-input"
                  style={{
                    letterSpacing: "0.4em",
                    fontSize: "1.6rem",
                    textAlign: "center",
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="pixel-btn w-full"
              >
                {loading ? "SEARCHING..." : "▶ FIND GAME"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                style={{ fontSize: "1rem", color: "#4a4a6a" }}
              >
                ← Back to login
              </Link>
            </div>
          </div>
        )}

        {/* ── STEP 2: Enter Info & Pick Role ── */}
        {step === 2 && gameInfo && (
          <div className="pixel-card pixel-slide-in space-y-5">
            <div className="flex items-center justify-between">
              <p
                className="pixel-heading"
                style={{ fontSize: "0.55rem", color: "#ffbe0b" }}
              >
                ▶ STEP 2: YOUR INFO
              </p>
              <span
                className="pixel-badge status-active"
                style={{ fontSize: "0.45rem" }}
              >
                GAME: {gameInfo.code}
              </span>
            </div>

            <div
              style={{
                border: "2px solid #4a4a6a",
                background: "#0a0a1a",
                padding: "0.75rem",
                fontSize: "0.95rem",
                color: "#888899",
              }}
            >
              {gameInfo.teams.length === 0 ? (
                <p>No teams yet — you&apos;ll create the first one!</p>
              ) : (
                <p>
                  {gameInfo.teams.length} team(s) already in lobby. Enter an
                  existing brand name to join that team, or type a new one to
                  create your own.
                </p>
              )}
            </div>

            {formError && (
              <div
                className="p-3"
                style={{
                  border: "2px solid #ff006e",
                  background: "#1a000d",
                  fontFamily: "var(--font-pixel), monospace",
                  fontSize: "0.5rem",
                  color: "#ff006e",
                }}
              >
                ❌ {formError}
              </div>
            )}

            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="pixel-label">YOUR NAME</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value.slice(0, 30))}
                  placeholder="Ace Throttle"
                  maxLength={30}
                  required
                  className="pixel-input"
                />
              </div>

              <div>
                <label className="pixel-label">
                  BRAND NAME (YOUR COMPANY)
                </label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => {
                    setBrandName(e.target.value.slice(0, 30));
                    setSelectedRole(null);
                  }}
                  placeholder="AeroVenture Corp"
                  maxLength={30}
                  required
                  className="pixel-input"
                />
                {brandName.trim().length >= 2 && isExistingTeam() && (
                  <p
                    style={{
                      fontFamily: "var(--font-pixel), monospace",
                      fontSize: "0.42rem",
                      color: "#39ff14",
                      marginTop: "0.3rem",
                    }}
                  >
                    ✓ JOINING EXISTING TEAM
                  </p>
                )}
                {brandName.trim().length >= 2 && !isExistingTeam() && (
                  <p
                    style={{
                      fontFamily: "var(--font-pixel), monospace",
                      fontSize: "0.42rem",
                      color: "#ffbe0b",
                      marginTop: "0.3rem",
                    }}
                  >
                    ★ NEW TEAM WILL BE CREATED
                  </p>
                )}
              </div>

              {/* Existing team member preview */}
              {brandName.trim().length >= 2 && isExistingTeam() && getExistingTeamMembers().length > 0 && (
                <div>
                  <p className="pixel-label">CURRENT TEAM MEMBERS</p>
                  <div
                    style={{
                      background: "#0a0a1a",
                      border: "2px solid #4a4a6a",
                      padding: "0.5rem",
                    }}
                  >
                    {getExistingTeamMembers().map((m) => (
                      <div
                        key={m.role}
                        style={{
                          display: "flex",
                          gap: "0.75rem",
                          fontSize: "1rem",
                          color: "#cccccc",
                          padding: "0.2rem 0",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-pixel), monospace",
                            fontSize: "0.5rem",
                            color: "#00f5ff",
                            minWidth: "3rem",
                          }}
                        >
                          {m.role}
                        </span>
                        <span>{m.userName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="pixel-label">PICK YOUR ROLE</label>
                {brandName.trim().length < 2 ? (
                  <p
                    style={{
                      fontSize: "1rem",
                      color: "#4a4a6a",
                      fontStyle: "italic",
                    }}
                  >
                    Enter a brand name first to see available roles.
                  </p>
                ) : availableRoles.length === 0 ? (
                  <div
                    style={{
                      border: "2px solid #ff006e",
                      background: "#1a000d",
                      padding: "0.75rem",
                      fontFamily: "var(--font-pixel), monospace",
                      fontSize: "0.5rem",
                      color: "#ff006e",
                    }}
                  >
                    ALL ROLES FILLED ON THIS TEAM
                  </div>
                ) : (
                  <RoleSlots
                    filledRoles={getExistingTeamMembers()}
                    onSelect={(role) => setSelectedRole(role)}
                    selectedRole={selectedRole}
                    interactive
                  />
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setFormError("");
                    setSelectedRole(null);
                  }}
                  className="pixel-btn pixel-btn-amber"
                  style={{ fontSize: "0.55rem" }}
                >
                  ← BACK
                </button>
                <button
                  type="submit"
                  disabled={loading || !selectedRole || brandName.trim().length < 2}
                  className="pixel-btn pixel-btn-green"
                  style={{ fontSize: "0.55rem", flex: 1 }}
                >
                  {loading ? "JOINING..." : "▶ JOIN GAME"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
