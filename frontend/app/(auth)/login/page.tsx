"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("ACCESS DENIED");
      } else {
        window.location.href = "/game";
      }
    } catch {
      setError("CONNECTION ERROR");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="game-screen scanlines flex items-center justify-center min-h-screen"
      style={{ fontFamily: "var(--font-pixel-body), monospace" }}
    >
      {/* Background grid effect */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(0,245,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        className="w-full max-w-md px-4 py-8 relative"
        style={{ zIndex: 1 }}
      >
        {/* Title */}
        <div className="text-center mb-10">
          <h1
            className="pixel-heading mb-2"
            style={{ fontSize: "1.1rem", lineHeight: 1.8 }}
          >
            FLYING CAR
            <br />
            SIM
            <span className="blink" style={{ color: "#00f5ff" }}>
              _
            </span>
          </h1>
          <p
            className="blink mt-4"
            style={{
              fontFamily: "var(--font-pixel-body), monospace",
              fontSize: "1.3rem",
              color: "#ff006e",
              letterSpacing: "0.15em",
            }}
          >
            PRESS START TO PLAY
          </p>
        </div>

        {/* Login card */}
        <div className="pixel-card pixel-slide-in">
          <p
            className="pixel-heading mb-6 text-center"
            style={{ fontSize: "0.55rem", color: "#ffbe0b" }}
          >
            ▶ PLAYER LOGIN
          </p>

          {error && (
            <div
              className="mb-4 p-3 text-center"
              style={{
                border: "2px solid #ff006e",
                background: "#1a000d",
                fontFamily: "var(--font-pixel), monospace",
                fontSize: "0.5rem",
                color: "#ff006e",
                letterSpacing: "0.05em",
              }}
            >
              ❌ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="pixel-label">EMAIL ADDRESS</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pilot@example.com"
                required
                className="pixel-input"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="pixel-label">PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="pixel-input"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="pixel-btn w-full mt-2"
              style={{ fontSize: "0.6rem", justifyContent: "center" }}
            >
              {loading ? "AUTHENTICATING..." : "▶ PLAYER LOGIN"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/join"
              style={{
                fontFamily: "var(--font-pixel-body), monospace",
                fontSize: "1rem",
                color: "#ffbe0b",
                textDecoration: "none",
              }}
            >
              Join a game with a code →
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p
          className="text-center mt-8"
          style={{
            fontFamily: "var(--font-pixel), monospace",
            fontSize: "0.4rem",
            color: "#4a4a6a",
            letterSpacing: "0.1em",
          }}
        >
          © FLYING CAR SIM v3.0 — INSERT COIN
        </p>
      </div>
    </div>
  );
}
