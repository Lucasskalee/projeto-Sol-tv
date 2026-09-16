import { Link } from "react-router-dom";
import { Copy, ArrowLeft, Save, Sparkles, Tv } from "lucide-react";
import type { MotionPreset } from "../../motion/types";

export type MotionToolbarProps = {
  activePreset: MotionPreset;
  isDirty: boolean;
  onSavePreset: () => void;
  onDuplicatePreset: () => void;
  onPublishToTv?: () => void;
};

export function MotionToolbar({
  activePreset,
  isDirty,
  onSavePreset,
  onDuplicatePreset,
  onPublishToTv,
}: MotionToolbarProps) {
  return (
    <header className="motion-studio-toolbar">
      {/* Left: Brand Identity & Studio Title */}
      <div className="toolbar-brand-group">
        <div className="studio-brand-icon">
          <Sparkles size={18} />
        </div>
        <div className="studio-brand-titles">
          <div className="studio-app-badge">SKALEE TV</div>
          <h1 className="studio-title">Motion Studio</h1>
        </div>
      </div>

      {/* Center: Active Preset Status Badge */}
      <div className="toolbar-preset-status">
        <span className="preset-label">Preset:</span>
        <strong className="preset-name">{activePreset.name}</strong>
        {isDirty ? (
          <span className="status-badge unsaved" title="Existem alterações não salvas neste preset">
            ● Alterações não salvas
          </span>
        ) : (
          <span className="status-badge saved" title="Todas as alterações estão salvas e ativas">
            ✓ Salvo
          </span>
        )}
      </div>

      {/* Right: Studio Actions */}
      <div className="toolbar-actions">
        <button
          type="button"
          className="btn btn-primary toolbar-btn"
          onClick={onSavePreset}
          title="Salvar alterações no preset e aplicar"
        >
          <Save size={14} /> Salvar preset
        </button>

        <button
          type="button"
          className="btn btn-secondary toolbar-btn"
          onClick={onDuplicatePreset}
          title="Duplicar configuração atual em um novo preset"
        >
          <Copy size={14} /> Duplicar
        </button>

        {onPublishToTv && (
          <button
            type="button"
            className="btn btn-secondary toolbar-btn btn-publish-active"
            onClick={onPublishToTv}
            title="Aplicar e publicar esta identidade visual em todas as TVs ao vivo"
          >
            <Tv size={14} /> Publicar na TV
          </button>
        )}

        <Link
          to="/admin"
          className="btn btn-secondary toolbar-btn toolbar-back-btn"
          title="Retornar ao Painel de Gestão"
        >
          <ArrowLeft size={14} /> Voltar ao Admin
        </Link>
      </div>
    </header>
  );
}
