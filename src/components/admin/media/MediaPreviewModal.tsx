import React, { useEffect } from "react";
import {
  X,
  Pencil,
  Eye,
  EyeOff,
  Film,
  Image as ImageIcon,
  Clock,
  Layers,
  Calendar,
  ExternalLink,
} from "lucide-react";
import type { SolTvMedia } from "../../../types";
import { VideoSlide } from "../../VideoSlide";
import { MediaStatusChip } from "./MediaStatusChip";

export interface MediaPreviewModalProps {
  media: SolTvMedia | null;
  onClose: () => void;
  onEdit: (media: SolTvMedia) => void;
  onToggleActive: (id: string, active: boolean) => void;
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({
  media,
  onClose,
  onEdit,
  onToggleActive,
}) => {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    if (media) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [media, onClose]);

  if (!media) return null;

  const isVideo = media.type === "video";
  const displayTitle =
    media.title?.trim() || (isVideo ? "Vídeo Institucional" : "Imagem Promocional");

  return (
    <div
      className="admin-media-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-preview-modal-title"
    >
      <div
        className="admin-media-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="admin-media-modal-header">
          <div className="admin-media-modal-header-info">
            <h2 id="media-preview-modal-title" className="admin-media-modal-title">
              {displayTitle}
            </h2>
            <div className="admin-media-modal-header-badges">
              <span className={`admin-media-type-badge ${isVideo ? "badge-video" : "badge-image"}`}>
                {isVideo ? (
                  <>
                    <Film size={12} /> VÍDEO
                  </>
                ) : (
                  <>
                    <ImageIcon size={12} /> IMAGEM
                  </>
                )}
              </span>
              <MediaStatusChip media={media} size="sm" />
            </div>
          </div>

          <button
            type="button"
            className="admin-btn-secondary admin-modal-close-btn"
            onClick={onClose}
            aria-label="Fechar pré-visualização"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Player/Image Left + Metadata Right */}
        <div className="admin-media-modal-body">
          {/* Main Visual Display Area */}
          <div className="admin-media-modal-player-area">
            {isVideo ? (
              /* VideoSlide mounts ONLY when modal is open and unmounts on close */
              <div className="admin-media-modal-video-wrapper">
                <VideoSlide
                  src={media.mediaUrl}
                  title={media.title}
                  mode="preview"
                />
              </div>
            ) : (
              <div className="admin-media-modal-image-wrapper">
                <img
                  src={media.mediaUrl}
                  alt={displayTitle}
                  className="admin-media-modal-img"
                />
              </div>
            )}
          </div>

          {/* Details / Metadata Panel */}
          <div className="admin-media-modal-sidebar">
            <h4 className="admin-media-sidebar-title">Detalhes da Mídia</h4>

            <div className="admin-media-meta-list">
              <div className="admin-media-meta-row">
                <span className="meta-label">
                  <Film size={13} /> Tipo de Conteúdo
                </span>
                <span className="meta-val">{isVideo ? "Vídeo (MP4)" : "Imagem"}</span>
              </div>

              <div className="admin-media-meta-row">
                <span className="meta-label">
                  <Clock size={13} /> Duração na TV
                </span>
                <span className="meta-val">{media.duration} segundos</span>
              </div>

              <div className="admin-media-meta-row">
                <span className="meta-label">
                  <Layers size={13} /> Posição na Playlist
                </span>
                <span className="meta-val">#{media.position}</span>
              </div>

              <div className="admin-media-meta-row">
                <span className="meta-label">Setor da TV</span>
                <span className="meta-val highlight">{media.sector.toUpperCase()}</span>
              </div>

              {(media.startsAt || media.endsAt) && (
                <div className="admin-media-meta-row">
                  <span className="meta-label">
                    <Calendar size={13} /> Vigência
                  </span>
                  <span className="meta-val">
                    {media.startsAt ? media.startsAt : "Imediato"} até{" "}
                    {media.endsAt ? media.endsAt : "Indeterminado"}
                  </span>
                </div>
              )}

              {media.mediaUrl && (
                <div className="admin-media-meta-row link-row">
                  <span className="meta-label">Link Direto</span>
                  <a
                    href={media.mediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="meta-link"
                  >
                    <span>Abrir arquivo</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>

            {/* Quick Actions in Modal */}
            <div className="admin-media-modal-actions">
              <button
                type="button"
                className="admin-primary-button"
                onClick={() => {
                  onClose();
                  onEdit(media);
                }}
              >
                <Pencil size={14} />
                <span>Editar detalhes</span>
              </button>

              <button
                type="button"
                className={`admin-btn-secondary ${media.active ? "" : "active"}`}
                onClick={() => onToggleActive(media.id, !media.active)}
              >
                {media.active ? (
                  <>
                    <EyeOff size={14} />
                    <span>Ocultar da TV</span>
                  </>
                ) : (
                  <>
                    <Eye size={14} style={{ color: "var(--skalee-status-online)" }} />
                    <span>Ativar na TV</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

