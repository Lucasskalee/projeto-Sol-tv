import { ArrowDown, ArrowUp, X } from "lucide-react";
import type { Offer } from "../../../types";
import { ProductImage } from "../../OfferProduct";

export type CompositionSlotsProps = {
  selectedOffers: readonly Offer[];
  maxCapacity: number;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (index: number) => void;
};

export function CompositionSlots({
  selectedOffers,
  maxCapacity,
  onMoveUp,
  onMoveDown,
  onRemove,
}: CompositionSlotsProps) {
  const slots = Array.from({ length: maxCapacity }, (_, i) => selectedOffers[i] || null);

  return (
    <div className="composition-slots-section">
      <div className="slots-grid">
        {slots.map((offer, index) => {
          const isAssigned = Boolean(offer);

          return (
            <div
              key={offer ? offer.id : `empty-slot-${index}`}
              className={`slot-card ${isAssigned ? "assigned" : "empty"}`}
            >
              <div className="slot-header">
                <span className="slot-number">Slot {index + 1}</span>
                {isAssigned && (
                  <div className="slot-actions">
                    <button
                      type="button"
                      className="slot-btn"
                      disabled={index === 0}
                      onClick={() => onMoveUp(index)}
                      title="Mover para cima"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      className="slot-btn"
                      disabled={index === selectedOffers.length - 1}
                      onClick={() => onMoveDown(index)}
                      title="Mover para baixo"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      className="slot-btn remove"
                      onClick={() => onRemove(index)}
                      title="Remover deste slot"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              {offer ? (
                <div className="slot-content">
                  <ProductImage
                    src={offer.image}
                    name={offer.name}
                    className="slot-thumb"
                  />
                  <div className="slot-details">
                    <strong className="slot-title">{offer.name}</strong>
                    <span className="slot-price">
                      R$ {offer.promotionalPrice}/{offer.unit}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="slot-empty-placeholder">
                  <span>Slot vazio</span>
                  <small>Selecione um produto no Passo 2</small>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

