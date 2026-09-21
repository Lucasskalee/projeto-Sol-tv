import React from "react";
import {
  ExternalLink,
  Pencil,
  Package,
  Calendar,
  Film,
  Layers,
  Sparkles,
  Clock,
  Tv as TvIcon,
} from "lucide-react";
import type { TvContent } from "../../../types";
import type { TvProgram } from "../../../offers/programs";
import type { ThemeDefinition } from "../../../themes/types";
import type { MotionConfig } from "../../../motion/types";
import { TvPlayer } from "../../TvPlayer";

export interface AdminOverviewProps {
  currentStore?: string;
  currentSector: string;
  currentSectorLabel: string;
  connection: "online" | "syncing" | "offline";
  lastSync: Date | null;
  content: TvContent;
  programs: TvProgram[];
  tvThemeSlug: "normal" | "black-friday";
  currentTheme: ThemeDefinition;
  motionConfig: MotionConfig;
  onOpenPrograms: () => void;
  onOpenOffers: () => void;
  onOpenMedia: () => void;
  onOpenCatalogs: () => void;
  onOpenThemes: () => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({
  currentStore = "Loja 01",
  currentSector,
  currentSectorLabel,
  connection,
  lastSync,
  content,
  programs,
  tvThemeSlug,
  currentTheme,
  motionConfig,
  onOpenPrograms,
  onOpenOffers,
  onOpenMedia,
  onOpenCatalogs,
}) => {
  // Dados da programação atual e próxima
  const activeProgram =
    programs.find((p) => p.status === "live" || p.status === "published") ||
    programs[0];
  const nextProgram = programs.length > 1 ? programs[1] : null;

  const activeOffersCount = content.offers.filter((o) => o.active).length;
  const activeMediaCount = content.media.filter((m) => m.active).length;

  const activeSchedule = activeProgram?.schedule;
  const nextSchedule = nextProgram?.schedule;

  return (
    <div
      className="admin-overview-container"
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {/* Top Header Card */}
      <div className="admin-card admin-card-elevated" style={{ padding: "18px 22px" }}>
        <div className="admin-card-header" style={{ marginBottom: 0 }}>
          <div className="admin-card-header-left">
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                background:
                  "linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(147, 51, 234, 0.3) 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(168, 85, 247, 0.3)",
              }}
            >
              <TvIcon size={22} style={{ color: "var(--skalee-purple-light)" }} />
            </div>
            <div>
              <h1 className="admin-section-title" style={{ fontSize: "18px" }}>
                SKALEE TV — Painel de Gestão
              </h1>
              <p className="admin-section-subtitle">
                Visão operacional em tempo real da exibição nos terminais de TV
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span className="admin-chip admin-chip-purple">
              🏬 {currentStore}
            </span>
            <span className="admin-chip">
              📍 Setor: {currentSectorLabel}
            </span>
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
                  ? "● TV Online"
                  : connection === "syncing"
                  ? "● Sincronizando..."
                  : "● TV Offline"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Agora na TV & Lateral */}
      <div className="admin-overview-grid">
        {/* Left Column: Agora na TV Preview 16:9 */}
        <section className="admin-card" aria-label="Agora na TV">
          <div className="admin-card-header">
            <div className="admin-card-header-left">
              <span style={{ fontSize: "18px" }}>📺</span>
              <div>
                <h2 className="admin-section-title">AGORA NA TV</h2>
                <p className="admin-section-subtitle">
                  Exibição ao vivo no setor {currentSectorLabel}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <a
                href={`/tv/${currentSector}`}
                target="_blank"
                rel="noreferrer"
                className="admin-btn-primary"
                style={{ padding: "8px 14px", minHeight: "36px", fontSize: "13px" }}
              >
                <span>Abrir TV</span>
                <ExternalLink size={14} />
              </a>
              <button
                type="button"
                className="admin-btn-secondary"
                style={{ padding: "8px 14px", minHeight: "36px", fontSize: "13px" }}
                onClick={onOpenPrograms}
              >
                <Pencil size={14} />
                <span>Editar</span>
              </button>
            </div>
          </div>

          {/* 16:9 TV Preview Window */}
          <div className="admin-tv-preview-wrapper">
            <div className="admin-tv-preview-ratio">
              <TvPlayer
                content={content}
                mode="preview"
                lastSync={lastSync}
                connection={connection}
                sectorLabel={currentSectorLabel}
                theme={currentTheme}
                motionConfig={motionConfig}
              />
            </div>
          </div>

          {/* Metadata Grid Below Preview */}
          <div className="admin-tv-preview-meta">
            <div className="admin-tv-preview-details">
              <div className="admin-meta-box">
                <span className="admin-meta-box-label">Programação Atual</span>
                <span
                  className="admin-meta-box-value"
                  title={activeProgram?.name || "Programação Regular"}
                >
                  {activeProgram?.name || "Programação Regular Base"}
                </span>
              </div>

              <div className="admin-meta-box">
                <span className="admin-meta-box-label">Catálogo / Camadas</span>
                <span className="admin-meta-box-value">
                  {content.compositions.length > 0
                    ? `${content.compositions.length} camadas ativas`
                    : `${activeOffersCount} ofertas em rotação`}
                </span>
              </div>

              <div className="admin-meta-box">
                <span className="admin-meta-box-label">Tema Ativo</span>
                <span
                  className="admin-meta-box-value"
                  style={{
                    color:
                      tvThemeSlug === "black-friday"
                        ? "#ff7b72"
                        : "var(--skalee-purple-light)",
                  }}
                >
                  {tvThemeSlug === "black-friday"
                    ? "🔥 Black Friday"
                    : "✨ Tema Normal"}
                </span>
              </div>

              <div className="admin-meta-box">
                <span className="admin-meta-box-label">Vigência / Horário</span>
                <span
                  className="admin-meta-box-value"
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <Clock size={13} style={{ color: "var(--skalee-text-secondary)" }} />
                  {activeSchedule?.startTime && activeSchedule?.endTime
                    ? `${activeSchedule.startTime} às ${activeSchedule.endTime}`
                    : "Exibição Contínua"}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Próxima Programação & Atalhos */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Próxima Programação Card */}
          <section className="admin-card" aria-label="Próxima Programação">
            <div className="admin-card-header">
              <div className="admin-card-header-left">
                <Clock size={18} style={{ color: "var(--skalee-purple)" }} />
                <div>
                  <h2 className="admin-section-title">PRÓXIMA PROGRAMAÇÃO</h2>
                  <p className="admin-section-subtitle">
                    Próxima grade na sequência de exibição
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="admin-btn-secondary"
                style={{ padding: "6px 10px", minHeight: "30px", fontSize: "12px" }}
                onClick={onOpenPrograms}
              >
                Ver todas
              </button>
            </div>

            {nextProgram ? (
              <div
                style={{
                  background: "var(--skalee-surface-elevated)",
                  border: "1px solid var(--skalee-border)",
                  borderRadius: "var(--admin-radius-md)",
                  padding: "14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <strong
                    style={{ fontSize: "14px", color: "var(--skalee-text-primary)" }}
                  >
                    {nextProgram.name}
                  </strong>
                  <span className="admin-chip admin-chip-purple">
                    {nextSchedule?.recurrence === "flash_offer"
                      ? "⚡ Oferta Relâmpago"
                      : "Regular"}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                    marginTop: "4px",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--skalee-text-secondary)",
                        display: "block",
                      }}
                    >
                      Horário
                    </span>
                    <span
                      style={{
                        fontSize: "12.5px",
                        fontWeight: 600,
                        color: "var(--skalee-text-primary)",
                      }}
                    >
                      {nextSchedule?.startTime && nextSchedule?.endTime
                        ? `${nextSchedule.startTime} - ${nextSchedule.endTime}`
                        : "Sequência automática"}
                    </span>
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--skalee-text-secondary)",
                        display: "block",
                      }}
                    >
                      Tema
                    </span>
                    <span
                      style={{
                        fontSize: "12.5px",
                        fontWeight: 600,
                        color: "var(--skalee-text-primary)",
                      }}
                    >
                      {tvThemeSlug === "black-friday" ? "Black Friday" : "Normal"}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: "var(--skalee-surface-elevated)",
                  border: "1px dashed var(--skalee-border)",
                  borderRadius: "var(--admin-radius-md)",
                  padding: "18px",
                  textAlign: "center",
                  color: "var(--skalee-text-secondary)",
                  fontSize: "13px",
                }}
              >
                <p style={{ margin: "0 0 10px" }}>
                  A programação atual está configurada em modo contínuo.
                </p>
                <button
                  type="button"
                  className="admin-btn-secondary"
                  style={{ fontSize: "12px", padding: "6px 12px" }}
                  onClick={onOpenPrograms}
                >
                  + Adicionar Programação Agendada
                </button>
              </div>
            )}
          </section>

          {/* Motion Studio Highlight Card */}
          <div
            className="admin-card"
            style={{
              background: "linear-gradient(135deg, #12101c 0%, #171226 100%)",
              borderColor: "rgba(168, 85, 247, 0.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "rgba(168, 85, 247, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--skalee-purple-light)",
                  flexShrink: 0,
                }}
              >
                <Sparkles size={20} />
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "#ffffff",
                  }}
                >
                  Motion Lab & Editor 16:9
                </h3>
                <p
                  style={{
                    margin: "3px 0 0",
                    fontSize: "12px",
                    color: "var(--skalee-text-secondary)",
                    lineHeight: 1.4,
                  }}
                >
                  Calibre posições de logo, tipografia, física de preços e animações em tempo real.
                </p>
              </div>
            </div>

            <a
              href="/studio/motion"
              className="admin-btn-primary"
              style={{ width: "100%", justifyContent: "center" }}
            >
              <span>Abrir Motion Lab 16:9</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>

      {/* Indicadores Compactos */}
      <section aria-label="Indicadores Operacionais">
        <h2
          className="admin-section-title"
          style={{ marginBottom: "12px", fontSize: "15px" }}
        >
          INDICADORES OPERACIONAIS — {currentSectorLabel}
        </h2>

        <div className="admin-metrics-grid">
          {/* Card: Ofertas Ativas */}
          <div
            className="admin-metric-card"
            onClick={onOpenOffers}
            style={{ cursor: "pointer" }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onOpenOffers()}
          >
            <div className="admin-metric-header">
              <span className="admin-metric-label">Ofertas Ativas</span>
              <div className="admin-metric-icon">
                <Package size={18} />
              </div>
            </div>
            <div>
              <div className="admin-metric-number">
                {activeOffersCount}
                <span
                  style={{
                    fontSize: "14px",
                    color: "var(--skalee-text-secondary)",
                    fontWeight: 500,
                  }}
                >
                  /{content.offers.length}
                </span>
              </div>
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--skalee-status-online)",
                  fontWeight: 600,
                }}
              >
                ● {activeOffersCount} no catálogo
              </span>
            </div>
          </div>

          {/* Card: Programações */}
          <div
            className="admin-metric-card"
            onClick={onOpenPrograms}
            style={{ cursor: "pointer" }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onOpenPrograms()}
          >
            <div className="admin-metric-header">
              <span className="admin-metric-label">Programações</span>
              <div className="admin-metric-icon">
                <Calendar size={18} />
              </div>
            </div>
            <div>
              <div className="admin-metric-number">{programs.length}</div>
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--skalee-purple-light)",
                  fontWeight: 600,
                }}
              >
                {
                  programs.filter(
                    (p) => p.status === "live" || p.status === "published",
                  ).length
                }{" "}
                ativas na grade
              </span>
            </div>
          </div>

          {/* Card: Mídias Ativas */}
          <div
            className="admin-metric-card"
            onClick={onOpenMedia}
            style={{ cursor: "pointer" }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onOpenMedia()}
          >
            <div className="admin-metric-header">
              <span className="admin-metric-label">Mídias Ativas</span>
              <div className="admin-metric-icon">
                <Film size={18} />
              </div>
            </div>
            <div>
              <div className="admin-metric-number">
                {activeMediaCount}
                <span
                  style={{
                    fontSize: "14px",
                    color: "var(--skalee-text-secondary)",
                    fontWeight: 500,
                  }}
                >
                  /{content.media.length}
                </span>
              </div>
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--skalee-text-secondary)",
                }}
              >
                Imagens e vídeos
              </span>
            </div>
          </div>

          {/* Card: Catálogos / Camadas */}
          <div
            className="admin-metric-card"
            onClick={onOpenCatalogs}
            style={{ cursor: "pointer" }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onOpenCatalogs()}
          >
            <div className="admin-metric-header">
              <span className="admin-metric-label">Camadas / Catálogo</span>
              <div className="admin-metric-icon">
                <Layers size={18} />
              </div>
            </div>
            <div>
              <div className="admin-metric-number">
                {content.compositions.length}
              </div>
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--skalee-text-secondary)",
                }}
              >
                Composições na TV
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

