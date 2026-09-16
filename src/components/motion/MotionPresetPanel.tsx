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
} from "lucide-react";
import type { MotionPreset } from "../../motion/types";

export type MotionPresetPanelProps = {
  presets: MotionPreset[];
  activePresetId?: string;
  onApplyPreset: (preset: MotionPreset) => void;
  onSaveAsNew: (name: string, description?: string) => void;
  onRenamePreset: (id: string, newName: string) => void;
  onDuplicatePreset: (id: string) => void;
  onDeletePreset: (id: string) => void;
  onRestoreDefaults: () => void;
};

export function MotionPresetPanel({
  presets,
  activePresetId,
  onApplyPreset,
  onSaveAsNew,
  onRenamePreset,
  onDuplicatePreset,
  onDeletePreset,
  onRestoreDefaults,
}: MotionPresetPanelProps) {
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
    <aside className="motion-presets-panel">
      {/* Header */}
      <div className="presets-panel-header">
        <div className="presets-title-row">
          <div className="title-with-icon">
            <Bookmark size={16} className="presets-icon" />
            <h2>Presets de Identidade</h2>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-save-new-preset"
            onClick={handleStartCreate}
            title="Salvar configuração atual como um novo preset"
          >
            <Plus size={14} />
            <span>Novo</span>
          </button>
        </div>
        <p className="presets-subtitle">
          Alterne rapidamente entre identidades visuais salvas
        </p>

        {/* Search filter */}
        <div className="presets-search-wrap">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar preset..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
      </div>

      {/* Modal / Dialog for New Preset */}
      {isCreatingNew && (
        <form className="preset-create-form" onSubmit={handleConfirmCreate}>
          <div className="form-header">
            <h4>Salvar Novo Preset</h4>
            <button
              type="button"
              className="btn-close-form"
              onClick={() => setIsCreatingNew(false)}
            >
              ×
            </button>
          </div>
          <div className="form-body">
            <label>
              Nome do Preset
              <input
                type="text"
                autoFocus
                placeholder="Ex: Sol Especial Fim de Ano"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                required
              />
            </label>
            <label>
              Descrição (opcional)
              <input
                type="text"
                placeholder="Ex: Visual festivo com dourado e badge animada"
                value={newPresetDesc}
                onChange={(e) => setNewPresetDesc(e.target.value)}
              />
            </label>
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsCreatingNew(false)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={!newPresetName.trim()}
              >
                Salvar Preset
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Presets List */}
      <div className="presets-cards-list">
        {filteredPresets.length === 0 ? (
          <div className="presets-empty-state">
            <Sliders size={24} />
            <p>Nenhum preset encontrado.</p>
          </div>
        ) : (
          filteredPresets.map((preset) => {
            const isActive = preset.id === activePresetId;
            const isEditing = editingPresetId === preset.id;

            return (
              <div
                key={preset.id}
                className={`preset-card ${isActive ? "active" : ""} ${
                  preset.isBuiltin ? "is-builtin" : ""
                }`}
              >
                <div className="preset-card-header">
                  <div className="preset-title-wrap">
                    {isEditing ? (
                      <div className="preset-rename-box">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleConfirmRename(preset.id);
                            if (e.key === "Escape") setEditingPresetId(null);
                          }}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="btn-confirm-rename"
                          onClick={() => handleConfirmRename(preset.id)}
                        >
                          <Check size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="name-and-badges">
                        <span className="preset-card-title">{preset.name}</span>
                        {preset.isBuiltin && (
                          <span className="badge-builtin">Padrão</span>
                        )}
                        {isActive && (
                          <span className="badge-active-tag">Em uso</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {preset.description && (
                  <p className="preset-card-desc">{preset.description}</p>
                )}

                {/* Specs Tags */}
                <div className="preset-spec-tags">
                  <span className="spec-tag">
                    Tema: {preset.config.themeSlug === "black-friday" ? "Black Friday" : "Normal"}
                  </span>
                  <span className="spec-tag">
                    Layout: {preset.config.layout.toUpperCase()}
                  </span>
                  <span className="spec-tag">
                    Logo: {preset.config.logo.size}px
                  </span>
                  <span className="spec-tag">
                    Física: {preset.config.pricePhysics.impact}
                  </span>
                </div>

                {/* Card Action Buttons */}
                <div className="preset-card-actions">
                  <button
                    type="button"
                    className={`btn btn-sm ${
                      isActive ? "btn-secondary active-apply" : "btn-primary"
                    }`}
                    onClick={() => onApplyPreset(preset)}
                    disabled={isActive}
                  >
                    {isActive ? "✓ Ativo" : "Aplicar"}
                  </button>

                  <div className="preset-sub-actions">
                    <button
                      type="button"
                      className="btn-icon-sub"
                      onClick={() => onDuplicatePreset(preset.id)}
                      title="Duplicar Preset"
                    >
                      <Copy size={13} />
                    </button>

                    {!preset.isBuiltin && (
                      <>
                        <button
                          type="button"
                          className="btn-icon-sub"
                          onClick={() => handleStartRename(preset)}
                          title="Renomear Preset"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon-sub delete-btn"
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

      {/* Footer Actions */}
      <div className="presets-panel-footer">
        <button
          type="button"
          className="btn-restore-defaults"
          onClick={onRestoreDefaults}
          title="Restaurar a lista original de presets do sistema"
        >
          <RotateCcw size={13} />
          <span>Restaurar Presets Originais</span>
        </button>
      </div>
    </aside>
  );
}

