import React from "react";
import { Monitor, ExternalLink, Check } from "lucide-react";
import { SECTORS } from "../../../data";

export interface AdminTvsTabProps {
  currentSector: string;
  onSelectSector: (sector: string) => void;
  connection: "online" | "syncing" | "offline";
}

export const AdminTvsTab: React.FC<AdminTvsTabProps> = ({
  currentSector,
  onSelectSector,
  connection,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div className="admin-card admin-card-elevated">
        <div className="admin-card-header">
          <div className="admin-card-header-left">
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "8px",
                background: "rgba(168, 85, 247, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--skalee-purple-light)",
              }}
            >
              <Monitor size={20} />
            </div>
            <div>
              <h2 className="admin-section-title">TVs e Pontos de Exibição</h2>
              <p className="admin-section-subtitle">
                Monitore e gerencie os terminais de TV espalhados pela loja
              </p>
            </div>
          </div>
        </div>

        {/* Sectors Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "14px",
            marginTop: "12px",
          }}
        >
          {SECTORS.map((sec) => {
            const isSelected = sec.id === currentSector;
            return (
              <div
                key={sec.id}
                className={`admin-card ${isSelected ? "admin-card-elevated" : ""}`}
                style={{
                  borderColor: isSelected ? "var(--skalee-purple)" : "var(--skalee-border)",
                  boxShadow: isSelected ? "0 0 16px rgba(168, 85, 247, 0.12)" : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "12px",
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0, fontSize: "15px", color: "var(--skalee-text-primary)" }}>
                      {sec.label}
                    </h3>
                    <span style={{ fontSize: "11px", color: "var(--skalee-text-secondary)" }}>
                      Canal: /tv/{sec.id}
                    </span>
                  </div>

                  <span
                    className={`admin-status ${
                      connection === "online" ? "admin-status-online" : "admin-status-syncing"
                    }`}
                    style={{ fontSize: "11px", padding: "2px 8px" }}
                  >
                    <span className="admin-status-dot" />
                    Online
                  </span>
                </div>

                <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
                  <button
                    type="button"
                    className={isSelected ? "admin-btn-primary" : "admin-btn-secondary"}
                    style={{ flex: 1, fontSize: "12.5px", padding: "8px 10px", minHeight: "36px" }}
                    onClick={() => onSelectSector(sec.id)}
                  >
                    {isSelected ? (
                      <>
                        <Check size={14} />
                        <span>Selecionado</span>
                      </>
                    ) : (
                      <span>Gerenciar Setor</span>
                    )}
                  </button>

                  <a
                    href={`/tv/${sec.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="admin-btn-secondary"
                    style={{ padding: "8px 12px", minHeight: "36px", fontSize: "12.5px" }}
                    title={`Abrir TV do setor ${sec.label}`}
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

