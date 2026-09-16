import { useState, useMemo, useCallback } from "react";
import { MotionToolbar } from "../components/motion/MotionToolbar";
import { MotionControls } from "../components/motion/MotionControls";
import { MotionPreview } from "../components/motion/MotionPreview";
import { MotionPresetPanel } from "../components/motion/MotionPresetPanel";
import {
  loadPresets,
  upsertPreset,
  deletePreset,
  duplicatePreset,
  restoreDefaultPresets,
  loadActivePresetId,
  saveActivePresetId,
  loadActiveMotionConfig,
  saveActiveMotionConfig,
} from "../motion/storage";
import { DEFAULT_PRESETS } from "../motion/presets";
import { DEFAULT_MOTION_CONFIG, areConfigsEqual, cloneMotionConfig } from "../motion/defaults";
import type { MotionConfig, MotionPreset } from "../motion/types";

export default function MotionStudio() {
  // 1. Presets State
  const [presets, setPresets] = useState<MotionPreset[]>(() => loadPresets());
  const [activePresetId, setActivePresetId] = useState<string>(() => loadActivePresetId());

  // 2. Active Preset & Config State
  const activePreset = useMemo(() => {
    return presets.find((p) => p.id === activePresetId) || presets[0] || DEFAULT_PRESETS[0];
  }, [presets, activePresetId]);

  const [currentConfig, setCurrentConfig] = useState<MotionConfig>(() => {
    return loadActiveMotionConfig();
  });

  const [savedConfig, setSavedConfig] = useState<MotionConfig>(() => {
    const activeId = loadActivePresetId();
    const allPresets = loadPresets();
    const target = allPresets.find((p) => p.id === activeId) || allPresets[0];
    return cloneMotionConfig(target?.config || DEFAULT_MOTION_CONFIG);
  });

  // 3. UI Status State
  const [replayKey, setReplayKey] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "error" } | null>(
    null
  );

  const showToast = useCallback(
    (message: string, type: "success" | "info" | "error" = "success") => {
      setToast({ message, type });
      setTimeout(() => {
        setToast((current) => (current?.message === message ? null : current));
      }, 3200);
    },
    []
  );

  // Dirty check: True if currentConfig differs from saved snapshot
  const isDirty = useMemo(() => {
    return !areConfigsEqual(currentConfig, savedConfig);
  }, [currentConfig, savedConfig]);

  // Handler: Replay animation
  const handleReplay = useCallback(() => {
    setReplayKey((k) => k + 1);
  }, []);

  // Handler: Change config
  const handleConfigChange = (updater: (prev: MotionConfig) => MotionConfig) => {
    setCurrentConfig((prev) => {
      const next = updater(prev);
      saveActiveMotionConfig(next);
      return next;
    });
  };

  // Handler: Speed change
  const handleSpeedChange = (speed: number) => {
    setCurrentConfig((prev) => {
      const next = { ...prev, speed };
      saveActiveMotionConfig(next);
      return next;
    });
  };

  // Handler: Apply a preset from panel
  const handleApplyPreset = (preset: MotionPreset) => {
    setActivePresetId(preset.id);
    saveActivePresetId(preset.id);

    const cloned = cloneMotionConfig(preset.config);
    setCurrentConfig(cloned);
    setSavedConfig(cloned);
    saveActiveMotionConfig(cloned);

    handleReplay();
    showToast(`Preset "${preset.name}" aplicado e ativado nas TVs!`, "success");
  };

  // Handler: Save current preset
  const handleSavePreset = () => {
    const updatedPreset: MotionPreset = {
      ...activePreset,
      config: cloneMotionConfig(currentConfig),
      updatedAt: new Date().toISOString(),
    };

    const updated = upsertPreset(updatedPreset);
    setPresets(updated);
    setActivePresetId(updatedPreset.id);
    saveActivePresetId(updatedPreset.id);
    setSavedConfig(cloneMotionConfig(currentConfig));
    saveActiveMotionConfig(currentConfig);

    showToast(`Preset "${updatedPreset.name}" salvo e publicado nas TVs!`, "success");
  };

  // Handler: Explicit publish to TV
  const handlePublishToTv = () => {
    handleSavePreset();
  };

  // Handler: Save as brand new preset
  const handleSaveAsNew = (name: string, description?: string) => {
    const newPreset: MotionPreset = {
      id: `user-preset-${Date.now()}`,
      name,
      description,
      config: cloneMotionConfig(currentConfig),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isBuiltin: false,
    };

    const updated = upsertPreset(newPreset);
    setPresets(updated);
    setActivePresetId(newPreset.id);
    saveActivePresetId(newPreset.id);
    setSavedConfig(cloneMotionConfig(currentConfig));
    saveActiveMotionConfig(currentConfig);

    showToast(`Novo preset "${name}" criado, salvo e ativado nas TVs!`, "success");
  };

  // Handler: Duplicate preset from toolbar or card
  const handleDuplicateCurrent = () => {
    const { updatedPresets, newPreset } = duplicatePreset(activePreset);
    setPresets(updatedPresets);
    setActivePresetId(newPreset.id);
    saveActivePresetId(newPreset.id);
    setCurrentConfig(cloneMotionConfig(newPreset.config));
    setSavedConfig(cloneMotionConfig(newPreset.config));
    saveActiveMotionConfig(newPreset.config);

    showToast(`Preset "${newPreset.name}" duplicado e ativado!`, "success");
  };

  const handleDuplicatePresetById = (id: string) => {
    const { updatedPresets, newPreset } = duplicatePreset(id);
    setPresets(updatedPresets);
    showToast(`Preset duplicado: "${newPreset.name}"`, "info");
  };

  // Handler: Rename user preset
  const handleRenamePreset = (id: string, newName: string) => {
    const target = presets.find((p) => p.id === id);
    if (!target) return;

    const updatedPreset: MotionPreset = {
      ...target,
      name: newName,
      updatedAt: new Date().toISOString(),
    };

    const updated = upsertPreset(updatedPreset);
    setPresets(updated);
    showToast(`Preset renomeado para "${newName}"`, "info");
  };

  // Handler: Delete user preset
  const handleDeletePreset = (id: string) => {
    const target = presets.find((p) => p.id === id);
    if (!target) return;

    const updated = deletePreset(id);
    setPresets(updated);

    if (activePresetId === id) {
      const fallback = updated[0] || DEFAULT_PRESETS[0];
      setActivePresetId(fallback.id);
      saveActivePresetId(fallback.id);
      setCurrentConfig(cloneMotionConfig(fallback.config));
      setSavedConfig(cloneMotionConfig(fallback.config));
      saveActiveMotionConfig(fallback.config);
      handleReplay();
    }

    showToast(`Preset "${target.name}" excluído.`, "info");
  };

  // Handler: Restore default presets
  const handleRestoreDefaults = () => {
    if (window.confirm("Deseja restaurar todos os presets originais do Skalee TV? Presets customizados serão removidos.")) {
      const defaults = restoreDefaultPresets();
      setPresets(defaults);
      const initial = defaults[0] || DEFAULT_PRESETS[0];
      setActivePresetId(initial.id);
      saveActivePresetId(initial.id);
      setCurrentConfig(cloneMotionConfig(initial.config));
      setSavedConfig(cloneMotionConfig(initial.config));
      saveActiveMotionConfig(initial.config);
      handleReplay();
      showToast("Presets originais restaurados e aplicados às TVs!", "info");
    }
  };

  // Handler: Copy configuration JSON
  const handleCopyConfig = () => {
    void navigator.clipboard.writeText(JSON.stringify(currentConfig, null, 2));
    setCopied(true);
    showToast("Configuração JSON copiada para a área de transferência!", "success");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="motion-studio-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`studio-toast-banner toast-${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* 1. Barra Superior (MotionToolbar) */}
      <MotionToolbar
        activePreset={activePreset}
        isDirty={isDirty}
        onSavePreset={handleSavePreset}
        onDuplicatePreset={handleDuplicateCurrent}
        onPublishToTv={handlePublishToTv}
      />

      {/* 2. Workspace em 3 colunas */}
      <div className="motion-studio-workspace">
        {/* Painel Esquerdo: Controles Accordion */}
        <MotionControls
          config={currentConfig}
          onChange={handleConfigChange}
          onReplay={handleReplay}
        />

        {/* Área Central: Monitor 16:9 Focal Hero */}
        <MotionPreview
          config={currentConfig}
          activePresetName={activePreset.name}
          replayKey={replayKey}
          onReplay={handleReplay}
          onSpeedChange={handleSpeedChange}
          onCopyConfig={handleCopyConfig}
          copied={copied}
        />

        {/* Painel Direito: Presets Salvos e Locais */}
        <MotionPresetPanel
          presets={presets}
          activePresetId={activePresetId}
          onApplyPreset={handleApplyPreset}
          onSaveAsNew={handleSaveAsNew}
          onRenamePreset={handleRenamePreset}
          onDuplicatePreset={handleDuplicatePresetById}
          onDeletePreset={handleDeletePreset}
          onRestoreDefaults={handleRestoreDefaults}
        />
      </div>
    </div>
  );
}
