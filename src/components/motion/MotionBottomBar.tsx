import React from "react";
import {
  LayoutGrid,
  Play,
  Pause,
  ZoomIn,
  Maximize2,
  Minimize2,
  Layers,
  Sliders,
  RotateCcw,
  Copy,
  Tv,
} from "lucide-react";
import type { OfferLayout } from "../../offers/layouts";

export type MotionBottomBarProps = {
  activeLayout: OfferLayout | "video";
  onSelectLayout: (layout: OfferLayout) => void;
  isPaused: boolean;
  onTogglePause: () => void;
  onReplay: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  zoom: "fit" | "50" | "75" | "100" | "125";
  onZoomChange: (zoom: "fit" | "50" | "75" | "100" | "125") => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  showBoxes: boolean;
  onToggleShowBoxes: () => void;
  isInteractiveMode: boolean;
  onToggleInteractiveMode: () => void;
  onResetLayout?: () => void;
  onCopyConfig?: () => void;
};

const SCENE_OPTIONS: Array<{ id: OfferLayout | "video"; label: string; shortLabel: string }> = [
  { id: "hero", label: "1 Prod (Hero)", shortLabel: "Hero" },
  { id: "duo", label: "2 Prods (Duo)", shortLabel: "Duo" },
  { id: "trio", label: "3 Prods (Trio)", shortLabel: "Trio" },
  { id: "grid4", label: "4 Prods (Grid 4)", shortLabel: "Grid 4" },
  { id: "grid8", label: "8 Prods (Grid 8)", shortLabel: "Grid 8" },
  { id: "video", label: "Vídeo", shortLabel: "Vídeo" },
];

const ZOOM_OPTIONS: Array<{ id: "fit" | "50" | "75" | "100" | "125"; label: string }> = [
  { id: "fit", label: "Ajustar" },
  { id: "50", label: "50%" },
  { id: "75", label: "75%" },
  { id: "100", label: "100%" },
  { id: "125", label: "125%" },
];

export function MotionBottomBar({
  activeLayout,
  onSelectLayout,
  isPaused,
  onTogglePause,
  onReplay,
  speed,
  onSpeedChange,
  zoom,
  onZoomChange,
  isFullscreen,
  onToggleFullscreen,
  showBoxes,
  onToggleShowBoxes,
  isInteractiveMode,
  onToggleInteractiveMode,
  onResetLayout,
  onCopyConfig,
}: MotionBottomBarProps) {
  return (
    <footer className="motion-studio-bottombar" aria-label="Controles inferiores e barra de cenas">
      {/* 1. Left: Scene / Layout Switcher */}
      <div className="bottombar-scenes-group">
        <span className="bottombar-section-label">
          <LayoutGrid size={13} className="text-accent" />
          <span>CENAS:</span>
        </span>
        <div className="scenes-pills-wrap">
          {SCENE_OPTIONS.map((sc) => {
            const isActive = activeLayout === sc.id;
            return (
              <button
                key={sc.id}
                type="button"
                className={`scene-pill-btn ${isActive ? "active" : ""}`}
                onClick={() => onSelectLayout(sc.id as OfferLayout)}
                title={`Alternar para layout ${sc.label}`}
              >
                {sc.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Center: Playback & Interactive Controls */}
      <div className="bottombar-playback-group">
        {/* Replay */}
        <button
          type="button"
          className="btn-bottombar-action btn-replay-accent"
          onClick={onReplay}
          title="Reiniciar animações da TV (Atalho: R)"
        >
          <Play size={13} />
          <span>Replay</span>
        </button>

        {/* Play/Pause */}
        <button
          type="button"
          className={`btn-bottombar-action ${isPaused ? "btn-paused" : "btn-playing"}`}
          onClick={onTogglePause}
          title={isPaused ? "Continuar reprodução da TV (Atalho: Espaço)" : "Pausar TV para editar (Atalho: Espaço)"}
        >
          {isPaused ? <Play size={13} /> : <Pause size={13} />}
          <span>{isPaused ? "Continuar TV" : "Pausar"}</span>
        </button>

        {/* Speed */}
        <div className="bottombar-speed-group">
          {[
            { val: 0.25, label: "0.25x" },
            { val: 0.5, label: "0.5x" },
            { val: 1.0, label: "1.0x" },
          ].map((s) => (
            <button
              key={s.val}
              type="button"
              className={`speed-pill-btn ${speed === s.val ? "active" : ""}`}
              onClick={() => onSpeedChange(s.val)}
              title={`Velocidade de animação: ${s.label}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Interactive Mode */}
        <button
          type="button"
          className={`btn-bottombar-action ${isInteractiveMode ? "active-interactive" : ""}`}
          onClick={onToggleInteractiveMode}
          title="Ativar/Desativar seleção e arraste com mouse no Canvas"
        >
          <Sliders size={13} />
          <span>{isInteractiveMode ? "Mouse: ON" : "Mouse: OFF"}</span>
        </button>

        {/* On-Screen Selection Boxes */}
        <button
          type="button"
          className={`btn-bottombar-action ${showBoxes ? "active-boxes" : ""}`}
          onClick={onToggleShowBoxes}
          title="Ligar ou desligar contornos luminosos dos elementos"
        >
          <Layers size={13} />
          <span>{showBoxes ? "Caixas: ON" : "Caixas: OFF"}</span>
        </button>

        {/* Reset Layout */}
        {onResetLayout && (
          <button
            type="button"
            className="btn-bottombar-icon"
            onClick={onResetLayout}
            title="Resetar ajustes deste layout para o padrão"
          >
            <RotateCcw size={13} />
          </button>
        )}

        {/* Copy Config */}
        {onCopyConfig && (
          <button
            type="button"
            className="btn-bottombar-icon"
            onClick={onCopyConfig}
            title="Copiar configuração JSON da identidade visual"
          >
            <Copy size={13} />
          </button>
        )}
      </div>

      {/* 3. Right: Zoom & Fullscreen */}
      <div className="bottombar-view-group">
        <div className="bottombar-zoom-pills">
          <ZoomIn size={12} className="text-muted" />
          {ZOOM_OPTIONS.map((zo) => (
            <button
              key={zo.id}
              type="button"
              className={`zoom-pill-btn ${zoom === zo.id ? "active" : ""}`}
              onClick={() => onZoomChange(zo.id)}
              title={`Zoom do canvas: ${zo.label}`}
            >
              {zo.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="btn-bottombar-fullscreen"
          onClick={onToggleFullscreen}
          title={isFullscreen ? "Sair da Tela Cheia (F)" : "Modo Tela Cheia (F)"}
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>
    </footer>
  );
}

