"use client";

import { useState } from "react";
import { FlyingCarScene } from "./FlyingCarScene";

const px = "var(--font-pixel), monospace";
const body = "var(--font-pixel-body), monospace";

const VEHICLE_SEGMENTS = [
  {
    name: "COMPACT",
    icon: "🚗",
    tagline: "Mass market workhorse",
    buyers: "Urban commuters, first-time buyers, budget-conscious professionals",
    pricing: "Price-sensitive — buyers comparison shop. Undercut rivals and you grab share fast, but margins are thin. Charge too much and demand collapses.",
    tip: "High volume play. Compete hard on price, control costs.",
    color: "#39ff14",
  },
  {
    name: "SEDAN",
    icon: "🚘",
    tagline: "Broad-appeal bread-and-butter",
    buyers: "Families, professionals, suburban commuters",
    pricing: "Moderately price-sensitive. Buyers want value, not the cheapest option. A small premium is fine if quality justifies it.",
    tip: "Balanced segment. Reward quality with a modest price bump.",
    color: "#00f5ff",
  },
  {
    name: "SUV",
    icon: "🚙",
    tagline: "Premium family hauler",
    buyers: "Affluent families, lifestyle buyers, safety-focused parents",
    pricing: "Low price sensitivity — buyers expect to pay more. You can hold firm on price without killing demand. Discounting signals cheap quality.",
    tip: "Margin play. Don't race to the bottom — hold your price.",
    color: "#ffbe0b",
  },
  {
    name: "TRUCK",
    icon: "🛻",
    tagline: "Utility niche, loyal buyers",
    buyers: "Tradespeople, rural buyers, outdoor enthusiasts — mostly Southeast and Midwest",
    pricing: "Very low price sensitivity — truck buyers are utility-focused and brand-loyal. Price matters less than reliability and capability.",
    tip: "Niche but sticky. Strong in rural regions. R&D on durability wins.",
    color: "#ff7c00",
  },
  {
    name: "SPORTS CAR",
    icon: "🏎️",
    tagline: "Prestige market — status over savings",
    buyers: "Wealthy early adopters, status buyers, tech enthusiasts",
    pricing: "Price is a signal of exclusivity. Charging more can actually increase demand. Discounting destroys the brand image.",
    tip: "Prestige play. Invest in R&D and brand perception over raw volume.",
    color: "#ff006e",
  },
];

const REGIONS = [
  {
    name: "WEST COAST",
    icon: "🌴",
    character: "Tech-forward, urban, early adopters",
    strongest: "COMPACT, SEDAN, SPORTS CAR",
    note: "Largest flying car market in Year 1. Buyers embrace new technology and pay premium for innovation.",
    color: "#00f5ff",
  },
  {
    name: "NORTHEAST",
    icon: "🏙️",
    character: "Dense urban, wealthy commuters, affluent professionals",
    strongest: "COMPACT, SEDAN",
    note: "High population density means commuter vehicles dominate. Buyers are affluent and respond well to brand prestige.",
    color: "#c77dff",
  },
  {
    name: "SOUTHEAST",
    icon: "🌿",
    character: "Sprawl, outdoor lifestyle, utility-focused",
    strongest: "TRUCK, SUV",
    note: "Truck demand here is far above the national average. Buyers are practical and brand-loyal. Underserved market.",
    color: "#39ff14",
  },
  {
    name: "MIDWEST",
    icon: "🌾",
    character: "Your home base — no regional shipping surcharge",
    strongest: "SEDAN, SUV, TRUCK",
    note: "Balanced demand across segments. Manufacturing here means no $1,500/unit shipping penalty — a built-in cost advantage.",
    color: "#ffbe0b",
  },
  {
    name: "SOUTHWEST",
    icon: "🏜️",
    character: "Suburban growth corridors, sun-belt expansion",
    strongest: "SUV, SEDAN",
    note: "Smaller market today but growing fastest. Early movers can build installed base before rivals show up.",
    color: "#ff7c00",
  },
];

const TOTAL = 3;

function Dots({ current }: { current: number }) {
  return (
    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginBottom: "1rem" }}>
      {Array.from({ length: TOTAL }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: 8,
            background: i === current ? "#00f5ff" : "#2a2a4a",
            border: "2px solid",
            borderColor: i === current ? "#00f5ff" : "#8888aa",
          }}
        />
      ))}
    </div>
  );
}

