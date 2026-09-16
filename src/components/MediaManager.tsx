import { useState, type FormEvent } from "react";
import { Film, Image as ImageIcon, Pencil, Trash2, Calendar, Clock, Eye } from "lucide-react";
import { newMedia, SECTORS, formatDate } from "../data";
import type { SolTvMedia } from "../types";
import { deleteMediaStorageFile } from "../supabase";
import { MediaUpload, type UploadResult } from "./MediaUpload";

export function MediaManager({
  mediaList,
  currentSector,
  onSaveMedia,
  onDeleteMedia,
  onToggleActiveMedia,
}: {
  mediaList: SolTvMedia[];
  currentSector: string;
  onSaveMedia: (media: SolTvMedia) => Promise<void>;
  onDeleteMedia: (id: string, storagePath?: string) => Promise<void>;
  onToggleActiveMedia?: (id: string, active: boolean) => Promise<void> | void;
}) {
  const [draft, setDraft] = useState<SolTvMedia>(() => newMedia(currentSector));
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [mediaTypeFilter, setMediaTypeFilter] = useState<"all" | "video" | "image">("all");

  const sectorMedia = mediaList.filter((m) => m.sector === currentSector);
  const filteredSectorMedia = sectorMedia.filter(
    (m) => mediaTypeFilter === "all" || m.type === mediaTypeFilter,
  );

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

  async function handleSubmit(e: FormEvent) {
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
      await onSaveMedia({
        ...draft,
        sector: currentSector,
        position: Number(draft.position) || 0,
        duration: Number(draft.duration) || 10,
      });
      setNotice(isEditing ? "Mídia atualizada com sucesso!" : "Mídia adicionada à playlist!");
      setDraft(newMedia(currentSector));
      setIsEditing(false);
      setTimeout(() => setNotice(""), 4000);
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

  function handleEdit(item: SolTvMedia) {
    setDraft({ ...item });
    setIsEditing(true);
    setError("");
  }

  function handleCancel() {
    setDraft(newMedia(currentSector));
    setIsEditing(false);
    setError("");
  }

  return (
    <div className="media-manager">
      <form className="card" onSubmit={handleSubmit}>
        <div className="section-heading">
          <h2>{isEditing ? "Editar Mídia da TV" : "Adicionar Mídia da TV"}</h2>
          <span className="badge-sector">{currentSector.toUpperCase()}</span>
        </div>

        {notice && <div className="toast-inline success">✓ {notice}</div>}
        {error && <div className="toast-inline error">⚠ {error}</div>}

        <label>Upload de Arquivo (Imagem ou Vídeo MP4)</label>
        <MediaUpload
          sector={currentSector}
          onUploadSuccess={handleUploadSuccess}
          onError={setError}
        />

        {draft.mediaUrl && (
          <div className="media-draft-preview">
            <div className="preview-label">
              <Eye size={13} /> Pré-visualização da mídia selecionada:
            </div>
            {draft.type === "video" ? (
              <video
                src={draft.mediaUrl}
                controls
                className="media-preview-player"
              />
            ) : (
              <img
                src={draft.mediaUrl}
                alt={draft.title || "Preview"}
                className="media-preview-image"
              />
            )}
          </div>
        )}

        <label htmlFor="media-title">Título / Descrição (opcional)</label>
        <input
          id="media-title"
          maxLength={80}
          value={draft.title || ""}
          onChange={(e) => field("title", e.target.value)}
          placeholder="Ex.: Promoção de Terça e Quarta"
          disabled={saving}
        />

        <div className="row">
          <div>
            <label htmlFor="media-duration">
              <Clock size={12} /> Duração (segundos)
            </label>
            <input
              id="media-duration"
              type="number"
              min="3"
              max="120"
              required
              value={draft.duration}
              onChange={(e) => field("duration", Number(e.target.value))}
              disabled={saving}
            />
          </div>

          <div>
            <label htmlFor="media-position">Posição na Playlist</label>
            <input
              id="media-position"
              type="number"
              min="0"
              max="100"
              value={draft.position}
              onChange={(e) => field("position", Number(e.target.value))}
              disabled={saving}
            />
          </div>
        </div>

        <details>
          <summary>
            <Calendar size={13} /> Agendamento de Exibição
          </summary>
          <div className="row">
            <div>
              <label htmlFor="media-start">Início da exibição</label>
              <input
                id="media-start"
                type="date"
                value={draft.startsAt || ""}
                onChange={(e) => field("startsAt", e.target.value)}
                disabled={saving}
              />
            </div>
            <div>
              <label htmlFor="media-end">Término da exibição</label>
              <input
                id="media-end"
                type="date"
                value={draft.endsAt || ""}
                onChange={(e) => field("endsAt", e.target.value)}
                disabled={saving}
              />
            </div>
          </div>
        </details>

        <label className="check" style={{ marginTop: "12px" }}>
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(e) => field("active", e.target.checked)}
            disabled={saving}
          />{" "}
          Mídia ativa para exibição na TV
        </label>

        <button
          type="submit"
          className="btn btn-primary submit"
          disabled={saving || !draft.mediaUrl}
        >
          {saving ? "Salvando..." : isEditing ? "Salvar alterações" : "Adicionar à playlist"}
        </button>

        {isEditing && (
          <button
            type="button"
            className="btn btn-secondary submit"
            onClick={handleCancel}
            disabled={saving}
          >
            Cancelar edição
          </button>
        )}
      </form>

      <section className="card">
        <div className="section-heading">
          <h2>Mídias Cadastradas</h2>
          <div className="media-filter-pills">
            <button
              type="button"
              className={`media-filter-btn ${mediaTypeFilter === "all" ? "active" : ""}`}
              onClick={() => setMediaTypeFilter("all")}
            >
              Todas ({sectorMedia.length})
            </button>
            <button
              type="button"
              className={`media-filter-btn ${mediaTypeFilter === "video" ? "active" : ""}`}
              onClick={() => setMediaTypeFilter("video")}
            >
              Vídeos ({sectorMedia.filter((m) => m.type === "video").length})
            </button>
            <button
              type="button"
              className={`media-filter-btn ${mediaTypeFilter === "image" ? "active" : ""}`}
              onClick={() => setMediaTypeFilter("image")}
            >
              Imagens ({sectorMedia.filter((m) => m.type === "image").length})
            </button>
          </div>
        </div>

        {filteredSectorMedia.length === 0 ? (
          <p className="hint">
            {sectorMedia.length === 0
              ? "Nenhuma mídia cadastrada neste setor. Faça o upload acima para adicionar imagens ou vídeos à programação da TV."
              : "Nenhuma mídia encontrada para o filtro selecionado."}
          </p>
        ) : (
          <div className="offers">
            {filteredSectorMedia.map((m) => (
              <article className="playlist-entry" key={m.id}>
                <div className="offer-item">
                  {m.type === "video" ? (
                    <div className="media-thumb-video">
                      <Film size={20} />
                    </div>
                  ) : (
                    <img
                      src={m.mediaUrl}
                      alt={m.title || "Imagem"}
                      className="offer-thumb"
                    />
                  )}
                  <div className="offer-info">
                    <strong>{m.title || (m.type === "video" ? "Vídeo Institucional" : "Imagem Promocional")}</strong>
                    <span>
                      {m.type.toUpperCase()} · Posição {m.position} · {m.duration}s
                    </span>
                    {!m.active && <small className="scheduled">Inativa</small>}
                  </div>
                </div>

                <div className="playlist-controls">
                  <button
                    type="button"
                    className={`media-toggle-btn ${m.active ? "active" : "inactive"}`}
                    onClick={() => {
                      if (onToggleActiveMedia) {
                        void onToggleActiveMedia(m.id, !m.active);
                      } else {
                        void onSaveMedia({ ...m, active: !m.active });
                      }
                    }}
                    title={m.active ? "Ocultar da TV" : "Exibir na TV"}
                  >
                    {m.active ? "Ocultar da TV" : "Exibir na TV"}
                  </button>
                  <div className="icon-actions">
                    <button
                      type="button"
                      className="mini-btn"
                      aria-label="Editar mídia"
                      onClick={() => handleEdit(m)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="mini-btn danger"
                      aria-label="Excluir mídia"
                      onClick={() => onDeleteMedia(m.id, m.storagePath)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

