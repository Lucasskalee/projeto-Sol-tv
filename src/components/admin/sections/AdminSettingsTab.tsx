import React, { useState } from "react";
import { Settings, Database, HardDrive, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { databaseConfigured, runStorageDiagnostic } from "../../../supabase";

export interface AdminSettingsTabProps {
  currentSectorLabel: string;
  connection: "online" | "syncing" | "offline";
  lastSync: Date | null;
  onRestoreDemo: () => void;
}

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({
  currentSectorLabel,
  connection,
  lastSync,
  onRestoreDemo,
}) => {
  const [runningDiag, setRunningDiag] = useState(false);
  const [diagResult, setDiagResult] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);

  const handleDiagnostic = async () => {
    setRunningDiag(true);
    setDiagResult(null);
    try {
      await runStorageDiagnostic();
      setDiagResult("Diagnóstico de Storage concluído! Veja os detalhes no console de desenvolvimento.");
    } catch (err) {
      setDiagResult(`Erro no diagnóstico: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunningDiag(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Sincronização e Conectividade */}
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
              <Database size={20} />
            </div>
            <div>
              <h2 className="admin-section-title">Conexão & Sincronização Realtime</h2>
              <p className="admin-section-subtitle">
                Estado da conexão com o banco Supabase e mecanismos de resiliência offline
              </p>
            </div>
          </div>

          <div
            className={`admin-status ${
              connection === "online"
                ? "admin-status-online"
                : connection === "syncing"
                ? "admin-status-syncing"
                : "admin-status-offline"
            }`}
          >
            <span className="admin-status-dot" />
            <span>
              {connection === "online"
                ? "Banco Online"
                : connection === "syncing"
                ? "Sincronizando..."
                : "Banco Offline"}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
            marginTop: "12px",
          }}
        >
          <div className="admin-meta-box">
            <span className="admin-meta-box-label">Status Supabase</span>
            <span className="admin-meta-box-value">
              {databaseConfigured ? "✓ Configurado & Conectado" : "Modo Local (Offline)"}
            </span>
          </div>

          <div className="admin-meta-box">
            <span className="admin-meta-box-label">Última Sincronização</span>
            <span className="admin-meta-box-value">
              {lastSync ? lastSync.toLocaleTimeString("pt-BR") : "Aguardando sincronização"}
            </span>
          </div>

          <div className="admin-meta-box">
            <span className="admin-meta-box-label">Cache Local IndexedDB</span>
            <span className="admin-meta-box-value" style={{ color: "#4ade80" }}>
              ✓ Ativo (Zero Tela Preta)
            </span>
          </div>
        </div>
      </div>

      {/* Diagnóstico de Armazenamento */}
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="admin-card-header-left">
            <HardDrive size={20} style={{ color: "var(--skalee-purple)" }} />
            <div>
              <h3 className="admin-section-title" style={{ fontSize: "15px" }}>
                Diagnóstico de Storage & Egress
              </h3>
              <p className="admin-section-subtitle">
                Audita integridade dos buckets de mídia e rotas de cache do Service Worker
              </p>
            </div>
          </div>

          <button
            type="button"
            className="admin-btn-secondary"
            onClick={handleDiagnostic}
            disabled={runningDiag}
          >
            <RefreshCw size={14} className={runningDiag ? "animate-spin" : ""} />
            <span>{runningDiag ? "Executando..." : "Executar Diagnóstico"}</span>
          </button>
        </div>

        {diagResult && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              background: "rgba(34, 197, 94, 0.1)",
              border: "1px solid rgba(34, 197, 94, 0.25)",
              color: "#4ade80",
              fontSize: "12.5px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <CheckCircle2 size={16} />
            <span>{diagResult}</span>
          </div>
        )}
      </div>

      {/* Restauração de Demonstração */}
      <div className="admin-card" style={{ borderColor: "rgba(239, 68, 68, 0.2)" }}>
        <div className="admin-card-header">
          <div className="admin-card-header-left">
            <AlertTriangle size={20} style={{ color: "#f87171" }} />
            <div>
              <h3 className="admin-section-title" style={{ fontSize: "15px", color: "#fca5a5" }}>
                Zona de Manutenção / Demonstração
              </h3>
              <p className="admin-section-subtitle">
                Restaura as mídias e ofertas de demonstração do setor {currentSectorLabel}
              </p>
            </div>
          </div>
        </div>

        {confirmRestore ? (
          <div
            style={{
              padding: "14px",
              borderRadius: "8px",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <p style={{ margin: 0, fontSize: "13px", color: "#fca5a5" }}>
              Tem certeza que deseja restaurar as ofertas de demonstração para o setor {currentSectorLabel}?
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                className="admin-danger-button"
                onClick={() => {
                  setConfirmRestore(false);
                  onRestoreDemo();
                }}
              >
                Sim, Restaurar Demonstração
              </button>
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => setConfirmRestore(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="admin-danger-button"
            onClick={() => setConfirmRestore(true)}
          >
            Restaurar Dados de Demonstração
          </button>
        )}
      </div>
    </div>
  );
};

