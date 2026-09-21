import { useState, useMemo, useCallback, useEffect } from "react";
import { MotionToolbar } from "../components/motion/MotionToolbar";
import { MotionPreview } from "../components/motion/MotionPreview";
import {
  MotionCategoryNav,
  type MotionEditorCategory,
  MotionPropertyInspector,
  MotionMobileDrawer,
  MotionPublishConfirmModal,
} from "../components/motion/editor";
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
import type { OfferLayout } from "../offers/layouts";
import {
  loadVisualConfig,
  saveDraftVisualConfig,
  publishVisualConfig,
  loadCachedVisualConfig,
  databaseConfigured,
} from "../supabase";
import { SECTORS } from "../data";

export default function MotionStudio() {
  // 1. Active Sector State
  const [sector, setSector] = useState<string>("acougue");

  // 2. Presets State
  const [presets, setPresets] = useState<MotionPreset[]>(() => loadPresets());
  const [activePresetId, setActivePresetId] = useState<string>(() => loadActivePresetId());

  const activePreset = useMemo(() => {
    return presets.find((p) => p.id === activePresetId) || presets[0] || DEFAULT_PRESETS[0];
  }, [presets, activePresetId]);

  // 3. Draft & Published Config State
  const [currentConfig, setCurrentConfig] = useState<MotionConfig>(() => {
    const cached = loadCachedVisualConfig("acougue");
    return cached.draftConfig || loadActiveMotionConfig();
  });

  const [savedConfig, setSavedConfig] = useState<MotionConfig>(() => {
    const cached = loadCachedVisualConfig("acougue");
    return cached.publishedConfig || cloneMotionConfig(DEFAULT_MOTION_CONFIG);
  });

  const [publishedVersion, setPublishedVersion] = useState<number>(1);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  // 4. Editor Navigation & View Modes
  const [activeCategory, setActiveCategory] = useState<MotionEditorCategory>("layout");
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(true);
  const [isCleanView, setIsCleanView] = useState<boolean>(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  const [isConfirmPublishOpen, setIsConfirmPublishOpen] = useState<boolean>(false);

  // 5. UI Playback & Toast State
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
      }, 3400);
    },
    []
  );

  // Load Sector Config from Supabase / Cache when sector changes
  useEffect(() => {
    const cached = loadCachedVisualConfig(sector);
    if (cached) {
      if (cached.draftConfig) setCurrentConfig(cloneMotionConfig(cached.draftConfig));
      if (cached.publishedConfig) setSavedConfig(cloneMotionConfig(cached.publishedConfig));
      if (cached.publishedVersion) setPublishedVersion(cached.publishedVersion);
      if (cached.publishedAt) setPublishedAt(cached.publishedAt);
    }

    if (!databaseConfigured) return;

    loadVisualConfig(sector)
      .then((data) => {
        if (data.draftConfig) setCurrentConfig(cloneMotionConfig(data.draftConfig));
        if (data.publishedConfig) setSavedConfig(cloneMotionConfig(data.publishedConfig));
        setPublishedVersion(data.publishedVersion || 1);
        setPublishedAt(data.publishedAt || null);
      })
      .catch((err) => {
        console.error("[MotionStudio] Erro ao carregar configuração visual:", err);
      });
  }, [sector]);

  // Dirty check: True if currentConfig differs from published savedConfig
  const isDirty = useMemo(() => {
    return !areConfigsEqual(currentConfig, savedConfig);
  }, [currentConfig, savedConfig]);

  // Keyboard shortcut 'H' for Clean View Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      ) {
        return;
      }

      if (e.key === "h" || e.key === "H") {
        e.preventDefault();
        setIsCleanView((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handler: Replay animation
  const handleReplay = useCallback(() => {
    setReplayKey((k) => k + 1);
  }, []);

  // Auto-save draft to Supabase & localStorage (Debounced 1000ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      saveActiveMotionConfig(currentConfig);
      if (databaseConfigured) {
        void saveDraftVisualConfig(sector, currentConfig);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [currentConfig, sector]);

  // Handler: Change config (pure state updater, auto-saved via debounced effect)
  const handleConfigChange = useCallback(
    (updater: (prev: MotionConfig) => MotionConfig) => {
      setCurrentConfig(updater);
    },
    []
  );

  // Handler: Layout change
  const handleLayoutChange = useCallback((layout: OfferLayout) => {
    setCurrentConfig((prev) => ({ ...prev, layout }));
    setReplayKey((k) => k + 1);
  }, []);

  // Handler: Layout tuning update
  const handleUpdateLayoutTuning = useCallback(
    (
      layout: OfferLayout,
      updater: (prev: import("../motion/types").PerLayoutTuning) => import("../motion/types").PerLayoutTuning
    ) => {
      setCurrentConfig((prev) => {
        const currentTunings = prev.layoutTuning || {};
        const currentLayoutTuning = currentTunings[layout] || {};
        const nextLayoutTuning = updater(currentLayoutTuning);
        return {
          ...prev,
          layoutTuning: {
            ...currentTunings,
            [layout]: nextLayoutTuning,
          },
        };
      });
    },
    []
  );

  // Handler: Reset layout tuning
  const handleResetLayoutTuning = useCallback((layout: OfferLayout) => {
    setCurrentConfig((prev) => {
      const currentTunings = { ...(prev.layoutTuning || {}) };
      delete currentTunings[layout];
      return {
        ...prev,
        layoutTuning: currentTunings,
      };
    });
    showToast(`Ajustes visuais do layout "${layout.toUpperCase()}" restaurados para o padrão.`, "info");
  }, [showToast]);

  // Handler: Speed change
  const handleSpeedChange = useCallback((speed: number) => {
    setCurrentConfig((prev) => ({ ...prev, speed }));
  }, []);

  // Handler: Apply a preset from panel
  const handleApplyPreset = useCallback((preset: MotionPreset) => {
    setActivePresetId(preset.id);
    saveActivePresetId(preset.id);

    const cloned = cloneMotionConfig(preset.config);
    setCurrentConfig(cloned);
    saveActiveMotionConfig(cloned);
    void saveDraftVisualConfig(sector, cloned);

    setReplayKey((k) => k + 1);
    showToast(`Preset "${preset.name}" aplicado como rascunho! Clique em "Publicar na TV" para enviar para as telas.`, "info");
  }, [sector, showToast]);

  // Handler: Save current preset to local library
  const handleSavePreset = useCallback(() => {
    const updatedPreset: MotionPreset = {
      ...activePreset,
      config: cloneMotionConfig(currentConfig),
      updatedAt: new Date().toISOString(),
    };

    const updated = upsertPreset(updatedPreset);
    setPresets(updated);
    setActivePresetId(updatedPreset.id);
    saveActivePresetId(updatedPreset.id);
    saveActiveMotionConfig(currentConfig);

    showToast(`Preset "${updatedPreset.name}" salvo na biblioteca local.`, "success");
  }, [activePreset, currentConfig, showToast]);

  // Handler: Explicit publish to TV via Supabase Realtime
  const handlePublishToTv = useCallback(async () => {
    setIsPublishing(true);
    try {
      const published = await publishVisualConfig(sector, currentConfig);
      setSavedConfig(cloneMotionConfig(currentConfig));
      setPublishedVersion(published.publishedVersion);
      setPublishedAt(published.publishedAt);
      saveActiveMotionConfig(currentConfig);
      setIsConfirmPublishOpen(false);

      const sectorLabel = SECTORS.find((s) => s.id === sector)?.label || sector.toUpperCase();
      showToast(
        `✓ Identidade visual (v${published.publishedVersion}) publicada com sucesso na TV do setor ${sectorLabel}!`,
        "success"
      );
    } catch (err: any) {
      console.error("[MotionStudio] Erro ao publicar visual na TV:", err);
      showToast(
        err?.message || "Erro ao publicar na TV. Verifique a conexão com o Supabase.",
        "error"
      );
    } finally {
      setIsPublishing(false);
    }
  }, [sector, currentConfig, showToast]);

  // Handler: Save as brand new preset
  const handleSaveAsNew = useCallback((name: string, description?: string) => {
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
    saveActiveMotionConfig(currentConfig);

    showToast(`Novo preset "${name}" salvo na biblioteca local!`, "success");
  }, [currentConfig, showToast]);

  // Handler: Duplicate current preset
  const handleDuplicateCurrent = useCallback(() => {
    const { updatedPresets, newPreset } = duplicatePreset(activePreset);
    setPresets(updatedPresets);
    setActivePresetId(newPreset.id);
    saveActivePresetId(newPreset.id);
    setCurrentConfig(cloneMotionConfig(newPreset.config));
    saveActiveMotionConfig(newPreset.config);
    void saveDraftVisualConfig(sector, newPreset.config);

    showToast(`Preset "${newPreset.name}" duplicado e ativado no rascunho!`, "info");
  }, [activePreset, sector, showToast]);

  const handleDuplicatePresetById = useCallback((id: string) => {
    const { updatedPresets, newPreset } = duplicatePreset(id);
    setPresets(updatedPresets);
    showToast(`Preset duplicado: "${newPreset.name}"`, "info");
  }, [showToast]);

  // Handler: Rename user preset
  const handleRenamePreset = useCallback((id: string, newName: string) => {
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
  }, [presets, showToast]);

  // Handler: Delete user preset
  const handleDeletePreset = useCallback((id: string) => {
    const target = presets.find((p) => p.id === id);
    if (!target) return;

    const updated = deletePreset(id);
    setPresets(updated);

    if (activePresetId === id) {
      const fallback = updated[0] || DEFAULT_PRESETS[0];
      setActivePresetId(fallback.id);
      saveActivePresetId(fallback.id);
      setCurrentConfig(cloneMotionConfig(fallback.config));
      saveActiveMotionConfig(fallback.config);
      setReplayKey((k) => k + 1);
    }

    showToast(`Preset "${target.name}" excluído.`, "info");
  }, [activePresetId, presets, showToast]);

  // Handler: Restore default presets
  const handleRestoreDefaults = useCallback(() => {
    if (window.confirm("Deseja restaurar todos os presets originais do Sol TV? Presets customizados locais serão removidos.")) {
      const defaults = restoreDefaultPresets();
      setPresets(defaults);
      const initial = defaults[0] || DEFAULT_PRESETS[0];
      setActivePresetId(initial.id);
      saveActivePresetId(initial.id);
      setCurrentConfig(cloneMotionConfig(initial.config));
      saveActiveMotionConfig(initial.config);
      setReplayKey((k) => k + 1);
      showToast("Presets originais restaurados na biblioteca!", "info");
    }
  }, [showToast]);

  // Handler: Copy configuration JSON
  const handleCopyConfig = useCallback(() => {
    void navigator.clipboard.writeText(JSON.stringify(currentConfig, null, 2));
    setCopied(true);
    showToast("Configuração JSON copiada para a área de transferência!", "success");
    setTimeout(() => setCopied(false), 2500);
  }, [currentConfig, showToast]);

  // Handle Category select on mobile or desktop
  const handleSelectCategory = useCallback((category: MotionEditorCategory) => {
    setActiveCategory(category);
    setIsRightPanelOpen(true);
    // On mobile, also open the bottom sheet drawer
    if (window.innerWidth < 768) {
      setIsMobileDrawerOpen(true);
    }
  }, []);

  return (
    <div className="motion-studio-container flex flex-col h-screen w-screen overflow-hidden bg-[#080a0e] text-[#f0f2f5]">
      {/* Toast Notification Banner */}
      {toast && (
        <div className={`studio-toast-banner toast-${toast.type} z-50`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* 1. Barra Superior (MotionToolbar) */}
      <MotionToolbar
        activePreset={activePreset}
        isDirty={isDirty}
        onSavePreset={handleSavePreset}
        onDuplicatePreset={handleDuplicateCurrent}
        onPublishToTv={() => setIsConfirmPublishOpen(true)}
        sector={sector}
        onSectorChange={setSector}
        publishedVersion={publishedVersion}
        publishedAt={publishedAt}
        isPublishing={isPublishing}
        isRightPanelOpen={isRightPanelOpen}
        onToggleRightPanel={() => setIsRightPanelOpen((p) => !p)}
        isCleanView={isCleanView}
        onToggleCleanView={() => setIsCleanView((p) => !p)}
      />

      {/* 2. Workspace Responsivo em 3 Zonas (Desktop) / Canvas + Nav + Drawer (Mobile) */}
      <div className="motion-studio-workspace flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Zona A: Barra de Ferramentas / Categorias (76px no desktop) */}
        {!isCleanView && (
          <div className="hidden md:flex h-full shrink-0">
            <MotionCategoryNav
              activeCategory={activeCategory}
              onSelectCategory={handleSelectCategory}
              orientation="vertical"
            />
          </div>
        )}

        {/* Zona B: Área Central - Monitor 16:9 Focal Hero */}
        <main className="motion-preview-center-zone flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
          <MotionPreview
            config={currentConfig}
            activePresetName={activePreset.name}
            replayKey={replayKey}
            onReplay={handleReplay}
            onSpeedChange={handleSpeedChange}
            onCopyConfig={handleCopyConfig}
            copied={copied}
            onLayoutChange={handleLayoutChange}
            onUpdateConfig={handleConfigChange}
            onUpdateLayoutTuning={handleUpdateLayoutTuning}
            onResetLayoutTuning={handleResetLayoutTuning}
            onSaveLayoutToTv={() => setIsConfirmPublishOpen(true)}
            sector={sector}
            onSectorChange={setSector}
          />

          {/* Barra de Categorias Horizontal no Mobile (< 768px) */}
          {!isCleanView && (
            <div className="md:hidden shrink-0 border-t border-white/10 bg-black/40">
              <MotionCategoryNav
                activeCategory={activeCategory}
                onSelectCategory={handleSelectCategory}
                orientation="horizontal"
              />
            </div>
          )}
        </main>

        {/* Zona C: Painel Contextual de Propriedades (360px no desktop/tablet) */}
        {!isCleanView && isRightPanelOpen && (
          <div className="hidden md:flex h-full shrink-0">
            <MotionPropertyInspector
              activeCategory={activeCategory}
              config={currentConfig}
              onChange={handleConfigChange}
              onReplay={handleReplay}
              presets={presets}
              activePresetId={activePresetId}
              onApplyPreset={handleApplyPreset}
              onSaveAsNew={handleSaveAsNew}
              onRenamePreset={handleRenamePreset}
              onDuplicatePreset={handleDuplicatePresetById}
              onDeletePreset={handleDeletePreset}
              onRestoreDefaults={handleRestoreDefaults}
              onResetLayoutTuning={handleResetLayoutTuning}
              sector={sector}
              onClose={() => setIsRightPanelOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Mobile Bottom Sheet Drawer (< 768px) */}
      <MotionMobileDrawer
        isOpen={isMobileDrawerOpen && !isCleanView}
        onClose={() => setIsMobileDrawerOpen(false)}
        activeCategory={activeCategory}
        config={currentConfig}
        onChange={handleConfigChange}
        onReplay={handleReplay}
        presets={presets}
        activePresetId={activePresetId}
        onApplyPreset={handleApplyPreset}
        onSaveAsNew={handleSaveAsNew}
        onRenamePreset={handleRenamePreset}
        onDuplicatePreset={handleDuplicatePresetById}
        onDeletePreset={handleDeletePreset}
        onRestoreDefaults={handleRestoreDefaults}
        onResetLayoutTuning={handleResetLayoutTuning}
        sector={sector}
      />

      {/* Modal de Confirmação para Publicar na TV */}
      <MotionPublishConfirmModal
        isOpen={isConfirmPublishOpen}
        onClose={() => setIsConfirmPublishOpen(false)}
        onConfirm={handlePublishToTv}
        sector={sector}
        config={currentConfig}
        currentVersion={publishedVersion}
        isPublishing={isPublishing}
      />
    </div>
  );
}
