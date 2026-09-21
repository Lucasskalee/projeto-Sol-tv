import React, { useEffect, useRef, useState } from "react";
import {
  MoreVertical,
  Edit3,
  Copy,
  Play,
  Sparkles,
  Trash2,
  Pause,
  Radio,
  CheckCircle,
} from "lucide-react";
import type { TvProgram } from "../../../offers/programs";

export type ProgramActionsMenuProps = {
  program: TvProgram;
  onEdit: (program: TvProgram) => void;
  onDuplicate: (program: TvProgram) => void;
  onToggleStatus?: (program: TvProgram) => void;
  onTest?: (program: TvProgram) => void;
  onOpenSimulator?: (program: TvProgram) => void;
  onDelete: (id: string) => void;
};

export function ProgramActionsMenu({
  program,
  onEdit,
  onDuplicate,
  onToggleStatus,
  onTest,
  onOpenSimulator,
  onDelete,
}: ProgramActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fecha o menu ao clicar fora ou ao pressionar ESC
  useEffect(() => {
    if (!isOpen) return;

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

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const isPublished = program.status === "published";
  const isDraft = program.status === "draft";
  const isDisabled = program.status === "disabled";

  return (
    <div className="admin-program-actions-wrapper" ref={menuRef}>
      <button
        type="button"
        className={`admin-icon-btn admin-actions-trigger-btn ${isOpen ? "active" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        aria-label={`Ações da programação ${program.name}`}
        aria-expanded={isOpen}
        title="Mais opções"
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && (
        <div className="admin-program-dropdown-menu" role="menu">
          <button
            type="button"
            className="admin-dropdown-item"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onEdit(program);
            }}
          >
            <Edit3 size={14} className="item-icon" />
            <span>Editar</span>
          </button>

          <button
            type="button"
            className="admin-dropdown-item"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onDuplicate(program);
            }}
          >
            <Copy size={14} className="item-icon" />
            <span>Duplicar</span>
          </button>

          {onToggleStatus && (
            <button
              type="button"
              className="admin-dropdown-item"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onToggleStatus(program);
              }}
            >
              {isDisabled ? (
                <>
                  <Radio size={14} className="item-icon icon-success" />
                  <span>Ativar Programação</span>
                </>
              ) : isDraft ? (
                <>
                  <CheckCircle size={14} className="item-icon icon-primary" />
                  <span>Publicar Programação</span>
                </>
              ) : (
                <>
                  <Pause size={14} className="item-icon icon-warning" />
                  <span>Pausar / Desativar</span>
                </>
              )}
            </button>
          )}

          {onTest && (
            <button
              type="button"
              className="admin-dropdown-item"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onTest(program);
              }}
            >
              <Play size={14} className="item-icon" />
              <span>Testar Prévia</span>
            </button>
          )}

          {onOpenSimulator && (
            <button
              type="button"
              className="admin-dropdown-item"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onOpenSimulator(program);
              }}
            >
              <Sparkles size={14} className="item-icon icon-purple" />
              <span>Simulador de Grade</span>
            </button>
          )}

          <div className="admin-dropdown-divider" />

          <button
            type="button"
            className="admin-dropdown-item item-danger"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onDelete(program.id);
            }}
          >
            <Trash2 size={14} className="item-icon" />
            <span>Excluir Programação</span>
          </button>
        </div>
      )}
    </div>
  );
}

