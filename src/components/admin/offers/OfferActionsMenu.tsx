import React, { useState, useRef, useEffect } from "react";
import {
  MoreVertical,
  Pencil,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
} from "lucide-react";
import type { Offer } from "../../../types";

export interface OfferActionsMenuProps {
  offer: Offer;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onEdit: () => void;
  onToggleActive: (active: boolean) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export const OfferActionsMenu: React.FC<OfferActionsMenuProps> = ({
  offer,
  canMoveUp,
  canMoveDown,
  onEdit,
  onToggleActive,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="admin-offer-actions-wrapper" ref={menuRef}>
      <button
        type="button"
        className="admin-btn-secondary"
        style={{
          padding: "6px 8px",
          minHeight: "34px",
          borderRadius: "8px",
          border: isOpen ? "1px solid var(--skalee-purple)" : undefined,
        }}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Ações para ${offer.name}`}
        aria-expanded={isOpen}
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && (
        <div
          className="admin-context-menu-dropdown"
          role="menu"
          aria-label="Opções da oferta"
        >
          {/* Editar */}
          <button
            type="button"
            className="admin-context-menu-item"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onEdit();
            }}
          >
            <Pencil size={15} style={{ color: "var(--skalee-purple-light)" }} />
            <span>Editar oferta</span>
          </button>

          {/* Ativar / Desativar */}
          <button
            type="button"
            className="admin-context-menu-item"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onToggleActive(!offer.active);
            }}
          >
            {offer.active ? (
              <>
                <EyeOff size={15} style={{ color: "var(--skalee-text-muted)" }} />
                <span>Desativar</span>
              </>
            ) : (
              <>
                <Eye size={15} style={{ color: "var(--skalee-status-online)" }} />
                <span>Ativar na TV</span>
              </>
            )}
          </button>

          {/* Mover para Cima */}
          <button
            type="button"
            className="admin-context-menu-item"
            role="menuitem"
            disabled={!canMoveUp}
            style={{ opacity: canMoveUp ? 1 : 0.4, cursor: canMoveUp ? "pointer" : "not-allowed" }}
            onClick={() => {
              if (!canMoveUp) return;
              setIsOpen(false);
              onMoveUp();
            }}
          >
            <ArrowUp size={15} />
            <span>Adiantar na TV</span>
          </button>

          {/* Mover para Baixo */}
          <button
            type="button"
            className="admin-context-menu-item"
            role="menuitem"
            disabled={!canMoveDown}
            style={{ opacity: canMoveDown ? 1 : 0.4, cursor: canMoveDown ? "pointer" : "not-allowed" }}
            onClick={() => {
              if (!canMoveDown) return;
              setIsOpen(false);
              onMoveDown();
            }}
          >
            <ArrowDown size={15} />
            <span>Adiar na TV</span>
          </button>

          {/* Duplicar */}
          <button
            type="button"
            className="admin-context-menu-item"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onDuplicate();
            }}
          >
            <Copy size={15} />
            <span>Duplicar oferta</span>
          </button>

          <div
            style={{
              height: "1px",
              background: "rgba(255, 255, 255, 0.08)",
              margin: "4px 0",
            }}
          />

          {/* Excluir */}
          <button
            type="button"
            className="admin-context-menu-item danger"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onDelete();
            }}
          >
            <Trash2 size={15} />
            <span>Excluir oferta</span>
          </button>
        </div>
      )}
    </div>
  );
};

