"use client";

import { useState } from "react";
import { PixelButton } from "@/components/game/PixelButton";
import { isSectionComplete } from "@/lib/decision-utils";
import type { SectionKey } from "@/types/decisions";

const SECTIONS_TO_CHECK: { key: SectionKey; label: string }[] = [
  { key: "vehicleSection", label: "CTO: VEHICLES" },
  { key: "rdSection", label: "CTO: R&D" },
  { key: "manufacturingSection", label: "COO: FACTORY" },
  { key: "productionSection", label: "CFO: PRICING" },
  { key: "marketingSection", label: "CMO: MARKETING" },
  { key: "lobbyingSection", label: "CEO: LOBBYING" },
];

interface SubmitPanelProps {
  decisionData: Record<SectionKey, unknown>;
  onSubmit: () => Promise<void>;
  submittedAt: string | null;
}

export function SubmitPanel({
  decisionData,
  onSubmit,
  submittedAt,
}: SubmitPanelProps) {
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sectionStatuses = SECTIONS_TO_CHECK.map((s) => ({
    ...s,
    complete: isSectionComplete(s.key, decisionData[s.key]),
  }));

  const allComplete = sectionStatuses.every((s) => s.complete);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
      setSubmitting(false);
      setConfirming(false);
    }
  }

  if (submittedAt) {
    return (
      <div
        className="pixel-card pixel-card-green mt-6"
        style={{ textAlign: "center" }}
      >
        <p
          className="pixel-heading"
          style={{ fontSize: "0.8rem", color: "var(--px-green)" }}
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
          Submitted at {new Date(submittedAt).toLocaleTimeString()}. Waiting for
          other teams.
        </p>
      </div>
    );
  }

  return (
    <div className="pixel-card pixel-card-amber mt-6 space-y-4">
      <p
        className="pixel-heading"
        style={{ fontSize: "0.6rem", color: "var(--px-amber)" }}
      >
        ROUND SUBMISSION CHECKLIST
      </p>

      {/* Checklist */}
      <div className="space-y-1">
        {sectionStatuses.map((s) => (
          <div key={s.key} className="flex items-center gap-3">
            <span
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: "0.55rem",
                color: s.complete ? "var(--px-green)" : "var(--px-pink)",
                width: 16,
                textAlign: "center",
              }}
            >
              {s.complete ? "✓" : "✗"}
            </span>
            <span
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: "0.45rem",
                color: s.complete ? "var(--px-green)" : "var(--px-gray)",
              }}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <p
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: "0.45rem",
            color: "var(--px-pink)",
          }}
        >
          ERROR: {error}
        </p>
      )}

      {/* Submit button or confirm dialog */}
      {!confirming ? (
        <PixelButton
          variant="amber"
          size="lg"
          disabled={!allComplete}
          onClick={() => setConfirming(true)}
        >
          LOCK IN DECISIONS
        </PixelButton>
      ) : (
        <div
          className="pixel-card"
          style={{ borderColor: "var(--px-pink)", background: "#1a0010" }}
        >
          <p
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "0.5rem",
              color: "var(--px-pink)",
              marginBottom: "1rem",
              lineHeight: 1.8,
            }}
          >
            ONCE SUBMITTED, DECISIONS ARE FINAL. PROCEED?
          </p>
          <div className="flex gap-3">
            <PixelButton
              variant="pink"
              size="md"
              disabled={submitting}
              onClick={handleConfirm}
            >
              {submitting ? "SUBMITTING..." : "CONFIRM"}
            </PixelButton>
            <PixelButton
              variant="cyan"
              size="md"
              disabled={submitting}
              onClick={() => setConfirming(false)}
            >
              CANCEL
            </PixelButton>
          </div>
        </div>
      )}
    </div>
  );
}
