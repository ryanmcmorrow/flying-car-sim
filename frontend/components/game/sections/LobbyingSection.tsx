"use client";

import React from "react";
import { Tooltip } from "@/components/game/Tooltip";
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
  currentPolicyScore = 0,
}: {
  value: LobbyingSectionType;
  onChange: (v: LobbyingSectionType) => void;
  disabled?: boolean;
  currentPolicyScore?: number;
}) {
  const points = computeLobbyPoints(value.lobbyingSpend);
  const steeringEligible = value.lobbyingSpend >= 6_000_000;
  const spendM = (value.lobbyingSpend / 1_000_000).toFixed(1);

  // Bidirectional meter: -10 to +10, 0 in the center
  const RANGE = 10; // blocks per side
  const projected = currentPolicyScore + points - 3; // -3 NPC drag always applies

  return (
    <div className="space-y-6">
      {/* hide number input spinners */}
      <style>{`input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}`}</style>
      <h2
        className="pixel-heading"
        style={{ fontSize: "0.8rem", color: "var(--px-amber)" }}
      >
        LOBBYING & POLICY
      </h2>

      {/* Policy score display — bidirectional meter */}
      <div className="pixel-card pixel-card-amber">
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontFamily: "var(--font-pixel)", fontSize: "0.5rem", color: "var(--px-amber)" }}>
            POLICY SCORE
            <Tooltip text="Shared industry policy score. Higher = more favourable regulations and better demand multipliers. Below 0 = hostile environment that crushes demand. The traditional auto lobby drains -3 pts/year automatically — you must spend to stay positive." />
          </span>
          <span style={{ fontFamily: "var(--font-pixel)", fontSize: "0.75rem", color: currentPolicyScore >= 0 ? "var(--px-amber)" : "var(--px-pink)" }}>
            {currentPolicyScore > 0 ? "+" : ""}{currentPolicyScore}
          </span>
        </div>

        {/* Bidirectional bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {/* Negative side (right-to-left fill from center) */}
          {Array.from({ length: RANGE }).map((_, i) => {
            const blockIdx = RANGE - 1 - i; // 9 = furthest left, 0 = adjacent to center
            const filled = currentPolicyScore < 0 && blockIdx < Math.min(RANGE, Math.abs(currentPolicyScore));
            return (
              <div key={`neg-${i}`} style={{
                flex: 1, height: 14,
                background: filled ? "var(--px-pink)" : "var(--px-bg-2)",
                border: "1px solid #3a2a3a",
              }} />
            );
          })}
          {/* Center marker */}
          <div style={{ width: 4, height: 20, background: "var(--px-amber)", flexShrink: 0 }} />
          {/* Positive side */}
          {Array.from({ length: RANGE }).map((_, i) => {
            const filled = currentPolicyScore > 0 && i < Math.min(RANGE, currentPolicyScore);
            return (
              <div key={`pos-${i}`} style={{
                flex: 1, height: 14,
                background: filled ? "var(--px-amber)" : "var(--px-bg-2)",
                border: "1px solid #3a3a1a",
              }} />
            );
          })}
        </div>

        {/* Axis labels */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.25rem" }}>
          <span style={{ fontFamily: "var(--font-pixel-body)", fontSize: "0.8rem", color: "var(--px-pink)" }}>−{RANGE} HOSTILE</span>
          <span style={{ fontFamily: "var(--font-pixel-body)", fontSize: "0.8rem", color: "var(--px-gray)" }}>0</span>
          <span style={{ fontFamily: "var(--font-pixel-body)", fontSize: "0.8rem", color: "var(--px-amber)" }}>FRIENDLY +{RANGE}</span>
        </div>

        {/* Projected next year */}
        {value.lobbyingSpend > 0 && (
          <p style={{ fontFamily: "var(--font-pixel-body)", fontSize: "0.95rem", color: projected >= currentPolicyScore ? "var(--px-green)" : "var(--px-pink)", marginTop: "0.5rem" }}>
            After this round: {projected > 0 ? "+" : ""}{projected} (your +{points} pts, auto −3 NPC)
          </p>
        )}
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
        <p style={{ fontFamily: "var(--font-pixel-body)", fontSize: "1rem", color: "var(--px-white)", marginTop: "0.25rem" }}>
          The legacy auto industry applies −3 policy points every year. Spend at least $3M to stay even.
        </p>
      </div>

      {/* Lobbying spend */}
      <div>
        <label className="pixel-label">LOBBYING SPEND ($) <Tooltip text="Annual lobbying investment. Each $1M = +1 policy point up to $5M, then diminishing returns ($2M per point above that). The traditional auto lobby costs you -3 pts/year automatically." /></label>
        <input
          type="number"
          min={0}
          value={value.lobbyingSpend || ""}
          disabled={disabled}
          placeholder="e.g. 5000000"
          onChange={(e) =>
            onChange({ ...value, lobbyingSpend: parseInt(e.target.value) || 0 })
          }
          onWheel={(e) => e.currentTarget.blur()}
          className="pixel-input"
          style={{ maxWidth: 220, MozAppearance: "textfield" } as React.CSSProperties}
        />
        <p style={{ fontFamily: "var(--font-pixel-body)", fontSize: "1rem", color: "var(--px-white)", marginTop: "0.4rem" }}>
          First $5M → +$1M per pt &nbsp;|&nbsp; Above $5M → +$2M per pt
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
            EVENT STEERING <Tooltip text="Spend $6M+ to bias next round's world event toward a category that favors your strategy. The highest spender among eligible teams wins the steer." />
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
