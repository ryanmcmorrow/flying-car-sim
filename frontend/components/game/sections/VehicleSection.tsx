"use client";

import { useState } from "react";
import { PixelButton } from "@/components/game/PixelButton";
import { computeModelUnitCost, computeEngineeringFee } from "@/lib/decision-utils";
import type { VehicleSection as VehicleSectionType, VehicleModel } from "@/types/decisions";

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

const VEHICLE_TYPES: { value: VehicleModel["vehicleType"]; label: string; base: number }[] = [
  { value: "COMPACT", label: "COMPACT", base: 42000 },
  { value: "SEDAN", label: "SEDAN", base: 52000 },
  { value: "SUV", label: "SUV", base: 68000 },
  { value: "TRUCK", label: "TRUCK", base: 72000 },
  { value: "SPORTS_CAR", label: "SPORTS CAR", base: 85000 },
];

const ENGINE_OPTIONS: { value: VehicleModel["engine"]; label: string; adder: number; desc: string }[] = [
  { value: "high_performance", label: "HIGH PERF", adder: 9000, desc: "+$9K/unit" },
  { value: "reliable", label: "RELIABLE", adder: 3500, desc: "+$3.5K/unit" },
  { value: "cheap", label: "CHEAP", adder: 0, desc: "+$0/unit" },
];

const INTERNALS_OPTIONS: { value: VehicleModel["internals"]; label: string; adder: number; desc: string }[] = [
  { value: "triple_tested", label: "TRIPLE-TESTED", adder: 5500, desc: "+$5.5K/unit" },
  { value: "mass_produced", label: "MASS PRODUCED", adder: 1200, desc: "+$1.2K/unit" },
  { value: "low_grade", label: "LOW-GRADE", adder: 0, desc: "+$0/unit" },
];

const FEATURE_OPTIONS: { value: VehicleModel["features"][number]; label: string; cost: number; effect: string }[] = [
  { value: "touchscreen", label: "TOUCHSCREEN", cost: 600, effect: "+1% demand" },
  { value: "lane_assist", label: "LANE ASSIST", cost: 900, effect: "+1.5% demand" },
  { value: "cameras", label: "CAMERAS", cost: 500, effect: "+1% demand" },
  { value: "speakers", label: "SPEAKERS", cost: 700, effect: "+0.5% demand" },
  { value: "leather", label: "LEATHER", cost: 1400, effect: "+2% demand" },
  { value: "phone_integration", label: "PHONE INTG", cost: 400, effect: "+1% demand" },
  { value: "virtual_assistant", label: "VIRTUAL ASST", cost: 1800, effect: "+2% demand" },
  { value: "entertainment", label: "ENTERTAIN", cost: 1100, effect: "+1.5% demand" },
];

function fmt(n: number) {
  return "$" + n.toLocaleString();
}

