"use client";

import type { ReactNode } from "react";
import type {
  SectionKey,
  VehicleSection,
  RdSection,
  ManufacturingSection,
  ProductionSection,
  MarketingSection,
  LobbyingSection,
} from "@/types/decisions";
import { computeModelUnitCost } from "@/lib/decision-utils";

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1 border-b" style={{ borderColor: "var(--px-gray)" }}>
      <span style={{ fontFamily: "var(--font-pixel)", fontSize: "0.42rem", color: "var(--px-gray)", flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontFamily: "var(--font-pixel-body)", fontSize: "1rem", color: "var(--px-white)", textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

function fmtM(n: number) {
  return "$" + (n / 1_000_000).toFixed(1) + "M";
}

export function ReadOnlySection({
  section,
  data,
}: {
  section: SectionKey;
  data: unknown;
}) {
  if (!data || typeof data !== "object") {
    return (
      <div style={{ fontFamily: "var(--font-pixel-body)", fontSize: "1rem", color: "var(--px-gray)" }}>
        No data yet.
      </div>
    );
  }

  if (section === "vehicleSection") {
    const d = data as VehicleSection;
    if (!d.models || d.models.length === 0) {
      return <div style={{ fontFamily: "var(--font-pixel-body)", fontSize: "1rem", color: "var(--px-gray)" }}>No vehicles designed yet.</div>;
    }
    return (
      <div className="space-y-3">
        {d.models.map((m) => (
          <div key={m.id} className="pixel-card" style={{ padding: "0.75rem", borderColor: "var(--px-gray)" }}>
            <Row label="MODEL" value={m.name || "(unnamed)"} />
            <Row label="TYPE" value={m.vehicleType} />
            <Row label="ENGINE" value={m.engine.replace(/_/g, " ").toUpperCase()} />
            <Row label="INTERNALS" value={m.internals.replace(/_/g, " ").toUpperCase()} />
            <Row label="FEATURES" value={m.features.length > 0 ? m.features.join(", ") : "none"} />
            <Row label="UNIT COST" value={"$" + computeModelUnitCost(m).toLocaleString()} />
          </div>
        ))}
      </div>
    );
  }

  if (section === "rdSection") {
    const d = data as RdSection;
    const recurringCount = Object.values(d.recurring).filter(Boolean).length;
    return (
      <div className="space-y-2">
        <Row label="RECURRING INVESTMENTS" value={`${recurringCount} active`} />
        <Row label="TECH UNLOCKS (this round)" value={d.techTreeUnlocks.length > 0 ? d.techTreeUnlocks.join(", ") : "none"} />
      </div>
    );
  }

  if (section === "manufacturingSection") {
    const d = data as ManufacturingSection;
    const totalUnits = d.productionRuns.reduce((s, r) => s + r.units, 0);
    return (
      <div className="space-y-2">
        <Row label="SPACE ACTION" value={d.spaceAction.toUpperCase()} />
        {d.spaceSize && <Row label="SIZE" value={d.spaceSize.toUpperCase()} />}
        {d.spaceOwnership && <Row label="OWNERSHIP" value={d.spaceOwnership.toUpperCase()} />}
        <Row label="PRODUCTION RUNS" value={d.productionRuns.length + " models"} />
        <Row label="TOTAL UNITS" value={totalUnits.toLocaleString()} />
      </div>
    );
  }

  if (section === "productionSection") {
    const d = data as ProductionSection;
    if (!d.models || d.models.length === 0) {
      return <div style={{ fontFamily: "var(--font-pixel-body)", fontSize: "1rem", color: "var(--px-gray)" }}>No pricing set yet.</div>;
    }
    return (
      <div className="space-y-2">
        {d.models.map((m) => (
          <div key={m.modelId} className="pixel-card" style={{ padding: "0.5rem", borderColor: "var(--px-gray)" }}>
            <Row label="MODEL ID" value={m.modelId.slice(0, 8) + "..."} />
            <Row label="SALE PRICE" value={"$" + m.salePrice.toLocaleString()} />
            <Row label="INV DISCOUNT" value={m.inventoryDiscount + "%"} />
          </div>
        ))}
      </div>
    );
  }

  if (section === "marketingSection") {
    const d = data as MarketingSection;
    return (
      <div className="space-y-2">
        <Row label="BUDGET" value={fmtM(d.totalBudget)} />
        <Row label="MESSAGING" value={d.messagingType.toUpperCase()} />
        <Row label="TONE" value={d.tone.toUpperCase()} />
        <Row label="REGIONAL" value={d.regionalTargeting.toUpperCase()} />
        <Row label="TV/ONLINE" value={fmtM(d.channels.tv_online)} />
        <Row label="RADIO" value={fmtM(d.channels.radio)} />
        <Row label="PRINT" value={fmtM(d.channels.print)} />
        <Row label="PAID SEARCH" value={fmtM(d.channels.paid_search)} />
      </div>
    );
  }

  if (section === "lobbyingSection") {
    const d = data as LobbyingSection;
    return (
      <div className="space-y-2">
        <Row label="SPEND" value={fmtM(d.lobbyingSpend)} />
        {d.steeringCategory && (
          <Row label="STEERING" value={d.steeringCategory.replace(/_/g, " ").toUpperCase()} />
        )}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "var(--font-pixel-body)", fontSize: "1rem", color: "var(--px-gray)" }}>
      No data.
    </div>
  );
}
