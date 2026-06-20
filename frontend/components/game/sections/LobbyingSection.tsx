"use client";

import type { LobbyingSection as LobbyingSectionType } from "@/types/decisions";

const STEERING_CATEGORIES = [
  { value: "regulatory_pro", label: "REGULATORY PRO — push friendly regulations" },
  { value: "regulatory_anti", label: "REGULATORY ANTI — block unfriendly policy" },
  { value: "economic", label: "ECONOMIC — macro stimulus for the sector" },
  { value: "technological", label: "TECHNOLOGICAL — R&D tax credits" },
  { value: "competitive", label: "COMPETITIVE — weaken competitors via policy" },
  { value: "environmental", label: "ENVIRONMENTAL — green/ESG framing" },
  { value: "opportunity", label: "OPPORTUNITY — seize emerging policy window" },
] as const;

function computeLobbyPoints(spend: number): number {
  if (spend <= 0) return 0;
  const spendM = spend / 1_000_000;
  if (spendM <= 5) {
    return Math.floor(spendM);
  }
  const firstFive = 5;
  const remaining = spendM - 5;
  return firstFive + Math.floor(remaining / 2);
}

export function LobbyingSection({
  value,
  onChange,
  disabled = false,
}: {
  value: LobbyingSectionType;
  onChange: (v: LobbyingSectionType) => void;
  disabled?: boolean;
}) {
  const points = computeLobbyPoints(value.lobbyingSpend);
  const steeringEligible = value.lobbyingSpend >= 6_000_000;
  const spendM = (value.lobbyingSpend / 1_000_000).toFixed(1);

  // Pixel meter for policy score
  const meterBlocks = 10;
  const filledBlocks = Math.min(meterBlocks, points);

  return (
    <div className="space-y-6">
      <h2
        className="pixel-heading"
        style={{ fontSize: "0.8rem", color: "var(--px-amber)" }}
      >
        LOBBYING & POLICY
      </h2>

      {/* Policy score display */}
      <div className="pixel-card pixel-card-amber">
        <div className="flex items-center justify-between mb-3">
          <span
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "0.5rem",
              color: "var(--px-amber)",
            }}
          >
            POLICY SCORE
          </span>
          <span
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "0.75rem",
              color: "var(--px-amber)",
            }}
          >
            0
          </span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: meterBlocks }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 12,
                background:
                  i < filledBlocks ? "var(--px-amber)" : "var(--px-gray)",
                border: "1px solid var(--px-amber-dark)",
              }}
            />
          ))}
        </div>
        <p
          style={{
            fontFamily: "var(--font-pixel-body)",
            fontSize: "0.9rem",
            color: "var(--px-gray)",
            marginTop: "0.5rem",
          }}
        >
          Current score is 0 (Year 1 start)
        </p>
      </div>

      {/* NPC pressure reminder */}
      <div
        className="pixel-border p-3"
        style={{ borderColor: "var(--px-pink)", background: "#1a000a" }}
      >
        <span
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: "0.45rem",
            color: "var(--px-pink)",
          }}
        >
          TRADITIONAL AUTO LOBBY: -3 pts/year (automatic)
        </span>
        <p
          style={{
            fontFamily: "var(--font-pixel-body)",
            fontSize: "0.9rem",
            color: "var(--px-gray)",
            marginTop: "0.25rem",
          }}
        >
          The legacy auto industry applies -3 policy points every year. Spend
          at least $3M to stay even.
        </p>
      </div>

      {/* Lobbying spend */}
      <div>
        <label className="pixel-label">LOBBYING SPEND ($)</label>
        <input
          type="number"
          min={0}
          value={value.lobbyingSpend || ""}
          disabled={disabled}
          placeholder="Enter spend in dollars..."
          onChange={(e) =>
            onChange({ ...value, lobbyingSpend: parseInt(e.target.value) || 0 })
          }
          className="pixel-input"
          style={{ maxWidth: 220 }}
        />
        <p
          style={{
            fontFamily: "var(--font-pixel-body)",
            fontSize: "0.85rem",
            color: "var(--px-gray)",
            marginTop: "0.2rem",
          }}
        >
          $1M = +1 pt (first $5M) | $2M = +1 pt (above $5M)
        </p>
      </div>

      {/* Live preview */}
      <div
        className="pixel-border p-3 flex items-center justify-between"
        style={{ borderColor: "var(--px-amber)" }}
      >
        <span
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: "0.5rem",
            color: "var(--px-amber)",
          }}
        >
          YOUR CONTRIBUTION
        </span>
        <span
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: "0.65rem",
            color: "var(--px-amber)",
          }}
        >
          +{points} pts (${spendM}M spent)
        </span>
      </div>

      {/* Event steering */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label
            className="pixel-label"
            style={{
              color: steeringEligible ? "var(--px-amber)" : "var(--px-gray)",
              marginBottom: 0,
            }}
          >
            EVENT STEERING
          </label>
          {!steeringEligible && (
            <span
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: "0.38rem",
                color: "var(--px-gray)",
              }}
            >
              (requires $6M+)
            </span>
          )}
        </div>
        <select
          className="pixel-select"
          style={{
            maxWidth: 360,
            opacity: steeringEligible ? 1 : 0.4,
          }}
          disabled={disabled || !steeringEligible}
          value={value.steeringCategory ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              steeringCategory:
                (e.target.value as LobbyingSectionType["steeringCategory"]) ||
                undefined,
            })
          }
        >
          <option value="">No steering preference</option>
          {STEERING_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        {steeringEligible && (
          <p
            style={{
              fontFamily: "var(--font-pixel-body)",
              fontSize: "0.9rem",
              color: "var(--px-amber)",
              marginTop: "0.25rem",
            }}
          >
            You qualify to steer next round's world event category.
          </p>
        )}
      </div>
    </div>
  );
}
