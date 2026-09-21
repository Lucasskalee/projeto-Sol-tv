import React, { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Film,
  Image as ImageIcon,
  Layers,
  CheckCircle2,
  XCircle,
  X,
  Tv,
} from "lucide-react";
import type { SolTvMedia } from "../../../types";
import { MediaCard } from "./MediaCard";
import { MediaPreviewModal } from "./MediaPreviewModal";
import { MediaEditorDrawer } from "./MediaEditorDrawer";

export type MediaFilterType = "all" | "images" | "videos" | "active" | "inactive";

export interface MediaLibraryProps {
  mediaList: SolTvMedia[];
  currentSector: string;
  onSaveMedia: (media: SolTvMedia) => Promise<void>;
  onDeleteMedia: (id: string, storagePath?: string) => Promise<void>;
  onToggleActiveMedia?: (id: string, active: boolean) => Promise<void> | void;
}

export const MediaLibrary: React.FC<MediaLibraryProps> = ({
  mediaList,
  currentSector,
  onSaveMedia,
  onDeleteMedia,
  onToggleActiveMedia,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<MediaFilterType>("all");
  const [previewMedia, setPreviewMedia] = useState<SolTvMedia | null>(null);
  const [editingMedia, setEditingMedia] = useState<SolTvMedia | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // Filter media for the current sector
  const sectorMedia = useMemo(() => {
    return mediaList.filter((m) => m.sector === currentSector);
  }, [mediaList, currentSector]);

  // Metric counts
  const counts = useMemo(() => {
    return {
      total: sectorMedia.length,
      images: sectorMedia.filter((m) => m.type === "image").length,
      videos: sectorMedia.filter((m) => m.type === "video").length,
      active: sectorMedia.filter((m) => m.active).length,
      inactive: sectorMedia.filter((m) => !m.active).length,
    };
  }, [sectorMedia]);

  // Filtered and searched media list
  const filteredMedia = useMemo(() => {
    return sectorMedia.filter((item) => {
      // Search filter (by title)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const titleMatch = (item.title || "").toLowerCase().includes(term);
        const typeMatch = (item.type || "").toLowerCase().includes(term);
        if (!titleMatch && !typeMatch) return false;
      }

      // Pill filter
      if (activeFilter === "images") return item.type === "image";
      if (activeFilter === "videos") return item.type === "video";
      if (activeFilter === "active") return item.active;
      if (activeFilter === "inactive") return !item.active;
      return true;
    });
  }, [sectorMedia, searchTerm, activeFilter]);

  function handleOpenNewMedia() {
    setEditingMedia(null);
    setIsDrawerOpen(true);
    setError("");
  }

  function handleOpenEditMedia(media: SolTvMedia) {
    setEditingMedia(media);
    setIsDrawerOpen(true);
    setError("");
  }

  async function handleToggleActive(id: string, active: boolean) {
    try {
      if (onToggleActiveMedia) {
        await onToggleActiveMedia(id, active);
      } else {
        const target = sectorMedia.find((m) => m.id === id);
        if (target) {
          await onSaveMedia({ ...target, active });
        }
      }
      setNotice(active ? "Mídia ativada para exibição na TV." : "Mídia desativada da TV.");
      setTimeout(() => setNotice(""), 3000);
    } catch (err: unknown) {
      console.error("Erro ao alterar status da mídia:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Erro ao alterar status: ${msg}`);
    }
  }

  async function handleDelete(id: string, storagePath?: string) {
    const target = sectorMedia.find((m) => m.id === id);
    const label = target?.title || (target?.type === "video" ? "Vídeo" : "Imagem");
    if (!window.confirm(`Tem certeza de que deseja excluir permanentemente a mídia "${label}"?`)) {
      return;
    }

    try {
      await onDeleteMedia(id, storagePath);
      setNotice(`Mídia "${label}" removida com sucesso.`);
      if (previewMedia?.id === id) {
        setPreviewMedia(null);
      }
      setTimeout(() => setNotice(""), 3000);
    } catch (err: unknown) {
      console.error("Erro ao excluir mídia:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Erro ao excluir mídia: ${msg}`);
    }
  }

  return (
    <div className="admin-media-library">
      {/* 1. Page Header */}
      <div className="admin-media-header">
        <div className="admin-media-header-left">
          <div className="admin-media-title-row">
            <h1 className="admin-page-title">Biblioteca de Mídias</h1>
            <span className="badge-sector">{currentSector.toUpperCase()}</span>
          </div>
          <p className="admin-page-subtitle">
            Gerencie imagens e vídeos promocionais e institucionais exibidos nas TVs do setor.
          </p>
        </div>

        <button
          type="button"
          className="admin-primary-button"
          onClick={handleOpenNewMedia}
        >
          <Plus size={16} />
          <span>Adicionar Mídia</span>
        </button>
      </div>

      {/* Inline Feedback Alerts */}
      {notice && (
        <div className="admin-inline-toast success">
          <CheckCircle2 size={16} />
          <span>{notice}</span>
        </div>
      )}
      {error && (
        <div className="admin-inline-toast error">
          <XCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Compact Metric Cards */}
      <div className="admin-media-metrics-grid">
        <div className="admin-media-metric-card">
          <div className="metric-icon total">
            <Layers size={18} />
          </div>
          <div className="metric-data">
            <span className="metric-value">{counts.total}</span>
            <span className="metric-label">Total Cadastrado</span>
          </div>
        </div>

        <div className="admin-media-metric-card">
          <div className="metric-icon images">
            <ImageIcon size={18} />
          </div>
          <div className="metric-data">
            <span className="metric-value">{counts.images}</span>
            <span className="metric-label">Imagens</span>
          </div>
        </div>

        <div className="admin-media-metric-card">
          <div className="metric-icon videos">
            <Film size={18} />
          </div>
          <div className="metric-data">
            <span className="metric-value">{counts.videos}</span>
            <span className="metric-label">Vídeos</span>
          </div>
        </div>

        <div className="admin-media-metric-card">
          <div className="metric-icon active">
            <Tv size={18} />
          </div>
          <div className="metric-data">
            <span className="metric-value">{counts.active}</span>
            <span className="metric-label">Ativas na TV</span>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="admin-media-controls-bar">
        {/* Search Input */}
        <div className="admin-media-search-wrapper">
          <Search size={16} className="admin-media-search-icon" />
          <input
            type="text"
            className="admin-media-search-input"
            placeholder="Buscar mídia por título..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="admin-media-search-clear"
              onClick={() => setSearchTerm("")}
              aria-label="Limpar busca"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="admin-media-filter-pills">
          <button
            type="button"
            className={`admin-filter-pill ${activeFilter === "all" ? "active" : ""}`}
            onClick={() => setActiveFilter("all")}
          >
            Todas ({counts.total})
          </button>
          <button
            type="button"
            className={`admin-filter-pill ${activeFilter === "images" ? "active" : ""}`}
            onClick={() => setActiveFilter("images")}
          >
            Imagens ({counts.images})
          </button>
          <button
            type="button"
            className={`admin-filter-pill ${activeFilter === "videos" ? "active" : ""}`}
            onClick={() => setActiveFilter("videos")}
          >
            Vídeos ({counts.videos})
          </button>
          <button
            type="button"
            className={`admin-filter-pill ${activeFilter === "active" ? "active" : ""}`}
            onClick={() => setActiveFilter("active")}
          >
            Ativas ({counts.active})
          </button>
          <button
            type="button"
            className={`admin-filter-pill ${activeFilter === "inactive" ? "active" : ""}`}
            onClick={() => setActiveFilter("inactive")}
          >
            Inativas ({counts.inactive})
          </button>
        </div>
      </div>

      {/* 4. Media Grid */}
      {filteredMedia.length === 0 ? (
        <div className="admin-media-empty-state">
          {sectorMedia.length === 0 ? (
            <>
              <div className="empty-icon-box">
                <Film size={36} />
              </div>
              <h3 className="empty-title">Nenhuma mídia cadastrada no setor {currentSector.toUpperCase()}</h3>
              <p className="empty-desc">
                Adicione fotos de produtos, banners promocionais ou vídeos institucionais para compor a grade da TV.
              </p>
              <button
                type="button"
                className="admin-primary-button"
                onClick={handleOpenNewMedia}
              >
                <Plus size={16} />
                <span>Adicionar primeira mídia</span>
              </button>
            </>
          ) : (
            <>
              <div className="empty-icon-box">
                <Search size={32} />
              </div>
              <h3 className="empty-title">Nenhuma mídia encontrada</h3>
              <p className="empty-desc">
                Tente ajustar os termos de busca ou selecionar outro filtro acima.
              </p>
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => {
                  setSearchTerm("");
                  setActiveFilter("all");
                }}
              >
                Limpar filtros
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="admin-media-grid">
          {filteredMedia.map((item) => (
            <MediaCard
              key={item.id}
              media={item}
              onPreview={setPreviewMedia}
              onEdit={handleOpenEditMedia}
              onToggleActive={handleToggleActive}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* 5. Standalone Preview Modal (Mounts VideoSlide ONLY when open) */}
      <MediaPreviewModal
        media={previewMedia}
        onClose={() => setPreviewMedia(null)}
        onEdit={(media) => {
          setPreviewMedia(null);
          handleOpenEditMedia(media);
        }}
        onToggleActive={handleToggleActive}
      />

      {/* 6. Lateral Drawer for Add/Edit Media */}
      <MediaEditorDrawer
        isOpen={isDrawerOpen}
        initialMedia={editingMedia}
        currentSector={currentSector}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingMedia(null);
        }}
        onSave={onSaveMedia}
      />
    </div>
  );
};

