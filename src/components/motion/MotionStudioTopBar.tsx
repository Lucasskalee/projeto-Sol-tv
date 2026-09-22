import React from "react";
import type { MotionLayout } from "../../motion/layoutTypes";

interface MotionStudioTopBarProps {
  layout: MotionLayout;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  publishedSectors?: string[];
  isLeftPanelOpen: boolean;
  isRightPanelOpen: boolean;
  isCleanView: boolean;
  onBackToLibrary: () => void;
  onSaveDraft: () => void;
  onOpenPublishModal: () => void;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
  onToggleCleanView: () => void;
  onRenameLayout?: (newName: string) => void;
}

export function MotionStudioTopBar({
  layout,
  isDirty,
  isSaving,
  lastSavedAt,
  publishedSectors = [],
  isLeftPanelOpen,
  isRightPanelOpen,
  isCleanView,
  onBackToLibrary,
  onSaveDraft,
  onOpenPublishModal,
  onToggleLeftPanel,
  onToggleRightPanel,
  onToggleCleanView,
}: MotionStudioTopBarProps) {
  const isPublished = publishedSectors.length > 0;

  return (
    <header className="studio-top-bar">
      {/* Left: Back to Library & Layout Name */}
      <div className="studio-top-left">
        <button
          onClick={onBackToLibrary}
          className="btn-admin-back"
          title="Voltar para Meus Layouts"
        >
          <span>←</span>
          <span>Meus Layouts</span>
        </button>

        <div style={{ height: "20px", width: "1px", backgroundColor: "#1e293b" }} />

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px", fontWeight: "800", color: "#ffffff", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {layout.name}
          </span>

          {/* Status Badge */}
          {isDirty ? (
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "2px 8px",
              borderRadius: "999px",
              fontSize: "10px",
              fontWeight: "700",
              background: "rgba(245, 158, 11, 0.15)",
              color: "#fbbf24",
              border: "1px solid rgba(245, 158, 11, 0.3)"
            }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#fbbf24" }} />
              Não salvo
            </span>
          ) : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#94a3b8" }}>
              <span style={{ color: "#34d399", fontWeight: "800" }}>✓</span>
              {lastSavedAt ? `Salvo às ${lastSavedAt.toLocaleTimeString()}` : "Salvo"}
            </span>
          )}

          {isPublished && (
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "2px 8px",
              borderRadius: "999px",
              fontSize: "10px",
              fontWeight: "800",
              background: "rgba(16, 185, 129, 0.15)",
              color: "#34d399",
              border: "1px solid rgba(16, 185, 129, 0.3)"
            }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#10b981" }} />
              NO AR: {publishedSectors.join(", ")}
            </span>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="studio-top-right">
        {/* Toggle Left Panel */}
        <button
          onClick={onToggleLeftPanel}
          title={isLeftPanelOpen ? "Recolher Controles (Esquerda)" : "Expandir Controles (Esquerda)"}
          style={{
            padding: "6px 10px",
            borderRadius: "8px",
            border: isLeftPanelOpen ? "1px solid #334155" : "1px solid rgba(245, 158, 11, 0.4)",
            background: isLeftPanelOpen ? "#1e293b" : "rgba(245, 158, 11, 0.15)",
            color: isLeftPanelOpen ? "#e2e8f0" : "#fbbf24",
            fontSize: "12px",
            fontFamily: "monospace",
            cursor: "pointer"
          }}
        >
          {isLeftPanelOpen ? "[ < ]" : "[ > ]"}
        </button>

        {/* Toggle Right Panel */}
        <button
          onClick={onToggleRightPanel}
          title={isRightPanelOpen ? "Recolher Presets (Direita)" : "Expandir Presets (Direita)"}
          style={{
            padding: "6px 10px",
            borderRadius: "8px",
            border: isRightPanelOpen ? "1px solid #334155" : "1px solid rgba(245, 158, 11, 0.4)",
            background: isRightPanelOpen ? "#1e293b" : "rgba(245, 158, 11, 0.15)",
            color: isRightPanelOpen ? "#e2e8f0" : "#fbbf24",
            fontSize: "12px",
            fontFamily: "monospace",
            cursor: "pointer"
          }}
        >
          {isRightPanelOpen ? "[ > ]" : "[ < ]"}
        </button>

        <div style={{ height: "20px", width: "1px", backgroundColor: "#1e293b", margin: "0 4px" }} />

        {/* Preview TV (Clean Mode) */}
        <button
          onClick={onToggleCleanView}
          style={{
            padding: "6px 12px",
            borderRadius: "8px",
            border: isCleanView ? "1px solid #f59e0b" : "1px solid #334155",
            background: isCleanView ? "#f59e0b" : "#1e293b",
            color: isCleanView ? "#0b0e14" : "#cbd5e1",
            fontWeight: "700",
            fontSize: "12px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}
          title="Pré-visualização Imersiva da TV (Atalho: H)"
        >
          <span>👁️</span>
          <span>Preview TV</span>
        </button>

        {/* Save Draft Button (CRITICAL: SALVAR ≠ PUBLICAR) */}
        <button
          onClick={onSaveDraft}
          disabled={isSaving || !isDirty}
          className="btn-top-save"
          title="Salvar alterações no rascunho do layout (NÃO altera a TV)"
        >
          <span>💾</span>
          <span>{isSaving ? "Salvando..." : "Salvar"}</span>
        </button>

        {/* Publish to TV Button (EXPLICIT PUBLICATION) */}
        <button
          onClick={onOpenPublishModal}
          className="btn-top-publish"
          title="Publicar este layout na TV do setor"
        >
          <span>🚀</span>
          <span>Publicar na TV</span>
        </button>
      </div>
    </header>
  );
}
