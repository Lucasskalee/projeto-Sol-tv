import React, { useState, useRef, useEffect } from "react";
import {
  Clock,
  MoreVertical,
  Pencil,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import type { Offer } from "../../../types";
import type { OfferComposition } from "../../../offers/compositions";
import { OFFER_LAYOUTS, type OfferLayout } from "../../../offers/layouts";
import { checkCompositionProductStatus } from "../../../offers/compositions";

export interface CatalogScreenCardProps {
  composition: OfferComposition;
  index: number;
  totalScreens: number;
  catalogOffers: readonly Offer[];
  onEdit: (comp: OfferComposition) => void;
  onToggleActive: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDuplicate: (comp: OfferComposition) => void;
  onDelete: (id: string) => void;
}

const LAYOUT_FRIENDLY_NAMES: Record<OfferLayout, { label: string; count: string; tag: string }> = {
  hero: { label: "1 PRODUTO", count: "1 produto", tag: "HERO" },
  duo: { label: "2 PRODUTOS", count: "2 produtos", tag: "DUO" },
  trio: { label: "3 PRODUTOS", count: "3 produtos", tag: "TRIO" },
  grid4: { label: "4 PRODUTOS", count: "4 produtos", tag: "GRADE 4" },
  grid8: { label: "8 PRODUTOS", count: "8 produtos", tag: "GRADE 8" },
};

export const CatalogScreenCard: React.FC<CatalogScreenCardProps> = ({
  composition,
  index,
  totalScreens,
  catalogOffers,
  onEdit,
  onToggleActive,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const layoutInfo = LAYOUT_FRIENDLY_NAMES[composition.layout] || {
    label: `${composition.offers.length} PRODUTOS`,
    count: `${composition.offers.length} produtos`,
    tag: composition.layout.toUpperCase(),
  };

  const status = checkCompositionProductStatus(composition, catalogOffers);

  // Prepara mapa de ofertas para resolução dinâmica dos dados comerciais
  const offersMap = new Map(catalogOffers.map((o) => [o.id, o]));

  // Determina classes de grid para os slots dependendo do layout
  const getSlotGridClass = (layout: OfferLayout) => {
    switch (layout) {
      case "hero":
        return "screen-slots-grid-hero";
      case "duo":
        return "screen-slots-grid-duo";
      case "trio":
        return "screen-slots-grid-trio";
      case "grid4":
        return "screen-slots-grid-grid4";
      case "grid8":
        return "screen-slots-grid-grid8";
      default:
        return "screen-slots-grid-duo";
    }
  };

  return (
    <article
      className={`admin-screen-card ${!composition.active ? "inactive" : ""}`}
      key={composition.id}
    >
      {/* 1. Header da Tela */}
      <div className="admin-screen-card-header">
        <div className="admin-screen-card-meta">
          <span className="admin-screen-index-badge">
            TELA {String(index + 1).padStart(2, "0")}
          </span>

          <span className="admin-screen-layout-badge">
            {layoutInfo.label} • {layoutInfo.tag}
          </span>

          <span className="admin-screen-duration-badge" title="Tempo de exibição nesta tela">
            <Clock size={12} />
            <span>{composition.duration}s</span>
          </span>

          <span
            className={`admin-status-chip ${composition.active ? "active" : "inactive"}`}
            style={{ fontSize: "11px", padding: "2px 7px" }}
          >
            <span className="admin-status-chip-dot" />
            <span>{composition.active ? "Ativa" : "Oculta"}</span>
          </span>

          {status.hasInactive && (
            <span
              className="admin-screen-warning-tag"
              title={`${status.inactiveCount} produto(s) inativo(s) no cadastro de ofertas`}
            >
              <AlertTriangle size={11} />
              <span>{status.inactiveCount} inativo(s)</span>
            </span>
          )}

          {status.hasMissing && (
            <span
              className="admin-screen-danger-tag"
              title={`${status.missingCount} produto(s) não encontrado(s) no cadastro`}
            >
              <AlertTriangle size={11} />
              <span>{status.missingCount} ausente(s)</span>
            </span>
          )}
        </div>

        {/* Ações do Header */}
        <div className="admin-screen-card-actions" ref={menuRef}>
          <button
            type="button"
            className="admin-btn-secondary"
            style={{ padding: "6px 12px", minHeight: "34px", fontSize: "12.5px", gap: "5px" }}
            onClick={() => onEdit(composition)}
          >
            <Pencil size={13} />
            <span className="hide-on-mobile">Editar</span>
          </button>

          <button
            type="button"
            className="admin-btn-secondary"
            style={{
              padding: "6px 8px",
              minHeight: "34px",
              borderRadius: "8px",
              border: menuOpen ? "1px solid var(--skalee-purple)" : undefined,
            }}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={`Opções da Tela ${index + 1}`}
            aria-expanded={menuOpen}
          >
            <MoreVertical size={16} />
          </button>

          {menuOpen && (
            <div className="admin-context-menu-dropdown" role="menu">
              <button
                type="button"
                className="admin-context-menu-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(composition);
                }}
              >
                <Pencil size={14} style={{ color: "var(--skalee-purple-light)" }} />
                <span>Editar produtos e layout</span>
              </button>

              <button
                type="button"
                className="admin-context-menu-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onToggleActive(composition.id);
                }}
              >
                {composition.active ? (
                  <>
                    <EyeOff size={14} style={{ color: "var(--skalee-text-muted)" }} />
                    <span>Ocultar na TV</span>
                  </>
                ) : (
                  <>
                    <Eye size={14} style={{ color: "var(--skalee-status-online)" }} />
                    <span>Ativar na TV</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="admin-context-menu-item"
                role="menuitem"
                disabled={index === 0}
                style={{ opacity: index === 0 ? 0.4 : 1, cursor: index === 0 ? "not-allowed" : "pointer" }}
                onClick={() => {
                  if (index === 0) return;
                  setMenuOpen(false);
                  onMoveUp(index);
                }}
              >
                <ArrowUp size={14} />
                <span>Mover para cima</span>
              </button>

              <button
                type="button"
                className="admin-context-menu-item"
                role="menuitem"
                disabled={index === totalScreens - 1}
                style={{
                  opacity: index === totalScreens - 1 ? 0.4 : 1,
                  cursor: index === totalScreens - 1 ? "not-allowed" : "pointer",
                }}
                onClick={() => {
                  if (index === totalScreens - 1) return;
                  setMenuOpen(false);
                  onMoveDown(index);
                }}
              >
                <ArrowDown size={14} />
                <span>Mover para baixo</span>
              </button>

              <button
                type="button"
                className="admin-context-menu-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onDuplicate(composition);
                }}
              >
                <Copy size={14} />
                <span>Duplicar tela</span>
              </button>

              <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.08)", margin: "4px 0" }} />

              <button
                type="button"
                className="admin-context-menu-item danger"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(composition.id);
                }}
              >
                <Trash2 size={14} />
                <span>Excluir tela</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Visualização dos Slots de Produtos da Tela */}
      <div className={`admin-screen-slots-wrapper ${getSlotGridClass(composition.layout)}`}>
        {composition.offers.map((compOffer, slotIdx) => {
          // Resolve dinamicamente os dados comerciais atuais da oferta
          const liveOffer = offersMap.get(compOffer.id) || compOffer;
          const isInactive = !liveOffer.active;
          const isMissing = !offersMap.has(compOffer.id);

          return (
            <div
              key={compOffer.id}
              className={`admin-screen-slot-item ${isInactive ? "slot-inactive" : ""}`}
            >
              {/* Slot Thumbnail */}
              <div className="admin-screen-slot-thumb-box">
                {liveOffer.image ? (
                  <img
                    src={liveOffer.image}
                    alt={liveOffer.name}
                    className="admin-screen-slot-img"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span style={{ fontSize: "18px", opacity: 0.3 }}>🛒</span>
                )}
                <span className="admin-screen-slot-index-tag">#{slotIdx + 1}</span>
              </div>

              {/* Slot Product Details (Preço apenas informativo da oferta) */}
              <div className="admin-screen-slot-info">
                <span className="admin-screen-slot-name" title={liveOffer.name}>
                  {liveOffer.name}
                </span>

                <div className="admin-screen-slot-price-row">
                  <span className="admin-screen-slot-price-value">
                    R$ {liveOffer.promotionalPrice}
                  </span>
                  <span className="admin-screen-slot-price-unit">/{liveOffer.unit}</span>
                </div>

                {isMissing && (
                  <span className="admin-screen-slot-alert-badge">Ausente</span>
                )}
                {!isMissing && isInactive && (
                  <span className="admin-screen-slot-alert-badge">Inativo</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Rodapé Informativo */}
      <div className="admin-screen-card-footer">
        <span className="admin-screen-footer-summary">
          {composition.offers.length} {composition.offers.length === 1 ? "produto vinculado" : "produtos vinculados"} • Exibição por {composition.duration} segundos
        </span>
      </div>
    </article>
  );
};

