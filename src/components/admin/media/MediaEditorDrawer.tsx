import React, { useState, useEffect } from "react";
import {
  X,
  Upload,
  Film,
  Image as ImageIcon,
  Clock,
  Layers,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Tv,
} from "lucide-react";
import type { SolTvMedia } from "../../../types";
import { newMedia, SECTORS } from "../../../data";
import { deleteMediaStorageFile } from "../../../supabase";
import { MediaUpload, type UploadResult } from "../../MediaUpload";

export interface MediaEditorDrawerProps {
  isOpen: boolean;
  initialMedia: SolTvMedia | null;
  currentSector: string;
  onClose: () => void;
  onSave: (media: SolTvMedia) => Promise<void>;
}

export const MediaEditorDrawer: React.FC<MediaEditorDrawerProps> = ({
  isOpen,
  initialMedia,
  currentSector,
  onClose,
  onSave,
}) => {
  const [draft, setDraft] = useState<SolTvMedia>(() =>
    initialMedia ? { ...initialMedia } : newMedia(currentSector),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isEditing = Boolean(initialMedia && initialMedia.id);

  useEffect(() => {
    if (isOpen) {
      if (initialMedia) {
        setDraft({ ...initialMedia });
      } else {
        setDraft(newMedia(currentSector));
      }
      setError("");
      setNotice("");
    }
  }, [isOpen, initialMedia, currentSector]);

  if (!isOpen) return null;

  function field<K extends keyof SolTvMedia>(key: K, value: SolTvMedia[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function handleUploadSuccess(result: UploadResult) {
    setDraft((d) => ({
      ...d,
      mediaUrl: result.publicUrl,
      storagePath: result.storagePath,
      type: result.type,
    }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!draft.mediaUrl) {
      setError("Faça o upload de uma imagem ou vídeo antes de salvar.");
      return;
    }

    if (draft.duration < 3 || draft.duration > 120) {
      setError("A duração deve estar entre 3 e 120 segundos.");
      return;
    }

    if (draft.startsAt && draft.endsAt && draft.endsAt < draft.startsAt) {
      setError("A data de término deve ser igual ou posterior à data de início.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await onSave({
        ...draft,
        sector: draft.sector || currentSector,
        position: Number(draft.position) || 0,
        duration: Number(draft.duration) || 10,
      });
      setNotice(isEditing ? "Mídia atualizada com sucesso!" : "Mídia adicionada com sucesso!");
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: unknown) {
      console.error("Erro ao salvar mídia:", err);

      if (!isEditing && draft.storagePath) {
        console.warn(`[Cleanup] Removendo arquivo recém-enviado do Storage (${draft.storagePath}) após erro no banco.`);
        void deleteMediaStorageFile(draft.storagePath);
      }

      const msg = err instanceof Error ? err.message : String(err);
      setError(`Erro ao salvar mídia: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="admin-media-drawer-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-drawer-title"
    >
      <div
        className="admin-media-drawer-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="admin-media-drawer-header">
          <div className="admin-media-drawer-header-left">
            <span className="admin-media-drawer-badge">
              {isEditing ? "EDIÇÃO" : "NOVA MÍDIA"}
            </span>
            <h2 id="media-drawer-title" className="admin-media-drawer-title">
              {isEditing ? "Editar Mídia da TV" : "Adicionar Mídia à TV"}
            </h2>
          </div>
          <button
            type="button"
            className="admin-btn-secondary admin-drawer-close-btn"
            onClick={onClose}
            aria-label="Fechar formulário de mídia"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        <form onSubmit={handleSubmit} className="admin-media-drawer-form">
          <div className="admin-media-drawer-body">
            {/* Feedback Alerts */}
            {notice && (
              <div className="admin-drawer-alert success">
                <CheckCircle2 size={16} />
                <span>{notice}</span>
              </div>
            )}
            {error && (
              <div className="admin-drawer-alert error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Step 1: Upload Arquivo */}
            <div className="admin-drawer-section">
              <label className="admin-form-label">
                1. Arquivo de Mídia (Imagem ou Vídeo MP4)
              </label>
              <MediaUpload
                sector={draft.sector || currentSector}
                onUploadSuccess={handleUploadSuccess}
                onError={setError}
              />

              {draft.mediaUrl && (
                <div className="admin-media-drawer-file-preview">
                  <div className="file-preview-header">
                    <span className="file-preview-type">
                      {draft.type === "video" ? (
                        <>
                          <Film size={13} /> Vídeo selecionado
                        </>
                      ) : (
                        <>
                          <ImageIcon size={13} /> Imagem selecionada
                        </>
                      )}
                    </span>
                  </div>

                  {draft.type === "video" ? (
                    <div className="admin-media-card-video-placeholder mini">
                      <Film size={20} />
                      <span>Vídeo pronto para a TV</span>
                    </div>
                  ) : (
                    <img
                      src={draft.mediaUrl}
                      alt={draft.title || "Preview"}
                      className="admin-media-drawer-thumb"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Informações Básicas */}
            <div className="admin-drawer-section">
              <label className="admin-form-label" htmlFor="media-input-title">
                2. Título / Descrição da Mídia
              </label>
              <input
                id="media-input-title"
                type="text"
                maxLength={80}
                className="admin-form-input"
                value={draft.title || ""}
                onChange={(e) => field("title", e.target.value)}
                placeholder="Ex.: Vídeo Institucional Açougue Sol"
                disabled={saving}
              />
              <span className="admin-form-hint">
                Identificação interna para organização das mídias.
              </span>
            </div>

            {/* Step 3: Setor e Playlist */}
            <div className="admin-drawer-section">
              <div className="admin-form-grid-2">
                <div>
                  <label className="admin-form-label" htmlFor="media-input-sector">
                    <Tv size={13} /> Setor de Exibição
                  </label>
                  <select
                    id="media-input-sector"
                    className="admin-form-select"
                    value={draft.sector || currentSector}
                    onChange={(e) => field("sector", e.target.value)}
                    disabled={saving}
                  >
                    {SECTORS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="admin-form-label" htmlFor="media-input-position">
                    <Layers size={13} /> Posição na Playlist
                  </label>
                  <input
                    id="media-input-position"
                    type="number"
                    min="0"
                    max="100"
                    className="admin-form-input"
                    value={draft.position}
                    onChange={(e) => field("position", Number(e.target.value))}
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            {/* Step 4: Duração */}
            <div className="admin-drawer-section">
              <label className="admin-form-label" htmlFor="media-input-duration">
                <Clock size={13} /> Duração de Exibição (segundos)
              </label>
              <div className="admin-duration-input-row">
                <input
                  id="media-input-duration"
                  type="number"
                  min="3"
                  max="120"
                  required
                  className="admin-form-input"
                  value={draft.duration}
                  onChange={(e) => field("duration", Number(e.target.value))}
                  disabled={saving}
                />
                <div className="admin-duration-quick-chips">
                  {[5, 10, 15, 30, 60].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      className={`admin-chip-btn ${draft.duration === sec ? "active" : ""}`}
                      onClick={() => field("duration", sec)}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>
              <span className="admin-form-hint">
                Tempo que este slide permanece na TV antes de avançar (3 a 120s).
              </span>
            </div>

            {/* Step 5: Agendamento Opcional */}
            <div className="admin-drawer-section">
              <label className="admin-form-label">
                <Calendar size={13} /> Agendamento de Exibição (Opcional)
              </label>
              <div className="admin-form-grid-2">
                <div>
                  <span className="admin-form-sublabel">Data de Início</span>
                  <input
                    type="date"
                    className="admin-form-input"
                    value={draft.startsAt || ""}
                    onChange={(e) => field("startsAt", e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div>
                  <span className="admin-form-sublabel">Data de Término</span>
                  <input
                    type="date"
                    className="admin-form-input"
                    value={draft.endsAt || ""}
                    onChange={(e) => field("endsAt", e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            {/* Step 6: Status Ativo */}
            <div className="admin-drawer-section">
              <label className="admin-checkbox-card">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(e) => field("active", e.target.checked)}
                  disabled={saving}
                  className="admin-checkbox"
                />
                <div className="admin-checkbox-label">
                  <strong>Mídia Ativa para exibição na TV</strong>
                  <span>
                    Quando desmarcada, a mídia é mantida no catálogo mas não entra na rotação da TV.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Drawer Fixed Footer */}
          <div className="admin-media-drawer-footer">
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="admin-primary-button"
              disabled={saving || !draft.mediaUrl}
            >
              {saving
                ? "Salvando mídia..."
                : isEditing
                  ? "Salvar alterações"
                  : "Adicionar à playlist"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

