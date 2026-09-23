import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, Play, RotateCcw, Sparkles } from "lucide-react";
import type { Offer, SolTvMedia, TvContent } from "../../../types";
import type { OfferComposition } from "../../../offers/compositions";
import { buildCompositionPlaylist } from "../../../offers/compositions";
import { TvPlayer } from "../../TvPlayer";
import { normalTheme } from "../../../themes/normal";
import { blackFridayTheme } from "../../../themes/blackFriday";

export interface CatalogPreviewModalProps {
  contentOverride?: TvContent;
  motionConfig?: import("../../../motion/types").MotionConfig;
  isOpen: boolean;
  catalogTitle: string;
  sector: string;
  sectorLabel: string;
  compositions: OfferComposition[];
  offers: readonly Offer[];
  media?: readonly SolTvMedia[];
  onClose: () => void;
}

export const CatalogPreviewModal: React.FC<CatalogPreviewModalProps> = ({
  contentOverride,
  motionConfig,
  isOpen,
  catalogTitle,
  sector,
  sectorLabel,
  compositions,
  offers,
  media = [],
  onClose,
}) => {
  const [previewThemeSlug, setPreviewThemeSlug] = useState<"normal" | "black-friday">(
    "normal",
  );
  const [replayKey, setReplayKey] = useState<number>(0);

  if (!isOpen) return null;

  const activeTheme = previewThemeSlug === "black-friday" ? blackFridayTheme : normalTheme;

  // Monta playlist unificada das telas ativas com resolução dinâmica das ofertas
  const playlist = buildCompositionPlaylist(
    compositions.filter((c) => c.active),
    media as SolTvMedia[],
  );

  const unifiedTvContent: TvContent = {
    sector,
    offers: offers as Offer[],
    media: media as SolTvMedia[],
    compositions: compositions.filter((c) => c.active),
    playlist,
    publishedAt: new Date().toISOString(),
  };

  const modalContent = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.88)",
        backdropFilter: "blur(6px)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Pré-visualização do catálogo ${catalogTitle}`}
    >
      {/* Header do Preview */}
      <div
        style={{
          width: "100%",
          maxWidth: "1100px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "#ffffff" }}>
            📺 Pré-visualização: {catalogTitle}
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--skalee-text-secondary)" }}>
            Setor: <strong>{sectorLabel}</strong> • {compositions.filter((c) => c.active).length} tela(s) ativa(s) na sequência da TV
          </p>
        </div>

        {/* Seletor Temporário de Tema para Teste */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "rgba(255, 255, 255, 0.06)",
              padding: "3px",
              borderRadius: "8px",
              border: "1px solid var(--skalee-border)",
            }}
          >
            <span style={{ fontSize: "11.5px", color: "var(--skalee-text-secondary)", margin: "0 8px" }}>
              Tema de teste:
            </span>
            <button
              type="button"
              className={`admin-filter-chip ${previewThemeSlug === "normal" ? "active" : ""}`}
              style={{ padding: "4px 10px", fontSize: "11.5px", borderRadius: "6px" }}
              onClick={() => setPreviewThemeSlug("normal")}
            >
              Normal
            </button>
            <button
              type="button"
              className={`admin-filter-chip ${previewThemeSlug === "black-friday" ? "active" : ""}`}
              style={{ padding: "4px 10px", fontSize: "11.5px", borderRadius: "6px" }}
              onClick={() => setPreviewThemeSlug("black-friday")}
            >
              Black Friday
            </button>
          </div>

          <button
            type="button"
            className="admin-btn-secondary"
            style={{ padding: "6px 10px", minHeight: "34px", fontSize: "12px", gap: "5px" }}
            onClick={() => setReplayKey((k) => k + 1)}
            title="Reiniciar apresentação do início"
          >
            <RotateCcw size={13} />
            <span>Reiniciar</span>
          </button>

          <button
            type="button"
            className="admin-btn-secondary"
            style={{ padding: "6px 10px", minHeight: "34px" }}
            onClick={onClose}
            aria-label="Fechar preview"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Frame 16:9 da TV */}
      <div
        style={{
          width: "100%",
          maxWidth: "1100px",
          aspectRatio: "16 / 9",
          borderRadius: "12px",
          overflow: "hidden",
          border: "2px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.8)",
          background: "#0b0d10",
        }}
      >
        {playlist.length === 0 ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              color: "var(--skalee-text-secondary)",
            }}
          >
            <p style={{ margin: 0, fontSize: "14px" }}>
              Nenhuma tela ativa configurada para exibição.
            </p>
            <small style={{ fontSize: "12px", color: "var(--skalee-text-muted)" }}>
              Ative ao menos uma tela no catálogo para iniciar a transmissão.
            </small>
          </div>
        ) : (
          <TvPlayer
            key={replayKey}
            content={contentOverride || unifiedTvContent}
            motionConfig={motionConfig}
            mode="preview"
            connection="online"
            sectorLabel={sectorLabel}
            theme={activeTheme}
          />
        )}
      </div>

      <small
        style={{
          marginTop: "10px",
          fontSize: "11px",
          color: "var(--skalee-text-muted)",
          textAlign: "center",
        }}
      >
        * O tema selecionado nesta tela serve apenas para testes visuais. O tema definitivo da TV é definido no Agendamento.
      </small>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : modalContent;
};

