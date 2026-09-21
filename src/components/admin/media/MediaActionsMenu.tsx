import React, { useState, useRef, useEffect } from "react";
import {
  MoreVertical,
  Pencil,
  Eye,
  EyeOff,
  Trash2,
  Maximize2,
} from "lucide-react";
import type { SolTvMedia } from "../../../types";

export interface MediaActionsMenuProps {
  media: SolTvMedia;
  onPreview: () => void;
  onEdit: () => void;
  onToggleActive: (active: boolean) => void;
  onDelete: () => void;
}

export const MediaActionsMenu: React.FC<MediaActionsMenuProps> = ({
  media,
  onPreview,
  onEdit,
  onToggleActive,
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
    <div
      className="admin-media-actions-wrapper"
      ref={menuRef}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="admin-btn-secondary admin-media-menu-trigger"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        aria-label={`Ações para a mídia ${media.title || "sem título"}`}
        aria-expanded={isOpen}
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && (
        <div
          className="admin-context-menu-dropdown admin-media-dropdown"
          role="menu"
          aria-label="Opções da mídia"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Visualizar / Preview */}
          <button
            type="button"
            className="admin-context-menu-item"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onPreview();
            }}
          >
            <Maximize2 size={15} style={{ color: "var(--skalee-purple-light)" }} />
            <span>Visualizar</span>
          </button>

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
            <Pencil size={15} style={{ color: "var(--skalee-text-secondary)" }} />
            <span>Editar detalhes</span>
          </button>

          {/* Ativar / Desativar */}
          <button
            type="button"
            className="admin-context-menu-item"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onToggleActive(!media.active);
            }}
          >
            {media.active ? (
              <>
                <EyeOff size={15} style={{ color: "var(--skalee-text-muted)" }} />
                <span>Ocultar da TV</span>
              </>
            ) : (
              <>
                <Eye size={15} style={{ color: "var(--skalee-status-online)" }} />
                <span>Exibir na TV</span>
              </>
            )}
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
            <span>Excluir mídia</span>
          </button>
        </div>
      )}
    </div>
  );
};

