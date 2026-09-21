import React, { useState, type FormEvent, type RefObject } from "react";
import {
  Plus,
  Search,
  Package,
  Sparkles,
  Filter,
} from "lucide-react";
import type { Offer } from "../../../types";
import { newOffer, isEligible, formatDate } from "../../../data";
import { OfferCard } from "../offers/OfferCard";
import { OfferFormDrawer } from "../offers/OfferFormDrawer";
import { getOfferState, type OfferComputedState } from "../offers/OfferStatusChip";

export type OfferFilterTab = "all" | "active" | "future" | "expired" | "inactive";

export interface AdminOffersTabProps {
  sector: string;
  currentSectorLabel: string;
  offers: Offer[];
  productSearch: string;
  setProductSearch: (s: string) => void;
  showOfferForm: boolean;
  setShowOfferForm: (b: boolean) => void;
  draft: Offer;
  editing: boolean;
  field: (key: keyof Offer, value: string | number | boolean) => void;
  submit: (e: FormEvent) => void;
  setDraft: React.Dispatch<React.SetStateAction<Offer>>;
  setError: (s: string) => void;
  offerFileInputRef: RefObject<HTMLInputElement | null>;
  formRef?: RefObject<HTMLFormElement | null>;
  handleOfferFileUpload: (file: File) => Promise<void>;
  uploadingOfferImage: boolean;
  toggleOfferActive: (id: string, active: boolean) => void;
  moveOffer: (index: number, delta: number) => void;
  removeOffer: (id: string) => void;
}