export function IntroScreen({ onContinue }: { onContinue: () => void }) {
  const [slide, setSlide] = useState(0);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#06060f",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "1.5rem 1rem",
        overflowY: "auto",
      }}
    >
      {/* Scanlines */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        backgroundImage: "repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,0,0,0.15) 3px, rgba(0,0,0,0.15) 4px)",
      }} />

      <div style={{ maxWidth: 620, width: "100%", position: "relative", zIndex: 2, paddingBottom: "2rem" }}>

        {/* ── Slide 0: Story ── */}
        {slide === 0 && (
          <>
            <FlyingCarScene />

            <h1 style={{ fontFamily: px, fontSize: "1.1rem", color: "#00f5ff", textAlign: "center", marginTop: "1.5rem", marginBottom: "0.5rem", letterSpacing: "0.15em", textShadow: "0 0 12px #00f5ff" }}>
              FLYING CAR SIM
            </h1>
            <p style={{ fontFamily: px, fontSize: "0.5rem", color: "#ff006e", textAlign: "center", marginBottom: "1.5rem", letterSpacing: "0.2em" }}>
              ▶ THE YEAR IS 2031
            </p>

            <div style={{ border: "2px solid #8888aa", padding: "1rem 1.25rem", background: "#0a0a18", marginBottom: "1.25rem" }}>
              <p style={{ fontFamily: body, fontSize: "1rem", color: "#cccccc", lineHeight: 1.7, marginBottom: "0.75rem" }}>
                Flying cars are real. After decades of prototypes and broken promises, the first commercially-viable models hit the road — and the sky — last year. The market is wide open, regulations are still being written, and the public is watching.
              </p>
              <p style={{ fontFamily: body, fontSize: "1rem", color: "#cccccc", lineHeight: 1.7, marginBottom: "0.75rem" }}>
                You&apos;re a startup founder racing to claim your share before the big automakers catch up. You&apos;ll design vehicles, set prices, run factories, market to consumers, and lobby the government — all at once.
              </p>
              <p style={{ fontFamily: body, fontSize: "1rem", color: "#ffbe0b", lineHeight: 1.7 }}>
                Every round is one year. Decisions lock at the end of each year. The founder with the most market share when time runs out wins.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "1.25rem" }}>
              {[
                ["🚗", "Design vehicles to match what buyers want"],
                ["🏭", "Build factory capacity before you can sell"],
                ["📣", "Marketing drives demand — but burns cash"],
                ["🏛️", "Lobby or regulators will bury you"],
              ].map(([icon, tip]) => (
                <div key={tip} style={{ border: "2px solid #1a1a30", padding: "0.5rem 0.75rem", background: "#0a0a18", display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{icon}</span>
                  <span style={{ fontFamily: body, fontSize: "0.9rem", color: "#888899", lineHeight: 1.5 }}>{tip}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Slide 1: Vehicle Segments ── */}
        {slide === 1 && (
          <>
            <p style={{ fontFamily: px, fontSize: "0.45rem", color: "#8888aa", textAlign: "center", marginBottom: "0.25rem", marginTop: "0.5rem" }}>MARKET RESEARCH BRIEFING 1/2</p>
            <h2 style={{ fontFamily: px, fontSize: "0.75rem", color: "#ffbe0b", textAlign: "center", marginBottom: "0.25rem" }}>VEHICLE SEGMENTS</h2>
            <p style={{ fontFamily: body, fontSize: "0.9rem", color: "#8888aa", textAlign: "center", marginBottom: "1.25rem" }}>
              Each segment has different buyers, different price tolerance, and different strategy implications.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.25rem" }}>
              {VEHICLE_SEGMENTS.map((seg) => (
                <div key={seg.name} style={{ border: `2px solid ${seg.color}22`, background: "#0a0a18", padding: "0.75rem 1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                    <span style={{ fontSize: "1.1rem" }}>{seg.icon}</span>
                    <span style={{ fontFamily: px, fontSize: "0.5rem", color: seg.color }}>{seg.name}</span>
                    <span style={{ fontFamily: body, fontSize: "0.85rem", color: "#8888aa" }}>— {seg.tagline}</span>
                  </div>
                  <p style={{ fontFamily: body, fontSize: "0.9rem", color: "#888899", lineHeight: 1.5, marginBottom: "0.3rem" }}>
                    <span style={{ color: "#8888aa" }}>Buyers: </span>{seg.buyers}
                  </p>
                  <p style={{ fontFamily: body, fontSize: "0.9rem", color: "#cccccc", lineHeight: 1.5, marginBottom: "0.3rem" }}>
                    <span style={{ color: "#8888aa" }}>Pricing: </span>{seg.pricing}
                  </p>
                  <p style={{ fontFamily: body, fontSize: "0.9rem", color: seg.color, lineHeight: 1.5 }}>
                    ▶ {seg.tip}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Slide 2: Regions ── */}
        {slide === 2 && (
          <>
            <p style={{ fontFamily: px, fontSize: "0.45rem", color: "#8888aa", textAlign: "center", marginBottom: "0.25rem", marginTop: "0.5rem" }}>MARKET RESEARCH BRIEFING 2/2</p>
            <h2 style={{ fontFamily: px, fontSize: "0.75rem", color: "#00f5ff", textAlign: "center", marginBottom: "0.25rem" }}>REGIONAL MARKETS</h2>
            <p style={{ fontFamily: body, fontSize: "0.9rem", color: "#8888aa", textAlign: "center", marginBottom: "1.25rem" }}>
              You can sell in all five regions — but shipping costs money unless you have a local factory. Know where your buyers are.
            </p>

            <div style={{ marginBottom: "0.75rem", padding: "0.6rem 0.9rem", border: "2px solid #ffbe0b44", background: "#0a0a10" }}>
              <p style={{ fontFamily: px, fontSize: "0.42rem", color: "#ffbe0b", marginBottom: "0.2rem" }}>⚠ MANUFACTURING COST INTEL</p>
              <p style={{ fontFamily: body, fontSize: "0.9rem", color: "#888899", lineHeight: 1.5 }}>
                Selling in a region where you have no local factory costs an extra <span style={{ color: "#ffbe0b" }}>$1,500 per unit</span> in shipping and distribution. Factories are expensive — pick your footprint strategically.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.25rem" }}>
              {REGIONS.map((reg) => (
                <div key={reg.name} style={{ border: `2px solid ${reg.color}33`, background: "#0a0a18", padding: "0.75rem 1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                    <span style={{ fontSize: "1.1rem" }}>{reg.icon}</span>
                    <span style={{ fontFamily: px, fontSize: "0.5rem", color: reg.color }}>{reg.name}</span>
                  </div>
                  <p style={{ fontFamily: body, fontSize: "0.9rem", color: "#888899", lineHeight: 1.5, marginBottom: "0.2rem" }}>
                    <span style={{ color: "#8888aa" }}>Character: </span>{reg.character}
                  </p>
                  <p style={{ fontFamily: body, fontSize: "0.9rem", color: "#888899", lineHeight: 1.5, marginBottom: "0.2rem" }}>
                    <span style={{ color: "#8888aa" }}>Top segments: </span>
                    <span style={{ color: reg.color }}>{reg.strongest}</span>
                  </p>
                  <p style={{ fontFamily: body, fontSize: "0.9rem", color: "#cccccc", lineHeight: 1.5 }}>
                    {reg.note}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Nav ── */}
        <Dots current={slide} />

        <div style={{ display: "flex", gap: "0.75rem" }}>
          {slide > 0 && (
            <button
              onClick={() => setSlide((s) => s - 1)}
              className="pixel-btn pixel-btn-amber"
              style={{ fontFamily: px, fontSize: "0.5rem", flex: "0 0 auto" }}
            >
              ← BACK
            </button>
          )}
          {slide < TOTAL - 1 ? (
            <button
              onClick={() => setSlide((s) => s + 1)}
              className="pixel-btn pixel-btn-green"
              style={{ fontFamily: px, fontSize: "0.6rem", flex: 1 }}
            >
              NEXT →
            </button>
          ) : (
            <button
              onClick={onContinue}
              className="pixel-btn pixel-btn-green"
              style={{ fontFamily: px, fontSize: "0.6rem", flex: 1 }}
            >
              ▶ ENTER THE LOBBY
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
