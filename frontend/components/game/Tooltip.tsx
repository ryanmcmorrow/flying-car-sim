"use client";

export function Tooltip({ text }: { text: string }) {
  return (
    <span
      title={text}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "1.1rem",
        height: "1.1rem",
        marginLeft: "0.4rem",
        border: "2px solid #4a4a6a",
        borderRadius: 0,
        fontFamily: "var(--font-pixel), monospace",
        fontSize: "0.4rem",
        color: "#4a4a6a",
        cursor: "help",
        verticalAlign: "middle",
        flexShrink: 0,
      }}
    >
      ?
    </span>
  );
}
