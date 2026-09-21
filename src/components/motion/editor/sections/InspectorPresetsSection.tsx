import { useState, useMemo } from "react";
import {
  Bookmark,
  Plus,
  RotateCcw,
  Copy,
  Edit2,
  Trash2,
  Check,
  Search,
  Sliders,
  Sparkles,
} from "lucide-react";
import type { MotionPreset } from "../../../../motion/types";

export type InspectorPresetsSectionProps = {
  presets: MotionPreset[];
  activePresetId?: string;
  onApplyPreset: (preset: MotionPreset) => void;
  onSaveAsNew: (name: string, description?: string) => void;
  onRenamePreset: (id: string, newName: string) => void;
  onDuplicatePreset: (id: string) => void;
  onDeletePreset: (id: string) => void;
  onRestoreDefaults: () => void;
};

export function InspectorPresetsSection({
  presets,
  activePresetId,
  onApplyPreset,
  onSaveAsNew,
  onRenamePreset,
  onDuplicatePreset,
  onDeletePreset,
  onRestoreDefaults,
}: InspectorPresetsSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [newPresetDesc, setNewPresetDesc] = useState("");
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const filteredPresets = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return presets;
    return presets.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }, [presets, searchQuery]);

  const handleStartCreate = () => {
    setNewPresetName("");
    setNewPresetDesc("");
    setIsCreatingNew(true);
  };

  const handleConfirmCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;
    onSaveAsNew(newPresetName.trim(), newPresetDesc.trim() || undefined);
    setIsCreatingNew(false);
    setNewPresetName("");
    setNewPresetDesc("");
  };

  const handleStartRename = (preset: MotionPreset) => {
    setEditingPresetId(preset.id);
    setEditingName(preset.name);
  };

  const handleConfirmRename = (id: string) => {
    if (editingName.trim()) {
      onRenamePreset(id, editingName.trim());
    }
    setEditingPresetId(null);
  };

  return (
    <div className="inspector-section-body inspector-presets-section">
      <div className="inspector-section-intro">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Bookmark size={15} className="text-accent" />
            <span className="font-bold text-sm text-foreground">Biblioteca de Presets</span>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-xs flex items-center gap-1"
            onClick={handleStartCreate}
            title="Salvar configuração atual como um novo preset"
          >
            <Plus size={13} />
            <span>Novo</span>
          </button>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Alterne rapidamente entre identidades visuais salvas ou crie versões customizadas.
        </p>
      </div>

      {/* Search Filter */}
      <div className="presets-search-wrap mb-3">
        <Search size={14} className="search-icon" />
        <input
          type="text"
          placeholder="Buscar preset..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-surface-dark border border-border-light/20 rounded-lg px-3 py-1.5 pl-8 text-xs text-foreground focus:outline-none focus:border-accent"
        />
        {searchQuery && (
          <button
            type="button"
            className="clear-search-btn"
            onClick={() => setSearchQuery("")}
          >
            ×
          </button>
        )}
      </div>

      {/* Form: Salvar Novo Preset */}
      {isCreatingNew && (
        <form className="preset-create-form p-3 mb-3 bg-surface-dark/90 border border-accent/40 rounded-lg" onSubmit={handleConfirmCreate}>
          <div className="form-header flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-accent flex items-center gap-1.5">
              <Sparkles size={12} /> Salvar Novo Preset
            </h4>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground text-sm"
              onClick={() => setIsCreatingNew(false)}
            >
              ✕
            </button>
          </div>
          <div className="form-body flex flex-col gap-2">
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Nome do Preset *</label>
              <input
                type="text"
                autoFocus
                placeholder="Ex: Sol Especial Fim de Ano"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                required
                className="w-full bg-black/40 border border-border-light/30 rounded px-2.5 py-1 text-xs text-foreground focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Descrição (opcional)</label>
              <input
                type="text"
                placeholder="Ex: Visual festivo com dourado e badge animada"
                value={newPresetDesc}
                onChange={(e) => setNewPresetDesc(e.target.value)}
                className="w-full bg-black/40 border border-border-light/30 rounded px-2.5 py-1 text-xs text-foreground focus:outline-none focus:border-accent"
              />
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                onClick={() => setIsCreatingNew(false)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-xs"
                disabled={!newPresetName.trim()}
              >
                Salvar Preset
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Presets List */}
      <div className="presets-cards-list flex flex-col gap-2 max-h-[460px] overflow-y-auto pr-1">
        {filteredPresets.length === 0 ? (
          <div className="presets-empty-state py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
            <Sliders size={20} className="opacity-40" />
            <p className="text-xs">Nenhum preset encontrado.</p>
          </div>
        ) : (
          filteredPresets.map((preset) => {
            const isActive = preset.id === activePresetId;
            const isEditing = editingPresetId === preset.id;

            return (
              <div
                key={preset.id}
                className={`preset-card p-3 rounded-lg border transition-all ${
                  isActive
                    ? "bg-accent/10 border-accent shadow-sm"
                    : "bg-surface-dark/40 border-border-light/20 hover:border-border-light/50"
                }`}
              >
                <div className="preset-card-header mb-1.5">
                  <div className="preset-title-wrap">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleConfirmRename(preset.id);
                            if (e.key === "Escape") setEditingPresetId(null);
                          }}
                          autoFocus
                          className="bg-black/50 border border-accent rounded px-2 py-0.5 text-xs text-foreground flex-1"
                        />
                        <button
                          type="button"
                          className="btn btn-primary btn-xs px-2"
                          onClick={() => handleConfirmRename(preset.id)}
                        >
                          <Check size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-semibold text-xs text-foreground truncate">
                          {preset.name}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {preset.isBuiltin && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-white/10 text-muted-foreground rounded font-mono">
                              Padrão
                            </span>
                          )}
                          {isActive && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-accent/20 text-accent font-bold rounded">
                              Ativo
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {preset.description && (
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2 leading-relaxed">
                    {preset.description}
                  </p>
                )}

                {/* Specs Tags */}
                <div className="preset-spec-tags flex flex-wrap gap-1 mb-2.5">
                  <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                    Tema: {preset.config.themeSlug === "black-friday" ? "Black Friday" : "Normal"}
                  </span>
                  <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                    Layout: {preset.config.layout.toUpperCase()}
                  </span>
                  <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                    Física: {preset.config.pricePhysics.impact}
                  </span>
                </div>

                {/* Card Action Buttons */}
                <div className="preset-card-actions flex items-center justify-between pt-1 border-t border-white/5">
                  <button
                    type="button"
                    className={`btn btn-xs ${
                      isActive
                        ? "bg-accent/20 text-accent border border-accent/40 cursor-default"
                        : "btn-primary"
                    }`}
                    onClick={() => onApplyPreset(preset)}
                    disabled={isActive}
                  >
                    {isActive ? "✓ Em uso" : "Aplicar"}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                      onClick={() => onDuplicatePreset(preset.id)}
                      title="Duplicar Preset"
                    >
                      <Copy size={13} />
                    </button>

                    {!preset.isBuiltin && (
                      <>
                        <button
                          type="button"
                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                          onClick={() => handleStartRename(preset)}
                          title="Renomear Preset"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          onClick={() => onDeletePreset(preset.id)}
                          title="Excluir Preset"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer: Restaurar Presets Originais */}
      <div className="presets-panel-footer pt-3 mt-3 border-t border-border-light/10">
        <button
          type="button"
          className="w-full py-2 px-3 rounded-lg border border-border-light/20 bg-surface-dark/40 hover:bg-surface-dark hover:border-border-light/40 text-muted-foreground hover:text-foreground text-xs flex items-center justify-center gap-2 transition-colors"
          onClick={onRestoreDefaults}
          title="Restaurar a lista original de presets do sistema"
        >
          <RotateCcw size={13} />
          <span>Restaurar Presets Originais</span>
        </button>
      </div>
    </div>
  );
}

