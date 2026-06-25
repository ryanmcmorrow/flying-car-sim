"use client";

import React from "react";
import { Tooltip } from "@/components/game/Tooltip";
import type { ManufacturingSection as ManufacturingSectionType, SpaceSize, FacilityRegion, Facility, VehicleModel } from "@/types/decisions";

// ── Constants ────────────────────────────────────────────────────────────────
const SPACE_OPTS = [
  { size: "small" as SpaceSize,  label: "SMALL",  capacity: 5_000,  buy: "$70M",  maintenance: "$6M/yr"  },
  { size: "medium" as SpaceSize, label: "MEDIUM", capacity: 20_000, buy: "$200M", maintenance: "$15M/yr" },
  { size: "large" as SpaceSize,  label: "LARGE",  capacity: 50_000, buy: "$500M", maintenance: "$40M/yr" },
] as const;

const CAPACITY: Record<SpaceSize, number> = { small: 5_000, medium: 20_000, large: 50_000 };

const REGIONS: { id: FacilityRegion; label: string; short: string }[] = [
  { id: "WEST_COAST", label: "WEST COAST", short: "WC" },
  { id: "NORTHEAST",  label: "NORTHEAST",  short: "NE" },
  { id: "SOUTHEAST",  label: "SOUTHEAST",  short: "SE" },
  { id: "MIDWEST",    label: "MIDWEST",    short: "MW" },
  { id: "SOUTHWEST",  label: "SOUTHWEST",  short: "SW" },
];

const px = "var(--font-pixel), monospace";
const body = "var(--font-pixel-body), monospace";

// ── Pixel art factory SVGs ───────────────────────────────────────────────────
function SmallFactory({ selected }: { selected: boolean }) {
  const c = selected ? "#00f5ff" : "#8888aa";
  return (
    <svg viewBox="0 0 64 52" style={{ width: 64, imageRendering: "pixelated" }} shapeRendering="crispEdges">
      {/* chimney */}
      <rect x="26" y="2" width="6" height="14" fill={c} opacity={0.7} />
      {/* smoke */}
      <rect x="24" y="0" width="4" height="2" fill={c} opacity={0.3} />
      {/* building */}
      <rect x="8" y="16" width="48" height="34" fill={selected ? "#0a2030" : "#0a0a18"} stroke={c} strokeWidth="2" />
      {/* windows */}
      {[[14,22],[30,22],[46,22],[14,36],[30,36],[46,36]].map(([x,y],i) => (
        <rect key={i} x={x} y={y} width="8" height="6" fill={selected ? "#00f5ff" : "#2a2a4a"} opacity={selected ? 0.6 : 0.4} />
      ))}
      {/* door */}
      <rect x="26" y="38" width="12" height="12" fill={selected ? "#006070" : "#1a1a30"} />
    </svg>
  );
}

function MediumFactory({ selected }: { selected: boolean }) {
  const c = selected ? "#00f5ff" : "#8888aa";
  return (
    <svg viewBox="0 0 80 60" style={{ width: 80, imageRendering: "pixelated" }} shapeRendering="crispEdges">
      {/* chimneys */}
      <rect x="14" y="2" width="6" height="18" fill={c} opacity={0.7} />
      <rect x="60" y="2" width="6" height="18" fill={c} opacity={0.7} />
      {/* smoke */}
      <rect x="12" y="0" width="4" height="2" fill={c} opacity={0.3} />
      <rect x="58" y="0" width="4" height="2" fill={c} opacity={0.3} />
      {/* main building */}
      <rect x="4" y="20" width="72" height="38" fill={selected ? "#0a2030" : "#0a0a18"} stroke={c} strokeWidth="2" />
      {/* windows row 1 */}
      {[[10,26],[28,26],[46,26],[64,26]].map(([x,y],i) => (
        <rect key={i} x={x} y={y} width="10" height="8" fill={selected ? "#00f5ff" : "#2a2a4a"} opacity={selected ? 0.6 : 0.4} />
      ))}
      {/* windows row 2 */}
      {[[10,40],[28,40],[46,40],[64,40]].map(([x,y],i) => (
        <rect key={`b${i}`} x={x} y={y} width="10" height="8" fill={selected ? "#00f5ff" : "#2a2a4a"} opacity={selected ? 0.4 : 0.3} />
      ))}
      {/* door */}
      <rect x="32" y="44" width="16" height="14" fill={selected ? "#006070" : "#1a1a30"} />
    </svg>
  );
}

