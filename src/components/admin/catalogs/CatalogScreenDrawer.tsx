import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  X,
  Clock,
  Eye,
  Search,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Trash2,
  Layers,
  Sparkles,
} from "lucide-react";
import type { Offer } from "../../../types";
import {
  getOfferLayoutCapacity,
  OFFER_LAYOUTS,
  type OfferLayout,
} from "../../../offers/layouts";
import type { OfferComposition } from "../../../offers/compositions";
import { CompositionPreview } from "../compositions/CompositionPreview";
import { ProductSelectItem } from "./ProductSelectItem";

export interface CatalogScreenDrawerProps {
  isOpen: boolean;
  initialComposition: OfferComposition;
  availableOffers: readonly Offer[];
  sectorLabel?: string;
  onSave: (composition: OfferComposition) => Promise<void> | void;
  onClose: () => void;
}

const LAYOUT_CHOICES: Array<{
  id: OfferLayout;
  title: string;
  subtitle: string;
  capacity: number;
  icon: string;
}> = [
  { id: "hero", title: "1 Produto", subtitle: "Destaque amplo (Hero)", capacity: 1, icon: "★" },
  { id: "duo", title: "2 Produtos", subtitle: "Apresentação dupla (Duo)", capacity: 2, icon: "⚏" },
  { id: "trio", title: "3 Produtos", subtitle: "Trio proporcional", capacity: 3, icon: "☰" },
  { id: "grid4", title: "4 Produtos", subtitle: "Grade 4 produtos", capacity: 4, icon: "▦" },
  { id: "grid8", title: "8 Produtos", subtitle: "Grade 8 compacta", capacity: 8, icon: "▥" },
];

