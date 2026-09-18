import { Link } from "react-router-dom";
import {
  Copy,
  ArrowLeft,
  Save,
  Sparkles,
  Tv,
  PanelLeftClose,
  PanelLeft,
  PanelRightClose,
  PanelRight,
  Eye,
  EyeOff,
  Radio,
} from "lucide-react";
import type { MotionPreset } from "../../motion/types";
import { SECTORS } from "../../data";

export type MotionToolbarProps = {
  activePreset: MotionPreset;
  isDirty: boolean;
  onSavePreset: () => void;
  onDuplicatePreset: () => void;
  onPublishToTv?: () => void;
  sector?: string;
  onSectorChange?: (sector: string) => void;
  publishedVersion?: number;
  publishedAt?: string | null;
  isPublishing?: boolean;
  isLeftPanelOpen?: boolean;
  onToggleLeftPanel?: () => void;
  isRightPanelOpen?: boolean;
  onToggleRightPanel?: () => void;
  isCleanView?: boolean;
  onToggleCleanView?: () => void;
};

export function MotionToolbar({
  activePreset,
  isDirty,
  onSavePreset,
  onDuplicatePreset,
  onPublishToTv,
  sector = "acougue",
  onSectorChange,
  publishedVersion = 1,
  publishedAt,
  isPublishing = false,
  isLeftPanelOpen = true,
  onToggleLeftPanel,
  isRightPanelOpen = true,
  onToggleRightPanel,
  isCleanView = false,
  onToggleCleanView,
}: MotionToolbarProps) {
  const formattedPublishedTime = publishedAt
    ? new Date(publishedAt).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <header className="motion-studio-toolbar">
      {/* Left: Brand Identity, Sector Selector & Panel Toggle */}
      <div className="toolbar-brand-group">
        {onToggleLeftPanel && (
          <button
            type="button"
            className={`btn-toolbar-icon ${isLeftPanelOpen ? "active" : ""}`}
            onClick={onToggleLeftPanel}
            title={isLeftPanelOpen ? "Recolher Painel de Propriedades" : "Expandir Painel de Propriedades"}
          >
            {isLeftPanelOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
          </button>
        )}

        <div className="studio-brand-icon">
          <Sparkles size={16} />
        </div>

        <div className="studio-brand-titles">
          <div className="studio-app-badge">SOL TV</div>
          <h1 className="studio-title">Motion Lab</h1>
        </div>

        {/* Sector Selector */}
        {onSectorChange && (
          <div className="toolbar-sector-selector-wrap">
            <Tv size={13} className="sector-icon" />
            <select
              className="toolbar-sector-select"
              value={sector}
              onChange={(e) => onSectorChange(e.target.value)}
              title="Selecione o setor da TV para editar a identidade visual"
            >
              {SECTORS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Center: Active Preset & Publication Status Badge */}
      <div className="toolbar-preset-status">
        <div className="active-preset-pill">
          <span className="preset-pill-label">Preset:</span>
          <strong className="preset-pill-name">{activePreset.name}</strong>
        </div>

        {/* Publication Status Badge */}
        {isDirty ? (
          <span
            className="dirty-indicator-pill is-dirty"
            title="Existem alterações no rascunho prontas para serem publicadas na TV"
          >
            <span className="dirty-dot" />
            <span>Rascunho não publicado</span>
          </span>
        ) : (
          <span
            className="dirty-indicator-pill is-clean"
            title={`Configuração publicada e ativa na TV (v${publishedVersion})`}
          >
            <Radio size={12} className="text-success" />
            <span>
              Ao Vivo na TV (v{publishedVersion}
              {formattedPublishedTime ? ` · ${formattedPublishedTime}` : ""})
            </span>
          </span>
        )}
      </div>

      {/* Right: Studio Actions & Panel Toggles */}
      <div className="toolbar-actions">
        {/* Clean View Mode Toggle */}
        {onToggleCleanView && (
          <button
            type="button"
            className={`btn btn-secondary toolbar-btn ${isCleanView ? "active-clean-view" : ""}`}
            onClick={onToggleCleanView}
            title={isCleanView ? "Sair do modo limpo (H)" : "Modo Limpo: Ocultar painéis e menus (H)"}
          >
            {isCleanView ? <Eye size={14} /> : <EyeOff size={14} />}
            <span>{isCleanView ? "Mostrar Painéis" : "Ocultar Controles (H)"}</span>
          </button>
        )}

        {/* Save Preset */}
        <button
          type="button"
          className="btn btn-secondary toolbar-btn"
          onClick={onSavePreset}
          title="Salvar como preset na biblioteca local"
        >
          <Save size={14} /> <span>Salvar Preset</span>
        </button>

        {/* Duplicate */}
        <button
          type="button"
          className="btn btn-secondary toolbar-btn"
          onClick={onDuplicatePreset}
          title="Duplicar configuração atual em um novo preset"
        >
          <Copy size={14} /> <span>Duplicar</span>
        </button>

        {/* Publish to TV */}
        {onPublishToTv && (
          <button
            type="button"
            className={`btn btn-primary toolbar-btn btn-publish-tv ${isPublishing ? "is-publishing" : ""}`}
            onClick={onPublishToTv}
            disabled={isPublishing}
            title="Publicar esta identidade visual imediatamente na TV do setor via Supabase Realtime"
          >
            <Tv size={14} />
            <span>{isPublishing ? "Publicando..." : "Publicar na TV"}</span>
          </button>
        )}

        {/* Toggle Right Preset Panel */}
        {onToggleRightPanel && (
          <button
            type="button"
            className={`btn-toolbar-icon ${isRightPanelOpen ? "active" : ""}`}
            onClick={onToggleRightPanel}
            title={isRightPanelOpen ? "Recolher Biblioteca de Presets" : "Expandir Biblioteca de Presets"}
          >
            {isRightPanelOpen ? <PanelRightClose size={16} /> : <PanelRight size={16} />}
          </button>
        )}

        {/* Back to Admin */}
        <Link
          to="/admin"
          className="btn btn-secondary toolbar-btn toolbar-back-btn"
          title="Retornar ao Painel de Gestão"
        >
          <ArrowLeft size={14} /> <span>Voltar ao Admin</span>
        </Link>
      </div>
    </header>
  );
}
