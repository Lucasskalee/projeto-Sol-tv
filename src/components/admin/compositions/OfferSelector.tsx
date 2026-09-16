import { useMemo, useState } from "react";
import { Search, CheckCircle2 } from "lucide-react";
import type { Offer } from "../../../types";
import { ProductImage } from "../../OfferProduct";

export type OfferSelectorProps = {
  availableOffers: readonly Offer[];
  selectedOffers: readonly Offer[];
  maxCapacity: number;
  onToggleOffer: (offer: Offer) => void;
};

export function OfferSelector({
  availableOffers,
  selectedOffers,
  maxCapacity,
  onToggleOffer,
}: OfferSelectorProps) {
  const [query, setQuery] = useState("");

  const selectedIds = useMemo(
    () => new Set(selectedOffers.map((o) => o.id)),
    [selectedOffers],
  );

  const isFull = selectedOffers.length >= maxCapacity;

  const filteredOffers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return availableOffers;
    return availableOffers.filter((offer) =>
      offer.name.toLowerCase().includes(q),
    );
  }, [availableOffers, query]);

  return (
    <div className="offer-selector-section">
      <div className="offer-selector-toolbar">
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar produto por nome..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className={`capacity-counter-badge ${isFull ? "full" : ""}`}>
          {isFull ? (
            <CheckCircle2 size={15} />
          ) : (
            <span className="dot" />
          )}
          <span>
            {selectedOffers.length} / {maxCapacity} produtos selecionados
          </span>
        </div>
      </div>

      {isFull && (
        <div className="capacity-alert-banner">
          Capacidade máxima atingida ({maxCapacity}/{maxCapacity}). Para adicionar outro produto, desmarque um item selecionado.
        </div>
      )}

      {filteredOffers.length === 0 ? (
        <div className="empty-offers-state">
          {query ? (
            <p>Nenhum produto encontrado para "{query}".</p>
          ) : (
            <p>Nenhum produto ativo cadastrado neste setor.</p>
          )}
        </div>
      ) : (
        <div className="offer-picker-list">
          {filteredOffers.map((offer) => {
            const isSelected = selectedIds.has(offer.id);
            const isDisabled = !isSelected && isFull;

            return (
              <label
                key={offer.id}
                className={`offer-picker-item ${isSelected ? "selected" : ""} ${
                  isDisabled ? "disabled" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={isDisabled}
                  onChange={() => onToggleOffer(offer)}
                />

                <ProductImage
                  src={offer.image}
                  name={offer.name}
                  className="offer-picker-thumb"
                />

                <div className="offer-picker-info">
                  <strong>{offer.name || "Produto sem nome"}</strong>
                  <div className="offer-picker-prices">
                    {offer.regularPrice && (
                      <span className="old">De R$ {offer.regularPrice}</span>
                    )}
                    <span className="promo">
                      Por R$ {offer.promotionalPrice || "0,00"}/{offer.unit}
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <span className="selected-slot-indicator">
                    Slot {selectedOffers.findIndex((o) => o.id === offer.id) + 1}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

