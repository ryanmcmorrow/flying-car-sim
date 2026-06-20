"use client";

import { computeModelUnitCost } from "@/lib/decision-utils";
import type { ProductionSection as ProductionSectionType } from "@/types/decisions";
import type { VehicleModel } from "@/types/decisions";

const REGIONS = [
  { key: "WEST_COAST", label: "WEST COAST", share: "26%", sensitivity: "LOW" },
  { key: "NORTHEAST", label: "NORTHEAST", share: "24%", sensitivity: "HIGH" },
  { key: "SOUTHEAST", label: "SOUTHEAST", share: "20%", sensitivity: "MED" },
  { key: "MIDWEST", label: "MIDWEST", share: "18%", sensitivity: "MED" },
  { key: "SOUTHWEST", label: "SOUTHWEST", share: "12%", sensitivity: "LOW" },
] as const;

type RegionKey = (typeof REGIONS)[number]["key"];

type RegionAllocation = Record<RegionKey, number>;

function emptyAllocation(): RegionAllocation {
  return {
    WEST_COAST: 20,
    NORTHEAST: 20,
    SOUTHEAST: 20,
    MIDWEST: 20,
    SOUTHWEST: 20,
  };
}

export function ProductionSection({
  value,
  vehicleModels,
  onChange,
  disabled = false,
}: {
  value: ProductionSectionType;
  vehicleModels: VehicleModel[];
  onChange: (v: ProductionSectionType) => void;
  disabled?: boolean;
}) {
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

  function updateModel(
    modelId: string,
    patch: Partial<ProductionSectionType["models"][number]>
  ) {
    const existing = getOrCreateModel(modelId);
    const updated = { ...existing, ...patch };
    const rest = value.models.filter((m) => m.modelId !== modelId);
    onChange({ ...value, models: [...rest, updated] });
  }

  function updateAllocation(modelId: string, region: RegionKey, pct: number) {
    const existing = getOrCreateModel(modelId);
    const alloc = { ...existing.regionalAllocation, [region]: pct };
    updateModel(modelId, { regionalAllocation: alloc as RegionAllocation });
  }

  return (
    <div className="space-y-6">
      <h2
        className="pixel-heading"
        style={{ fontSize: "0.8rem", color: "var(--px-green)" }}
      >
        PRICING & ALLOCATION
      </h2>

      {vehicleModels.length === 0 ? (
        <div
          className="pixel-card text-center py-8"
          style={{ borderColor: "var(--px-gray)" }}
        >
          <p
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "0.5rem",
              color: "var(--px-gray)",
            }}
          >
            CTO MUST DESIGN VEHICLES FIRST
          </p>
        </div>
      ) : (
        vehicleModels.map((model) => {
          const m = getOrCreateModel(model.id);
          const unitCost = computeModelUnitCost(model);
          const margin =
            m.salePrice > 0
              ? (((m.salePrice - unitCost) / m.salePrice) * 100).toFixed(1)
              : null;
          const allocTotal = REGIONS.reduce(
            (sum, r) => sum + (m.regionalAllocation[r.key] ?? 0),
            0
          );
          const allocValid = Math.abs(allocTotal - 100) < 0.1;

          return (
            <div
              key={model.id}
              className="pixel-card pixel-card-green space-y-4"
            >
              <div>
                <p
                  style={{
                    fontFamily: "var(--font-pixel)",
                    fontSize: "0.55rem",
                    color: "var(--px-green)",
                  }}
                >
                  {model.name || "(unnamed)"} — {model.vehicleType}
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-pixel-body)",
                    fontSize: "1rem",
                    color: "var(--px-gray)",
                  }}
                >
                  Unit cost: ${unitCost.toLocaleString()}
                </p>
              </div>

              {/* Sale Price */}
              <div>
                <label className="pixel-label">SALE PRICE ($)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    value={m.salePrice || ""}
                    disabled={disabled}
                    placeholder="Enter sale price..."
                    onChange={(e) =>
                      updateModel(model.id, {
                        salePrice: parseInt(e.target.value) || 0,
                      })
                    }
                    className="pixel-input"
                    style={{ maxWidth: 200 }}
                  />
                  {margin !== null && (
                    <span
                      style={{
                        fontFamily: "var(--font-pixel)",
                        fontSize: "0.5rem",
                        color:
                          parseFloat(margin) >= 0
                            ? "var(--px-green)"
                            : "var(--px-pink)",
                      }}
                    >
                      MARGIN: {margin}%
                    </span>
                  )}
                </div>
              </div>

              {/* Inventory discount (Year 1: not relevant but show UI) */}
              <div>
                <label className="pixel-label">
                  INVENTORY DISCOUNT % (Prior-year stock)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={m.inventoryDiscount}
                    disabled={disabled}
                    onChange={(e) =>
                      updateModel(model.id, {
                        inventoryDiscount: Math.min(
                          50,
                          Math.max(0, parseInt(e.target.value) || 0)
                        ),
                      })
                    }
                    className="pixel-input"
                    style={{ width: 80 }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-pixel-body)",
                      fontSize: "1rem",
                      color: "var(--px-gray)",
                    }}
                  >
                    % (0–50)
                  </span>
                </div>
              </div>

              {/* Regional Allocation */}
              <div>
                <label className="pixel-label">REGIONAL ALLOCATION (%)</label>
                <div className="space-y-2">
                  {REGIONS.map((region) => {
                    const pct = m.regionalAllocation[region.key] ?? 0;
                    return (
                      <div key={region.key} className="flex items-center gap-3">
                        <div style={{ width: 120 }}>
                          <div
                            style={{
                              fontFamily: "var(--font-pixel)",
                              fontSize: "0.42rem",
                              color: "var(--px-cyan)",
                            }}
                          >
                            {region.label}
                          </div>
                          <div
                            style={{
                              fontFamily: "var(--font-pixel-body)",
                              fontSize: "0.85rem",
                              color: "var(--px-gray)",
                            }}
                          >
                            {region.share} market | {region.sensitivity} sensitivity
                          </div>
                        </div>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={pct}
                          disabled={disabled}
                          onChange={(e) =>
                            updateAllocation(
                              model.id,
                              region.key,
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="pixel-input"
                          style={{ width: 70 }}
                        />
                        <span
                          style={{
                            fontFamily: "var(--font-pixel-body)",
                            fontSize: "1rem",
                            color: "var(--px-gray)",
                          }}
                        >
                          %
                        </span>
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
                  <span
                    style={{
                      fontFamily: "var(--font-pixel)",
                      fontSize: "0.42rem",
                      color: allocValid ? "var(--px-green)" : "var(--px-pink)",
                    }}
                  >
                    TOTAL ALLOCATION
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-pixel)",
                      fontSize: "0.55rem",
                      color: allocValid ? "var(--px-green)" : "var(--px-pink)",
                    }}
                  >
                    {allocTotal}% {allocValid ? "" : "(MUST = 100%)"}
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
