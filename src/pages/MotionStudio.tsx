import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MotionLayoutLibrary } from "../components/motion/MotionLayoutLibrary";
import { MotionStudioTopBar } from "../components/motion/MotionStudioTopBar";
import { MotionCategoryBar, type MotionCategory } from "../components/motion/MotionCategoryBar";
import { MotionControls } from "../components/motion/MotionControls";
import { MotionPreview } from "../components/motion/MotionPreview";
import { MotionPresetPanel } from "../components/motion/MotionPresetPanel";
import { MotionBottomBar } from "../components/motion/MotionBottomBar";
import { MotionPublishModal } from "../components/motion/MotionPublishModal";
import type { SelectableElementType } from "../components/motion/InteractiveLayoutOverlay";
import type { OfferLayout } from "../offers/layouts";
import type { MotionLayout, MotionPublication } from "../motion/layoutTypes";
import {
  listLayouts,
  getLayoutById,
  updateLayout,
  publishLayoutToSector,
  listPublications,
} from "../services/motionLayoutService";
import {
  loadPresets,
  upsertPreset,
  deletePreset,
  duplicatePreset,
  restoreDefaultPresets,
  loadActivePresetId,
  saveActivePresetId,
} from "../motion/storage";
import { DEFAULT_PRESETS } from "../motion/presets";
import { DEFAULT_MOTION_CONFIG, areConfigsEqual, cloneMotionConfig } from "../motion/defaults";
import type { MotionConfig, MotionPreset } from "../motion/types";
import { SECTORS } from "../data";

