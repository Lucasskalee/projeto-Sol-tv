import React from "react";
import { CheckCircle2, Sparkles } from "lucide-react";

export interface ThemeStatusChipProps {
  isActive: boolean;
  size?: "sm" | "md";
}

export const ThemeStatusChip: React.FC<ThemeStatusChipProps> = ({
  isActive,
  size = "md",
}) => {
  const isSm = size === "sm";

  if (isActive) {
    return (
      <span
        className="admin-chip"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: isSm ? "4px" : "6px",
          padding: isSm ? "3px 8px" : "5px 12px",
          borderRadius: "9999px",
          fontSize: isSm ? "11px" : "12px",
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          background: "rgba(34, 197, 94, 0.15)",
          color: "#4ade80",
          border: "1px solid rgba(34, 197, 94, 0.35)",
          boxShadow: "0 0 12px rgba(34, 197, 94, 0.2)",
        }}
      >
        <span
          style={{
            width: isSm ? "6px" : "7px",
            height: isSm ? "6px" : "7px",
            borderRadius: "50%",
            background: "#4ade80",
            boxShadow: "0 0 8px #4ade80",
            display: "inline-block",
            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}
        />
        EM USO
      </span>
    );
  }

  return (
    <span
      className="admin-chip"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: isSm ? "4px" : "6px",
        padding: isSm ? "3px 8px" : "5px 12px",
        borderRadius: "9999px",
        fontSize: isSm ? "11px" : "12px",
        fontWeight: 600,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        background: "rgba(148, 163, 184, 0.1)",
        color: "var(--skalee-text-secondary, #94a3b8)",
        border: "1px solid rgba(148, 163, 184, 0.2)",
      }}
    >
      <Sparkles size={isSm ? 10 : 12} />
      DISPONÍVEL
    </span>
  );
};

