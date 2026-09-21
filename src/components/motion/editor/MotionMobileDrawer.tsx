import { useEffect } from "react";
import type { MotionConfig, MotionPreset } from "../../../motion/types";
import type { OfferLayout } from "../../../offers/layouts";
import type { MotionEditorCategory } from "./MotionCategoryNav";
import { MotionPropertyInspector } from "./MotionPropertyInspector";

export type MotionMobileDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
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
};

export function MotionMobileDrawer({
  isOpen,
  onClose,
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
}: MotionMobileDrawerProps) {
  // Prevent background body scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.65)",
          backdropFilter: "blur(4px)",
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxHeight: "75vh",
          minHeight: "50vh",
          background: "#0d1017",
          borderTop: "1px solid rgba(255, 255, 255, 0.12)",
          borderTopLeftRadius: "16px",
          borderTopRightRadius: "16px",
          boxShadow: "0 -10px 40px rgba(0, 0, 0, 0.8)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          zIndex: 9001,
        }}
      >
        {/* Handle Bar */}
        <div
          style={{
            width: "100%",
            paddingTop: "10px",
            paddingBottom: "6px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            cursor: "pointer",
            background: "rgba(0, 0, 0, 0.3)",
          }}
          onClick={onClose}
        >
          <div style={{ width: "40px", height: "4px", borderRadius: "2px", background: "rgba(255, 255, 255, 0.25)" }} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <MotionPropertyInspector
            activeCategory={activeCategory}
            config={config}
            onChange={onChange}
            onReplay={onReplay}
            presets={presets}
            activePresetId={activePresetId}
            onApplyPreset={onApplyPreset}
            onSaveAsNew={onSaveAsNew}
            onRenamePreset={onRenamePreset}
            onDuplicatePreset={onDuplicatePreset}
            onDeletePreset={onDeletePreset}
            onRestoreDefaults={onRestoreDefaults}
            onResetLayoutTuning={onResetLayoutTuning}
            sector={sector}
            onClose={onClose}
            isMobile={true}
          />
        </div>
      </div>
    </div>
  );
}

