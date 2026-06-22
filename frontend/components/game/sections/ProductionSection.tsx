"use client";

import { Tooltip } from "@/components/game/Tooltip";
import { computeModelUnitCost } from "@/lib/decision-utils";
import { VEHICLE_PRICE_RANGE } from "@/lib/engine/constants";
import type { ProductionSection as ProductionSectionType } from "@/types/decisions";
import type { VehicleModel } from "@/types/decisions";

const REGIONS = [
  { key: "WEST_COAST", label: "WEST COAST", share: "26%", sensitivity: "LOW"  },
  { key: "NORTHEAST",  label: "NORTHEAST",  share: "24%", sensitivity: "HIGH" },
  { key: "SOUTHEAST",  label: "SOUTHEAST",  share: "20%", sensitivity: "MED"  },
  { key: "MIDWEST",    label: "MIDWEST",    share: "18%", sensitivity: "MED"  },
  { key: "SOUTHWEST",  label: "SOUTHWEST",  share: "12%", sensitivity: "LOW"  },
] as const;

type RegionKey = (typeof REGIONS)[number]["key"];
type RegionAllocation = Record<RegionKey, number>;

const SHIPPING_COST_PER_UNIT = 1_500;




function emptyAllocation(): RegionAllocation {
  return { WEST_COAST: 20, NORTHEAST: 20, SOUTHEAST: 20, MIDWEST: 20, SOUTHWEST: 20 };
}

const px = "var(--font-pixel), monospace";
const body = "var(--font-pixel-body), monospace";

