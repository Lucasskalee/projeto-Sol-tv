import React, { useState } from "react";
import { Film, Image as ImageIcon, Clock, Play, Layers } from "lucide-react";
import type { SolTvMedia } from "../../../types";
import { MediaStatusChip } from "./MediaStatusChip";
import { MediaActionsMenu } from "./MediaActionsMenu";

export interface MediaCardProps {
  media: SolTvMedia;
  onPreview: (media: SolTvMedia) => void;
  onEdit: (media: SolTvMedia) => void;
  onToggleActive: (id: string, active: boolean) => void;
  onDelete: (id: string, storagePath?: string) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  media,
  onPreview,
  onEdit,
  onToggleActive,
  onDelete,
}) => {
  const [imgError, setImgError] = useState(false);
  const isVideo = media.type === "video";
  const displayTitle =
    media.title?.trim() || (isVideo ? "Vídeo Institucional" : "Imagem Promocional");

  return (
    <article
      className={`admin-media-card ${!media.active ? "inactive" : ""}`}
      onClick={() => onPreview(media)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPreview(media);
        }
      }}
      aria-label={`Mídia: ${displayTitle}. Clique para pré-visualizar.`}
    >
      {/* 16:9 Visual Thumbnail Area */}
      <div className="admin-media-card-thumbnail-container">
        {isVideo ? (
          /* PURE STATIC PLACEHOLDER FOR VIDEOS — ZERO <video> TAGS */
          <div className="admin-media-card-video-placeholder">
            <div className="admin-media-video-glow" aria-hidden="true" />
            <div className="admin-media-video-play-icon">
              <Play size={22} fill="currentColor" />
            </div>
            <span className="admin-media-video-hint">Clique para reproduzir</span>
          </div>
        ) : imgError || !media.mediaUrl ? (
          <div className="admin-media-card-fallback">
            <ImageIcon size={32} />
            <span>Imagem indisponível</span>
          </div>
        ) : (
          <img
            src={media.mediaUrl}
            alt={displayTitle}
            loading="lazy"
            className="admin-media-card-img"
            onError={() => setImgError(true)}
          />
        )}

        {/* Top Floating Badges */}
        <div className="admin-media-card-top-badges">
          <span className={`admin-media-type-badge ${isVideo ? "badge-video" : "badge-image"}`}>
            {isVideo ? (
              <>
                <Film size={11} /> VÍDEO
              </>
            ) : (
              <>
                <ImageIcon size={11} /> IMAGEM
              </>
            )}
          </span>

          <span className="admin-media-duration-badge">
            <Clock size={11} /> {media.duration}s
          </span>
        </div>

        {/* Top-Right Status Chip */}
        <div className="admin-media-card-status-badge">
          <MediaStatusChip media={media} size="sm" />
        </div>
      </div>

      {/* Media Info Footer */}
      <div className="admin-media-card-body">
        <div className="admin-media-card-info">
          <h3 className="admin-media-card-title" title={displayTitle}>
            {displayTitle}
          </h3>
          <div className="admin-media-card-meta">
            <span className="admin-media-meta-tag">
              <Layers size={11} /> Posição {media.position}
            </span>
            <span className="admin-media-meta-sector">
              {media.sector.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Quick Actions Dropdown */}
        <div className="admin-media-card-actions">
          <MediaActionsMenu
            media={media}
            onPreview={() => onPreview(media)}
            onEdit={() => onEdit(media)}
            onToggleActive={(active) => onToggleActive(media.id, active)}
            onDelete={() => onDelete(media.id, media.storagePath)}
          />
        </div>
      </div>
    </article>
  );
};

