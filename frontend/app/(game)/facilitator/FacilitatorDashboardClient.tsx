"use client";

import { useState } from "react";
import Link from "next/link";

interface GameSummary {
  id: string;
  code: string;
  status: "LOBBY" | "ACTIVE" | "COMPLETED";
  currentRound: number;
  teamCount: number;
  createdAt: string;
}

interface Props {
  games: GameSummary[];
  facilitatorName: string;
}

const STATUS_LABELS: Record<string, string> = {
  LOBBY: "LOBBY",
  ACTIVE: "ACTIVE",
  COMPLETED: "DONE",
};

const STATUS_CLASSES: Record<string, string> = {
  LOBBY: "status-lobby",
  ACTIVE: "status-active",
  COMPLETED: "status-completed",
};

export function FacilitatorDashboardClient({ games, facilitatorName }: Props) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [economicCondition, setEconomicCondition] = useState<
    "stable" | "growth" | "recession"
  >("stable");
  const [creating, setCreating] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [newGameId, setNewGameId] = useState<string | null>(null);
  const [createError, setCreateError] = useState("");
  const [gameList, setGameList] = useState<GameSummary[]>(games);

  const ECON_OPTIONS = [
    {
      value: "stable",
      label: "STABLE",
      desc: "Balanced market. Good for first-timers. No modifiers.",
    },
    {
      value: "growth",
      label: "GROWTH",
      desc: "Boom times! Demand +15%. Cash burns faster though.",
    },
    {
      value: "recession",
      label: "RECESSION",
      desc: "Survive or die. Demand -20%. Only the strong prevail.",
    },
  ];

  async function handleCreate() {
    setCreateError("");
    setCreating(true);
    setNewCode(null);

    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ economicCondition }),
      });
      const body = await res.json();
      if (!res.ok) {
        setCreateError(body.error ?? "CREATE FAILED");
        return;
      }
      setNewCode(body.code);
      setNewGameId(body.id);
      // Add new game to list
      setGameList((prev) => [
        {
          id: body.id,
          code: body.code,
          status: "LOBBY",
          currentRound: 1,
          teamCount: 0,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    } catch {
      setCreateError("CONNECTION ERROR");
    } finally {
      setCreating(false);
    }
  }

  function handleCloseModal() {
    setShowCreateModal(false);
    setNewCode(null);
    setNewGameId(null);
    setCreateError("");
    setEconomicCondition("stable");
  }

  return (
    <div
      className="game-screen scanlines min-h-screen"
      style={{ fontFamily: "var(--font-pixel-body), monospace" }}
    >
      {/* BG grid */}
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
        className="max-w-4xl mx-auto px-4 py-8 relative"
        style={{ zIndex: 1 }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1
              className="pixel-heading"
              style={{ fontSize: "0.9rem", lineHeight: 1.8 }}
            >
              COMMAND CENTER
            </h1>
            <p style={{ fontSize: "1.1rem", color: "#888899", marginTop: "0.5rem" }}>
              Welcome back,{" "}
              <span style={{ color: "#ffbe0b" }}>{facilitatorName}</span>
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="pixel-btn pixel-btn-pink"
            style={{ fontSize: "0.55rem" }}
          >
            + CREATE GAME
          </button>
        </div>

        <hr className="pixel-hr" />

        {/* Games list */}
        {gameList.length === 0 ? (
          <div
            className="pixel-card text-center py-12"
            style={{ marginTop: "2rem" }}
          >
            <p
              className="pixel-heading"
              style={{ fontSize: "0.6rem", color: "#4a4a6a" }}
            >
              NO GAMES YET
            </p>
            <p
              style={{ color: "#4a4a6a", fontSize: "1.1rem", marginTop: "1rem" }}
            >
              Hit CREATE GAME to launch your first simulation.
            </p>
          </div>
        ) : (
          <div className="space-y-4 mt-6">
            <p
              className="pixel-heading"
              style={{ fontSize: "0.5rem", color: "#4a4a6a" }}
            >
              YOUR GAMES ({gameList.length})
            </p>
            {gameList.map((game) => (
              <Link key={game.id} href={`/game/facilitator/${game.id}`} style={{ display: "block" }}>
                <div
                  className="pixel-card"
                  style={{
                    cursor: "pointer",
                    transition: "none",
                    borderColor:
                      game.status === "ACTIVE"
                        ? "#39ff14"
                        : game.status === "COMPLETED"
                          ? "#4a4a6a"
                          : "#00f5ff",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span
                        className="pixel-heading"
                        style={{ fontSize: "1rem", letterSpacing: "0.3em" }}
                      >
                        {game.code}
                      </span>
                      <span
                        className={`pixel-badge ${STATUS_CLASSES[game.status]}`}
                        style={{ fontSize: "0.45rem" }}
                      >
                        {STATUS_LABELS[game.status]}
                      </span>
                    </div>
                    <div
                      className="flex items-center gap-6"
                      style={{ fontSize: "0.95rem", color: "#888899" }}
                    >
                      <span>
                        <span style={{ color: "#ffbe0b" }}>{game.teamCount}</span>{" "}
                        TEAMS
                      </span>
                      <span>
                        RND{" "}
                        <span style={{ color: "#00f5ff" }}>
                          {game.currentRound}
                        </span>
                      </span>
                      <span style={{ color: "#4a4a6a", fontSize: "0.85rem" }}>
                        →
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Create Game Modal ── */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: "1rem",
          }}
        >
          <div
            className="pixel-card pixel-slide-in"
            style={{ width: "100%", maxWidth: "500px" }}
          >
            {!newCode ? (
              <>
                <p
                  className="pixel-heading mb-6 text-center"
                  style={{ fontSize: "0.65rem" }}
                >
                  ▶ LAUNCH NEW GAME
                </p>

                {createError && (
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
                    ❌ {createError}
                  </div>
                )}

                <div className="space-y-3 mb-6">
                  <label className="pixel-label">ECONOMIC CONDITION</label>
                  {ECON_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setEconomicCondition(
                          opt.value as "stable" | "growth" | "recession"
                        )
                      }
                      className="w-full text-left p-3"
                      style={{
                        border: "2px solid",
                        borderColor:
                          economicCondition === opt.value
                            ? "#00f5ff"
                            : "#4a4a6a",
                        background:
                          economicCondition === opt.value
                            ? "#00f5ff22"
                            : "#0a0a1a",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <span
                          style={{
                            fontFamily: "var(--font-pixel), monospace",
                            fontSize: "0.5rem",
                            color:
                              economicCondition === opt.value
                                ? "#00f5ff"
                                : "#888899",
                          }}
                        >
                          {opt.label}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-pixel-body), monospace",
                            fontSize: "1rem",
                            color:
                              economicCondition === opt.value
                                ? "#cccccc"
                                : "#666677",
                          }}
                        >
                          {opt.desc}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCloseModal}
                    className="pixel-btn pixel-btn-amber"
                    style={{ fontSize: "0.5rem" }}
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={creating}
                    className="pixel-btn pixel-btn-green"
                    style={{ fontSize: "0.5rem", flex: 1 }}
                  >
                    {creating ? "LAUNCHING..." : "▶ LAUNCH GAME"}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Success state — show game code */}
                <p
                  className="pixel-heading mb-4 text-center"
                  style={{ fontSize: "0.65rem", color: "#39ff14" }}
                >
                  ✓ GAME LAUNCHED!
                </p>
                <p
                  style={{
                    fontSize: "1rem",
                    color: "#888899",
                    textAlign: "center",
                    marginBottom: "1rem",
                  }}
                >
                  Share this code with your teams:
                </p>
                <div
                  className="text-center py-4 mb-4"
                  style={{
                    border: "3px solid #39ff14",
                    background: "#001a00",
                  }}
                >
                  <span
                    className="pixel-heading"
                    style={{
                      fontSize: "2rem",
                      letterSpacing: "0.4em",
                      color: "#39ff14",
                    }}
                  >
                    {newCode}
                  </span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(newCode ?? "");
                  }}
                  className="pixel-btn w-full mb-3"
                  style={{ fontSize: "0.5rem" }}
                >
                  COPY CODE TO CLIPBOARD
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={handleCloseModal}
                    className="pixel-btn pixel-btn-amber"
                    style={{ fontSize: "0.5rem" }}
                  >
                    CLOSE
                  </button>
                  {newGameId && (
                    <Link
                      href={`/game/facilitator/${newGameId}`}
                      className="pixel-btn pixel-btn-green text-center"
                      style={{ fontSize: "0.5rem", flex: 1, textDecoration: "none" }}
                    >
                      ▶ GO TO LOBBY
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
