"use client";

import { useState } from "react";
import { PixelButton } from "@/components/game/PixelButton";
import { Tooltip } from "@/components/game/Tooltip";
import { computeModelUnitCost, computeEngineeringFee } from "@/lib/decision-utils";
import type { VehicleSection as VehicleSectionType, VehicleModel } from "@/types/decisions";

const px = "var(--font-pixel), monospace";
const body = "var(--font-pixel-body), monospace";

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

const VEHICLE_TYPES: { value: VehicleModel["vehicleType"]; label: string; base: number }[] = [
  { value: "COMPACT", label: "Compact", base: 42000 },
  { value: "SEDAN", label: "Sedan", base: 52000 },
  { value: "SUV", label: "SUV", base: 68000 },
  { value: "TRUCK", label: "Truck", base: 72000 },
  { value: "SPORTS_CAR", label: "Sports Car", base: 85000 },
];

const ENGINE_OPTIONS: { value: VehicleModel["engine"]; label: string; adder: number; desc: string }[] = [
  { value: "high_performance", label: "High Performance", adder: 9000, desc: "+$9K/unit" },
  { value: "reliable", label: "Reliable", adder: 3500, desc: "+$3.5K/unit" },
  { value: "cheap", label: "Cheap", adder: 0, desc: "+$0/unit" },
];

const INTERNALS_OPTIONS: { value: VehicleModel["internals"]; label: string; adder: number; desc: string }[] = [
  { value: "triple_tested", label: "Triple-Tested", adder: 5500, desc: "+$5.5K/unit" },
  { value: "mass_produced", label: "Mass Produced", adder: 1200, desc: "+$1.2K/unit" },
  { value: "low_grade", label: "Low-Grade", adder: 0, desc: "+$0/unit" },
];

const FEATURE_OPTIONS: { value: VehicleModel["features"][number]; label: string; cost: number; effect: string }[] = [
  { value: "touchscreen",       label: "Touchscreen",       cost: 800,   effect: "+1.2% demand" },
  { value: "lane_assist",       label: "Lane Assist",       cost: 1_200, effect: "+2.0% demand" },
  { value: "cameras",           label: "Cameras",           cost: 700,   effect: "+1.0% demand" },
  { value: "speakers",          label: "Speakers",          cost: 600,   effect: "+1.0% demand" },
  { value: "leather",           label: "Leather",           cost: 1_500, effect: "+2.2% demand" },
  { value: "phone_integration", label: "Phone Sync",        cost: 1_000, effect: "+1.4% demand" },
  { value: "virtual_assistant", label: "AI Assistant",      cost: 2_000, effect: "+2.5% demand" },
  { value: "entertainment",     label: "Entertainment",     cost: 1_300, effect: "+1.8% demand" },
];

function fmt(n: number) {
  return "$" + n.toLocaleString();
}

const VT_LABEL: Record<string, string> = Object.fromEntries(VEHICLE_TYPES.map((v) => [v.value, v.label]));
const ENG_LABEL: Record<string, string> = Object.fromEntries(ENGINE_OPTIONS.map((e) => [e.value, e.label]));
const INT_LABEL: Record<string, string> = Object.fromEntries(INTERNALS_OPTIONS.map((i) => [i.value, i.label]));

// ── Inherited model card (locked, not refreshed) ──────────────────────────────

