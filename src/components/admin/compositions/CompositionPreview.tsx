import type { OfferComposition } from "../../../offers/compositions";
import { normalTheme } from "../../../themes/normal";
import type { ThemeDefinition } from "../../../themes/types";
import { TvPlayer } from "../../TvPlayer";

export type CompositionPreviewProps = {
  composition: OfferComposition;
  sectorLabel?: string;
  theme?: ThemeDefinition;
};

export function CompositionPreview({
  composition,
  sectorLabel = "AÇOUGUE",
  theme = normalTheme,
}: CompositionPreviewProps) {
  // Build a single-item preview content with the composition
  const previewContent = {
    sector: composition.sector || "acougue",
    offers: [...composition.offers],
    media: [],
    compositions: [composition],
    playlist: [
      {
        id: `preview-comp-${composition.id}`,
        kind: "composition" as const,
        composition,
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
      </div>

      <div className="preview-player-wrapper">
        {composition.offers.length === 0 ? (
          <div className="preview-empty-state">
            <p>Selecione ao menos 1 produto para pré-visualizar a camada.</p>
          </div>
        ) : (
          <TvPlayer
            content={previewContent}
            mode="preview"
            connection="online"
            sectorLabel={sectorLabel}
            theme={theme}
            layoutOverride={composition.layout}
          />
        )}
      </div>
    </div>
  );
}

