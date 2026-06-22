"use client";

import { useRouter } from "next/navigation";

export interface TeamSummary {
  teamId: string;
  brandName: string;
  finalCash: number;
  startCash: number;
  cashByRound: number[];
  totalUnitsSold: number;
  totalRevenue: number;
  totalNetProfit: number;
  finalBrandPerception: number;
  finalMarketShare: number;
  bestYear: { round: number; profit: number };
}

interface Props {
  gameId: string;
  teams: TeamSummary[];
  roundNumbers: number[];
  latestRound: number;
  isCompleted: boolean;
  isFacilitator: boolean;
  myTeamId: string | null;
}

const PX = "var(--font-pixel), monospace";
const BODY = "var(--font-pixel-body), monospace";
const MEDALS = ["🥇", "🥈", "🥉"];
// Distinct line colors per team (champion always uses the first / gold slot).
const PALETTE = ["#ffbe0b", "#00f5ff", "#ff006e", "#39ff14", "#b15bff", "#ff8c42", "#4af0ff", "#f038ff"];

function fmtMoney(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

// ── Cash trajectory line chart ────────────────────────────────────────────────
function TrajectoryChart({
  teams,
  roundNumbers,
  colorOf,
  myTeamId,
}: {
  teams: TeamSummary[];
  roundNumbers: number[];
  colorOf: (teamId: string) => string;
  myTeamId: string | null;
}) {
  const W = 800;
  const H = 360;
  const padL = 70;
  const padR = 20;
  const padT = 20;
  const padB = 36;

  // X points: year 0 (start) through the last resolved round.
  const xLabels = [0, ...roundNumbers];
  const nPts = xLabels.length;

  const allCash = teams.flatMap((t) => t.cashByRound);
  const rawMin = Math.min(...allCash);
  const rawMax = Math.max(...allCash);
  // Pad the range a touch so lines don't ride the edges.
  const span = rawMax - rawMin || 1;
  const yMin = rawMin - span * 0.08;
  const yMax = rawMax + span * 0.08;

  const xAt = (i: number) =>
    padL + (nPts === 1 ? 0 : (i / (nPts - 1)) * (W - padL - padR));
  const yAt = (v: number) =>
    padT + (1 - (v - yMin) / (yMax - yMin)) * (H - padT - padB);

  // 4 horizontal gridlines
  const gridVals = [0, 0.25, 0.5, 0.75, 1].map((f) => yMin + f * (yMax - yMin));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", display: "block" }}
    >
      {/* gridlines + y labels */}
      {gridVals.map((v, i) => (
        <g key={i}>
          <line x1={padL} y1={yAt(v)} x2={W - padR} y2={yAt(v)} stroke="#1a1a30" strokeWidth={1} />
          <text x={padL - 8} y={yAt(v) + 4} textAnchor="end" fontFamily={BODY} fontSize={13} fill="#9999bb">
            {fmtMoney(v)}
          </text>
        </g>
      ))}

      {/* x axis labels */}
      {xLabels.map((yr, i) => (
        <text key={i} x={xAt(i)} y={H - 12} textAnchor="middle" fontFamily={PX} fontSize={9} fill="#9999bb">
          {yr === 0 ? "START" : `Y${yr}`}
        </text>
      ))}

      {/* one polyline per team */}
      {teams.map((t) => {
        const color = colorOf(t.teamId);
        const isMe = t.teamId === myTeamId;
        const pts = t.cashByRound
          .slice(0, nPts)
          .map((v, i) => `${xAt(i)},${yAt(v)}`)
          .join(" ");
        return (
          <g key={t.teamId}>
            <polyline
              points={pts}
              fill="none"
              stroke={color}
              strokeWidth={isMe ? 4 : 2}
              strokeLinejoin="round"
              opacity={isMe ? 1 : 0.85}
            />
            {t.cashByRound.slice(0, nPts).map((v, i) => (
              <rect key={i} x={xAt(i) - 2.5} y={yAt(v) - 2.5} width={5} height={5} fill={color} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// ── Superlative card ──────────────────────────────────────────────────────────
function Superlative({ icon, title, brand, detail, accent }: {
  icon: string; title: string; brand: string; detail: string; accent: string;
}) {
  return (
    <div className="pixel-card" style={{ borderColor: accent, padding: "0.85rem", flex: "1 1 0" }}>
      <p style={{ fontFamily: PX, fontSize: "0.4rem", color: accent, marginBottom: "0.5rem" }}>
        {icon} {title}
      </p>
      <p style={{ fontFamily: BODY, fontSize: "1.15rem", color: "var(--px-white)", lineHeight: 1.2 }}>
        {brand}
      </p>
      <p style={{ fontFamily: BODY, fontSize: "0.9rem", color: "#888", marginTop: "0.2rem" }}>
        {detail}
      </p>
    </div>
  );
}

export function FinalStandings({
  gameId,
  teams,
  roundNumbers,
  latestRound,
  isCompleted,
  isFacilitator,
  myTeamId,
}: Props) {
  const router = useRouter();

  const colorOf = (teamId: string) => {
    const idx = teams.findIndex((t) => t.teamId === teamId);
    return PALETTE[idx % PALETTE.length];
  };

  const champion = teams[0];
  const champIsMe = champion?.teamId === myTeamId;

  // Superlatives across the whole game.
  const bestYear = teams.reduce((best, t) =>
    t.bestYear.profit > best.bestYear.profit ? t : best, teams[0]);
  const mostUnits = teams.reduce((best, t) =>
    t.totalUnitsSold > best.totalUnitsSold ? t : best, teams[0]);
  const topBrand = teams.reduce((best, t) =>
    t.finalBrandPerception > best.finalBrandPerception ? t : best, teams[0]);

  return (
    <div className="game-screen scanlines min-h-screen p-4" style={{ fontFamily: PX }}>
      {/* Header banner */}
      <div
        style={{
          textAlign: "center",
          padding: "1.75rem 1rem",
          border: "4px solid var(--px-amber)",
          background: "rgba(255,190,11,0.05)",
          marginBottom: "1.5rem",
        }}
      >
        <p
          style={{
            fontFamily: PX,
            fontSize: "1.6rem",
            color: "var(--px-amber)",
            animation: "pixel-blink 1s step-end infinite",
            letterSpacing: "0.12em",
            marginBottom: "0.75rem",
          }}
        >
          {isCompleted ? "★ GAME OVER ★" : `★ STANDINGS · YEAR ${latestRound} ★`}
        </p>
        {champion && (
          <>
            <p style={{ fontSize: "2.2rem", marginBottom: "0.25rem" }}>👑</p>
            <p style={{ fontFamily: PX, fontSize: "0.55rem", color: "var(--px-white)", marginBottom: "0.4rem" }}>
              {isCompleted ? "CHAMPION" : "CURRENT LEADER"}
            </p>
            <p style={{ fontFamily: PX, fontSize: "1.1rem", color: "var(--px-amber)" }}>
              {champion.brandName}
            </p>
            <p style={{ fontFamily: BODY, fontSize: "1.4rem", color: "var(--px-green)", marginTop: "0.5rem" }}>
              {fmtMoney(champion.finalCash)} valuation
            </p>
            {champIsMe && (
              <p style={{ fontFamily: BODY, fontSize: "1.2rem", color: "var(--px-cyan)", marginTop: "0.4rem" }}>
                That&apos;s you — congratulations!
              </p>
            )}
          </>
        )}
      </div>

      {/* Cash trajectory */}
      <div className="pixel-card mb-6" style={{ borderColor: "var(--px-cyan)", padding: "1rem" }}>
        <p style={{ fontFamily: PX, fontSize: "0.5rem", color: "var(--px-cyan)", marginBottom: "0.75rem" }}>
          CASH TRAJECTORY · YEAR 0 → {latestRound}
        </p>
        <TrajectoryChart
          teams={teams}
          roundNumbers={roundNumbers}
          colorOf={colorOf}
          myTeamId={myTeamId}
        />
        {/* legend */}
        <div style={{ display: "flex", gap: "1rem", marginTop: "0.6rem", flexWrap: "wrap" }}>
          {teams.map((t) => (
            <span
              key={t.teamId}
              style={{
                fontFamily: BODY,
                fontSize: "0.85rem",
                color: colorOf(t.teamId),
                fontWeight: t.teamId === myTeamId ? "bold" : "normal",
              }}
            >
              ■ {t.brandName}{t.teamId === myTeamId ? " (you)" : ""}
            </span>
          ))}
        </div>
      </div>

      {/* Superlatives */}
      {teams.length > 0 && (
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <Superlative
            icon="📈" title="BEST YEAR" accent="#39ff14"
            brand={bestYear.brandName}
            detail={`${fmtMoney(bestYear.bestYear.profit)} profit in Year ${bestYear.bestYear.round}`}
          />
          <Superlative
            icon="🏭" title="MOST UNITS SOLD" accent="#00f5ff"
            brand={mostUnits.brandName}
            detail={`${mostUnits.totalUnitsSold.toLocaleString()} vehicles all-time`}
          />
          <Superlative
            icon="⭐" title="STRONGEST BRAND" accent="#ff006e"
            brand={topBrand.brandName}
            detail={`Brand perception ${topBrand.finalBrandPerception.toFixed(0)}`}
          />
        </div>
      )}

      {/* Final standings table */}
      <div style={{ border: "2px solid var(--px-amber)", padding: "1rem", marginBottom: "1.5rem" }}>
        <p style={{ fontFamily: PX, fontSize: "0.5rem", color: "var(--px-amber)", marginBottom: "0.75rem" }}>
          {isCompleted ? "FINAL STANDINGS" : "STANDINGS"}
        </p>
        <div className="space-y-2">
          {teams.map((t, i) => {
            const me = t.teamId === myTeamId;
            const gain = t.finalCash - t.startCash;
            return (
              <div
                key={t.teamId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2.5rem 1fr auto",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.7rem 0.75rem",
                  border: `2px solid ${me ? "var(--px-cyan)" : i === 0 ? "var(--px-amber)" : "#1a1a30"}`,
                  background: i === 0 ? "rgba(255,190,11,0.06)" : me ? "rgba(0,245,255,0.05)" : "transparent",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  {i < 3
                    ? <span style={{ fontSize: "1.3rem" }}>{MEDALS[i]}</span>
                    : <span style={{ fontFamily: BODY, fontSize: "1.1rem", color: "#8888aa" }}>#{i + 1}</span>}
                </div>

                <div>
                  <p style={{ fontFamily: PX, fontSize: "0.5rem", color: me ? "var(--px-cyan)" : i === 0 ? "var(--px-amber)" : "var(--px-white)" }}>
                    <span style={{ color: colorOf(t.teamId) }}>■</span> {t.brandName}{me ? " ← YOU" : ""}
                  </p>
                  <div style={{ display: "flex", gap: "1rem", marginTop: "0.3rem", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: BODY, fontSize: "0.85rem", color: "#888" }}>
                      {(t.finalMarketShare * 100).toFixed(1)}% share
                    </span>
                    <span style={{ fontFamily: BODY, fontSize: "0.85rem", color: "#888" }}>
                      {t.totalUnitsSold.toLocaleString()} units
                    </span>
                    <span style={{ fontFamily: BODY, fontSize: "0.85rem", color: "#888" }}>
                      Brand {t.finalBrandPerception.toFixed(0)}
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <p style={{ fontFamily: BODY, fontSize: "1.25rem", color: "var(--px-white)" }}>
                    {fmtMoney(t.finalCash)}
                  </p>
                  <p style={{ fontFamily: BODY, fontSize: "0.85rem", color: gain >= 0 ? "#39ff14" : "#ff006e" }}>
                    {gain >= 0 ? "▲ " : "▼ "}{fmtMoney(gain)} vs start
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => router.push(`/results/${gameId}/${latestRound}`)}
          className="pixel-btn pixel-btn-amber"
          style={{ fontFamily: PX, fontSize: "0.45rem" }}
        >
          ← YEAR {latestRound} DETAIL
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => router.push(isFacilitator ? `/facilitator/${gameId}` : `/game`)}
          className="pixel-btn pixel-btn-green"
          style={{ fontFamily: PX, fontSize: "0.45rem" }}
        >
          {isFacilitator ? "DASHBOARD →" : "HOME →"}
        </button>
      </div>
    </div>
  );
}
