import { useState } from "react";
import { RotateCcw } from "lucide-react";
import type { OfferComposition } from "../../../offers/compositions";
import type { ThemeDefinition } from "../../../themes/types";
import { TvPlayer } from "../../TvPlayer";
import { getSectorThemeSlug, resolveTheme } from "../../../themes/resolveTheme";

export type CompositionPreviewProps = {
  composition: OfferComposition;
  sectorLabel?: string;
  theme?: ThemeDefinition;
};

export function CompositionPreview({
  composition,
  sectorLabel = "AÇOUGUE",
  theme,
}: CompositionPreviewProps) {
  const [replay, setReplay] = useState(0);
  const previewTheme = theme || resolveTheme(getSectorThemeSlug(composition.sector));
  // Testing a hidden layer must not change its saved visibility.
  const visibleComposition = { ...composition, active: true };
  // Build a single-item preview content with the composition
  const previewContent = {
    sector: composition.sector || "acougue",
    offers: [...composition.offers],
    media: [],
    compositions: [visibleComposition],
    playlist: [
      {
        id: `preview-comp-${composition.id}`,
        kind: "composition" as const,
        composition: visibleComposition,
        duration: composition.duration,
        position: 0,
        active: true,
      },
    ],
    publishedAt: new Date().toISOString(),
  };

  return (
    <div className="composition-preview-section">
      <div className="preview-toolbar">
        <div className="preview-info">
          <strong>Pré-visualização da Camada ({composition.layout.toUpperCase()})</strong>
          <small>
            {composition.offers.length} produto(s) · Duração: {composition.duration}s
          </small>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => setReplay((value) => value + 1)} disabled={composition.offers.length === 0}>
          <RotateCcw size={16} /> Repetir teste
        </button>
      </div>

      <div className="preview-player-wrapper">
        {composition.offers.length === 0 ? (
          <div className="preview-empty-state">
            <p>Selecione ao menos 1 produto para pré-visualizar a camada.</p>
          </div>
        ) : (
          <TvPlayer
            key={replay}
            content={previewContent}
            mode="preview"
            connection="online"
            sectorLabel={sectorLabel}
            theme={previewTheme}
            layoutOverride={composition.layout}
          />
        )}
      </div>
    </div>
  );
}