function InheritedLockedCard({
  model,
  onRefresh,
  disabled,
  roundNumber,
}: {
  model: VehicleModel;
  onRefresh: () => void;
  disabled: boolean;
  roundNumber: number;
}) {
  const unitCost = computeModelUnitCost(model);
  const age = roundNumber - (model.modelYear ?? 1);
  const agePenalty = age >= 3 ? 20 : age >= 2 ? 12 : age >= 1 ? 5 : 0;
  const ageColor = agePenalty >= 20 ? "var(--px-pink)" : agePenalty >= 12 ? "var(--px-amber)" : "var(--px-gray)";

  return (
    <div
      className="pixel-card mb-3"
      style={{ borderColor: "var(--px-gray)", opacity: 0.85 }}
    >
      <div className="flex items-start justify-between gap-4">
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span style={{ fontFamily: px, fontSize: "0.35rem", color: "var(--px-gray)", border: "1px solid var(--px-gray)", padding: "0.1rem 0.35rem", letterSpacing: "0.08em" }}>
              CONTINUING
            </span>
            <span style={{ fontFamily: px, fontSize: "0.55rem", color: "var(--px-white)" }}>
              {model.name || "(unnamed)"}
            </span>
          </div>
          <div style={{ fontFamily: body, fontSize: "0.85rem", color: "var(--px-gray)" }}>
            {VT_LABEL[model.vehicleType] ?? model.vehicleType} · {ENG_LABEL[model.engine] ?? model.engine} · {INT_LABEL[model.internals] ?? model.internals}
            {model.features.length > 0 && ` · ${model.features.length} feature${model.features.length !== 1 ? "s" : ""}`}
          </div>
          {agePenalty > 0 ? (
            <div style={{ fontFamily: body, fontSize: "0.8rem", color: ageColor, marginTop: "0.15rem" }}>
              {age} year{age !== 1 ? "s" : ""} old — −{agePenalty}% demand penalty. Refresh to reset.
            </div>
          ) : (
            <div style={{ fontFamily: body, fontSize: "0.8rem", color: "var(--px-gray)", marginTop: "0.15rem" }}>
              Same specs as last year — no re-engineering fee.
            </div>
          )}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: px, fontSize: "0.5rem", color: "var(--px-amber)" }}>{fmt(unitCost)}/unit</div>
          {!disabled && (
            <button
              type="button"
              onClick={onRefresh}
              style={{
                marginTop: "0.5rem",
                fontFamily: px,
                fontSize: "0.38rem",
                color: "var(--px-cyan)",
                border: "1px solid var(--px-cyan)",
                padding: "0.2rem 0.5rem",
                background: "transparent",
                cursor: "pointer",
                display: "block",
              }}
            >
              ⟳ REFRESH MODEL
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Refresh form (inherited model, unlocked for editing) ──────────────────────

function RefreshedModelForm({
  model,
  onChange,
  onSave,
  onRevert,
  disabled,
}: {
  model: VehicleModel;
  onChange: (m: VehicleModel) => void;
  onSave: () => void;
  onRevert: () => void;
  disabled: boolean;
}) {
  const unitCost = computeModelUnitCost(model);

  function toggleFeature(f: VehicleModel["features"][number]) {
    const next = model.features.includes(f)
      ? model.features.filter((x) => x !== f)
      : [...model.features, f];
    onChange({ ...model, features: next });
  }

  return (
    <div className="pixel-card mb-4 space-y-4" style={{ borderColor: "var(--px-cyan)", background: "rgba(0,245,255,0.03)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontFamily: px, fontSize: "0.4rem", color: "var(--px-cyan)", letterSpacing: "0.08em" }}>
            ⟳ REFRESHING MODEL
          </span>
          <p style={{ fontFamily: body, fontSize: "0.85rem", color: "var(--px-gray)", marginTop: "0.1rem" }}>
            Upgrade engine, internals, or features. Segment is locked — no re-engineering fee.
          </p>
        </div>
        <div
          style={{
            fontFamily: px,
            fontSize: "0.4rem",
            color: "var(--px-gray)",
            border: "1px solid var(--px-gray)",
            padding: "0.15rem 0.4rem",
          }}
        >
          {VT_LABEL[model.vehicleType] ?? model.vehicleType}
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="pixel-label">Model Name</label>
        <input
          className="pixel-input"
          value={model.name}
          maxLength={24}
          placeholder="Enter model name..."
          disabled={disabled}
          onChange={(e) => onChange({ ...model, name: e.target.value })}
        />
      </div>

      {/* Engine */}
      <div>
        <label className="pixel-label">Engine <Tooltip text="Propulsion quality. High Performance boosts demand. Cheap cuts unit cost but lowers brand perception." /></label>
        <div className="flex gap-2 flex-wrap">
          {ENGINE_OPTIONS.map((e) => (
            <button
              key={e.value}
              disabled={disabled}
              onClick={() => onChange({ ...model, engine: e.value })}
              className={`pixel-btn px-3 py-2 ${model.engine === e.value ? "pixel-btn-amber" : ""}`}
              style={{ fontFamily: body }}
            >
              <div style={{ fontSize: "1rem" }}>{e.label}</div>
              <div style={{ fontSize: "0.85rem", color: model.engine === e.value ? "rgba(0,0,0,0.5)" : "var(--px-gray)" }}>{e.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Internals */}
      <div>
        <label className="pixel-label">Internals <Tooltip text="Build quality and safety testing. Triple-Tested minimises recall risk. Low-Grade cuts cost but risks defects." /></label>
        <div className="flex gap-2 flex-wrap">
          {INTERNALS_OPTIONS.map((i) => (
            <button
              key={i.value}
              disabled={disabled}
              onClick={() => onChange({ ...model, internals: i.value })}
              className={`pixel-btn px-3 py-2 ${model.internals === i.value ? "pixel-btn-green" : ""}`}
              style={{ fontFamily: body }}
            >
              <div style={{ fontSize: "1rem" }}>{i.label}</div>
              <div style={{ fontSize: "0.85rem", color: model.internals === i.value ? "rgba(0,0,0,0.5)" : "var(--px-gray)" }}>{i.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Features */}
      <div>
        <label className="pixel-label">Features <Tooltip text="Optional amenities that raise unit cost and buyer willingness to pay a premium." /></label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FEATURE_OPTIONS.map((f) => {
            const selected = model.features.includes(f.value);
            return (
              <button
                key={f.value}
                disabled={disabled}
                onClick={() => toggleFeature(f.value)}
                className={`pixel-btn p-2 text-left ${selected ? "pixel-btn-cyan" : ""}`}
                style={{
                  fontFamily: body,
                  ...(selected ? {} : { background: "var(--px-bg-2)", color: "var(--px-gray)" }),
                }}
              >
                <div style={{ fontSize: "0.9rem", color: selected ? "var(--px-bg)" : "var(--px-white)", lineHeight: 1.2 }}>
                  {f.label}
                </div>
                <div style={{ fontSize: "0.8rem", color: selected ? "rgba(0,0,0,0.5)" : "var(--px-gray)", marginTop: "0.15rem" }}>
                  +{fmt(f.cost)} · {f.effect}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cost summary */}
      <div className="pixel-border p-3 flex items-center justify-between" style={{ borderColor: "var(--px-amber)" }}>
        <span style={{ fontFamily: px, fontSize: "0.55rem", color: "var(--px-amber)" }}>EST. MFG COST / UNIT</span>
        <span style={{ fontFamily: px, fontSize: "0.75rem", color: "var(--px-amber)" }}>{fmt(unitCost)}</span>
      </div>

      {!disabled && (
        <div className="flex justify-between items-center gap-3">
          <PixelButton variant="green" size="sm" onClick={onSave}>
            ✓ SAVE CHANGES
          </PixelButton>
          <PixelButton variant="pink" size="sm" onClick={onRevert}>
            ↩ KEEP AS-IS
          </PixelButton>
        </div>
      )}
    </div>
  );
}

// ── New model summary card (saved new design) ─────────────────────────────────

function NewModelSummary({
  model,
  onEdit,
  onRemove,
  disabled,
}: {
  model: VehicleModel;
  onEdit: () => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  const unitCost = computeModelUnitCost(model);
  const engFee = computeEngineeringFee(model.vehicleType);
  return (
    <div
      className="pixel-card mb-3"
      style={{ borderColor: "var(--px-green)", boxShadow: "4px 4px 0 #1d4a0a", cursor: disabled ? "default" : "pointer" }}
      onClick={disabled ? undefined : onEdit}
    >
      <div className="flex items-center justify-between gap-4">
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span style={{ fontFamily: px, fontSize: "0.35rem", color: "var(--px-green)", border: "1px solid var(--px-green)", padding: "0.1rem 0.35rem", letterSpacing: "0.08em" }}>
              NEW LINE
            </span>
            <span style={{ fontFamily: px, fontSize: "0.55rem", color: "var(--px-white)" }}>
              {model.name || "(unnamed)"}
            </span>
          </div>
          <div style={{ fontFamily: body, fontSize: "0.85rem", color: "var(--px-gray)" }}>
            {VT_LABEL[model.vehicleType] ?? model.vehicleType} · {ENG_LABEL[model.engine] ?? model.engine} · {INT_LABEL[model.internals] ?? model.internals}
            {model.features.length > 0 && ` · ${model.features.length} feature${model.features.length !== 1 ? "s" : ""}`}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: px, fontSize: "0.5rem", color: "var(--px-amber)" }}>{fmt(unitCost)}/unit</div>
          <div style={{ fontFamily: px, fontSize: "0.38rem", color: "var(--px-pink)", marginTop: "0.1rem" }}>
            +{fmt(engFee)} eng. fee
          </div>
          {!disabled && (
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.4rem", justifyContent: "flex-end" }}>
              <span style={{ fontFamily: px, fontSize: "0.38rem", color: "var(--px-cyan)", border: "1px solid var(--px-cyan)", padding: "0.15rem 0.4rem" }}>
                ✎ EDIT
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                style={{ fontFamily: px, fontSize: "0.38rem", color: "var(--px-pink)", border: "1px solid var(--px-pink)", padding: "0.15rem 0.4rem", background: "transparent", cursor: "pointer" }}
              >
                ✕ REMOVE
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── New model full form ───────────────────────────────────────────────────────

function NewModelForm({
  model,
  onChange,
  onRemove,
  onSave,
  disabled,
}: {
  model: VehicleModel;
  onChange: (m: VehicleModel) => void;
  onRemove: () => void;
  onSave: () => void;
  disabled: boolean;
}) {
  const unitCost = computeModelUnitCost(model);
  const engFee = computeEngineeringFee(model.vehicleType);

  function toggleFeature(f: VehicleModel["features"][number]) {
    const next = model.features.includes(f)
      ? model.features.filter((x) => x !== f)
      : [...model.features, f];
    onChange({ ...model, features: next });
  }

  return (
    <div className="pixel-card pixel-card-pink mb-4 space-y-4">
      <div>
        <span style={{ fontFamily: px, fontSize: "0.4rem", color: "var(--px-pink)", letterSpacing: "0.08em" }}>
          ✦ NEW VEHICLE LINE
        </span>
        <p style={{ fontFamily: body, fontSize: "0.85rem", color: "var(--px-gray)", marginTop: "0.1rem" }}>
          Brand new platform — one-time engineering fee applies.
        </p>
      </div>

      {/* Name */}
      <div>
        <label className="pixel-label">Model Name <Tooltip text="Give your vehicle a unique name. You can design multiple models to compete in different segments." /></label>
        <input
          className="pixel-input"
          value={model.name}
          maxLength={24}
          placeholder="Enter model name..."
          disabled={disabled}
          onChange={(e) => onChange({ ...model, name: e.target.value })}
        />
      </div>

      {/* Vehicle Type */}
      <div>
        <label className="pixel-label">
          Vehicle Type{" "}
          <Tooltip text="Determines base manufacturing cost and which market segments you compete in." />
        </label>
        <p style={{ fontFamily: body, fontSize: "0.85rem", color: "var(--px-gray)", marginBottom: "0.5rem" }}>
          Prices shown are base manufacturing cost — your sale price in Production will typically be much higher.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {VEHICLE_TYPES.map((vt) => {
            const selected = model.vehicleType === vt.value;
            return (
              <button
                key={vt.value}
                disabled={disabled}
                onClick={() => onChange({ ...model, vehicleType: vt.value, isNewDesign: true })}
                className={`pixel-btn p-2 ${selected ? "pixel-btn-pink" : ""}`}
                style={{ fontFamily: body }}
              >
                <div style={{ fontSize: "1rem", color: selected ? "var(--px-bg)" : "var(--px-white)" }}>{vt.label}</div>
                <div style={{ fontSize: "0.8rem", color: selected ? "rgba(0,0,0,0.55)" : "var(--px-gray)", marginTop: "0.1rem" }}>
                  {fmt(vt.base)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Engine */}
      <div>
        <label className="pixel-label">Engine <Tooltip text="Propulsion quality. High Performance boosts demand. Cheap cuts unit cost but lowers brand perception." /></label>
        <div className="flex gap-2 flex-wrap">
          {ENGINE_OPTIONS.map((e) => (
            <button
              key={e.value}
              disabled={disabled}
              onClick={() => onChange({ ...model, engine: e.value })}
              className={`pixel-btn px-3 py-2 ${model.engine === e.value ? "pixel-btn-amber" : ""}`}
              style={{ fontFamily: body }}
            >
              <div style={{ fontSize: "1rem" }}>{e.label}</div>
              <div style={{ fontSize: "0.85rem", color: model.engine === e.value ? "rgba(0,0,0,0.5)" : "var(--px-gray)" }}>{e.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Internals */}
      <div>
        <label className="pixel-label">Internals <Tooltip text="Build quality and safety testing. Triple-Tested minimises recall risk. Low-Grade cuts cost but risks defects." /></label>
        <div className="flex gap-2 flex-wrap">
          {INTERNALS_OPTIONS.map((i) => (
            <button
              key={i.value}
              disabled={disabled}
              onClick={() => onChange({ ...model, internals: i.value })}
              className={`pixel-btn px-3 py-2 ${model.internals === i.value ? "pixel-btn-green" : ""}`}
              style={{ fontFamily: body }}
            >
              <div style={{ fontSize: "1rem" }}>{i.label}</div>
              <div style={{ fontSize: "0.85rem", color: model.internals === i.value ? "rgba(0,0,0,0.5)" : "var(--px-gray)" }}>{i.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Features */}
      <div>
        <label className="pixel-label">Features <Tooltip text="Optional amenities that raise unit cost and buyer willingness to pay a premium." /></label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FEATURE_OPTIONS.map((f) => {
            const selected = model.features.includes(f.value);
            return (
              <button
                key={f.value}
                disabled={disabled}
                onClick={() => toggleFeature(f.value)}
                className={`pixel-btn p-2 text-left ${selected ? "pixel-btn-cyan" : ""}`}
                style={{
                  fontFamily: body,
                  ...(selected ? {} : { background: "var(--px-bg-2)", color: "var(--px-gray)" }),
                }}
              >
                <div style={{ fontSize: "0.9rem", color: selected ? "var(--px-bg)" : "var(--px-white)", lineHeight: 1.2 }}>
                  {f.label}
                </div>
                <div style={{ fontSize: "0.8rem", color: selected ? "rgba(0,0,0,0.5)" : "var(--px-gray)", marginTop: "0.15rem" }}>
                  +{fmt(f.cost)} · {f.effect}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cost summary */}
      <div className="pixel-border p-3 flex items-center justify-between" style={{ borderColor: "var(--px-amber)" }}>
        <div>
          <span style={{ fontFamily: px, fontSize: "0.55rem", color: "var(--px-amber)" }}>EST. MFG COST / UNIT</span>
          <p style={{ fontFamily: body, fontSize: "0.85rem", color: "var(--px-gray)", marginTop: "0.15rem" }}>
            Set your sale price in the Production tab — aim well above this.
          </p>
        </div>
        <span style={{ fontFamily: px, fontSize: "0.75rem", color: "var(--px-amber)" }}>{fmt(unitCost)}</span>
      </div>

      <div className="pixel-border p-2 text-center" style={{ borderColor: "var(--px-pink)", background: "#1a000a" }}>
        <span style={{ fontFamily: px, fontSize: "0.45rem", color: "var(--px-pink)" }}>
          NEW DESIGN FEE: {fmt(engFee)} (one-time engineering)
        </span>
      </div>

      {!disabled && (
        <div className="flex justify-between items-center gap-3">
          <PixelButton variant="green" size="sm" onClick={onSave}>
            ✓ SAVE MODEL
          </PixelButton>
          <PixelButton variant="pink" size="sm" onClick={onRemove}>
            REMOVE MODEL
          </PixelButton>
        </div>
      )}
    </div>
  );
}

function emptyModel(roundNumber: number): VehicleModel {
  return {
    id: genId(),
    name: "",
    vehicleType: "SEDAN",
    engine: "reliable",
    internals: "mass_produced",
    features: [],
    isNewDesign: true,
    modelYear: roundNumber,
  };
}

export function VehicleSection({
  value,
  onChange,
  disabled = false,
  roundNumber = 1,
}: {
  value: VehicleSectionType;
  onChange: (v: VehicleSectionType) => void;
  disabled?: boolean;
  roundNumber?: number;
}) {
  // Which new-model cards are in edit mode (expanded)
  const [expandedNew, setExpandedNew] = useState<Set<string>>(
    () => new Set(value.models.filter((m) => m.isNewDesign).map((m) => m.id))
  );

  // Which inherited models have been unlocked for refresh editing
  const [refreshed, setRefreshed] = useState<Set<string>>(new Set());

  // Saved original specs for inherited models (for revert)
  const [originals, setOriginals] = useState<Record<string, VehicleModel>>({});

  const inheritedModels = value.models.filter((m) => !m.isNewDesign);
  const newModels = value.models.filter((m) => m.isNewDesign);

  function addNewModel() {
    const m = emptyModel(roundNumber);
    onChange({ ...value, models: [...value.models, m] });
    setExpandedNew((prev) => new Set([...prev, m.id]));
  }

  function updateModel(id: string, updated: VehicleModel) {
    onChange({ ...value, models: value.models.map((m) => (m.id === id ? updated : m)) });
  }

  function removeModel(id: string) {
    onChange({ ...value, models: value.models.filter((m) => m.id !== id) });
    setExpandedNew((prev) => { const next = new Set(prev); next.delete(id); return next; });
  }

  function saveNew(id: string) {
    setExpandedNew((prev) => { const next = new Set(prev); next.delete(id); return next; });
  }

  function editNew(id: string) {
    setExpandedNew((prev) => new Set([...prev, id]));
  }

  function startRefresh(model: VehicleModel) {
    setOriginals((prev) => ({ ...prev, [model.id]: { ...model } }));
    // Stamp modelYear on the model so the engine sees it as refreshed this round
    updateModel(model.id, { ...model, modelYear: roundNumber });
    setRefreshed((prev) => new Set([...prev, model.id]));
  }

  function saveRefresh(id: string) {
    setRefreshed((prev) => { const next = new Set(prev); next.delete(id); return next; });
  }

  function revertRefresh(id: string) {
    const original = originals[id];
    if (original) updateModel(id, original);
    setRefreshed((prev) => { const next = new Set(prev); next.delete(id); return next; });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="pixel-heading" style={{ fontSize: "0.8rem", color: "var(--px-cyan)" }}>
          YOUR FLEET
        </h2>
        {!disabled && (
          <PixelButton variant="pink" size="sm" onClick={addNewModel}>
            + NEW VEHICLE LINE
          </PixelButton>
        )}
      </div>

      {/* Inherited models from prior year */}
      {inheritedModels.length > 0 && (
        <div className="mb-5">
          <p style={{ fontFamily: px, fontSize: "0.38rem", color: "var(--px-gray)", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
            LAST YEAR&apos;S FLEET — click ⟳ REFRESH MODEL to upgrade a vehicle for this year
          </p>
          {inheritedModels.map((model) => {
            if (refreshed.has(model.id)) {
              return (
                <RefreshedModelForm
                  key={model.id}
                  model={model}
                  onChange={(m) => updateModel(model.id, m)}
                  onSave={() => saveRefresh(model.id)}
                  onRevert={() => revertRefresh(model.id)}
                  disabled={disabled}
                />
              );
            }
            return (
              <InheritedLockedCard
                key={model.id}
                model={model}
                onRefresh={() => startRefresh(model)}
                disabled={disabled}
                roundNumber={roundNumber}
              />
            );
          })}
        </div>
      )}

      {/* New vehicle lines designed this year */}
      {newModels.length > 0 && (
        <div>
          {inheritedModels.length > 0 && (
            <p style={{ fontFamily: px, fontSize: "0.38rem", color: "var(--px-gray)", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
              NEW VEHICLE LINES THIS YEAR
            </p>
          )}
          {newModels.map((model) => {
            const isOpen = !disabled && expandedNew.has(model.id);
            return (
              <div key={model.id}>
                {isOpen ? (
                  <NewModelForm
                    model={model}
                    onChange={(m) => updateModel(model.id, m)}
                    onRemove={() => removeModel(model.id)}
                    onSave={() => saveNew(model.id)}
                    disabled={disabled}
                  />
                ) : (
                  <NewModelSummary
                    model={model}
                    onEdit={() => editNew(model.id)}
                    onRemove={() => removeModel(model.id)}
                    disabled={disabled}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state — only shown in year 1 before any vehicles are added */}
      {value.models.length === 0 && (
        <div className="pixel-card text-center py-8" style={{ borderColor: "var(--px-gray)" }}>
          <p style={{ fontFamily: px, fontSize: "0.55rem", color: "var(--px-gray)" }}>
            NO VEHICLES DESIGNED YET
          </p>
          <p className="mt-2" style={{ fontFamily: body, fontSize: "1rem", color: "var(--px-gray)" }}>
            {disabled
              ? "CTO has not designed any vehicles yet."
              : "Click + NEW VEHICLE LINE to design your first vehicle."}
          </p>
        </div>
      )}
    </div>
  );
}
