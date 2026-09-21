import React from "react";
import { Link } from "react-router-dom";
import {
  Package,
  Film,
  Palette,
  Sparkles,
  Monitor,
  Settings,
  LogOut,
  X,
  ExternalLink,
} from "lucide-react";
import type { AdminTab } from "./DesktopSidebar";

export interface MobileMoreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: AdminTab) => void;
  onLogout: () => void;
  currentSector: string;
}

export const MobileMoreDrawer: React.FC<MobileMoreDrawerProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  onLogout,
  currentSector,
}) => {
  if (!isOpen) return null;

  const handleItemClick = (tab: AdminTab) => {
    onSelectTab(tab);
    onClose();
  };

  return (
    <>
      <div
        className="admin-drawer-overlay"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="admin-drawer-content"
        role="dialog"
        aria-modal="true"
        aria-label="Menu Mais Opções"
      >
        <div className="admin-drawer-handle" />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: 800, fontSize: "16px", color: "var(--skalee-text-primary)" }}>
              Mais Opções
            </span>
          </div>
          <button
            type="button"
            className="admin-btn-secondary"
            style={{ padding: "4px 8px", minHeight: "30px" }}
            onClick={onClose}
            aria-label="Fechar menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* SECTION: CONTEÚDO */}
        <div className="admin-drawer-heading">Conteúdo</div>
        <div className="admin-drawer-grid">
          <button
            type="button"
            className="admin-drawer-item"
            onClick={() => handleItemClick("offers")}
          >
            <Package size={18} />
            <span>Ofertas</span>
          </button>
          <button
            type="button"
            className="admin-drawer-item"
            onClick={() => handleItemClick("media")}
          >
            <Film size={18} />
            <span>Mídias</span>
          </button>
        </div>

        {/* SECTION: PERSONALIZAÇÃO */}
        <div className="admin-drawer-heading">Personalização</div>
        <div className="admin-drawer-grid">
          <button
            type="button"
            className="admin-drawer-item"
            onClick={() => handleItemClick("themes")}
          >
            <Palette size={18} />
            <span>Temas</span>
          </button>
          <Link
            to="/studio/motion"
            className="admin-drawer-item"
            onClick={onClose}
          >
            <Sparkles size={18} />
            <span>Motion Lab 16:9</span>
          </Link>
        </div>

        {/* SECTION: SISTEMA */}
        <div className="admin-drawer-heading">Sistema</div>
        <div className="admin-drawer-grid">
          <button
            type="button"
            className="admin-drawer-item"
            onClick={() => handleItemClick("tvs")}
          >
            <Monitor size={18} />
            <span>TVs & Setores</span>
          </button>
          <button
            type="button"
            className="admin-drawer-item"
            onClick={() => handleItemClick("settings")}
          >
            <Settings size={18} />
            <span>Configurações</span>
          </button>
        </div>

        {/* TV Link & Sair */}
        <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <a
            href={`/tv/${currentSector}`}
            target="_blank"
            rel="noreferrer"
            className="admin-btn-secondary"
            style={{ width: "100%", justifyContent: "center" }}
          >
            <span>Abrir Tela da TV</span>
            <ExternalLink size={14} />
          </a>

          <button
            type="button"
            className="admin-danger-button"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={() => {
              onClose();
              onLogout();
            }}
          >
            <LogOut size={16} />
            <span>Encerrar Sessão</span>
          </button>
        </div>
      </div>
    </>
  );
};

