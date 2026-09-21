import React from "react";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Layers,
  Film,
  Calendar,
  Palette,
  Sparkles,
  Monitor,
  Settings,
} from "lucide-react";

export type AdminTab =
  | "overview"
  | "programs"
  | "catalogs"
  | "offers"
  | "media"
  | "themes"
  | "tvs"
  | "settings";

export interface DesktopSidebarProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  counts?: {
    programs?: number;
    offers?: number;
    media?: number;
    catalogs?: number;
  };
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeTab,
  onSelectTab,
  counts = {},
}) => {
  return (
    <aside className="admin-sidebar" aria-label="Navegação Administrativa">
      <div>
        {/* Brand Header */}
        <div className="admin-sidebar-brand" title="Skalee TV — Painel de Gestão">
          <img
            src="/logo-skalee.jpg"
            alt="Skalee Logo"
            className="admin-sidebar-logo-img"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
          <div className="admin-sidebar-brand-text">
            <span className="admin-sidebar-brand-title">SKALEE TV</span>
            <span className="admin-sidebar-brand-subtitle">Painel de Gestão</span>
          </div>
        </div>

        {/* SECTION: VISÃO */}
        <div className="admin-sidebar-section">
          <div className="admin-sidebar-heading">Visão</div>
          <ul className="admin-sidebar-nav">
            <li>
              <button
                type="button"
                className={`admin-sidebar-link ${activeTab === "overview" ? "active" : ""}`}
                onClick={() => onSelectTab("overview")}
                title="Início / Visão Geral"
              >
                <LayoutDashboard size={18} />
                <span className="admin-sidebar-label">Início</span>
              </button>
            </li>
          </ul>
        </div>

        {/* SECTION: CONTEÚDO */}
        <div className="admin-sidebar-section">
          <div className="admin-sidebar-heading">Conteúdo</div>
          <ul className="admin-sidebar-nav">
            <li>
              <button
                type="button"
                className={`admin-sidebar-link ${activeTab === "offers" ? "active" : ""}`}
                onClick={() => onSelectTab("offers")}
                title={`Ofertas (${counts.offers ?? 0})`}
              >
                <Package size={18} />
                <span className="admin-sidebar-label">Ofertas</span>
                {typeof counts.offers === "number" && (
                  <span className="admin-sidebar-badge">{counts.offers}</span>
                )}
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`admin-sidebar-link ${activeTab === "catalogs" ? "active" : ""}`}
                onClick={() => onSelectTab("catalogs")}
                title={`Catálogos (${counts.catalogs ?? 0})`}
              >
                <Layers size={18} />
                <span className="admin-sidebar-label">Catálogos</span>
                {typeof counts.catalogs === "number" && (
                  <span className="admin-sidebar-badge">{counts.catalogs}</span>
                )}
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`admin-sidebar-link ${activeTab === "media" ? "active" : ""}`}
                onClick={() => onSelectTab("media")}
                title={`Mídias (${counts.media ?? 0})`}
              >
                <Film size={18} />
                <span className="admin-sidebar-label">Mídias</span>
                {typeof counts.media === "number" && (
                  <span className="admin-sidebar-badge">{counts.media}</span>
                )}
              </button>
            </li>
          </ul>
        </div>

        {/* SECTION: EXIBIÇÃO */}
        <div className="admin-sidebar-section">
          <div className="admin-sidebar-heading">Exibição</div>
          <ul className="admin-sidebar-nav">
            <li>
              <button
                type="button"
                className={`admin-sidebar-link ${activeTab === "programs" ? "active" : ""}`}
                onClick={() => onSelectTab("programs")}
                title={`Programação (${counts.programs ?? 0})`}
              >
                <Calendar size={18} />
                <span className="admin-sidebar-label">Programação</span>
                {typeof counts.programs === "number" && (
                  <span className="admin-sidebar-badge">{counts.programs}</span>
                )}
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`admin-sidebar-link ${activeTab === "themes" ? "active" : ""}`}
                onClick={() => onSelectTab("themes")}
                title="Temas Visuais"
              >
                <Palette size={18} />
                <span className="admin-sidebar-label">Temas</span>
              </button>
            </li>
            <li>
              <Link
                to="/studio/motion"
                className="admin-sidebar-link"
                title="Motion Studio 16:9"
              >
                <Sparkles size={18} />
                <span className="admin-sidebar-label">Motion Studio</span>
                <span className="admin-chip admin-chip-purple" style={{ marginLeft: "auto", fontSize: "10px" }}>
                  16:9
                </span>
              </Link>
            </li>
          </ul>
        </div>

        {/* SECTION: SISTEMA */}
        <div className="admin-sidebar-section">
          <div className="admin-sidebar-heading">Sistema</div>
          <ul className="admin-sidebar-nav">
            <li>
              <button
                type="button"
                className={`admin-sidebar-link ${activeTab === "tvs" ? "active" : ""}`}
                onClick={() => onSelectTab("tvs")}
                title="TVs e Setores"
              >
                <Monitor size={18} />
                <span className="admin-sidebar-label">TVs e Setores</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`admin-sidebar-link ${activeTab === "settings" ? "active" : ""}`}
                onClick={() => onSelectTab("settings")}
                title="Configurações & Sincronização"
              >
                <Settings size={18} />
                <span className="admin-sidebar-label">Configurações</span>
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div className="admin-sidebar-footer">
        <span style={{ fontSize: "11px", color: "var(--skalee-text-muted)" }}>
          Skalee TV v2.4 • Offline Ready
        </span>
      </div>
    </aside>
  );
};
