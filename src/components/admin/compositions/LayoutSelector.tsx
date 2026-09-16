import {
  OFFER_LAYOUTS,
  getOfferLayoutCapacity,
  type OfferLayout,
} from "../../../offers/layouts";

export type LayoutSelectorProps = {
  selectedLayout: OfferLayout;
  currentOffersCount: number;
  onSelectLayout: (layout: OfferLayout) => void;
};

const LAYOUT_OPTIONS: Array<{
  id: OfferLayout;
  title: string;
  subtitle: string;
  badge: string;
  icon: string;
}> = [
  {
    id: "hero",
    title: "DESTAQUE",
    subtitle: "1 produto",
    badge: "1 produto",
    icon: "★",
  },
  {
    id: "duo",
    title: "DUPLA",
    subtitle: "2 produtos",
    badge: "2 produtos",
    icon: "⚏",
  },
  {
    id: "grid4",
    title: "GRADE 4",
    subtitle: "4 produtos",
    badge: "4 produtos",
    icon: "▦",
  },
  {
    id: "grid8",
    title: "GRADE 8",
    subtitle: "8 produtos",
    badge: "8 produtos",
    icon: "▥",
  },
];

export function LayoutSelector({
  selectedLayout,
  currentOffersCount,
  onSelectLayout,
}: LayoutSelectorProps) {
  return (
    <div className="layout-selector-section">
      <div className="layout-selector-grid">
        {LAYOUT_OPTIONS.map((option) => {
          const isSelected = selectedLayout === option.id;
          const capacity = getOfferLayoutCapacity(option.id);
          const exceedsCapacity = currentOffersCount > capacity;

          return (
            <button
              key={option.id}
              type="button"
              className={`layout-option-card ${isSelected ? "selected" : ""} ${
                exceedsCapacity ? "disabled" : ""
              }`}
              onClick={() => {
                if (!exceedsCapacity) {
                  onSelectLayout(option.id);
                }
              }}
              title={
                exceedsCapacity
                  ? `Remova ${currentOffersCount - capacity} produto(s) antes de selecionar ${option.title}.`
                  : undefined
              }
            >
              <div className="layout-option-header">
                <span className="layout-option-icon">{option.icon}</span>
                <span className="layout-option-badge">{option.badge}</span>
              </div>
              <strong className="layout-option-title">{option.title}</strong>
              <p className="layout-option-subtitle">{option.subtitle}</p>
              <div className="layout-option-capacity">
                Capacidade: <strong>{OFFER_LAYOUTS[option.id].productCount} produto(s)</strong>
              </div>
              {exceedsCapacity && (
                <div className="layout-capacity-warning">
                  {currentOffersCount} produtos selecionados (máx: {capacity})
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

