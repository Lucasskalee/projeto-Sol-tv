import React from "react";
import {
  Tv,
  CheckCircle,
  X,
  Sparkles,
  Layers,
  Palette,
  Eye,
  ArrowRight,
  Radio,
} from "lucide-react";
import type { MotionConfig } from "../../motion/types";
import { SECTORS } from "../../data";

export interface MotionPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmPublish: () => void;
  isPublishing: boolean;
  sector: string;
  currentConfig: MotionConfig;
  savedConfig?: MotionConfig;
  publishedVersion: number;
}

export function MotionPublishModal({
  isOpen,
  onClose,
  onConfirmPublish,
  isPublishing,
  sector,
  currentConfig,
  publishedVersion,
}: MotionPublishModalProps) {
  if (!isOpen) return null;

  const sectorLabel =
    SECTORS.find((s) => s.id === sector)?.label || sector.toUpperCase();

  const nextVersion = (publishedVersion || 1) + 1;

  // Background summary
  const bgType = currentConfig.background?.type || "solid";
  const bgColor =
    currentConfig.colorOverrides?.enabled && currentConfig.colorOverrides?.background
      ? currentConfig.colorOverrides.background
      : currentConfig.background?.color || "#ffffff";
  const isSunburst = bgType === "sunburst";

  // Layout summary
  const layout = currentConfig.layout || "hero";

  // Elements visibility summary
  const showLogo = currentConfig.visibility?.logo !== false && currentConfig.logo?.visible !== false;
  const showSector = currentConfig.logo?.sectorLayout !== "hidden";
  const showBadge = currentConfig.visibility?.badge !== false && currentConfig.badge?.visible !== false;

  return (
    <div className="modal-backdrop publish-modal-backdrop" onClick={onClose}>
      <div
        className="modal-content publish-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-modal-title"
      >
        {/* Header */}
        <div className="publish-modal-header">
          <div className="publish-modal-title-group">
            <div className="publish-icon-wrap">
              <Radio size={20} className="publish-radio-icon" />
            </div>
            <div>
              <h2 id="publish-modal-title">Publicar Identidade Visual na TV</h2>
              <p>Envio imediato em tempo real para as telas do setor</p>
            </div>
          </div>
          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
            disabled={isPublishing}
            aria-label="Fechar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="publish-modal-body">
          {/* Target Sector Banner */}
          <div className="publish-target-banner">
            <div className="publish-sector-badge">
              <Tv size={16} />
              <span>Setor Alvo:</span>
              <strong>{sectorLabel}</strong>
            </div>
            <div className="publish-version-flow">
              <span className="version-pill current">v{publishedVersion}</span>
              <ArrowRight size={14} className="version-arrow" />
              <span className="version-pill next">v{nextVersion}</span>
            </div>
          </div>

          {/* Config Summary Grid */}
          <div className="publish-summary-section">
            <h4 className="publish-summary-title">Resumo das Modificações no Rascunho:</h4>
            <div className="publish-summary-grid">
              <div className="publish-summary-item">
                <span className="summary-icon"><Palette size={14} /></span>
                <div className="summary-details">
                  <span className="summary-label">Fundo & Estilo:</span>
                  <span className="summary-value">
                    {isSunburst
                      ? `Sunburst (${bgColor})`
                      : bgType === "gradient"
                      ? "Gradiente Personalizado"
                      : `Sólido (${bgColor})`}
                  </span>
                </div>
              </div>

              <div className="publish-summary-item">
                <span className="summary-icon"><Layers size={14} /></span>
                <div className="summary-details">
                  <span className="summary-label">Layout Padrão:</span>
                  <span className="summary-value">
                    {layout === "hero"
                      ? "1 Produto (Hero)"
                      : layout === "duo"
                      ? "2 Produtos (Duo)"
                      : layout === "trio"
                      ? "3 Produtos (Trio)"
                      : layout === "grid4"
                      ? "4 Produtos (Grid 4)"
                      : layout === "grid8"
                      ? "8 Produtos (Grid 8)"
                      : String(layout).toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="publish-summary-item">
                <span className="summary-icon"><Sparkles size={14} /></span>
                <div className="summary-details">
                  <span className="summary-label">Logo & Marca:</span>
                  <span className="summary-value">
                    {currentConfig.logo?.image ? "Logo Customizada" : "Logo Padrão Sol"}
                  </span>
                </div>
              </div>

              <div className="publish-summary-item">
                <span className="summary-icon"><Eye size={14} /></span>
                <div className="summary-details">
                  <span className="summary-label">Elementos na TV:</span>
                  <span className="summary-value">
                    {showLogo ? "Logo (Visível)" : "Logo (Oculto)"} ·{" "}
                    {showSector ? "Setor (Visível)" : "Setor (Oculto)"} ·{" "}
                    {showBadge ? "Selo (Visível)" : "Selo (Oculto)"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="publish-warning-note">
            <CheckCircle size={15} className="text-success" />
            <span>
              Ao confirmar, a TV do setor <strong>{sectorLabel}</strong> atualizará
              instantaneamente via Supabase Realtime sem interrupção de tela.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="publish-modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isPublishing}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary btn-confirm-publish"
            onClick={onConfirmPublish}
            disabled={isPublishing}
          >
            {isPublishing ? (
              <>
                <span className="publish-spinner" />
                <span>Publicando na TV...</span>
              </>
            ) : (
              <>
                <Radio size={15} />
                <span>Confirmar e Publicar (v{nextVersion})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
