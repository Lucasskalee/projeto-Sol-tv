import React, { useState } from "react";
import {
  Plus,
  Search,
  BookOpen,
  Pencil,
  MoreVertical,
  Play,
  Sparkles,
  Layers,
  Copy,
  Trash2,
} from "lucide-react";
import type { Offer, SolTvMedia } from "../../../types";
import type { OfferComposition } from "../../../offers/compositions";

export interface CatalogItem {
  id: string;
  title: string;
  description?: string;
  sector: string;
  isDefault?: boolean;
}

export interface CatalogListProps {
  sector: string;
  sectorLabel: string;
  offers: readonly Offer[];
  compositions: OfferComposition[];
  media?: readonly SolTvMedia[];
  onOpenCatalog: (catalogId: string, title: string) => void;
  onPreviewCatalog: () => void;
  onSynthesize: () => void;
}

export const CatalogList: React.FC<CatalogListProps> = ({
  sector,
  sectorLabel,
  offers,
  compositions,
  onOpenCatalog,
  onPreviewCatalog,
  onSynthesize,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Calcula estatísticas do catálogo principal do setor
  const uniqueProductIds = new Set<string>();
  compositions.forEach((c) => {
    c.offers.forEach((o) => uniqueProductIds.add(o.id));
  });

  // Lista de catálogos do setor
  // O catálogo principal é construído a partir das composições reais do setor
  const defaultCatalogTitle = `OFERTAS DO ${sectorLabel.toUpperCase()}`;

  const catalogItems: CatalogItem[] = [
    {
      id: `catalog-${sector}-default`,
      title: defaultCatalogTitle,
      description: `Apresentação principal da TV com ${compositions.length} tela(s) e ${uniqueProductIds.size} produto(s).`,
      sector,
      isDefault: true,
    },
  ];

  const filteredCatalogs = catalogItems.filter((cat) => {
    if (!searchQuery.trim()) return true;
    return (
      cat.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      cat.description?.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 1. Page Header */}
      <div className="admin-page-header">
        <div className="admin-page-header-info">
          <h1 className="admin-page-title">CATÁLOGOS</h1>
          <p className="admin-page-description">
            Monte grupos de produtos e organize como eles aparecem na TV para o setor <strong>{sectorLabel}</strong>.
          </p>
        </div>

        <button
          type="button"
          className="admin-btn-primary"
          onClick={() => onOpenCatalog(`catalog-${sector}-default`, defaultCatalogTitle)}
        >
          <Plus size={18} />
          <span>+ Novo Catálogo</span>
        </button>
      </div>

      {/* 2. Barra de Busca */}
      <div className="admin-card admin-card-elevated" style={{ padding: "14px 16px" }}>
        <div style={{ position: "relative" }}>
          <Search
            size={17}
            style={{
              position: "absolute",
              left: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--skalee-text-secondary)",
              pointerEvents: "none",
            }}
          />
          <input
            type="search"
            className="search-input"
            placeholder="Buscar catálogo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "100%", paddingLeft: "42px", boxSizing: "border-box" }}
          />
        </div>
      </div>

      {/* 3. Grid Responsivo de Catálogos */}
      {filteredCatalogs.length > 0 ? (
        <div className="admin-catalogs-grid">
          {filteredCatalogs.map((catalog) => (
            <article key={catalog.id} className="admin-catalog-card">
              {/* Topo do Card */}
              <div className="admin-catalog-card-header">
                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                  <div className="admin-catalog-card-icon">
                    <BookOpen size={20} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h3 className="admin-catalog-card-title">{catalog.title}</h3>
                    <span className="admin-catalog-card-subtitle">
                      Setor {sectorLabel}
                    </span>
                  </div>
                </div>

                {/* Tag de Status */}
                <span className="admin-chip admin-chip-purple" style={{ fontSize: "11px" }}>
                  {compositions.filter((c) => c.active).length} ativas
                </span>
              </div>

              {/* Informações Centrais do Catálogo */}
              <div className="admin-catalog-card-body">
                <div className="admin-catalog-metrics-row">
                  <span className="admin-catalog-metric">
                    <strong>{uniqueProductIds.size}</strong> produtos
                  </span>
                  <span className="admin-catalog-dot">•</span>
                  <span className="admin-catalog-metric">
                    <strong>{compositions.length}</strong> telas
                  </span>
                </div>
                <p className="admin-catalog-card-desc">
                  {catalog.description}
                </p>
              </div>

              {/* Rodapé e Ações */}
              <div className="admin-catalog-card-footer">
                <button
                  type="button"
                  className="admin-btn-primary"
                  style={{ padding: "8px 16px", fontSize: "13px", gap: "6px" }}
                  onClick={() => onOpenCatalog(catalog.id, catalog.title)}
                >
                  <Pencil size={14} />
                  <span>Editar catálogo</span>
                </button>

                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    className="admin-btn-secondary"
                    style={{ padding: "8px 12px", minHeight: "36px", fontSize: "12.5px", gap: "5px" }}
                    onClick={onPreviewCatalog}
                    title="Visualizar apresentação da TV"
                  >
                    <Play size={13} />
                    <span className="hide-on-mobile">Preview</span>
                  </button>

                  <button
                    type="button"
                    className="admin-btn-secondary"
                    style={{ padding: "8px 12px", minHeight: "36px", fontSize: "12.5px", gap: "5px" }}
                    onClick={onSynthesize}
                    title="Atualizar telas a partir das ofertas do setor"
                  >
                    <Sparkles size={13} />
                    <span className="hide-on-mobile">Sintetizar</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div
          className="admin-card"
          style={{
            padding: "48px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            background: "var(--skalee-surface)",
            border: "1px dashed var(--skalee-border)",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "rgba(168, 85, 247, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--skalee-purple-light)",
            }}
          >
            <BookOpen size={28} />
          </div>

          <div>
            <h3 style={{ margin: 0, fontSize: "16px", color: "var(--skalee-text-primary)" }}>
              Nenhum catálogo encontrado
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--skalee-text-secondary)" }}>
              Tente buscar por outro termo ou limpe o campo de busca.
            </p>
          </div>

          <button
            type="button"
            className="admin-btn-secondary"
            onClick={() => setSearchQuery("")}
            style={{ marginTop: "8px" }}
          >
            Limpar Busca
          </button>
        </div>
      )}
    </div>
  );
};

