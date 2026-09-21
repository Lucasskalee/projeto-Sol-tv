import React from "react";
import type { Offer } from "../../../types";

export interface ProductSelectItemProps {
  offer: Offer;
  isSelected: boolean;
  isDisabled: boolean;
  slotIndex?: number;
  onToggle: (offer: Offer) => void;
}

export const ProductSelectItem: React.FC<ProductSelectItemProps> = ({
  offer,
  isSelected,
  isDisabled,
  slotIndex,
  onToggle,
}) => {
  const shortCode = offer.id.slice(0, 6).toUpperCase();

  return (
    <div
      className={`admin-product-select-item ${isSelected ? "selected" : ""} ${isDisabled ? "disabled" : ""}`}
      onClick={() => {
        if (!isDisabled || isSelected) {
          onToggle(offer);
        }
      }}
      role="checkbox"
      aria-checked={isSelected}
      aria-disabled={isDisabled}
      tabIndex={isDisabled && !isSelected ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          if (!isDisabled || isSelected) {
            onToggle(offer);
          }
        }
      }}
    >
      {/* 1. Checkbox */}
      <div className={`admin-product-select-checkbox ${isSelected ? "checked" : ""}`}>
        {isSelected ? "✓" : ""}
      </div>

      {/* 2. Thumbnail (48x48px fixa, object-fit: contain, isolada da TV) */}
      <div className="admin-product-select-thumb-box">
        {offer.image ? (
          <img
            src={offer.image}
            alt=""
            className="admin-product-select-img"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
        ) : (
          <span style={{ fontSize: "16px", opacity: 0.3 }}>🛒</span>
        )}
      </div>

      {/* 3. Informações (Nome & Código) */}
      <div className="admin-product-select-info">
        <span className="admin-product-select-name" title={offer.name}>
          {offer.name}
        </span>
        <span className="admin-product-select-code">Cód. {shortCode}</span>
      </div>

      {/* 4. Preço Comercial da Oferta */}
      <div className="admin-product-select-price">
        <span className="admin-product-select-price-val">
          R$ {offer.promotionalPrice}
        </span>
        <span className="admin-product-select-price-unit">/{offer.unit}</span>
      </div>

      {/* 5. Slot Indicator (quando selecionado) */}
      {isSelected && typeof slotIndex === "number" && (
        <span className="admin-product-select-slot-badge">
          Slot #{slotIndex + 1}
        </span>
      )}
    </div>
  );
};

