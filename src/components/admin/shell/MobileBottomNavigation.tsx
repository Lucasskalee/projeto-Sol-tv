import React from "react";
import {
  LayoutDashboard,
  Layers,
  Calendar,
  MoreHorizontal,
} from "lucide-react";
import type { AdminTab } from "./DesktopSidebar";

export interface MobileBottomNavigationProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  onOpenMore: () => void;
  isMoreOpen?: boolean;
}

export const MobileBottomNavigation: React.FC<MobileBottomNavigationProps> = ({
  activeTab,
  onSelectTab,
  onOpenMore,
  isMoreOpen = false,
}) => {
  return (
    <nav className="admin-mobile-nav" aria-label="Navegação Principal Mobile">
      <button
        type="button"
        className={`admin-mobile-nav-btn ${activeTab === "overview" && !isMoreOpen ? "active" : ""}`}
        onClick={() => onSelectTab("overview")}
      >
        <LayoutDashboard size={20} />
        <span>Início</span>
      </button>

      <button
        type="button"
        className={`admin-mobile-nav-btn ${activeTab === "catalogs" && !isMoreOpen ? "active" : ""}`}
        onClick={() => onSelectTab("catalogs")}
      >
        <Layers size={20} />
        <span>Catálogos</span>
      </button>

      <button
        type="button"
        className={`admin-mobile-nav-btn ${activeTab === "programs" && !isMoreOpen ? "active" : ""}`}
        onClick={() => onSelectTab("programs")}
      >
        <Calendar size={20} />
        <span>Agenda</span>
      </button>

      <button
        type="button"
        className={`admin-mobile-nav-btn ${isMoreOpen ? "active" : ""}`}
        onClick={onOpenMore}
        aria-expanded={isMoreOpen}
        aria-label="Mais opções"
      >
        <MoreHorizontal size={20} />
        <span>Mais</span>
      </button>
    </nav>
  );
};