function ModelForm({
  model,
  onChange,
  onRemove,
  disabled,
}: {
  model: VehicleModel;
  onChange: (m: VehicleModel) => void;
  onRemove: () => void;
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
        <label className="pixel-label">MODEL NAME</label>
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
        <label className="pixel-label">VEHICLE TYPE</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {VEHICLE_TYPES.map((vt) => (
            <button
              key={vt.value}
              disabled={disabled}
              onClick={() =>
                onChange({ ...model, vehicleType: vt.value, isNewDesign: true })
              }
              className={`pixel-btn text-[0.45rem] p-2 ${
                model.vehicleType === vt.value
                  ? "pixel-btn-pink"
                  : ""
              }`}
            >
              <div>{vt.label}</div>
              <div style={{ fontSize: "0.4rem", color: "var(--px-amber)" }}>
                {fmt(vt.base)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Engine */}
      <div>
        <label className="pixel-label">ENGINE</label>
        <div className="flex gap-2 flex-wrap">
          {ENGINE_OPTIONS.map((e) => (
            <button
              key={e.value}
              disabled={disabled}
              onClick={() => onChange({ ...model, engine: e.value })}
              className={`pixel-btn text-[0.45rem] px-3 py-2 ${
                model.engine === e.value ? "pixel-btn-amber" : ""
              }`}
            >
              <div>{e.label}</div>
              <div style={{ fontSize: "0.4rem", color: "var(--px-cyan)" }}>{e.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Internals */}
      <div>
        <label className="pixel-label">INTERNALS</label>
        <div className="flex gap-2 flex-wrap">
          {INTERNALS_OPTIONS.map((i) => (
            <button
              key={i.value}
              disabled={disabled}
              onClick={() => onChange({ ...model, internals: i.value })}
              className={`pixel-btn text-[0.45rem] px-3 py-2 ${
                model.internals === i.value ? "pixel-btn-green" : ""
              }`}
            >
              <div>{i.label}</div>
              <div style={{ fontSize: "0.4rem", color: "var(--px-cyan)" }}>{i.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Features */}
      <div>
        <label className="pixel-label">FEATURES (STACKABLE)</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FEATURE_OPTIONS.map((f) => {
            const selected = model.features.includes(f.value);
            return (
              <button
                key={f.value}
                disabled={disabled}
                onClick={() => toggleFeature(f.value)}
                className={`pixel-btn text-[0.4rem] p-2 text-left ${
                  selected ? "pixel-btn-cyan" : ""
                }`}
                style={selected ? {} : { background: "var(--px-bg-2)", color: "var(--px-gray)" }}
              >
                <div style={{ color: selected ? "var(--px-bg)" : "var(--px-white)" }}>
                  {f.label}
                </div>
                <div style={{ fontSize: "0.35rem", color: selected ? "var(--px-bg)" : "var(--px-gray)" }}>
                  +{fmt(f.cost)} | {f.effect}
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
        <span style={{ fontFamily: "var(--font-pixel)", fontSize: "0.55rem", color: "var(--px-amber)" }}>
          EST. UNIT COST
        </span>
        <span style={{ fontFamily: "var(--font-pixel)", fontSize: "0.75rem", color: "var(--px-amber)" }}>
          {fmt(unitCost)}
        </span>
      </div>

      {model.isNewDesign && (
        <div
          className="pixel-border p-2 text-center"
          style={{ borderColor: "var(--px-pink)", background: "#1a000a" }}
        >
          <span style={{ fontFamily: "var(--font-pixel)", fontSize: "0.45rem", color: "var(--px-pink)" }}>
            NEW DESIGN FEE: {fmt(engFee)} (one-time engineering)
          </span>
        </div>
      )}

      {!disabled && (
        <div className="flex justify-end">
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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2
          className="pixel-heading"
          style={{ fontSize: "0.8rem", color: "var(--px-cyan)" }}
        >
          YOUR FLEET
        </h2>
        {!disabled && (
          <PixelButton variant="cyan" size="sm" onClick={addModel}>
            + DESIGN NEW MODEL
          </PixelButton>
        )}
      </div>

      {value.models.length === 0 && (
        <div
          className="pixel-card text-center py-8"
          style={{ borderColor: "var(--px-gray)" }}
        >
          <p
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "0.55rem",
              color: "var(--px-gray)",
            }}
          >
            NO VEHICLES DESIGNED YET
          </p>
          <p
            className="mt-2"
            style={{
              fontFamily: "var(--font-pixel-body)",
              fontSize: "1rem",
              color: "var(--px-gray)",
            }}
          >
            {disabled
              ? "CTO has not designed any vehicles yet."
              : "Click + DESIGN NEW MODEL to add your first vehicle."}
          </p>
        </div>
      )}

      {value.models.map((model) => {
        const isOpen = expanded.has(model.id) || !disabled;
        return (
          <div key={model.id}>
            {disabled ? (
              <div
                className="pixel-card mb-2 flex items-center justify-between"
                style={{ borderColor: "var(--px-gray)" }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-pixel)",
                    fontSize: "0.55rem",
                    color: "var(--px-white)",
                  }}
                >
                  {model.name || "(unnamed)"} — {model.vehicleType}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-pixel-body)",
                    fontSize: "1rem",
                    color: "var(--px-amber)",
                  }}
                >
                  {fmt(computeModelUnitCost(model))}/unit
                </span>
              </div>
            ) : (
              <ModelForm
                model={model}
                onChange={(m) => updateModel(model.id, m)}
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