export const CatalogScreenDrawer: React.FC<CatalogScreenDrawerProps> = ({
  isOpen,
  initialComposition,
  availableOffers,
  sectorLabel = "AÇOUGUE",
  onSave,
  onClose,
}) => {
  const [layout, setLayout] = useState<OfferLayout>(initialComposition.layout || "hero");
  const [selectedOffers, setSelectedOffers] = useState<Offer[]>([
    ...initialComposition.offers,
  ]);
  const [duration, setDuration] = useState<number>(initialComposition.duration || 8);
  const [productSearch, setProductSearch] = useState("");
  const [error, setError] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [testingMode, setTestingMode] = useState<boolean>(false);

  if (!isOpen) return null;

  const maxCapacity = getOfferLayoutCapacity(layout);
  const isFull = selectedOffers.length >= maxCapacity;
  const selectedIds = new Set(selectedOffers.map((o) => o.id));

  // Filtra ofertas ativas com base na busca
  const filteredOffers = availableOffers.filter((offer) => {
    if (!productSearch.trim()) return true;
    return (
      offer.name.toLowerCase().includes(productSearch.toLowerCase().trim()) ||
      offer.promotionalPrice.includes(productSearch.trim())
    );
  });

  function handleSelectLayout(nextLayout: OfferLayout) {
    const nextCapacity = getOfferLayoutCapacity(nextLayout);
    if (selectedOffers.length > nextCapacity) {
      setError(
        `O layout ${nextLayout.toUpperCase()} aceita no máximo ${nextCapacity} produto(s). Remova ${
          selectedOffers.length - nextCapacity
        } produto(s) antes de trocar.`,
      );
      return;
    }
    setError("");
    setLayout(nextLayout);
  }

  function handleToggleOffer(offer: Offer) {
    setError("");
    const exists = selectedOffers.some((o) => o.id === offer.id);

    if (exists) {
      setSelectedOffers((prev) => prev.filter((o) => o.id !== offer.id));
    } else {
      if (selectedOffers.length >= maxCapacity) {
        setError(
          `Capacidade máxima de ${maxCapacity} produtos atingida para o layout escolhido.`,
        );
        return;
      }
      setSelectedOffers((prev) => [...prev, offer]);
    }
  }

  function handleMoveSlot(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= selectedOffers.length) return;
    setSelectedOffers((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[target];
      next[target] = temp;
      return next;
    });
  }

  function handleRemoveSlot(index: number) {
    setError("");
    setSelectedOffers((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (selectedOffers.length === 0) {
      setError("Selecione ao menos 1 produto para salvar a tela.");
      return;
    }

    if (selectedOffers.length > maxCapacity) {
      setError(
        `A tela possui mais produtos (${selectedOffers.length}) do que o formato suporta (${maxCapacity}).`,
      );
      return;
    }

    const safeDuration = Math.max(3, Math.min(60, Number(duration) || 8));

    const updatedComposition: OfferComposition = {
      ...initialComposition,
      layout,
      duration: safeDuration,
      offers: Object.freeze([...selectedOffers]),
      updatedAt: new Date().toISOString(),
    };

    setSaving(true);
    setError("");
    try {
      await onSave(updatedComposition);
      onClose();
    } catch (err: unknown) {
      setError("Erro ao salvar tela no banco de dados.");
    } finally {
      setSaving(false);
    }
  }

  const previewComposition: OfferComposition = {
    ...initialComposition,
    layout,
    duration: Math.max(3, Math.min(60, Number(duration) || 8)),
    offers: Object.freeze([...selectedOffers]),
  };

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        className="admin-drawer-form-overlay"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Body */}
      <div
        className="admin-drawer-form-content"
        role="dialog"
        aria-modal="true"
        aria-label="Configurar Tela do Catálogo"
        style={{ width: "640px" }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
            paddingBottom: "12px",
            borderBottom: "1px solid var(--skalee-border)",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#ffffff" }}>
              {initialComposition.offers.length > 0 ? "Editar Tela do Catálogo" : "Nova Tela do Catálogo"}
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--skalee-text-secondary)" }}>
              Setor: <strong>{sectorLabel}</strong> • Organize o layout e os produtos exibidos nesta tela
            </p>
          </div>

          <button
            type="button"
            className="admin-btn-secondary"
            style={{ padding: "6px 8px", minHeight: "32px" }}
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="toast-inline error" role="alert" style={{ marginBottom: "14px" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* PASSO 1: Escolha do Layout */}
          <div>
            <div className="admin-form-section-title">1. Escolha o Layout da Tela</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(105px, 1fr))",
                gap: "8px",
                marginTop: "8px",
              }}
            >
              {LAYOUT_CHOICES.map((choice) => {
                const isSelected = layout === choice.id;
                const exceeds = selectedOffers.length > choice.capacity;

                return (
                  <button
                    key={choice.id}
                    type="button"
                    className={`admin-filter-chip ${isSelected ? "active" : ""}`}
                    style={{
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "10px 8px",
                      borderRadius: "10px",
                      height: "auto",
                      border: isSelected
                        ? "1.5px solid var(--skalee-purple)"
                        : "1px solid var(--skalee-border)",
                      opacity: exceeds ? 0.4 : 1,
                      cursor: exceeds ? "not-allowed" : "pointer",
                    }}
                    onClick={() => {
                      if (!exceeds) handleSelectLayout(choice.id);
                    }}
                    title={
                      exceeds
                        ? `Remova ${selectedOffers.length - choice.capacity} produto(s) antes de trocar`
                        : undefined
                    }
                  >
                    <span style={{ fontSize: "16px", marginBottom: "2px" }}>{choice.icon}</span>
                    <strong style={{ fontSize: "12px", color: isSelected ? "var(--skalee-purple-light)" : "#fff" }}>
                      {choice.title}
                    </strong>
                    <small style={{ fontSize: "10px", color: "var(--skalee-text-secondary)" }}>
                      máx {choice.capacity}
                    </small>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PASSO 2: Seleção de Produtos (Preço apenas informativo) */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <div className="admin-form-section-title" style={{ margin: 0 }}>
                2. Selecione os Produtos
              </div>

              <div
                className={`admin-chip ${isFull ? "admin-chip-purple" : ""}`}
                style={{ fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                {isFull && <CheckCircle2 size={12} />}
                <span>
                  {selectedOffers.length} / {maxCapacity} selecionados
                </span>
              </div>
            </div>

            {/* Busca de Produtos */}
            <div style={{ position: "relative", marginBottom: "8px" }}>
              <Search
                size={15}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--skalee-text-secondary)",
                  pointerEvents: "none",
                }}
              />
              <input
                type="search"
                className="search-input"
                placeholder="Buscar produto cadastrado..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                style={{ width: "100%", paddingLeft: "36px", boxSizing: "border-box", fontSize: "13px" }}
              />
            </div>

            {/* Lista de Seleção */}
            <div className="admin-product-select-list">
              {filteredOffers.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", fontSize: "12.5px", color: "var(--skalee-text-muted)" }}>
                  Nenhum produto encontrado.
                </div>
              ) : (
                filteredOffers.map((offer) => {
                  const isSelected = selectedIds.has(offer.id);
                  const isDisabled = !isSelected && isFull;
                  const slotIndex = isSelected
                    ? selectedOffers.findIndex((o) => o.id === offer.id)
                    : undefined;

                  return (
                    <ProductSelectItem
                      key={offer.id}
                      offer={offer}
                      isSelected={isSelected}
                      isDisabled={isDisabled}
                      slotIndex={slotIndex}
                      onToggle={handleToggleOffer}
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* PASSO 3: Ordem dos Produtos nos Slots */}
          {selectedOffers.length > 0 && (
            <div>
              <div className="admin-form-section-title">3. Posição dos Produtos nos Slots</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {selectedOffers.map((offer, idx) => (
                  <div
                    key={offer.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 10px",
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid var(--skalee-border)",
                      borderRadius: "6px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 800,
                          color: "var(--skalee-purple-light)",
                          width: "50px",
                          flexShrink: 0,
                        }}
                      >
                        Slot {idx + 1}
                      </span>
                      <span
                        style={{
                          fontSize: "12.5px",
                          color: "#fff",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {offer.name}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <button
                        type="button"
                        className="admin-btn-secondary"
                        style={{ padding: "4px 6px", minHeight: "28px" }}
                        disabled={idx === 0}
                        onClick={() => handleMoveSlot(idx, "up")}
                        title="Mover para cima"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        className="admin-btn-secondary"
                        style={{ padding: "4px 6px", minHeight: "28px" }}
                        disabled={idx === selectedOffers.length - 1}
                        onClick={() => handleMoveSlot(idx, "down")}
                        title="Mover para baixo"
                      >
                        <ArrowDown size={13} />
                      </button>
                      <button
                        type="button"
                        className="admin-btn-secondary"
                        style={{ padding: "4px 6px", minHeight: "28px", color: "#f87171" }}
                        onClick={() => handleRemoveSlot(idx)}
                        title="Remover produto da tela"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PASSO 4: Duração da Tela */}
          <div>
            <div className="admin-form-section-title">4. Duração da Exibição</div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Clock size={16} style={{ color: "var(--skalee-text-secondary)" }} />
              <input
                type="number"
                min={3}
                max={60}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                style={{ width: "90px", fontSize: "14px", fontWeight: 700 }}
              />
              <span style={{ fontSize: "13px", color: "var(--skalee-text-secondary)" }}>
                segundos na TV
              </span>
            </div>
          </div>

          {/* PASSO 5: Pré-visualização Real 16:9 */}
          {selectedOffers.length > 0 && (
            <div>
              <div className="admin-form-section-title">5. Pré-visualização Real (16:9)</div>
              <CompositionPreview
                composition={previewComposition}
                sectorLabel={sectorLabel}
              />
            </div>
          )}

          {/* Ações */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "10px",
              paddingTop: "14px",
              borderTop: "1px solid var(--skalee-border)",
            }}
          >
            <button
              type="button"
              className="admin-btn-primary"
              style={{ flex: 1, justifyContent: "center" }}
              onClick={handleSave}
              disabled={selectedOffers.length === 0 || saving}
            >
              <Check size={16} />
              <span>{saving ? "Salvando..." : "Salvar Tela"}</span>
            </button>

            <button
              type="button"
              className="admin-btn-secondary"
              onClick={onClose}
              disabled={saving}
              style={{ padding: "0 18px" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : modalContent;
};

