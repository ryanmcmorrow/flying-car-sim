// Self-check for the pricing mechanics added alongside elasticity curves.
// Verifies: (1) absolute demand curve multiplier, (2) clearing-price inversion
// round-trips against the forward priceFactor → share formula.
//
// Run: npx tsx lib/engine/__tests__/clearing-price.test.ts

import { PRICE_ELASTICITY, VEHICLE_PRICE_RANGE } from "../constants";
import assert from "node:assert";

// ── (1) Absolute demand curve ────────────────────────────────────────────────
function absMultiplier(vt: "COMPACT", avg: number): number {
  const { low, high } = VEHICLE_PRICE_RANGE[vt];
  if (avg <= low) return Math.min(1.15, 1.0 + 0.15 * (low - avg) / low);
  if (avg <= high) return 1.0;
  const overshoot = (avg - high) / high;
  return Math.max(0.25, 1.0 - 0.75 * overshoot);
}

const { low, high } = VEHICLE_PRICE_RANGE.COMPACT;
assert(absMultiplier("COMPACT", low - 1) > 1.0, "below floor should boost");
assert(absMultiplier("COMPACT", (low + high) / 2) === 1.0, "mid range flat");
assert(absMultiplier("COMPACT", high * 2) < 1.0, "above ceiling should shrink");
assert(absMultiplier("COMPACT", high * 100) === 0.25, "decay floored at 0.25");
assert(absMultiplier("COMPACT", 0) === 1.15, "max boost capped at 1.15");

// ── (2) Clearing-price inversion round-trip (linear elasticity) ───────────────
// Forward: priceFactor(P) = 1 + e*(avg - P)/avg ; score = base * pf ; share = score/(score+other)
// Inverse: given targetShare, solve for P. The engine computes:
//   targetScore = targetShare*other/(1-targetShare); pf = targetScore/base
//   P = avg * (1 - (pf - 1)/e)
function clearingPrice(avg: number, e: number, base: number, other: number, targetShare: number): number {
  const targetScore = targetShare * other / (1 - targetShare);
  const pf = targetScore / base;
  return avg * (1 - (pf - 1) / e);
}
function forwardShare(P: number, avg: number, e: number, base: number, other: number): number {
  const pf = Math.max(0.1, 1 + e * (avg - P) / avg);
  const score = base * pf;
  return score / (score + other);
}

const avg = 90_000, e = PRICE_ELASTICITY.COMPACT, base = 2.0, other = 5.0;
for (const targetShare of [0.2, 0.35, 0.5, 0.65]) {
  const P = clearingPrice(avg, e, base, other, targetShare);
  const got = forwardShare(P, avg, e, base, other);
  assert(Math.abs(got - targetShare) < 1e-6, `round-trip share ${targetShare} → ${got} at P=${P}`);
}

console.log("clearing-price self-check: OK");
