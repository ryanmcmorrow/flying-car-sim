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
  { value: "touchscreen",       label: "Touchscreen",       cost: 800,   effect: "+1.2% price premium" },
  { value: "lane_assist",       label: "Lane Assist",       cost: 1_200, effect: "+2.0% price premium" },
  { value: "cameras",           label: "Cameras",           cost: 700,   effect: "+1.0% price premium" },
  { value: "speakers",          label: "Speakers",          cost: 600,   effect: "+1.0% price premium" },
  { value: "leather",           label: "Leather",           cost: 1_500, effect: "+2.2% price premium" },
  { value: "phone_integration", label: "Phone Sync",        cost: 1_000, effect: "+1.4% price premium" },
  { value: "virtual_assistant", label: "AI Assistant",      cost: 2_000, effect: "+2.5% price premium" },
  { value: "entertainment",     label: "Entertainment",     cost: 1_300, effect: "+1.8% price premium" },
];

function fmt(n: number) {
  return "$" + n.toLocaleString();
}

const VT_LABEL: Record<string, string> = Object.fromEntries(VEHICLE_TYPES.map((v) => [v.value, v.label]));
const ENG_LABEL: Record<string, string> = Object.fromEntries(ENGINE_OPTIONS.map((e) => [e.value, e.label]));
const INT_LABEL: Record<string, string> = Object.fromEntries(INTERNALS_OPTIONS.map((i) => [i.value, i.label]));

function ModelSummary({
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
  return (
    <div
      className="pixel-card mb-3"
      style={{ borderColor: "var(--px-green)", boxShadow: "4px 4px 0 #1d4a0a", cursor: disabled ? "default" : "pointer" }}
      onClick={disabled ? undefined : onEdit}
    >
      <div className="flex items-center justify-between gap-4">
        <div style={{ flex: 1 }}>
          <span style={{ fontFamily: px, fontSize: "0.55rem", color: "var(--px-green)" }}>✓ </span>
          <span style={{ fontFamily: px, fontSize: "0.55rem", color: "var(--px-white)" }}>
            {model.name || "(unnamed)"}
          </span>
          <div style={{ fontFamily: body, fontSize: "0.85rem", color: "var(--px-gray)", marginTop: "0.2rem" }}>
            {VT_LABEL[model.vehicleType] ?? model.vehicleType} · {ENG_LABEL[model.engine] ?? model.engine} · {INT_LABEL[model.internals] ?? model.internals}
            {model.features.length > 0 && ` · ${model.features.length} feature${model.features.length !== 1 ? "s" : ""}`}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: px, fontSize: "0.5rem", color: "var(--px-amber)" }}>{fmt(unitCost)}/unit mfg</div>
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

function ModelForm({
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
          <Tooltip text="Determines base manufacturing cost and which market segments you compete in. Each type draws demand from different buyer groups." />
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
        <label className="pixel-label">Engine <Tooltip text="Propulsion quality. High Performance boosts brand appeal and demand. Cheap cuts unit cost but lowers brand perception." /></label>
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
        <label className="pixel-label">Internals <Tooltip text="Build quality and safety testing level. Triple-Tested minimises recall risk. Low-Grade cuts cost but risks defects that can tank your reputation." /></label>
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
        <label className="pixel-label">Features <Tooltip text="Optional amenities that raise your unit cost but also raise buyer expectations — letting you charge more without losing sales. Buyers paying more for a well-equipped car won't penalise you for a higher price point. Stack them to justify a premium." /></label>
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
      <div
        className="pixel-border p-3 flex items-center justify-between"
        style={{ borderColor: "var(--px-amber)" }}
      >
        <div>
          <span style={{ fontFamily: px, fontSize: "0.55rem", color: "var(--px-amber)" }}>EST. MFG COST / UNIT</span>
          <p style={{ fontFamily: body, fontSize: "0.85rem", color: "var(--px-gray)", marginTop: "0.15rem" }}>
            Set your sale price in the Production tab — aim well above this.
          </p>
        </div>
        <span style={{ fontFamily: px, fontSize: "0.75rem", color: "var(--px-amber)" }}>
          {fmt(unitCost)}
        </span>
      </div>

      {model.isNewDesign && (
        <div
          className="pixel-border p-2 text-center"
          style={{ borderColor: "var(--px-pink)", background: "#1a000a" }}
        >
          <span style={{ fontFamily: px, fontSize: "0.45rem", color: "var(--px-pink)" }}>
            NEW DESIGN FEE: {fmt(engFee)} (one-time engineering)
          </span>
        </div>
      )}

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

function emptyModel(): VehicleModel {
  return {
    id: genId(),
    name: "",
    vehicleType: "SEDAN",
    engine: "reliable",
    internals: "mass_produced",
    features: [],
    isNewDesign: true,
  };
}

export function VehicleSection({
  value,
  onChange,
  disabled = false,
}: {
  value: VehicleSectionType;
  onChange: (v: VehicleSectionType) => void;
  disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(value.models.map((m) => m.id))
  );

  function addModel() {
    const m = emptyModel();
    onChange({ ...value, models: [...value.models, m] });
    setExpanded((prev) => new Set([...prev, m.id]));
  }

  function updateModel(id: string, updated: VehicleModel) {
    onChange({
      ...value,
      models: value.models.map((m) => (m.id === id ? updated : m)),
    });
  }

  function removeModel(id: string) {
    onChange({ ...value, models: value.models.filter((m) => m.id !== id) });
    setExpanded((prev) => { const next = new Set(prev); next.delete(id); return next; });
  }

  function collapseModel(id: string) {
    setExpanded((prev) => { const next = new Set(prev); next.delete(id); return next; });
  }

  function expandModel(id: string) {
    setExpanded((prev) => new Set([...prev, id]));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="pixel-heading" style={{ fontSize: "0.8rem", color: "var(--px-cyan)" }}>
          YOUR FLEET
        </h2>
        {!disabled && (
          <PixelButton variant="cyan" size="sm" onClick={addModel}>
            + DESIGN NEW MODEL
          </PixelButton>
        )}
      </div>

      {value.models.length === 0 && (
        <div className="pixel-card text-center py-8" style={{ borderColor: "var(--px-gray)" }}>
          <p style={{ fontFamily: px, fontSize: "0.55rem", color: "var(--px-gray)" }}>
            NO VEHICLES DESIGNED YET
          </p>
          <p className="mt-2" style={{ fontFamily: body, fontSize: "1rem", color: "var(--px-gray)" }}>
            {disabled
              ? "CTO has not designed any vehicles yet."
              : "Click + DESIGN NEW MODEL to add your first vehicle."}
          </p>
        </div>
      )}

      {value.models.map((model) => {
        const isOpen = !disabled && expanded.has(model.id);
        return (
          <div key={model.id}>
            {isOpen ? (
              <ModelForm
                model={model}
                onChange={(m) => updateModel(model.id, m)}
                onRemove={() => removeModel(model.id)}
                onSave={() => collapseModel(model.id)}
                disabled={disabled}
              />
            ) : (
              <ModelSummary
                model={model}
                onEdit={() => expandModel(model.id)}
                onRemove={() => removeModel(model.id)}
                disabled={disabled}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