function LargeFactory({ selected }: { selected: boolean }) {
  const c = selected ? "#00f5ff" : "#8888aa";
  return (
    <svg viewBox="0 0 100 68" style={{ width: 100, imageRendering: "pixelated" }} shapeRendering="crispEdges">
      {/* 3 chimneys */}
      {[[12,2],[46,2],[80,2]].map(([x,y],i) => (
        <rect key={i} x={x} y={y} width="6" height="20" fill={c} opacity={0.7} />
      ))}
      {/* smoke puffs */}
      {[10,44,78].map((x,i) => (
        <rect key={i} x={x} y={0} width="4" height="2" fill={c} opacity={0.3} />
      ))}
      {/* main building */}
      <rect x="2" y="22" width="96" height="44" fill={selected ? "#0a2030" : "#0a0a18"} stroke={c} strokeWidth="2" />
      {/* windows row 1 */}
      {[[8,28],[26,28],[44,28],[62,28],[80,28]].map(([x,y],i) => (
        <rect key={i} x={x} y={y} width="12" height="8" fill={selected ? "#00f5ff" : "#2a2a4a"} opacity={selected ? 0.7 : 0.4} />
      ))}
      {/* windows row 2 */}
      {[[8,42],[26,42],[44,42],[62,42],[80,42]].map(([x,y],i) => (
        <rect key={`b${i}`} x={x} y={y} width="12" height="8" fill={selected ? "#00f5ff" : "#2a2a4a"} opacity={selected ? 0.5 : 0.3} />
      ))}
      {/* door */}
      <rect x="40" y="52" width="20" height="14" fill={selected ? "#006070" : "#1a1a30"} />
    </svg>
  );
}

const FACTORY_ART: Record<SpaceSize, (p: { selected: boolean }) => React.ReactNode> = {
  small:  (p) => <SmallFactory  selected={p.selected} />,
  medium: (p) => <MediumFactory selected={p.selected} />,
  large:  (p) => <LargeFactory  selected={p.selected} />,
};

// ── Coverage map ─────────────────────────────────────────────────────────────
const MAP_CELLS = [
  { id: "WEST_COAST", label: "WC",  x:  0,  y:  0, w: 34, h: 88 },
  { id: "MIDWEST",    label: "MW",  x: 38,  y:  0, w: 82, h: 52 },
  { id: "NORTHEAST",  label: "NE",  x: 124, y:  0, w: 54, h: 52 },
  { id: "SOUTHWEST",  label: "SW",  x: 38,  y: 56, w: 66, h: 32 },
  { id: "SOUTHEAST",  label: "SE",  x: 108, y: 56, w: 70, h: 32 },
];

