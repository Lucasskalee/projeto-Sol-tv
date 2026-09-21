import React from "react";
import { ExternalLink, LogOut, Tv as TvIcon } from "lucide-react";
import { SECTORS } from "../../../data";

export interface AdminHeaderProps {
  currentStore?: string;
  currentSector: string;
  onSelectSector: (sector: string) => void;
  connection: "online" | "syncing" | "offline";
  lastSync: Date | null;
  onLogout: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  currentStore = "Loja 01",
  currentSector,
  onSelectSector,
  connection,
  lastSync,
  onLogout,
}) => {
  const currentSectorObj = SECTORS.find((s) => s.id === currentSector);
  const currentSectorLabel = currentSectorObj?.label || currentSector;

  return (
    <header className="admin-header">
      <div className="admin-header-content">
        {/* Left side: Mobile Brand & Selectors */}
        <div className="admin-header-left">
          <div className="admin-header-brand-mobile">
            <img
              src="/logo-skalee.jpg"
              alt="Skalee TV"
              className="admin-sidebar-logo-img"
              style={{ width: "32px", height: "32px" }}
              onError={(e) => {
                // Fallback if image fails to load
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
            <span style={{ fontWeight: 800, fontSize: "14px", letterSpacing: "0.04em" }}>
              SKALEE <span style={{ color: "var(--skalee-purple)" }}>TV</span>
            </span>
          </div>

          <div className="admin-header-selectors">
            {/* Store Badge / Selector */}
            <span className="admin-chip admin-chip-purple" title="Loja selecionada">
              🏬 {currentStore}
            </span>

            {/* Sector Selector */}
            <select
              className="admin-select-compact"
              value={currentSector}
              onChange={(e) => onSelectSector(e.target.value)}
              aria-label="Selecionar setor da TV"
            >
              {SECTORS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right side: Status indicator, Open TV, and Logout */}
        <div className="admin-header-right">
          {/* Status Indicator */}
          <div
            className={`admin-status ${
              connection === "online"
                ? "admin-status-online"
                : connection === "syncing"
                ? "admin-status-syncing"
                : "admin-status-offline"
            }`}
            title={
              lastSync
                ? `Última sincronização: ${lastSync.toLocaleTimeString("pt-BR")}`
                : "Aguardando sincronização"
            }
          >
            <span className="admin-status-dot" />
            <span className="hide-on-mobile">
              {connection === "online"
                ? "TV Online"
                : connection === "syncing"
                ? "Sincronizando..."
                : "TV Offline"}
            </span>
          </div>

          {/* Quick Open TV */}
          <a
            href={`/tv/${currentSector}`}
            target="_blank"
            rel="noreferrer"
            className="admin-btn-secondary"
            style={{ padding: "6px 12px", minHeight: "34px", fontSize: "12.5px" }}
            title={`Abrir exibição da TV — ${currentSectorLabel}`}
          >
            <TvIcon size={14} />
            <span className="hide-on-mobile">Abrir TV</span>
            <ExternalLink size={12} style={{ opacity: 0.7 }} />
          </a>

          {/* Logout */}
          <button
            type="button"
            className="admin-btn-secondary"
            style={{ padding: "6px 10px", minHeight: "34px" }}
            onClick={onLogout}
            title="Encerrar sessão"
            aria-label="Sair"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </header>
  );
};

