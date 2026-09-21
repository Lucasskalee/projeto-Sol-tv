import { useState } from "react";
import {
  Sliders,
  Image as ImageIcon,
  Type,
  DollarSign,
  Tag,
  LayoutGrid,
  Copy,
  Check,
  RotateCcw,
} from "lucide-react";
import type { MotionConfig, PerLayoutTuning } from "../../../../motion/types";
import type { OfferLayout } from "../../../../offers/layouts";
import { formatCompleteTuningExport } from "../../../../motion/layoutTuningFormatter";

export type InspectorTuningSectionProps = {
  config: MotionConfig;
  onChange: (updater: (prev: MotionConfig) => MotionConfig) => void;
  onReplay: () => void;
  onResetLayoutTuning?: (layout: OfferLayout) => void;
};

const LAYOUT_OPTIONS: Array<{ id: OfferLayout; label: string }> = [
  { id: "hero", label: "1 Prod (Hero)" },
  { id: "duo", label: "2 Prods (Duo)" },
  { id: "trio", label: "3 Prods (Trio)" },
  { id: "grid4", label: "4 Prods (Grid 4)" },
  { id: "grid8", label: "8 Prods (Grid 8)" },
];

export function InspectorTuningSection({
  config,
  onChange,
  onReplay,
  onResetLayoutTuning,
}: InspectorTuningSectionProps) {
  const [activeTab, setActiveTab] = useState<
    "image" | "name" | "price" | "oldPrice" | "columns"
  >("image");
  const [tuningCopied, setTuningCopied] = useState<boolean>(false);

  const activeLayout = config.layout || "hero";
  const currentTuning = config.layoutTuning?.[activeLayout] || {};

  const updateLayoutTuning = (
    updater: (prev: PerLayoutTuning) => PerLayoutTuning
  ) => {
    onChange((prev) => {
      const currentTunings = prev.layoutTuning || {};
      const layoutTuning = currentTunings[activeLayout] || {};
      return {
        ...prev,
        layoutTuning: {
          ...currentTunings,
          [activeLayout]: updater(layoutTuning),
        },
      };
    });
  };

  const handleCopyConfig = () => {
    const text = formatCompleteTuningExport(
      activeLayout,
      config.layoutTuning?.[activeLayout],
      config.layoutTuning
    );
    void navigator.clipboard.writeText(text);
    setTuningCopied(true);
    setTimeout(() => setTuningCopied(false), 2600);
  };

  const handleResetCurrent = () => {
    if (onResetLayoutTuning) {
      onResetLayoutTuning(activeLayout);
    } else {
      onChange((prev) => {
        const currentTunings = { ...(prev.layoutTuning || {}) };
        delete currentTunings[activeLayout];
        return {
          ...prev,
          layoutTuning: currentTunings,
        };
      });
    }
  };

  return (
    <div className="inspector-section-body inspector-tuning-section">
      <div className="inspector-section-intro">
        <div className="flex items-center gap-2 mb-1">
          <Sliders size={15} className="text-accent" />
          <span className="font-bold text-sm text-foreground">
            Ajustes Finos ({activeLayout.toUpperCase()})
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Calibre posições milimétricas, proporções e escalas específicas deste layout.
        </p>
      </div>

      {/* 1. Escolha do Layout de Teste */}
      <div className="control-field mb-3">
        <span className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
          Layout Ativo para Ajuste:
        </span>
        <div className="grid grid-cols-3 gap-1">
          {LAYOUT_OPTIONS.map((l) => (
            <button
              key={l.id}
              type="button"
              className={`px-2 py-1.5 rounded text-xs font-semibold border transition-all text-center ${
                activeLayout === l.id
                  ? "bg-accent text-accent-foreground border-accent shadow-sm"
                  : "bg-surface-dark/60 text-muted-foreground border-border-light/20 hover:border-border-light/40"
              }`}
              onClick={() => {
                onChange((prev) => ({ ...prev, layout: l.id }));
                onReplay();
              }}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Abas de Elemento */}
      <div className="control-field mb-3">
        <span className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
          Elemento a Customizar:
        </span>
        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            className={`flex items-center justify-center gap-1.5 px-2 py-1 rounded text-xs border transition-all ${
              activeTab === "image"
                ? "bg-accent/20 text-accent border-accent font-bold"
                : "bg-surface-dark/40 text-muted-foreground border-border-light/10 hover:border-border-light/30"
            }`}
            onClick={() => setActiveTab("image")}
          >
            <ImageIcon size={12} /> Foto
          </button>
          <button
            type="button"
            className={`flex items-center justify-center gap-1.5 px-2 py-1 rounded text-xs border transition-all ${
              activeTab === "name"
                ? "bg-accent/20 text-accent border-accent font-bold"
                : "bg-surface-dark/40 text-muted-foreground border-border-light/10 hover:border-border-light/30"
            }`}
            onClick={() => setActiveTab("name")}
          >
            <Type size={12} /> Nome
          </button>
          <button
            type="button"
            className={`flex items-center justify-center gap-1.5 px-2 py-1 rounded text-xs border transition-all ${
              activeTab === "price"
                ? "bg-accent/20 text-accent border-accent font-bold"
                : "bg-surface-dark/40 text-muted-foreground border-border-light/10 hover:border-border-light/30"
            }`}
            onClick={() => setActiveTab("price")}
          >
            <DollarSign size={12} /> Preço
          </button>
          <button
            type="button"
            className={`flex items-center justify-center gap-1.5 px-2 py-1 rounded text-xs border transition-all ${
              activeTab === "oldPrice"
                ? "bg-accent/20 text-accent border-accent font-bold"
                : "bg-surface-dark/40 text-muted-foreground border-border-light/10 hover:border-border-light/30"
            }`}
            onClick={() => setActiveTab("oldPrice")}
          >
            <Tag size={12} /> De: ...
          </button>
          <button
            type="button"
            className={`col-span-2 flex items-center justify-center gap-1.5 px-2 py-1 rounded text-xs border transition-all ${
              activeTab === "columns"
                ? "bg-accent/20 text-accent border-accent font-bold"
                : "bg-surface-dark/40 text-muted-foreground border-border-light/10 hover:border-border-light/30"
            }`}
            onClick={() => setActiveTab("columns")}
          >
            <LayoutGrid size={12} /> Espaço & Colunas
          </button>
        </div>
      </div>

      {/* 3. Controles do Elemento Selecionado */}
      {activeTab === "image" && (
        <div className="p-3 bg-surface-dark/50 border border-border-light/20 rounded-lg flex flex-col gap-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Escala da Imagem:</span>
              <strong className="text-accent font-mono">
                {Math.round((currentTuning.productImage?.scale ?? 1) * 100)}%
              </strong>
            </div>
            <input
              type="range"
              min="0.2"
              max="6.0"
              step="0.05"
              value={currentTuning.productImage?.scale ?? 1}
              onChange={(e) =>
                updateLayoutTuning((prev) => ({
                  ...prev,
                  productImage: {
                    ...(prev.productImage || {}),
                    scale: Number(e.target.value),
                  },
                }))
              }
              className="w-full accent-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Posição X:</span>
                <strong className="text-foreground font-mono">
                  {currentTuning.productImage?.x || 0}px
                </strong>
              </div>
              <input
                type="range"
                min="-800"
                max="800"
                step="2"
                value={currentTuning.productImage?.x || 0}
                onChange={(e) =>
                  updateLayoutTuning((prev) => ({
                    ...prev,
                    productImage: {
                      ...(prev.productImage || {}),
                      x: Number(e.target.value),
                    },
                  }))
                }
                className="w-full accent-accent"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Posição Y:</span>
                <strong className="text-foreground font-mono">
                  {currentTuning.productImage?.y || 0}px
                </strong>
              </div>
              <input
                type="range"
                min="-800"
                max="800"
                step="2"
                value={currentTuning.productImage?.y || 0}
                onChange={(e) =>
                  updateLayoutTuning((prev) => ({
                    ...prev,
                    productImage: {
                      ...(prev.productImage || {}),
                      y: Number(e.target.value),
                    },
                  }))
                }
                className="w-full accent-accent"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "name" && (
        <div className="p-3 bg-surface-dark/50 border border-border-light/20 rounded-lg flex flex-col gap-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Tamanho do Nome:</span>
              <strong className="text-accent font-mono">
                {(currentTuning.productName?.fontSizeOffset ?? 0) >= 0 ? "+" : ""}
                {currentTuning.productName?.fontSizeOffset ?? 0}px
              </strong>
            </div>
            <input
              type="range"
              min="-80"
              max="350"
              step="1"
              value={currentTuning.productName?.fontSizeOffset ?? 0}
              onChange={(e) =>
                updateLayoutTuning((prev) => ({
                  ...prev,
                  productName: {
                    ...(prev.productName || {}),
                    fontSizeOffset: Number(e.target.value),
                  },
                }))
              }
              className="w-full accent-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Posição X:</span>
                <strong className="text-foreground font-mono">
                  {currentTuning.productName?.x || 0}px
                </strong>
              </div>
              <input
                type="range"
                min="-800"
                max="800"
                step="2"
                value={currentTuning.productName?.x || 0}
                onChange={(e) =>
                  updateLayoutTuning((prev) => ({
                    ...prev,
                    productName: {
                      ...(prev.productName || {}),
                      x: Number(e.target.value),
                    },
                  }))
                }
                className="w-full accent-accent"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Posição Y:</span>
                <strong className="text-foreground font-mono">
                  {currentTuning.productName?.y || 0}px
                </strong>
              </div>
              <input
                type="range"
                min="-800"
                max="800"
                step="2"
                value={currentTuning.productName?.y || 0}
                onChange={(e) =>
                  updateLayoutTuning((prev) => ({
                    ...prev,
                    productName: {
                      ...(prev.productName || {}),
                      y: Number(e.target.value),
                    },
                  }))
                }
                className="w-full accent-accent"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "price" && (
        <div className="p-3 bg-surface-dark/50 border border-border-light/20 rounded-lg flex flex-col gap-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Tamanho do Preço:</span>
              <strong className="text-accent font-mono">
                {(currentTuning.promotionalPrice?.fontSizeOffset ?? 0) >= 0 ? "+" : ""}
                {currentTuning.promotionalPrice?.fontSizeOffset ?? 0}px
              </strong>
            </div>
            <input
              type="range"
              min="-80"
              max="450"
              step="1"
              value={currentTuning.promotionalPrice?.fontSizeOffset ?? 0}
              onChange={(e) =>
                updateLayoutTuning((prev) => ({
                  ...prev,
                  promotionalPrice: {
                    ...(prev.promotionalPrice || {}),
                    fontSizeOffset: Number(e.target.value),
                  },
                }))
              }
              className="w-full accent-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Posição X:</span>
                <strong className="text-foreground font-mono">
                  {currentTuning.promotionalPrice?.x || 0}px
                </strong>
              </div>
              <input
                type="range"
                min="-800"
                max="800"
                step="2"
                value={currentTuning.promotionalPrice?.x || 0}
                onChange={(e) =>
                  updateLayoutTuning((prev) => ({
                    ...prev,
                    promotionalPrice: {
                      ...(prev.promotionalPrice || {}),
                      x: Number(e.target.value),
                    },
                  }))
                }
                className="w-full accent-accent"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Posição Y:</span>
                <strong className="text-foreground font-mono">
                  {currentTuning.promotionalPrice?.y || 0}px
                </strong>
              </div>
              <input
                type="range"
                min="-800"
                max="800"
                step="2"
                value={currentTuning.promotionalPrice?.y || 0}
                onChange={(e) =>
                  updateLayoutTuning((prev) => ({
                    ...prev,
                    promotionalPrice: {
                      ...(prev.promotionalPrice || {}),
                      y: Number(e.target.value),
                    },
                  }))
                }
                className="w-full accent-accent"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "oldPrice" && (
        <div className="p-3 bg-surface-dark/50 border border-border-light/20 rounded-lg flex flex-col gap-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Tamanho Preço Anterior:</span>
              <strong className="text-accent font-mono">
                {(currentTuning.oldPrice?.fontSizeOffset ?? 0) >= 0 ? "+" : ""}
                {currentTuning.oldPrice?.fontSizeOffset ?? 0}px
              </strong>
            </div>
            <input
              type="range"
              min="-50"
              max="200"
              step="1"
              value={currentTuning.oldPrice?.fontSizeOffset ?? 0}
              onChange={(e) =>
                updateLayoutTuning((prev) => ({
                  ...prev,
                  oldPrice: {
                    ...(prev.oldPrice || {}),
                    fontSizeOffset: Number(e.target.value),
                  },
                }))
              }
              className="w-full accent-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Posição X:</span>
                <strong className="text-foreground font-mono">
                  {currentTuning.oldPrice?.x || 0}px
                </strong>
              </div>
              <input
                type="range"
                min="-800"
                max="800"
                step="2"
                value={currentTuning.oldPrice?.x || 0}
                onChange={(e) =>
                  updateLayoutTuning((prev) => ({
                    ...prev,
                    oldPrice: {
                      ...(prev.oldPrice || {}),
                      x: Number(e.target.value),
                    },
                  }))
                }
                className="w-full accent-accent"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Posição Y:</span>
                <strong className="text-foreground font-mono">
                  {currentTuning.oldPrice?.y || 0}px
                </strong>
              </div>
              <input
                type="range"
                min="-800"
                max="800"
                step="2"
                value={currentTuning.oldPrice?.y || 0}
                onChange={(e) =>
                  updateLayoutTuning((prev) => ({
                    ...prev,
                    oldPrice: {
                      ...(prev.oldPrice || {}),
                      y: Number(e.target.value),
                    },
                  }))
                }
                className="w-full accent-accent"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "columns" && (
        <div className="p-3 bg-surface-dark/50 border border-border-light/20 rounded-lg flex flex-col gap-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Espaço Foto vs Textos:</span>
              <strong className="text-accent font-mono">
                {Math.round((currentTuning.columnRatio ?? 0.56) * 100)}% para foto
              </strong>
            </div>
            <input
              type="range"
              min="0.20"
              max="0.85"
              step="0.01"
              value={currentTuning.columnRatio ?? 0.56}
              onChange={(e) =>
                updateLayoutTuning((prev) => ({
                  ...prev,
                  columnRatio: Number(e.target.value),
                }))
              }
              className="w-full accent-accent"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Distância entre Produtos (Gap):</span>
              <strong className="text-foreground font-mono">
                {currentTuning.gap ?? 16}px
              </strong>
            </div>
            <input
              type="range"
              min="0"
              max="160"
              step="2"
              value={currentTuning.gap ?? 16}
              onChange={(e) =>
                updateLayoutTuning((prev) => ({
                  ...prev,
                  gap: Number(e.target.value),
                }))
              }
              className="w-full accent-accent"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Espaço Foto vs Preço:</span>
              <strong className="text-foreground font-mono">
                {currentTuning.itemGap ?? 10}px
              </strong>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="2"
              value={currentTuning.itemGap ?? 10}
              onChange={(e) =>
                updateLayoutTuning((prev) => ({
                  ...prev,
                  itemGap: Number(e.target.value),
                }))
              }
              className="w-full accent-accent"
            />
          </div>
        </div>
      )}

      {/* Botões de Ação */}
      <div className="flex gap-2 mt-4 pt-3 border-t border-border-light/10">
        <button
          type="button"
          className="btn btn-secondary btn-xs flex-1 flex items-center justify-center gap-1.5"
          onClick={handleCopyConfig}
          title="Copiar calibração em CSS/JSON"
        >
          {tuningCopied ? (
            <Check size={13} className="text-success" />
          ) : (
            <Copy size={13} />
          )}
          <span>{tuningCopied ? "Copiado!" : "Copiar Config"}</span>
        </button>

        <button
          type="button"
          className="btn btn-secondary btn-xs flex items-center justify-center gap-1.5 text-muted-foreground hover:text-destructive"
          onClick={handleResetCurrent}
          title="Restaurar layout original para o padrão"
        >
          <RotateCcw size={13} />
          <span>Restaurar Padrão</span>
        </button>
      </div>
    </div>
  );
}