function CoverageMap({ covered }: { covered: Set<string> }) {
  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <p style={{ fontFamily: px, fontSize: "0.38rem", color: "var(--px-gray)", marginBottom: "0.3rem" }}>
        FACTORY COVERAGE
      </p>
      <svg viewBox="0 0 182 90" style={{ width: "100%", maxWidth: 300, imageRendering: "pixelated" }} shapeRendering="crispEdges">
        {MAP_CELLS.map(({ id, label, x, y, w, h }) => {
          const has = covered.has(id);
          return (
            <g key={id}>
              <rect x={x} y={y} width={w} height={h}
                fill={has ? "rgba(57,255,20,0.15)" : "rgba(255,0,110,0.08)"}
                stroke={has ? "var(--px-green)" : "var(--px-pink)"}
                strokeWidth={2} />
              <text x={x + w / 2} y={y + h / 2 - 4}
                textAnchor="middle" dominantBaseline="middle"
                fill={has ? "#39ff14" : "#ff006e"}
                style={{ fontFamily: px, fontSize: "6px" }}>
                {label}
              </text>
              <text x={x + w / 2} y={y + h / 2 + 8}
                textAnchor="middle" dominantBaseline="middle"
                fill={has ? "#39ff14" : "#ff006e"}
                style={{ fontFamily: "sans-serif", fontSize: "5px" }}>
                {has ? "✓ LOCAL" : "⚠ +$1.5K"}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function ManufacturingSection({
  value,
  currentFacilities = [],
  vehicleModels,
  onChange,
  disabled = false,
}: {
  value: ManufacturingSectionType;
  currentFacilities?: Array<{ region: string; size: string }>;
  vehicleModels: VehicleModel[];
  onChange: (v: ManufacturingSectionType) => void;
  disabled?: boolean;
}) {
  const newFacilities = value.newFacilities ?? [];

  // All active facilities = owned (from prior rounds) + new (this round)
  const allFacilities = [
    ...currentFacilities.map((f) => ({ ...f, isOwned: true })),
    ...newFacilities.map((f) => ({ ...f, isOwned: false })),
  ];
  const totalCapacity = allFacilities.reduce((s, f) => s + (CAPACITY[f.size as SpaceSize] ?? 0), 0);
  const totalUnits = (value.productionRuns ?? []).reduce((s, r) => s + (r.units || 0), 0);
  const capacityExceeded = totalUnits > totalCapacity;

  // New-facility form state
  const [addingSize, setAddingSize] = React.useState<SpaceSize | null>(null);
  const [addingRegion, setAddingRegion] = React.useState<FacilityRegion | null>(null);

  function commitNewFacility() {
    if (!addingSize || !addingRegion) return;
    const next: Facility = { region: addingRegion, size: addingSize };
    onChange({ ...value, newFacilities: [...newFacilities, next] });
    setAddingSize(null);
    setAddingRegion(null);
  }

  function removeNewFacility(idx: number) {
    onChange({ ...value, newFacilities: newFacilities.filter((_, i) => i !== idx) });
  }

  function setProductionRun(modelId: string, units: number) {
    const existing = (value.productionRuns ?? []).find((r) => r.modelId === modelId);
    const next = existing
      ? (value.productionRuns ?? []).map((r) => r.modelId === modelId ? { ...r, units } : r)
      : [...(value.productionRuns ?? []), { modelId, units }];
    onChange({ ...value, productionRuns: next });
  }

  function getUnits(modelId: string) {
    return (value.productionRuns ?? []).find((r) => r.modelId === modelId)?.units ?? 0;
  }

  return (
    <div className="space-y-6">
      {/* hide number spinners */}
      <style>{`input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}`}</style>

      <h2 className="pixel-heading" style={{ fontSize: "0.75rem", color: "var(--px-cyan)" }}>
        🏭 PRODUCTION FACILITIES <Tooltip text="Each facility adds production capacity and covers one region. Selling into a region with a local factory saves $1,500/unit in shipping. You own every factory you build — upfront price paid once, then annual maintenance." />
      </h2>

      {/* ── Coverage map ── */}
      <CoverageMap covered={new Set(allFacilities.map((f) => f.region))} />

      {/* ── Existing owned facilities ── */}
      {currentFacilities.length > 0 && (
        <div>
          <p style={{ fontFamily: px, fontSize: "0.42rem", color: "var(--px-green)", marginBottom: "0.4rem" }}>OWNED FACILITIES (AUTO-PERSIST)</p>
          <div className="space-y-2">
            {currentFacilities.map((f, i) => {
              const opt = SPACE_OPTS.find((o) => o.size === f.size);
              const reg = REGIONS.find((r) => r.id === f.region);
              return (
                <div key={i} className="pixel-card flex items-center gap-3" style={{ borderColor: "var(--px-green)", padding: "0.6rem 1rem" }}>
                  <div style={{ opacity: 0.7 }}>{FACTORY_ART[f.size as SpaceSize]?.({ selected: false })}</div>
                  <div className="flex-1">
                    <div style={{ fontFamily: px, fontSize: "0.42rem", color: "var(--px-green)" }}>{opt?.label ?? f.size.toUpperCase()} · {reg?.label ?? f.region}</div>
                    <div style={{ fontFamily: body, fontSize: "0.9rem", color: "var(--px-gray)" }}>{opt?.capacity.toLocaleString()} units · {opt?.maintenance}/yr maintenance</div>
                  </div>
                  <div style={{ fontFamily: px, fontSize: "0.38rem", color: "var(--px-green)", border: "2px solid var(--px-green)", padding: "0.2rem 0.4rem" }}> Owned</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── New facilities this round ── */}
      {newFacilities.length > 0 && (
        <div>
          <p style={{ fontFamily: px, fontSize: "0.42rem", color: "var(--px-cyan)", marginBottom: "0.4rem" }}>New this round</p>
          <div className="space-y-2">
            {newFacilities.map((f, i) => {
              const opt = SPACE_OPTS.find((o) => o.size === f.size);
              const reg = REGIONS.find((r) => r.id === f.region);
              return (
                <div key={i} className="pixel-card flex items-center gap-3" style={{ borderColor: "var(--px-amber)", padding: "0.6rem 1rem" }}>
                  <div>{FACTORY_ART[f.size as SpaceSize]?.({ selected: true })}</div>
                  <div className="flex-1">
                    <div style={{ fontFamily: px, fontSize: "0.42rem", color: "var(--px-cyan)" }}>{opt?.label ?? f.size.toUpperCase()} · {reg?.label ?? f.region}</div>
                    <div style={{ fontFamily: body, fontSize: "0.9rem", color: "var(--px-gray)" }}>
                      {opt?.capacity.toLocaleString()} units · {opt?.buy} purchase · {opt?.maintenance} ongoing
                    </div>
                  </div>
                  <div style={{ fontFamily: px, fontSize: "0.38rem", color: "var(--px-amber)", border: "2px solid var(--px-amber)", padding: "0.2rem 0.4rem" }}>
                    OWNED
                  </div>
                  {!disabled && (
                    <button onClick={() => removeNewFacility(i)} style={{ fontFamily: px, fontSize: "0.4rem", color: "var(--px-pink)", border: "2px solid var(--px-pink)", padding: "0.2rem 0.4rem", background: "transparent", cursor: "pointer" }}>✕</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Add facility flow ── */}
      {!disabled && (
        <div className="pixel-card" style={{ borderColor: "var(--px-gray)", padding: "1rem" }}>
          <p style={{ fontFamily: px, fontSize: "0.45rem", color: "var(--px-white)", marginBottom: "0.75rem" }}>
            + ADD FACILITY
          </p>

          {/* Step 1: pick size */}
          <p style={{ fontFamily: px, fontSize: "0.38rem", color: "var(--px-gray)", marginBottom: "0.4rem" }}>STEP 1 — PICK SIZE</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem" }}>
            {SPACE_OPTS.map((opt) => {
              const sel = addingSize === opt.size;
              return (
                <button
                  key={opt.size}
                  onClick={() => setAddingSize(opt.size)}
                  style={{
                    border: `3px solid ${sel ? "var(--px-cyan)" : "var(--px-gray)"}`,
                    background: sel ? "rgba(0,245,255,0.08)" : "var(--px-bg-2)",
                    padding: "0.75rem 0.5rem",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  {FACTORY_ART[opt.size]?.({ selected: sel })}
                  <div style={{ fontFamily: px, fontSize: "0.42rem", color: sel ? "var(--px-cyan)" : "var(--px-white)" }}>{opt.label}</div>
                  <div style={{ fontFamily: body, fontSize: "0.85rem", color: "var(--px-gray)" }}>{opt.capacity.toLocaleString()} units</div>
                  <div style={{ fontFamily: body, fontSize: "0.8rem", color: "var(--px-amber)" }}>{opt.buy} to build</div>
                  <div style={{ fontFamily: body, fontSize: "0.8rem", color: "var(--px-gray)" }}>{opt.maintenance} maintenance</div>
                </button>
              );
            })}
          </div>

          {/* Step 2: pick region */}
          {addingSize && (
            <>
              <p style={{ fontFamily: px, fontSize: "0.38rem", color: "var(--px-gray)", marginBottom: "0.4rem" }}>STEP 2 — PICK REGION</p>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                {REGIONS.map((r) => {
                  const sel = addingRegion === r.id;
                  return (
                    <button key={r.id} onClick={() => setAddingRegion(r.id)} style={{ fontFamily: px, fontSize: "0.38rem", padding: "0.35rem 0.65rem", border: `2px solid ${sel ? "var(--px-cyan)" : "var(--px-gray)"}`, background: sel ? "rgba(0,245,255,0.08)" : "var(--px-bg-2)", color: sel ? "var(--px-cyan)" : "var(--px-white)", cursor: "pointer" }}>
                      {r.label}
                    </button>
                  );
                })}
              </div>
              {addingRegion && (
                <button onClick={commitNewFacility} className="pixel-btn pixel-btn-green" style={{ fontFamily: px, fontSize: "0.45rem" }}>
                  ▶ BUILD FACTORY
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Capacity summary ── */}
      <div className="pixel-border p-3 flex items-center justify-between" style={{ borderColor: totalCapacity === 0 ? "var(--px-gray)" : "var(--px-cyan)" }}>
        <span style={{ fontFamily: px, fontSize: "0.5rem", color: "var(--px-cyan)" }}>Total capacity</span>
        <span style={{ fontFamily: px, fontSize: "0.65rem", color: totalCapacity === 0 ? "var(--px-gray)" : "var(--px-green)" }}>
          {totalCapacity.toLocaleString()} UNITS
        </span>
      </div>

      {/* ── Production Runs ── */}
      <div>
        <h2 className="pixel-heading mb-3" style={{ fontSize: "0.75rem", color: "var(--px-cyan)" }}>
          PRODUCTION RUNS <Tooltip text="How many units of each model to build this year. Total cannot exceed your combined facility capacity. Unsold units carry into next year as inventory." />
        </h2>

        {vehicleModels.length === 0 ? (
          <div className="pixel-card text-center py-6" style={{ borderColor: "var(--px-gray)" }}>
            <p style={{ fontFamily: px, fontSize: "0.5rem", color: "var(--px-gray)" }}>CTO must design vehicles first</p>
          </div>
        ) : (
          <div className="space-y-3">
            {vehicleModels.map((model) => {
              const units = getUnits(model.id);
              return (
                <div key={model.id} className="pixel-card flex items-center gap-4" style={{ borderColor: "var(--px-cyan)", padding: "0.75rem 1rem" }}>
                  <div className="flex-1">
                    <div style={{ fontFamily: px, fontSize: "0.5rem", color: "var(--px-cyan)" }}>{model.name || "(unnamed)"}</div>
                    <div style={{ fontFamily: body, fontSize: "0.9rem", color: "var(--px-gray)" }}>{model.vehicleType}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label style={{ fontFamily: px, fontSize: "0.4rem", color: "var(--px-amber)" }}>UNITS:</label>
                    <input
                      type="number"
                      min={0}
                      value={units || ""}
                      placeholder="0"
                      disabled={disabled}
                      onChange={(e) => setProductionRun(model.id, parseInt(e.target.value) || 0)}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="pixel-input"
                      style={{ width: 100 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Capacity usage bar */}
        <div className="pixel-border p-3 flex items-center justify-between mt-3" style={{ borderColor: capacityExceeded ? "var(--px-pink)" : "var(--px-amber)" }}>
          <span style={{ fontFamily: px, fontSize: "0.5rem", color: capacityExceeded ? "var(--px-pink)" : "var(--px-amber)" }}>Total production</span>
          <span style={{ fontFamily: px, fontSize: "0.65rem", color: capacityExceeded ? "var(--px-pink)" : "var(--px-green)" }}>
            {totalUnits.toLocaleString()} / {totalCapacity.toLocaleString()} UNITS
          </span>
        </div>
        {capacityExceeded && (
          <p style={{ fontFamily: px, fontSize: "0.45rem", color: "var(--px-pink)", marginTop: "0.25rem" }}>
            CAPACITY EXCEEDED — add more facilities or reduce production runs
          </p>
        )}
      </div>
    </div>
  );
}
