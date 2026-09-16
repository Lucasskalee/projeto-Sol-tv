import { useSearchParams } from "react-router-dom";
import { TvPlayer } from "../components/TvPlayer";
import { contentFromData, seedOffers } from "../data";
import { isOfferLayout, OFFER_LAYOUTS, type OfferLayout } from "../offers/layouts";
import { resolveTheme } from "../themes/resolveTheme";
import { themeRegistry } from "../themes/registry";
import type { Offer } from "../types";

const PREVIEW_PRODUCT_OFFERS = [
  {
    name: "Picanha bovina especial",
    regularPrice: "69,90",
    promotionalPrice: "49,99",
    unit: "kg",
    image:
      "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "Costela janela bovina",
    regularPrice: "39,90",
    promotionalPrice: "27,90",
    unit: "kg",
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "Fraldinha maturada grill",
    regularPrice: "52,90",
    promotionalPrice: "38,90",
    unit: "kg",
    image:
      "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "Linguiça toscana artesanal",
    regularPrice: "26,90",
    promotionalPrice: "19,90",
    unit: "kg",
    image:
      "https://images.unsplash.com/photo-1585325701956-60dd9c8553bc?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "Contrafilé em bifes nobres",
    regularPrice: "58,90",
    promotionalPrice: "42,90",
    unit: "kg",
    image:
      "https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "Coxinha da asa temperada",
    regularPrice: "21,90",
    promotionalPrice: "15,99",
    unit: "kg",
    image:
      "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "Acém bovino em cubos",
    regularPrice: "34,90",
    promotionalPrice: "24,90",
    unit: "kg",
    image:
      "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "Cupim especial para churrasco",
    regularPrice: "46,90",
    promotionalPrice: "34,90",
    unit: "kg",
    image:
      "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=1200&q=85",
  },
] as const;

function createPreviewOffers(): Offer[] {
  return PREVIEW_PRODUCT_OFFERS.map((item, index) => {
    const source = seedOffers[index % seedOffers.length];
    return {
      ...source,
      id: `theme-preview-${index + 1}`,
      name: item.name,
      regularPrice: item.regularPrice,
      promotionalPrice: item.promotionalPrice,
      unit: item.unit,
      image: item.image,
      displayOrder: index,
      active: true,
    };
  });
}

const previewContent = contentFromData({
  sector: "acougue",
  offers: createPreviewOffers(),
  media: [],
});

const AVAILABLE_THEMES = Object.values(themeRegistry);

export default function ThemePreview() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTheme = searchParams.get("theme") || "normal";
  const requestedLayout = searchParams.get("layout");
  const layout: OfferLayout = isOfferLayout(requestedLayout)
    ? requestedLayout
    : "hero";
  const theme = resolveTheme(requestedTheme);

  function updateParam(key: "theme" | "layout", value: string) {
    const next = new URLSearchParams(searchParams);
    next.set(key, value);
    setSearchParams(next, { replace: true });
  }

  return (
    <main className="theme-preview-page">
      <header className="theme-preview-controls">
        <div>
          <strong>Preview local de temas</strong>
          <small>Somente desenvolvimento · dados locais</small>
        </div>
        <label>
          Tema
          <select
            value={theme.slug}
            onChange={(event) => updateParam("theme", event.target.value)}
          >
            {AVAILABLE_THEMES.map((option) => (
              <option key={option.slug} value={option.slug}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Layout
          <select
            value={layout}
            onChange={(event) => updateParam("layout", event.target.value)}
          >
            {Object.values(OFFER_LAYOUTS).map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      <TvPlayer
        content={previewContent}
        mode="preview"
        connection="online"
        sectorLabel="AÇOUGUE"
        theme={theme}
        layoutOverride={layout}
      />
    </main>
  );
}
