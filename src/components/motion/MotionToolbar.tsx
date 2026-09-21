import { Link } from "react-router-dom";
import {
  Copy,
  ArrowLeft,
  Save,
  Sparkles,
  Tv,
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
    <header className="motion-studio-toolbar h-14 min-h-[56px] px-4 bg-[#0d1016] border-b border-border-light/15 flex items-center justify-between gap-4 z-40 shrink-0">
      {/* Left: Brand Identity, Back Link & Sector Selector */}
      <div className="flex items-center gap-3 shrink-0">
        <Link
          to="/admin"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          title="Retornar ao Painel de Gestão"
        >
          <ArrowLeft size={14} /> <span>Admin</span>
        </Link>

        <div className="h-4 w-[1px] bg-white/10" />

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
            <Sparkles size={14} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent text-accent-foreground">
              SKALEE TV
            </span>
            <span className="font-extrabold text-sm text-foreground whitespace-nowrap hidden sm:inline">
              Motion Studio
            </span>
          </div>
        </div>

        {/* Sector Selector */}
        {onSectorChange && (
          <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-foreground">
            <Tv size={13} className="text-accent" />
            <select
              className="bg-transparent border-0 text-xs font-semibold text-foreground focus:outline-none cursor-pointer pr-1"
              value={sector}
              onChange={(e) => onSectorChange(e.target.value)}
              title="Selecione o setor da TV para editar a identidade visual"
            >
              {SECTORS.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#121620] text-foreground">
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Center: Active Preset & Publication Status Badge */}
      <div className="hidden md:flex items-center gap-2.5 shrink-0">
        <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-dark border border-white/10 rounded-full text-xs">
          <span className="text-muted-foreground font-medium">Preset:</span>
          <strong className="text-accent font-bold">{activePreset.name}</strong>
        </div>

        {/* Publication Status Badge */}
        {isDirty ? (
          <span
            className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-full text-xs font-semibold"
            title="Existem alterações no rascunho prontas para serem publicadas na TV"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Rascunho não publicado</span>
          </span>
        ) : (
          <span
            className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-semibold"
            title={`Configuração publicada e ativa na TV (v${publishedVersion})`}
          >
            <Radio size={12} className="text-emerald-400" />
            <span>
              Ao Vivo na TV (v{publishedVersion}
              {formattedPublishedTime ? ` · ${formattedPublishedTime}` : ""})
            </span>
          </span>
        )}
      </div>

      {/* Right: Studio Actions & Clean View */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Clean View Mode Toggle */}
        {onToggleCleanView && (
          <button
            type="button"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
              isCleanView
                ? "bg-accent text-accent-foreground border-accent"
                : "bg-surface-dark/60 border-white/10 text-muted-foreground hover:text-foreground hover:bg-surface-dark"
            }`}
            onClick={onToggleCleanView}
            title={isCleanView ? "Sair do modo limpo (H)" : "Modo Limpo: Ocultar painéis e menus (H)"}
          >
            {isCleanView ? <Eye size={14} /> : <EyeOff size={14} />}
            <span className="hidden xl:inline">{isCleanView ? "Mostrar Painéis" : "Modo Limpo (H)"}</span>
          </button>
        )}

        {/* Save Preset */}
        <button
          type="button"
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-dark/60 border border-white/10 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-surface-dark transition-colors"
          onClick={onSavePreset}
          title="Salvar como preset na biblioteca local"
        >
          <Save size={14} /> <span>Salvar Preset</span>
        </button>

        {/* Duplicate */}
        <button
          type="button"
          className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-dark/60 border border-white/10 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-surface-dark transition-colors"
          onClick={onDuplicatePreset}
          title="Duplicar configuração atual em um novo preset"
        >
          <Copy size={14} /> <span>Duplicar</span>
        </button>

        {/* Publish to TV */}
        {onPublishToTv && (
          <button
            type="button"
            className="btn btn-primary btn-publish-tv flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold shadow-md shadow-accent/20"
            onClick={onPublishToTv}
            disabled={isPublishing}
            title="Publicar esta identidade visual imediatamente na TV do setor via Supabase Realtime"
          >
            <Tv size={14} />
            <span>{isPublishing ? "Publicando..." : "Publicar na TV"}</span>
          </button>
        )}

        {/* Toggle Right Inspector on Desktop */}
        {onToggleRightPanel && (
          <button
            type="button"
            className={`hidden md:flex p-1.5 rounded-lg border text-muted-foreground hover:text-foreground transition-colors ${
              isRightPanelOpen
                ? "bg-white/10 border-white/20 text-foreground"
                : "bg-surface-dark border-white/10"
            }`}
            onClick={onToggleRightPanel}
            title={isRightPanelOpen ? "Recolher Painel de Propriedades" : "Expandir Painel de Propriedades"}
          >
            {isRightPanelOpen ? <PanelRightClose size={16} /> : <PanelRight size={16} />}
          </button>
        )}
      </div>
    </header>
  );
}