export default function MotionStudio() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialLayoutId = searchParams.get("id") || searchParams.get("layout");

  // 1. Navigation Mode ('library' vs 'editor')
  const [viewMode, setViewMode] = useState<"library" | "editor">(() =>
    initialLayoutId ? "editor" : "library"
  );
  const [currentLayout, setCurrentLayout] = useState<MotionLayout | null>(null);
  const [publications, setPublications] = useState<Record<string, MotionPublication>>({});

  // 2. Active Sector State (for previewing prices & target sector)
  const [sector, setSector] = useState<string>("acougue");

  // 3. Presets State
  const [presets, setPresets] = useState<MotionPreset[]>(() => loadPresets());
  const [activePresetId, setActivePresetId] = useState<string>(() => loadActivePresetId());

  const activePreset = useMemo(() => {
    return presets.find((p) => p.id === activePresetId) || presets[0] || DEFAULT_PRESETS[0];
  }, [presets, activePresetId]);

  // 4. Draft & Saved Config State (CRITICAL: SALVAR ≠ PUBLICAR)
  const [currentConfig, setCurrentConfig] = useState<MotionConfig>(DEFAULT_MOTION_CONFIG);
  const [savedConfig, setSavedConfig] = useState<MotionConfig>(DEFAULT_MOTION_CONFIG);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // 5. Publishing State
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState<boolean>(false);
  const [publishedVersion, setPublishedVersion] = useState<number>(1);

  // 6. Category & Contextual Navigation
  const [activeCategory, setActiveCategory] = useState<MotionCategory>("layout");
  const [selectedLayoutTuningTab, setSelectedLayoutTuningTab] = useState<
    "image" | "name" | "price" | "oldPrice" | "columns"
  >("image");

  // 7. Panels & View Modes
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState<boolean>(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(true);
  const [isCleanView, setIsCleanView] = useState<boolean>(false);

  // 8. Playback, Zoom & Interactive State
  const [isPaused, setIsPaused] = useState<boolean>(true);
  const [zoom, setZoom] = useState<"fit" | "50" | "75" | "100" | "125">("fit");
  const [showBoxes, setShowBoxes] = useState<boolean>(true);
  const [isInteractiveMode, setIsInteractiveMode] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // 9. UI Replay & Toast State
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

  // Load initial publications and check URL layoutId
  useEffect(() => {
    void listPublications().then((pubs) => {
      setPublications(pubs);
    });

    if (initialLayoutId) {
      void getLayoutById(initialLayoutId).then((found) => {
        if (found) {
          setCurrentLayout(found);
          setCurrentConfig(cloneMotionConfig(found.config));
          setSavedConfig(cloneMotionConfig(found.config));
          setViewMode("editor");
        }
      });
    }
  }, [initialLayoutId]);

  // Dirty check: True if currentConfig differs from savedConfig in layout
  const isDirty = useMemo(() => {
    return !areConfigsEqual(currentConfig, savedConfig);
  }, [currentConfig, savedConfig]);

  // Which sectors are currently publishing this layout
  const publishedSectors = useMemo(() => {
    if (!currentLayout) return [];
    return Object.values(publications)
      .filter((p) => p.layoutId === currentLayout.id)
      .map((p) => p.sector.toUpperCase());
  }, [publications, currentLayout]);

  // Keyboard shortcut 'H' and 'Escape' for Clean View Mode
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
      } else if (e.key === "Escape" && isCleanView) {
        e.preventDefault();
        setIsCleanView(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCleanView]);

  // Handler: Replay animation
  const handleReplay = useCallback(() => {
    setReplayKey((k) => k + 1);
  }, []);

  // Handler: Change config
  const handleConfigChange = (updater: (prev: MotionConfig) => MotionConfig) => {
    setCurrentConfig(updater);
  };

  // Handler: Layout change
  const handleLayoutChange = (layout: OfferLayout) => {
    setCurrentConfig((prev) => ({ ...prev, layout }));
    handleReplay();
  };

  // Handler: Layout tuning update
  const handleUpdateLayoutTuning = (
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
  };

  // Handler: Reset layout tuning
  const handleResetLayoutTuning = (layout: OfferLayout) => {
    setCurrentConfig((prev) => {
      const currentTunings = { ...(prev.layoutTuning || {}) };
      delete currentTunings[layout];
      return {
        ...prev,
        layoutTuning: currentTunings,
      };
    });
    showToast(`Ajustes visuais do layout "${layout.toUpperCase()}" restaurados para o padrão.`, "info");
  };

  // Handler: Speed change
  const handleSpeedChange = (speed: number) => {
    setCurrentConfig((prev) => ({ ...prev, speed }));
  };

  // ---------------------------------------------------------------------------
  // CRITICAL FLOW: SALVAR RASCUNHO (SALVAR ≠ PUBLICAR)
  // ---------------------------------------------------------------------------
  const handleSaveDraft = async () => {
    if (!currentLayout) return;
    setIsSaving(true);
    try {
      const updated = await updateLayout(currentLayout.id, {
        config: currentConfig,
      });
      setCurrentLayout(updated);
      setSavedConfig(cloneMotionConfig(currentConfig));
      setLastSavedAt(new Date());
      showToast(`✓ Rascunho de "${updated.name}" salvo no banco (TV permanece inalterada).`, "success");
    } catch (err: any) {
      console.error("Erro ao salvar rascunho:", err);
      showToast(err.message || "Erro ao salvar rascunho do layout.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // CRITICAL FLOW: PUBLICAR NA TV (EXPLICIT PUBLICATION SNAPSHOT)
  // ---------------------------------------------------------------------------
  const handlePublishToTv = async () => {
    if (!currentLayout) return;
    setIsPublishing(true);
    try {
      // 1. Also ensure the draft is updated in motion_layouts
      await updateLayout(currentLayout.id, { config: currentConfig });
      setSavedConfig(cloneMotionConfig(currentConfig));

      // 2. Publish immutable snapshot to the selected sector
      const pub = await publishLayoutToSector({
        sector,
        layoutId: currentLayout.id,
        layoutName: currentLayout.name,
        configToPublish: currentConfig,
      });

      setPublishedVersion(pub.publishedVersion);
      setIsPublishModalOpen(false);

      // 3. Refresh publications list
      const allPubs = await listPublications();
      setPublications(allPubs);

      const sectorLabel = SECTORS.find((s) => s.id === sector)?.label || sector.toUpperCase();
      showToast(
        `✓ Layout "${currentLayout.name}" publicado com sucesso na TV do setor ${sectorLabel} (v${pub.publishedVersion})!`,
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
  };

  // Handler: Apply a preset from panel
  const handleApplyPreset = (preset: MotionPreset) => {
    setActivePresetId(preset.id);
    saveActivePresetId(preset.id);

    const cloned = cloneMotionConfig(preset.config);
    setCurrentConfig(cloned);
    handleReplay();
    showToast(`Preset "${preset.name}" aplicado na área de trabalho. Clique em "Salvar" para gravar no layout.`, "info");
  };

  // Handler: Save current preset to local library
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

    showToast(`Preset "${updatedPreset.name}" salvo na biblioteca local.`, "success");
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

    showToast(`Novo preset "${name}" salvo na biblioteca local!`, "success");
  };

  // Handler: Duplicate preset from toolbar or card
  const handleDuplicateCurrent = () => {
    const { updatedPresets, newPreset } = duplicatePreset(activePreset.id);
    if (newPreset) {
      setPresets(updatedPresets);
      setActivePresetId(newPreset.id);
      saveActivePresetId(newPreset.id);
      showToast(`Preset duplicado como "${newPreset.name}".`, "success");
    }
  };

  // Handler: Duplicate preset by ID
  const handleDuplicatePresetById = (id: string) => {
    const { updatedPresets, newPreset } = duplicatePreset(id);
    if (newPreset) {
      setPresets(updatedPresets);
      setActivePresetId(newPreset.id);
      saveActivePresetId(newPreset.id);
      showToast(`Preset duplicado como "${newPreset.name}".`, "success");
    }
  };

  // Handler: Rename preset
  const handleRenamePreset = (id: string, newName: string) => {
    const target = presets.find((p) => p.id === id);
    if (target) {
      const updated = upsertPreset({
        ...target,
        name: newName,
        updatedAt: new Date().toISOString(),
      });
      setPresets(updated);
      showToast(`Preset renomeado para "${newName}".`, "success");
    }
  };

  // Handler: Delete preset
  const handleDeletePreset = (id: string) => {
    try {
      const updated = deletePreset(id);
      setPresets(updated);
      if (activePresetId === id) {
        const nextId = updated[0]?.id || DEFAULT_PRESETS[0].id;
        setActivePresetId(nextId);
        saveActivePresetId(nextId);
        const nextPreset = updated[0] || DEFAULT_PRESETS[0];
        setCurrentConfig(cloneMotionConfig(nextPreset.config));
      }
      showToast("Preset excluído da biblioteca local.", "info");
    } catch (err: any) {
      showToast(err.message || "Erro ao excluir preset.", "error");
    }
  };

  // Handler: Restore default presets
  const handleRestoreDefaults = () => {
    const restored = restoreDefaultPresets();
    setPresets(restored);
    setActivePresetId(restored[0].id);
    saveActivePresetId(restored[0].id);
    setCurrentConfig(cloneMotionConfig(restored[0].config));
    showToast("Presets padrão restaurados com sucesso.", "success");
  };

  // Handler: Copy config JSON to clipboard
  const handleCopyConfig = () => {
    void navigator.clipboard.writeText(JSON.stringify(currentConfig, null, 2));
    setCopied(true);
    showToast("JSON do MotionConfig copiado para a área de transferência!", "info");
    setTimeout(() => setCopied(false), 2000);
  };

  // Handler: Selection from Overlay Hotspots
  const handleSelectOverlayElement = useCallback((elementType: SelectableElementType) => {
    if (!isLeftPanelOpen) setIsLeftPanelOpen(true);

    switch (elementType) {
      case "productImage":
        setActiveCategory("produto");
        setSelectedLayoutTuningTab("image");
        break;
      case "productName":
        setActiveCategory("texto");
        setSelectedLayoutTuningTab("name");
        break;
      case "promotionalPrice":
        setActiveCategory("preco");
        setSelectedLayoutTuningTab("price");
        break;
      case "oldPrice":
        setActiveCategory("preco");
        setSelectedLayoutTuningTab("oldPrice");
        break;
      case "logo":
      case "sectorText":
        setActiveCategory("marca");
        break;
      case "badge":
      case "blackFridayImage":
        setActiveCategory("efeitos");
        break;
      case "brushCorners":
        setActiveCategory("fundo");
        break;
      case "spacing":
        setActiveCategory("layout");
        setSelectedLayoutTuningTab("columns");
        break;
    }
  }, [isLeftPanelOpen]);

  // Handler: Select Category from Top Bar
  const handleCategorySelect = (category: MotionCategory) => {
    setActiveCategory(category);
    if (!isLeftPanelOpen) setIsLeftPanelOpen(true);
    if (category === "presets" && !isRightPanelOpen) {
      setIsRightPanelOpen(true);
    }
  };

  // Handler: Fullscreen Toggle
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      void document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Handler: Select Layout from Library
  const handleSelectLayoutToEdit = (layout: MotionLayout) => {
    setCurrentLayout(layout);
    setCurrentConfig(cloneMotionConfig(layout.config));
    setSavedConfig(cloneMotionConfig(layout.config));
    setLastSavedAt(new Date(layout.updatedAt));
    setViewMode("editor");
    setSearchParams({ id: layout.id });
  };

  // Handler: Back to Library
  const handleBackToLibrary = () => {
    setViewMode("library");
    setSearchParams({});
  };

  // ===========================================================================
  // RENDER: BIBLIOTECA DE LAYOUTS ("MEUS LAYOUTS")
  // ===========================================================================
  if (viewMode === "library" || !currentLayout) {
    return (
      <MotionLayoutLibrary
        onSelectLayoutToEdit={handleSelectLayoutToEdit}
        onPublishSuccess={() => {
          void listPublications().then(setPublications);
        }}
      />
    );
  }

  // ===========================================================================
  // RENDER: EDITOR VISUAL (MOTION STUDIO)
  // ===========================================================================
  return (
    <div className={`motion-studio-container ${isCleanView ? "is-clean-view-mode" : ""}`}>
      {/* Toast Notification Banner */}
      {toast && (
        <div className={`studio-toast-banner toast-${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* 1. TOP BAR (56px) - Hidden in clean mode */}
      {!isCleanView && (
        <MotionStudioTopBar
          layout={currentLayout}
          isDirty={isDirty}
          isSaving={isSaving}
          lastSavedAt={lastSavedAt}
          publishedSectors={publishedSectors}
          isLeftPanelOpen={isLeftPanelOpen}
          isRightPanelOpen={isRightPanelOpen}
          isCleanView={isCleanView}
          onBackToLibrary={handleBackToLibrary}
          onSaveDraft={handleSaveDraft}
          onOpenPublishModal={() => setIsPublishModalOpen(true)}
          onToggleLeftPanel={() => setIsLeftPanelOpen((p) => !p)}
          onToggleRightPanel={() => setIsRightPanelOpen((p) => !p)}
          onToggleCleanView={() => setIsCleanView((p) => !p)}
        />
      )}

      {/* 2. CATEGORY BAR (48px) - Hidden in clean mode */}
      {!isCleanView && (
        <MotionCategoryBar
          activeCategory={activeCategory}
          onSelectCategory={handleCategorySelect}
        />
      )}

      {/* 3. WORKSPACE (flex: 1, overflow: hidden) */}
      <div className="motion-studio-workspace">
        {/* Left Column: Controls (~260px / collapsible) */}
        {!isCleanView && isLeftPanelOpen && (
          <aside className="studio-left-panel" aria-label="Painel de Controles">
            <MotionControls
              config={currentConfig}
              onChange={handleConfigChange}
              onReplay={handleReplay}
              sector={sector}
              activeCategory={activeCategory}
              onSelectCategory={handleCategorySelect}
              activeLayoutTuningTab={selectedLayoutTuningTab}
              onSelectLayoutTuningTab={setSelectedLayoutTuningTab}
            />
          </aside>
        )}

        {/* Center Column: Dominant 16:9 Canvas Stage (flex: 1) */}
        <MotionPreview
          config={currentConfig}
          activePresetName={currentLayout.name}
          replayKey={replayKey}
          onReplay={handleReplay}
          speed={currentConfig.speed}
          onSpeedChange={handleSpeedChange}
          onCopyConfig={handleCopyConfig}
          copied={copied}
          onLayoutChange={handleLayoutChange}
          onUpdateConfig={handleConfigChange}
          onUpdateLayoutTuning={handleUpdateLayoutTuning}
          onResetLayoutTuning={handleResetLayoutTuning}
          onSaveLayoutToTv={() => setIsPublishModalOpen(true)}
          sector={sector}
          onSectorChange={setSector}
          onSelectElement={handleSelectOverlayElement}
          isCleanView={isCleanView}
          onExitCleanView={() => setIsCleanView(false)}
          zoom={zoom}
          onZoomChange={setZoom}
          isPaused={isPaused}
          onTogglePause={() => setIsPaused((p) => !p)}
          showBoxes={showBoxes}
          onToggleShowBoxes={() => setShowBoxes((p) => !p)}
          isInteractiveMode={isInteractiveMode}
          onToggleInteractiveMode={() => setIsInteractiveMode((p) => !p)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
        />

        {/* Right Column: Presets (~260px / collapsible) */}
        {!isCleanView && isRightPanelOpen && (
          <aside className="studio-right-panel" aria-label="Biblioteca de Presets">
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
          </aside>
        )}
      </div>

      {/* 4. BOTTOM BAR (56px) - Hidden in clean mode */}
      {!isCleanView && (
        <MotionBottomBar
          activeLayout={currentConfig.layout}
          onSelectLayout={handleLayoutChange}
          isPaused={isPaused}
          onTogglePause={() => setIsPaused((p) => !p)}
          onReplay={handleReplay}
          speed={currentConfig.speed}
          onSpeedChange={handleSpeedChange}
          zoom={zoom}
          onZoomChange={setZoom}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          showBoxes={showBoxes}
          onToggleShowBoxes={() => setShowBoxes((p) => !p)}
          isInteractiveMode={isInteractiveMode}
          onToggleInteractiveMode={() => setIsInteractiveMode((p) => !p)}
          onResetLayout={() => handleResetLayoutTuning(currentConfig.layout)}
          onCopyConfig={handleCopyConfig}
        />
      )}

      {/* 5. PUBLISH CONFIRMATION MODAL */}
      <MotionPublishModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        onConfirmPublish={handlePublishToTv}
        isPublishing={isPublishing}
        sector={sector}
        currentConfig={currentConfig}
        savedConfig={savedConfig}
        publishedVersion={publishedVersion}
      />
    </div>
  );
}
