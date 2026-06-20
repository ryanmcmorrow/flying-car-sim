"use client";

import type { ManufacturingSection as ManufacturingSectionType, SpaceSize, SpaceOwnership } from "@/types/decisions";
import type { VehicleModel } from "@/types/decisions";

const SPACE_OPTIONS: {
  size: SpaceSize;
  label: string;
  capacity: number;
  rent: string;
  buy: string;
  maintenance: string;
}[] = [
  {
    size: "small",
    label: "SMALL",
    capacity: 500,
    rent: "$900K/yr",
    buy: "$9M",
    maintenance: "$350K/yr",
  },
  {
    size: "medium",
    label: "MEDIUM",
    capacity: 2000,
    rent: "$2.6M/yr",
    buy: "$28M",
    maintenance: "$950K/yr",
  },
  {
    size: "large",
    label: "LARGE",
    capacity: 6000,
    rent: "$6.5M/yr",
    buy: "$65M",
    maintenance: "$2.2M/yr",
  },
];

const CAPACITY: Record<SpaceSize, number> = {
  small: 500,
  medium: 2000,
  large: 6000,
};

export function ManufacturingSection({
  value,
  vehicleModels,
  onChange,
  disabled = false,
}: {
  value: ManufacturingSectionType;
  vehicleModels: VehicleModel[];
  onChange: (v: ManufacturingSectionType) => void;
  disabled?: boolean;
}) {
  const selectedCapacity = value.spaceSize ? CAPACITY[value.spaceSize] : 0;
  const totalUnits = value.productionRuns.reduce((s, r) => s + (r.units || 0), 0);
  const capacityExceeded = totalUnits > selectedCapacity;

  function setProductionRun(modelId: string, units: number) {
    const existing = value.productionRuns.find((r) => r.modelId === modelId);
    const next = existing
      ? value.productionRuns.map((r) =>
          r.modelId === modelId ? { ...r, units } : r
        )
      : [...value.productionRuns, { modelId, units }];
    onChange({ ...value, productionRuns: next });
  }

  function getUnits(modelId: string) {
    return value.productionRuns.find((r) => r.modelId === modelId)?.units ?? 0;
  }

  return (
    <div className="space-y-6">
      {/* Factory Space */}
      <div>
        <h2
          className="pixel-heading mb-3"
          style={{ fontSize: "0.75rem", color: "var(--px-cyan)" }}
        >
          FACTORY SPACE
        </h2>

        {/* Action selector */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {(["new", "keep", "upgrade", "sell"] as const).map((action) => (
            <button
              key={action}
              disabled={disabled}
              onClick={() => onChange({ ...value, spaceAction: action })}
              className={`pixel-btn text-[0.45rem] px-3 py-2 ${
                value.spaceAction === action ? "pixel-btn-cyan" : ""
              }`}
            >
              {action === "new" && "ACQUIRE NEW"}
              {action === "keep" && "KEEP CURRENT"}
              {action === "upgrade" && "UPGRADE"}
              {action === "sell" && "SELL"}
            </button>
          ))}
        </div>

        {/* Space size/ownership selector */}
        {(value.spaceAction === "new" || value.spaceAction === "upgrade") && (
          <div>
            {/* Comparison table */}
            <div className="overflow-x-auto mb-3">
              <table className="w-full" style={{ borderCollapse: "separate", borderSpacing: "0 4px" }}>
                <thead>
                  <tr>
                    {["SIZE", "CAPACITY", "RENT/YR", "BUY PRICE", "MAINTENANCE"].map((h) => (
                      <th
                        key={h}
                        style={{
                          fontFamily: "var(--font-pixel)",
                          fontSize: "0.4rem",
                          color: "var(--px-amber)",
                          textAlign: "left",
                          padding: "0.25rem 0.5rem",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SPACE_OPTIONS.map((opt) => {
                    const selected = value.spaceSize === opt.size;
                    return (
                      <tr
                        key={opt.size}
                        onClick={() =>
                          !disabled &&
                          onChange({ ...value, spaceSize: opt.size })
                        }
                        style={{
                          cursor: disabled ? "default" : "pointer",
                          background: selected
                            ? "rgba(0,245,255,0.1)"
                            : "var(--px-bg-2)",
                          border: `2px solid ${
                            selected ? "var(--px-cyan)" : "var(--px-gray)"
                          }`,
                        }}
                      >
                        {[
                          opt.label,
                          opt.capacity.toLocaleString() + " units",
                          opt.rent,
                          opt.buy,
                          opt.maintenance,
                        ].map((cell, i) => (
                          <td
                            key={i}
                            style={{
                              fontFamily:
                                i === 0 ? "var(--font-pixel)" : "var(--font-pixel-body)",
                              fontSize: i === 0 ? "0.45rem" : "1rem",
                              color: selected ? "var(--px-cyan)" : "var(--px-white)",
                              padding: "0.4rem 0.5rem",
                            }}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Rent / Buy toggle */}
            {value.spaceAction === "new" && (
              <div className="flex gap-2">
                <label
                  style={{
                    fontFamily: "var(--font-pixel)",
                    fontSize: "0.45rem",
                    color: "var(--px-amber)",
                    alignSelf: "center",
                  }}
                >
                  OWNERSHIP:
                </label>
                {(["rent", "buy"] as SpaceOwnership[]).map((own) => (
                  <button
                    key={own}
                    disabled={disabled}
                    onClick={() => onChange({ ...value, spaceOwnership: own })}
                    className={`pixel-btn text-[0.45rem] px-4 py-2 ${
                      value.spaceOwnership === own ? "pixel-btn-amber" : ""
                    }`}
                  >
                    {own.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {value.spaceAction === "keep" && (
          <div
            className="pixel-card"
            style={{ borderColor: "var(--px-gray)" }}
          >
            <p
              style={{
                fontFamily: "var(--font-pixel-body)",
                fontSize: "1.1rem",
                color: "var(--px-gray)",
              }}
            >
              Keeping existing factory space. No changes.
            </p>
          </div>
        )}

        {value.spaceAction === "sell" && (
          <div
            className="pixel-card"
            style={{ borderColor: "var(--px-pink)", background: "#1a000a" }}
          >
            <p
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: "0.5rem",
                color: "var(--px-pink)",
              }}
            >
              WARNING: Selling factory will halt all production.
            </p>
          </div>
        )}
      </div>

      {/* Production Runs */}
      <div>
        <h2
          className="pixel-heading mb-3"
          style={{ fontSize: "0.75rem", color: "var(--px-cyan)" }}
        >
          PRODUCTION RUNS
        </h2>

        {vehicleModels.length === 0 ? (
          <div
            className="pixel-card text-center py-6"
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
          <div className="space-y-3">
            {vehicleModels.map((model) => {
              const units = getUnits(model.id);
              return (
                <div
                  key={model.id}
                  className="pixel-card flex items-center gap-4"
                  style={{ borderColor: "var(--px-cyan)", padding: "0.75rem 1rem" }}
                >
                  <div className="flex-1">
                    <div
                      style={{
                        fontFamily: "var(--font-pixel)",
                        fontSize: "0.5rem",
                        color: "var(--px-cyan)",
                      }}
                    >
                      {model.name || "(unnamed)"}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-pixel-body)",
                        fontSize: "0.9rem",
                        color: "var(--px-gray)",
                      }}
                    >
                      {model.vehicleType}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label
                      style={{
                        fontFamily: "var(--font-pixel)",
                        fontSize: "0.4rem",
                        color: "var(--px-amber)",
                      }}
                    >
                      UNITS:
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={selectedCapacity || 99999}
                      value={units}
                      disabled={disabled}
                      onChange={(e) =>
                        setProductionRun(model.id, parseInt(e.target.value) || 0)
                      }
                      className="pixel-input"
                      style={{ width: 100 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Capacity summary */}
        <div
          className="pixel-border p-3 flex items-center justify-between mt-3"
          style={{
            borderColor: capacityExceeded ? "var(--px-pink)" : "var(--px-amber)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "0.5rem",
              color: capacityExceeded ? "var(--px-pink)" : "var(--px-amber)",
            }}
          >
            TOTAL PRODUCTION
          </span>
          <span
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "0.65rem",
              color: capacityExceeded ? "var(--px-pink)" : "var(--px-green)",
            }}
          >
            {totalUnits.toLocaleString()} / {selectedCapacity.toLocaleString()} UNITS
          </span>
        </div>
        {capacityExceeded && (
          <p
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "0.45rem",
              color: "var(--px-pink)",
              marginTop: "0.25rem",
            }}
          >
            CAPACITY EXCEEDED — reduce production or upgrade factory
          </p>
        )}
      </div>
    </div>
  );
}
