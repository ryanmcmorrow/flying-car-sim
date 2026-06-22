"use client";

import { TeamMemberRole } from "@/app/generated/prisma/client";
import { ALL_ROLES, ROLE_DESCRIPTIONS, ROLE_COLORS } from "@/lib/game-utils";

interface RoleSlotsProps {
  filledRoles: { role: TeamMemberRole; userName: string }[];
  onSelect?: (role: TeamMemberRole) => void;
  selectedRole?: TeamMemberRole | null;
  interactive?: boolean;
}

export function RoleSlots({
  filledRoles,
  onSelect,
  selectedRole,
  interactive = false,
}: RoleSlotsProps) {
  const filledMap = new Map(filledRoles.map((r) => [r.role, r.userName]));

  return (
    <div className="space-y-2">
      {ALL_ROLES.map((role) => {
        const filledBy = filledMap.get(role);
        const isFilled = Boolean(filledBy);
        const isSelected = selectedRole === role;
        const color = ROLE_COLORS[role];

        if (interactive && !isFilled) {
          return (
            <button
              key={role}
              type="button"
              onClick={() => onSelect?.(role)}
              className="w-full text-left p-3 border-2 transition-none"
              style={{
                borderColor: isSelected ? color : "#8888aa",
                background: isSelected ? `${color}22` : "#0a0a1a",
                color: isSelected ? color : "#888899",
                boxShadow: isSelected ? `3px 3px 0 ${color}55` : "none",
                cursor: "pointer",
              }}
            >
              <div className="flex items-start gap-3">
                <span
                  className="font-mono font-bold shrink-0"
                  style={{
                    fontFamily: "var(--font-pixel), monospace",
                    fontSize: "0.55rem",
                    color: isSelected ? color : "#888899",
                  }}
                >
                  {role}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-pixel-body), monospace",
                    fontSize: "1rem",
                    color: isSelected ? color : "#9999bb",
                  }}
                >
                  {ROLE_DESCRIPTIONS[role]}
                </span>
              </div>
              {isSelected && (
                <p
                  style={{
                    fontFamily: "var(--font-pixel), monospace",
                    fontSize: "0.4rem",
                    color: color,
                    marginTop: "0.3rem",
                  }}
                >
                  ▶ SELECTED
                </p>
              )}
            </button>
          );
        }

        return (
          <div
            key={role}
            className="p-3 border-2"
            style={{
              borderColor: isFilled ? color : "#2a2a3a",
              background: isFilled ? `${color}11` : "#050510",
              opacity: interactive && isFilled ? 0.5 : 1,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  style={{
                    fontFamily: "var(--font-pixel), monospace",
                    fontSize: "0.55rem",
                    color: isFilled ? color : "#8888aa",
                  }}
                >
                  {role}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-pixel-body), monospace",
                    fontSize: "0.95rem",
                    color: isFilled ? "#cccccc" : "#8888aa",
                  }}
                >
                  {isFilled ? filledBy : "— VACANT —"}
                </span>
              </div>
              <span
                className="pixel-badge"
                style={{
                  color: isFilled ? color : "#8888aa",
                  borderColor: isFilled ? color : "#8888aa",
                  fontSize: "0.4rem",
                }}
              >
                {isFilled ? "FILLED" : "OPEN"}
              </span>
            </div>
            {!isFilled && !interactive && (
              <p
                style={{
                  fontFamily: "var(--font-pixel-body), monospace",
                  fontSize: "0.85rem",
                  color: "#8888aa",
                  marginTop: "0.2rem",
                }}
              >
                {ROLE_DESCRIPTIONS[role]}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
