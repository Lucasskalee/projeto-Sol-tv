import { useEffect } from "react";
import { Tv, AlertTriangle, Check, Loader2, X } from "lucide-react";
import type { MotionConfig } from "../../../motion/types";
import { SECTORS } from "../../../data";

export type MotionPublishConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  sector: string;
  config: MotionConfig;
  currentVersion: number;
  isPublishing?: boolean;
};

export function MotionPublishConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  sector,
  config,
  currentVersion,
  isPublishing = false,
}: MotionPublishConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPublishing) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isPublishing, onClose]);

  if (!isOpen) return null;

  const sectorLabel =
    SECTORS.find((s) => s.id === sector)?.label || sector.toUpperCase();

  return (
    <div
      className="admin-modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPublishing) onClose();
      }}
    >
      <div
        className="admin-modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-modal-title"
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "#121620",
          border: "1px solid rgba(242, 201, 76, 0.35)",
          borderRadius: "16px",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.8)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 22px 14px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(0, 0, 0, 0.3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                background: "rgba(242, 201, 76, 0.15)",
                border: "1px solid rgba(242, 201, 76, 0.3)",
                color: "var(--accent, #f2c94c)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Tv size={20} />
            </div>
            <div>
              <h3
                id="publish-modal-title"
                style={{
                  margin: 0,
                  fontSize: "15px",
                  fontWeight: 800,
                  color: "#ffffff",
                }}
              >
                Publicar na TV ao Vivo?
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: "12px",
                  color: "var(--muted, #94a3b8)",
                }}
              >
                Setor: <strong style={{ color: "var(--accent, #f2c94c)" }}>{sectorLabel}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isPublishing}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--muted, #94a3b8)",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "10px",
              background: "rgba(242, 201, 76, 0.08)",
              border: "1px solid rgba(242, 201, 76, 0.2)",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
            }}
          >
            <AlertTriangle size={18} style={{ color: "var(--accent, #f2c94c)", flexShrink: 0, marginTop: "2px" }} />
            <p style={{ margin: 0, fontSize: "12px", color: "rgba(255, 255, 255, 0.9)", lineHeight: 1.5 }}>
              Esta ação atualizará <strong>imediatamente</strong> os monitores de TV físicos e o player web do setor{" "}
              <strong>{sectorLabel}</strong> via Supabase Realtime.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              padding: "12px 14px",
              borderRadius: "10px",
              background: "rgba(0, 0, 0, 0.25)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              fontSize: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted, #94a3b8)" }}>
              <span>Layout Base:</span>
              <strong style={{ color: "#ffffff", fontFamily: "monospace", textTransform: "uppercase" }}>
                {config.layout}
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted, #94a3b8)" }}>
              <span>Física de Preço:</span>
              <strong style={{ color: "#ffffff", textTransform: "capitalize" }}>
                {config.pricePhysics.impact}
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted, #94a3b8)" }}>
              <span>Fundo:</span>
              <strong style={{ color: "#ffffff", textTransform: "capitalize" }}>
                {config.background.type === "sunburst" ? "Sunburst Animado" : config.background.type}
              </strong>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                paddingTop: "6px",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                color: "var(--muted, #94a3b8)",
              }}
            >
              <span>Versão Publicada:</span>
              <strong style={{ color: "var(--accent, #f2c94c)", fontFamily: "monospace" }}>
                v{currentVersion} → v{currentVersion + 1}
              </strong>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 22px",
            background: "rgba(0, 0, 0, 0.4)",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "10px",
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: "12px", padding: "8px 16px" }}
            onClick={onClose}
            disabled={isPublishing}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{
              fontSize: "12px",
              padding: "8px 18px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontWeight: 800,
            }}
            onClick={onConfirm}
            disabled={isPublishing}
          >
            {isPublishing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Publicando...</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>Confirmar e Publicar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

