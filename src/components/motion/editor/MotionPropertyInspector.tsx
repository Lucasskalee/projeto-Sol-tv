import {
  LayoutTemplate,
  Layers,
  Sparkles,
  Palette,
  Type,
  DollarSign,
  ImageIcon,
  Activity,
  ShieldCheck,
  Bookmark,
  Sliders,
  X,
} from "lucide-react";
import type { MotionConfig, MotionPreset } from "../../../motion/types";
import type { OfferLayout } from "../../../offers/layouts";
import type { MotionEditorCategory } from "./MotionCategoryNav";
import {
  InspectorLayoutSection,
  InspectorElementsSection,
  InspectorBackgroundSection,
  InspectorColorsSection,
  InspectorTextSection,
  InspectorPriceSection,
  InspectorImageSection,
  InspectorMotionSection,
  InspectorIdentitySection,
  InspectorPresetsSection,
  InspectorTuningSection,
} from "./sections";

export type MotionPropertyInspectorProps = {
  activeCategory: MotionEditorCategory;
  config: MotionConfig;
  onChange: (updater: (prev: MotionConfig) => MotionConfig) => void;
  onReplay: () => void;
  presets: MotionPreset[];
  activePresetId?: string;
  onApplyPreset: (preset: MotionPreset) => void;
  onSaveAsNew: (name: string, description?: string) => void;
  onRenamePreset: (id: string, newName: string) => void;
  onDuplicatePreset: (id: string) => void;
  onDeletePreset: (id: string) => void;
  onRestoreDefaults: () => void;
  onResetLayoutTuning?: (layout: OfferLayout) => void;
  sector?: string;
  onClose?: () => void;
  isMobile?: boolean;
};

const CATEGORY_META: Record<
  MotionEditorCategory,
  { label: string; icon: React.ComponentType<{ size?: number; className?: string }> }
> = {
  layout: { label: "Layout Base & Grade", icon: LayoutTemplate },
  elements: { label: "Visibilidade de Elementos", icon: Layers },
  background: { label: "Fundo & Efeito Sunburst", icon: Sparkles },
  colors: { label: "Paleta de Cores", icon: Palette },
  text: { label: "Tipografia & Textos", icon: Type },
  price: { label: "Física & Efeitos do Preço", icon: DollarSign },
  image: { label: "Imagem Temática / Selo", icon: ImageIcon },
  motion: { label: "Animação, Saída & Faíscas", icon: Activity },
  identity: { label: "Logo & Identidade da Loja", icon: ShieldCheck },
  presets: { label: "Biblioteca de Presets", icon: Bookmark },
  tuning: { label: "Calibração & Ajustes Finos", icon: Sliders },
};

export function MotionPropertyInspector({
  activeCategory,
  config,
  onChange,
  onReplay,
  presets,
  activePresetId,
  onApplyPreset,
  onSaveAsNew,
  onRenamePreset,
  onDuplicatePreset,
  onDeletePreset,
  onRestoreDefaults,
  onResetLayoutTuning,
  sector = "acougue",
  onClose,
  isMobile = false,
}: MotionPropertyInspectorProps) {
  const currentMeta = CATEGORY_META[activeCategory] || CATEGORY_META.layout;
  const Icon = currentMeta.icon;

  return (
    <aside
      className={`motion-property-inspector flex flex-col h-full bg-surface-dark/95 border-l border-border-light/10 ${
        isMobile ? "w-full border-l-0" : "w-[360px] min-w-[320px] max-w-[400px]"
      }`}
    >
      {/* Header */}
      <div className="inspector-header px-4 py-3 border-b border-border-light/10 flex items-center justify-between bg-black/20 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-accent/15 text-accent">
            <Icon size={16} />
          </div>
          <h3 className="font-bold text-sm text-foreground">{currentMeta.label}</h3>
        </div>

        {onClose && (
          <button
            type="button"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            onClick={onClose}
            title="Fechar painel de propriedades"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Content Scroll Area */}
      <div className="inspector-scroll-area flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activeCategory === "layout" && (
          <InspectorLayoutSection config={config} onChange={onChange} onReplay={onReplay} />
        )}

        {activeCategory === "elements" && (
          <InspectorElementsSection config={config} onChange={onChange} onReplay={onReplay} />
        )}

        {activeCategory === "background" && (
          <InspectorBackgroundSection
            config={config}
            onChange={onChange}
            onReplay={onReplay}
            sector={sector}
          />
        )}

        {activeCategory === "colors" && (
          <InspectorColorsSection config={config} onChange={onChange} onReplay={onReplay} />
        )}

        {activeCategory === "text" && (
          <InspectorTextSection config={config} onChange={onChange} onReplay={onReplay} />
        )}

        {activeCategory === "price" && (
          <InspectorPriceSection config={config} onChange={onChange} onReplay={onReplay} />
        )}

        {activeCategory === "image" && (
          <InspectorImageSection
            config={config}
            onChange={onChange}
            onReplay={onReplay}
            sector={sector}
          />
        )}

        {activeCategory === "motion" && (
          <InspectorMotionSection config={config} onChange={onChange} onReplay={onReplay} />
        )}

        {activeCategory === "identity" && (
          <InspectorIdentitySection
            config={config}
            onChange={onChange}
            onReplay={onReplay}
            sector={sector}
          />
        )}

        {activeCategory === "presets" && (
          <InspectorPresetsSection
            presets={presets}
            activePresetId={activePresetId}
            onApplyPreset={onApplyPreset}
            onSaveAsNew={onSaveAsNew}
            onRenamePreset={onRenamePreset}
            onDuplicatePreset={onDuplicatePreset}
            onDeletePreset={onDeletePreset}
            onRestoreDefaults={onRestoreDefaults}
          />
        )}

        {activeCategory === "tuning" && (
          <InspectorTuningSection
            config={config}
            onChange={onChange}
            onReplay={onReplay}
            onResetLayoutTuning={onResetLayoutTuning}
          />
        )}
      </div>
    </aside>
  );
}