function fmtM(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

type InventoryItem = { modelName: string; vehicleType: string; unitCost: number; salePrice: number; unitsLeftInInventory: number; fromRound: number };

export function ProductionSection({
  value,
  vehicleModels,
  currentFacilities = [],
  flyingMedians = null,
  inventoryItems = null,
  onChange,
  disabled = false,
}: {
  value: ProductionSectionType;
  vehicleModels: VehicleModel[];
  currentFacilities?: Array<{ region: string; size: string }>;
  flyingMedians?: Record<string, number> | null;
  inventoryItems?: InventoryItem[] | null;
  onChange: (v: ProductionSectionType) => void;
  disabled?: boolean;
}) {
  const coveredRegions = new Set(currentFacilities.map((f) => f.region));

  function getOrCreateModel(modelId: string) {
    return (
      value.models.find((m) => m.modelId === modelId) ?? {
        modelId,
        salePrice: 0,
        inventoryDiscount: 0,
        regionalAllocation: emptyAllocation(),
      }
    );
  }

  function updateModel(modelId: string, patch: Partial<ProductionSectionType["models"][number]>) {
    const existing = getOrCreateModel(modelId);
    const updated = { ...existing, ...patch };
    const rest = value.models.filter((m) => m.modelId !== modelId);
    onChange({ ...value, models: [...rest, updated] });
  }

  function setAlloc(modelId: string, region: RegionKey, pct: number) {
    const existing = getOrCreateModel(modelId);
    const alloc = { ...existing.regionalAllocation, [region]: Math.max(0, Math.min(100, pct)) };
    updateModel(modelId, { regionalAllocation: alloc as RegionAllocation });
  }

  function toggleRegion(modelId: string, region: RegionKey, currentPct: number) {
    const existing = getOrCreateModel(modelId);
    const alloc = { ...existing.regionalAllocation };
    if (currentPct > 0) {
      // Disable: zero it out
      alloc[region] = 0;
    } else {
      // Enable: give it an equal share of what's left
      const enabledCount = REGIONS.filter((r) => alloc[r.key] > 0).length;
      const share = Math.floor(100 / (enabledCount + 1));
      alloc[region] = share;
    }
    updateModel(modelId, { regionalAllocation: alloc as RegionAllocation });
  }

  function distributeEvenly(modelId: string) {
    const existing = getOrCreateModel(modelId);
    const enabled = REGIONS.filter((r) => (existing.regionalAllocation[r.key] ?? 0) > 0).map((r) => r.key);
    if (enabled.length === 0) return;
    const base = Math.floor(100 / enabled.length);
    const rem = 100 - base * enabled.length;
    const alloc = { ...existing.regionalAllocation };
    REGIONS.forEach((r) => { alloc[r.key] = 0; });
    enabled.forEach((k, i) => { alloc[k] = base + (i === 0 ? rem : 0); });
    updateModel(modelId, { regionalAllocation: alloc as RegionAllocation });
  }

  return (
    <div className="space-y-6">
      {/* hide number spinners */}
      <style>{`input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}`}</style>

      <h2 className="pixel-heading" style={{ fontSize: "0.8rem", color: "var(--px-green)" }}>
        PRICING & ALLOCATION
      </h2>

      {vehicleModels.length === 0 ? (
        <div className="pixel-card text-center py-8" style={{ borderColor: "var(--px-gray)" }}>
          <p style={{ fontFamily: px, fontSize: "0.5rem", color: "var(--px-gray)" }}>CTO must design vehicles first</p>
        </div>
      ) : (
        vehicleModels.map((model) => {
          const m = getOrCreateModel(model.id);
          const unitCost = computeModelUnitCost(model);
          const margin = m.salePrice > 0 ? (((m.salePrice - unitCost) / m.salePrice) * 100).toFixed(1) : null;
          const allocTotal = REGIONS.reduce((s, r) => s + (m.regionalAllocation[r.key] ?? 0), 0);
          const allocValid = Math.abs(allocTotal - 100) < 0.1;

          // Estimate shipping cost (rough: assume production = 1000 units for preview)
          const activeRegions = REGIONS.filter((r) => (m.regionalAllocation[r.key] ?? 0) > 0);
          const uncoveredActiveRegions = activeRegions.filter((r) => !coveredRegions.has(r.key));
          const hasShippingExposure = uncoveredActiveRegions.length > 0;

          return (
            <div key={model.id} className="pixel-card pixel-card-green space-y-4">
              <div>
                <p style={{ fontFamily: px, fontSize: "0.55rem", color: "var(--px-green)" }}>
                  {model.name || "(unnamed)"} — {model.vehicleType}
                </p>
                <p style={{ fontFamily: body, fontSize: "1rem", color: "var(--px-gray)" }}>
                  Unit cost: ${unitCost.toLocaleString()}
                </p>
              </div>

              {/* Sale Price */}
              <div>
                <label className="pixel-label">
                  SALE PRICE ($) <Tooltip text="Your retail price per unit. Higher price means more profit margin but lower demand. Set below unit cost and you lose money on every sale." />
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    value={m.salePrice || ""}
                    disabled={disabled}
                    placeholder={`e.g. ${Math.round(unitCost * 1.8).toLocaleString()}`}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => updateModel(model.id, { salePrice: parseInt(e.target.value) || 0 })}
                    className="pixel-input"
                    style={{ maxWidth: 200 }}
                  />
                  {margin !== null && (
                    <span style={{ fontFamily: px, fontSize: "0.5rem", color: parseFloat(margin) >= 0 ? "var(--px-green)" : "var(--px-pink)" }}>
                      MARGIN: {margin}%
                    </span>
                  )}
                </div>
                {flyingMedians?.[model.vehicleType] ? (
                  <div style={{ marginTop: "0.35rem" }}>
                    <span style={{ fontFamily: px, fontSize: "0.35rem", color: "var(--px-cyan)" }}>FLYING CAR {model.vehicleType.replace("_", " ")} MEDIAN (LAST YR)</span>
                    <p style={{ fontFamily: body, fontSize: "0.95rem", color: "var(--px-cyan)" }}>${flyingMedians[model.vehicleType].toLocaleString()}</p>
                  </div>
                ) : (() => {
                  const range = VEHICLE_PRICE_RANGE[model.vehicleType as keyof typeof VEHICLE_PRICE_RANGE];
                  const [lo, hi] = range ? [range.low, range.high] : [0, 0];
                  return (
                    <div style={{ marginTop: "0.35rem" }}>
                      <span style={{ fontFamily: px, fontSize: "0.35rem", color: "var(--px-gray)" }}>ANALYST FORECAST — {model.vehicleType.replace("_", " ")} SEGMENT</span>
                      <p style={{ fontFamily: body, fontSize: "0.95rem", color: "#cccccc" }}>${lo.toLocaleString()} – ${hi.toLocaleString()}</p>
                    </div>
                  );
                })()}
                {margin !== null && parseFloat(margin) < 0 && (
                  <div style={{ background: "rgba(255,0,110,0.08)", border: "2px solid var(--px-pink)", padding: "0.4rem 0.75rem", marginTop: "0.4rem" }}>
                    <span style={{ fontFamily: px, fontSize: "0.38rem", color: "var(--px-pink)" }}>
                      ⚠ NEGATIVE MARGIN — selling below unit cost
                    </span>
                    <p style={{ fontFamily: body, fontSize: "0.85rem", color: "var(--px-gray)", marginTop: "0.15rem" }}>
                      You lose money on every unit sold. This is a valid strategy (grab share, burn rivals) but make sure you have the cash.
                    </p>
                  </div>
                )}
              </div>

              {/* Inventory discount — round 2+ only */}
              {inventoryItems !== null && (() => {
                const modelType = model.vehicleType;
                const relevantInv = inventoryItems.filter((i) => i.vehicleType === modelType);
                const totalUnits = relevantInv.reduce((s, i) => s + i.unitsLeftInInventory, 0);
                if (totalUnits === 0) return null;
                return (
                  <div>
                    <label className="pixel-label">
                      INVENTORY DISCOUNT % <Tooltip text="Slash prices on leftover inventory from prior years. 0% = full price. Max 50% off. Applies only to units already built." />
                    </label>

                    {/* Per-model inventory rows */}
                    <div className="space-y-1 mb-3">
                      {relevantInv.map((inv, idx) => {
                        const discountedPrice = Math.round(inv.salePrice * (1 - (m.inventoryDiscount ?? 0) / 100));
                        return (
                          <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: "0.75rem", alignItems: "center", padding: "0.4rem 0.6rem", background: "rgba(255,190,11,0.04)", border: "1px solid rgba(255,190,11,0.2)" }}>
                            <div>
                              <div style={{ fontFamily: px, fontSize: "0.4rem", color: "var(--px-amber)" }}>{inv.modelName}</div>
                              <div style={{ fontFamily: body, fontSize: "0.8rem", color: "var(--px-gray)" }}>Yr {inv.fromRound} · {inv.unitsLeftInInventory.toLocaleString()} units</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontFamily: px, fontSize: "0.32rem", color: "var(--px-gray)" }}>MFG COST</div>
                              <div style={{ fontFamily: body, fontSize: "0.85rem", color: "var(--px-gray)" }}>${inv.unitCost.toLocaleString()}</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontFamily: px, fontSize: "0.32rem", color: "var(--px-gray)" }}>ORIG PRICE</div>
                              <div style={{ fontFamily: body, fontSize: "0.85rem", color: "#cccccc" }}>${inv.salePrice.toLocaleString()}</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontFamily: px, fontSize: "0.32rem", color: "var(--px-cyan)" }}>NEW PRICE</div>
                              <div style={{ fontFamily: body, fontSize: "0.85rem", color: "var(--px-cyan)" }}>${discountedPrice.toLocaleString()}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={m.inventoryDiscount || ""}
                        placeholder="0"
                        disabled={disabled}
                        onWheel={(e) => e.currentTarget.blur()}
                        onChange={(e) => updateModel(model.id, { inventoryDiscount: Math.min(50, Math.max(0, parseInt(e.target.value) || 0)) })}
                        className="pixel-input"
                        style={{ width: 80 }}
                      />
                      <span style={{ fontFamily: body, fontSize: "1rem", color: "var(--px-gray)" }}>% off (0–50)</span>
                    </div>
                  </div>
                );
              })()}

              {/* Regional targeting */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="pixel-label" style={{ marginBottom: 0 }}>
                    REGIONAL SALES TARGETS <Tooltip text="Choose which regions to ship this model to. Toggle regions on/off. Selling in a region where you have a factory saves $1,500/unit in shipping costs. Total allocation must equal 100%." />
                  </label>
                  {!disabled && (
                    <button
                      onClick={() => distributeEvenly(model.id)}
                      style={{ fontFamily: px, fontSize: "0.35rem", color: "var(--px-cyan)", border: "2px solid var(--px-cyan)", padding: "0.2rem 0.5rem", background: "transparent", cursor: "pointer" }}
                    >
                      SPLIT EVENLY
                    </button>
                  )}
                </div>

                {/* Shipping cost banner */}
                {hasShippingExposure && (
                  <div style={{ background: "rgba(255,190,11,0.08)", border: "2px solid var(--px-amber)", padding: "0.4rem 0.75rem", marginBottom: "0.5rem" }}>
                    <span style={{ fontFamily: px, fontSize: "0.38rem", color: "var(--px-amber)" }}>
                      ⚠ +${SHIPPING_COST_PER_UNIT.toLocaleString()}/UNIT SHIPPING on {uncoveredActiveRegions.map(r => r.label).join(", ")}
                    </span>
                    <p style={{ fontFamily: body, fontSize: "0.85rem", color: "var(--px-gray)", marginTop: "0.15rem" }}>
                      Add a factory in those regions (COO tab) to eliminate this cost.
                    </p>
                  </div>
                )}
                {!hasShippingExposure && activeRegions.length > 0 && (
                  <div style={{ background: "rgba(57,255,20,0.06)", border: "2px solid var(--px-green)", padding: "0.4rem 0.75rem", marginBottom: "0.5rem" }}>
                    <span style={{ fontFamily: px, fontSize: "0.38rem", color: "var(--px-green)" }}>
                      ✓ ALL TARGET REGIONS COVERED — NO SHIPPING SURCHARGE
                    </span>
                  </div>
                )}

                <div className="space-y-1">
                  {REGIONS.map((region) => {
                    const pct = m.regionalAllocation[region.key] ?? 0;
                    const isActive = pct > 0;
                    const hasFactory = coveredRegions.has(region.key);

                    return (
                      <div
                        key={region.key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.4rem 0.6rem",
                          border: `2px solid ${isActive ? "var(--px-cyan)" : "var(--px-bg-2)"}`,
                          background: isActive ? "rgba(0,245,255,0.04)" : "var(--px-bg-2)",
                          opacity: isActive ? 1 : 0.5,
                        }}
                      >
                        {/* Toggle */}
                        <button
                          disabled={disabled}
                          onClick={() => toggleRegion(model.id, region.key, pct)}
                          style={{
                            width: 20, height: 20, flexShrink: 0,
                            border: `2px solid ${isActive ? "var(--px-cyan)" : "var(--px-gray)"}`,
                            background: isActive ? "var(--px-cyan)" : "transparent",
                            cursor: disabled ? "default" : "pointer",
                          }}
                        />

                        {/* Region name + info */}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: px, fontSize: "0.4rem", color: isActive ? "var(--px-cyan)" : "var(--px-gray)" }}>
                            {region.label}
                          </div>
                          <div style={{ fontFamily: body, fontSize: "0.8rem", color: "var(--px-gray)" }}>
                            {region.share} of market · {region.sensitivity} price sensitivity
                          </div>
                        </div>

                        {/* Factory badge */}
                        <div style={{
                          fontFamily: px, fontSize: "0.32rem", padding: "0.2rem 0.4rem",
                          border: `2px solid ${hasFactory ? "var(--px-green)" : "var(--px-amber)"}`,
                          color: hasFactory ? "var(--px-green)" : "var(--px-amber)",
                          flexShrink: 0,
                          whiteSpace: "nowrap",
                        }}>
                          {hasFactory ? "✓ LOCAL" : `+$${SHIPPING_COST_PER_UNIT.toLocaleString()}/unit`}
                        </div>

                        {/* % input */}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", flexShrink: 0 }}>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={pct || ""}
                            disabled={disabled}
                            placeholder="0"
                            onWheel={(e) => e.currentTarget.blur()}
                            onChange={(e) => setAlloc(model.id, region.key, parseInt(e.target.value) || 0)}
                            className="pixel-input"
                            style={{ width: 60, opacity: isActive ? 1 : 0.3 }}
                          />
                          <span style={{ fontFamily: body, fontSize: "0.9rem", color: "var(--px-gray)" }}>%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Allocation total */}
                <div
                  className="flex items-center justify-between mt-2 p-2"
                  style={{
                    border: `2px solid ${allocValid ? "var(--px-green)" : "var(--px-pink)"}`,
                    background: allocValid ? "rgba(57,255,20,0.05)" : "rgba(255,0,110,0.05)",
                  }}
                >
                  <span style={{ fontFamily: px, fontSize: "0.42rem", color: allocValid ? "var(--px-green)" : "var(--px-pink)" }}>
                    TOTAL ALLOCATION
                  </span>
                  <span style={{ fontFamily: px, fontSize: "0.55rem", color: allocValid ? "var(--px-green)" : "var(--px-pink)" }}>
                    {allocTotal}% {allocValid ? "✓" : "(MUST = 100%)"}
                  </span>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