export const AdminOffersTab: React.FC<AdminOffersTabProps> = ({
  sector,
  currentSectorLabel,
  offers,
  productSearch,
  setProductSearch,
  showOfferForm,
  setShowOfferForm,
  draft,
  editing,
  field,
  submit,
  setDraft,
  setError,
  offerFileInputRef,
  handleOfferFileUpload,
  uploadingOfferImage,
  toggleOfferActive,
  moveOffer,
  removeOffer,
}) => {
  const [activeFilter, setActiveFilter] = useState<OfferFilterTab>("all");
  const today = formatDate(new Date());

  // Contagens reais para os filtros
  const activeCount = offers.filter((o) => o.active && isEligible(o, today)).length;
  const futureCount = offers.filter((o) => o.active && o.startsAt && o.startsAt > today).length;
  const expiredCount = offers.filter((o) => o.active && o.endsAt && o.endsAt < today).length;
  const inactiveCount = offers.filter((o) => !o.active).length;

  // Filtragem composta (busca textual + filtro de status)
  const filteredOffers = offers.filter((offer) => {
    // 1. Busca textual (nome ou preço)
    const matchesSearch =
      !productSearch.trim() ||
      offer.name.toLowerCase().includes(productSearch.toLowerCase().trim()) ||
      offer.promotionalPrice.includes(productSearch.trim());

    if (!matchesSearch) return false;

    // 2. Filtro de status
    if (activeFilter === "all") return true;
    const { state } = getOfferState(offer);
    return state === activeFilter;
  });

  // Handler para editar oferta
  const handleEditOffer = (targetOffer: Offer) => {
    setDraft({ ...targetOffer });
    setShowOfferForm(true);
    setError("");
  };

  // Handler para duplicar oferta
  const handleDuplicateOffer = (targetOffer: Offer) => {
    const duplicated: Offer = {
      ...targetOffer,
      id: crypto.randomUUID(),
      name: `${targetOffer.name} (Cópia)`,
      displayOrder: offers.length,
    };
    setDraft(duplicated);
    setShowOfferForm(true);
    setError("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 1. Page Header */}
      <div className="admin-page-header">
        <div className="admin-page-header-info">
          <h1 className="admin-page-title">OFERTAS</h1>
          <p className="admin-page-description">
            Gerencie produtos, preços e períodos promocionais do setor <strong>{currentSectorLabel}</strong>.
          </p>
        </div>

        <button
          type="button"
          className="admin-btn-primary"
          onClick={() => {
            setDraft(newOffer(sector));
            setShowOfferForm(true);
            setError("");
          }}
        >
          <Plus size={18} />
          <span>Nova Oferta</span>
        </button>
      </div>

      {/* 2. Barra de Busca & Filtros */}
      <div className="admin-card admin-card-elevated" style={{ padding: "16px" }}>
        {/* Campo de Busca */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "14px", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1 }}>
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
              placeholder="Buscar produto, preço ou código..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              style={{
                width: "100%",
                paddingLeft: "42px",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Chips de Filtro */}
        <div className="admin-filter-bar">
          <button
            type="button"
            className={`admin-filter-chip ${activeFilter === "all" ? "active" : ""}`}
            onClick={() => setActiveFilter("all")}
          >
            <span>Todas</span>
            <span className="admin-filter-chip-count">{offers.length}</span>
          </button>

          <button
            type="button"
            className={`admin-filter-chip ${activeFilter === "active" ? "active" : ""}`}
            onClick={() => setActiveFilter("active")}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#22c55e",
                boxShadow: "0 0 6px #22c55e",
              }}
            />
            <span>Ativas</span>
            <span className="admin-filter-chip-count">{activeCount}</span>
          </button>

          <button
            type="button"
            className={`admin-filter-chip ${activeFilter === "future" ? "active" : ""}`}
            onClick={() => setActiveFilter("future")}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#06b6d4",
              }}
            />
            <span>Futuras</span>
            <span className="admin-filter-chip-count">{futureCount}</span>
          </button>

          <button
            type="button"
            className={`admin-filter-chip ${activeFilter === "expired" ? "active" : ""}`}
            onClick={() => setActiveFilter("expired")}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#ef4444",
              }}
            />
            <span>Vencidas</span>
            <span className="admin-filter-chip-count">{expiredCount}</span>
          </button>

          <button
            type="button"
            className={`admin-filter-chip ${activeFilter === "inactive" ? "active" : ""}`}
            onClick={() => setActiveFilter("inactive")}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#64748b",
              }}
            />
            <span>Inativas</span>
            <span className="admin-filter-chip-count">{inactiveCount}</span>
          </button>
        </div>
      </div>

      {/* 3. Grid de Ofertas Horizontais */}
      {filteredOffers.length > 0 ? (
        <div className="admin-offers-grid" aria-label="Lista de Ofertas">
          {filteredOffers.map((offer, index) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              index={index}
              totalOffers={filteredOffers.length}
              onEdit={handleEditOffer}
              onToggleActive={toggleOfferActive}
              onMoveOffer={moveOffer}
              onDuplicateOffer={handleDuplicateOffer}
              onDeleteOffer={removeOffer}
            />
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
            <Package size={28} />
          </div>

          <div>
            <h3 style={{ margin: 0, fontSize: "16px", color: "var(--skalee-text-primary)" }}>
              {productSearch.trim() || activeFilter !== "all"
                ? "Nenhuma oferta encontrada para os filtros aplicados"
                : `Nenhuma oferta cadastrada no setor ${currentSectorLabel}`}
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--skalee-text-secondary)" }}>
              {productSearch.trim() || activeFilter !== "all"
                ? "Tente buscar por outro termo ou limpe os filtros para ver todas as ofertas."
                : "Clique no botão abaixo para cadastrar a primeira oferta deste setor."}
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
            {productSearch.trim() || activeFilter !== "all" ? (
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => {
                  setProductSearch("");
                  setActiveFilter("all");
                }}
              >
                Limpar Filtros
              </button>
            ) : null}

            <button
              type="button"
              className="admin-btn-primary"
              onClick={() => {
                setDraft(newOffer(sector));
                setShowOfferForm(true);
                setError("");
              }}
            >
              <Plus size={16} />
              <span>+ Cadastrar Oferta</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Modal / Drawer para Cadastro e Edição de Ofertas */}
      <OfferFormDrawer
        isOpen={showOfferForm || editing}
        editing={editing}
        draft={draft}
        field={field}
        submit={submit}
        onClose={() => {
          setDraft(newOffer(sector));
          setShowOfferForm(false);
          setError("");
        }}
        offerFileInputRef={offerFileInputRef}
        handleOfferFileUpload={handleOfferFileUpload}
        uploadingOfferImage={uploadingOfferImage}
      />
    </div>
  );
};
