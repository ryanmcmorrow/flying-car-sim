"use client";

import { useState } from "react";

export function Tooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", verticalAlign: "middle" }}>
      <span
        onClick={() => setVisible((v) => !v)}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "1.1rem",
          height: "1.1rem",
          marginLeft: "0.4rem",
          border: "2px solid #8888aa",
          borderRadius: 0,
          fontFamily: "var(--font-pixel), monospace",
          fontSize: "0.4rem",
          color: "#8888aa",
          cursor: "help",
          flexShrink: 0,
          userSelect: "none",
        }}
      >
        ?
      </span>
      {visible && (
        <span
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#0f0f1a",
            border: "2px solid #8888aa",
            color: "#cccccc",
            fontFamily: "var(--font-pixel-body), monospace",
            fontSize: "0.85rem",
            padding: "0.5rem 0.75rem",
            width: "220px",
            lineHeight: 1.5,
            zIndex: 100,
            pointerEvents: "none",
            boxShadow: "4px 4px 0 #1a1a2e",
            whiteSpace: "normal",
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
