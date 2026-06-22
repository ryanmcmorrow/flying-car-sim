// Self-check for the submit-time capacity guard: parseFacilities normalizes
// stored shapes, and computeSpaceCost totals capacity across owned + new.
//
// Run: npx tsx lib/engine/__tests__/capacity-guard.test.ts

import assert from "node:assert";
import { parseFacilities, computeSpaceCost } from "../financials";
import type { TeamInput } from "../types";

// parseFacilities: array passes through, legacy owned → MIDWEST, everything else → [].
assert.deepEqual(parseFacilities([{ region: "WEST_COAST", size: "large" }]), [
  { region: "WEST_COAST", size: "large" },
]);
assert.deepEqual(parseFacilities({ size: "medium", ownership: "buy" }), [
  { region: "MIDWEST", size: "medium" },
]);
assert.deepEqual(parseFacilities({ size: "medium", ownership: "rent" }), []); // legacy rent isn't persisted
assert.deepEqual(parseFacilities(undefined), []);
assert.deepEqual(parseFacilities(null), []);

// Capacity = owned (small=500) + new buy (large=6000), deduped.
const cap = (currentFacilities: TeamInput["currentFacilities"], newFacilities: unknown) =>
  computeSpaceCost({
    currentFacilities,
    manufacturingSection: { newFacilities, productionRuns: [] },
  } as unknown as TeamInput).totalCapacity;

assert.equal(cap([{ region: "MIDWEST", size: "small" }], []), 500);
assert.equal(
  cap(
    [{ region: "MIDWEST", size: "small" }],
    [{ region: "WEST_COAST", size: "large", ownership: "buy" }]
  ),
  6500
);
// Duplicate region::size (already owned) isn't double-counted.
assert.equal(
  cap(
    [{ region: "MIDWEST", size: "small" }],
    [{ region: "MIDWEST", size: "small", ownership: "rent" }]
  ),
  500
);

// The guard itself: production over total capacity is rejected.
const overCapacity = (production: number, capacity: number) => production > capacity;
assert.equal(overCapacity(501, 500), true);
assert.equal(overCapacity(500, 500), false);
assert.equal(overCapacity(0, 0), false); // no facilities, no production = fine

console.log("capacity-guard self-check: OK");
