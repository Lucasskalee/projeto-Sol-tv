import React from "react";
import { Pencil, Calendar } from "lucide-react";
import type { Offer } from "../../../types";
import { OfferStatusChip } from "./OfferStatusChip";
import { OfferActionsMenu } from "./OfferActionsMenu";

export interface OfferCardProps {
  offer: Offer;
  index: number;
  totalOffers: number;
  onEdit: (offer: Offer) => void;
  onToggleActive: (id: string, active: boolean) => void;
  onMoveOffer: (index: number, delta: number) => void;
  onDuplicateOffer: (offer: Offer) => void;
  onDeleteOffer: (id: string) => void;
}

function formatShortDate(dateStr?: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
}

export const OfferCard: React.FC<OfferCardProps> = ({
  offer,
  index,
  totalOffers,
  onEdit,
  onToggleActive,
  onMoveOffer,
  onDuplicateOffer,
  onDeleteOffer,
}) => {
  const shortStart = formatShortDate(offer.startsAt);
  const shortEnd = formatShortDate(offer.endsAt);
  const validityText =
    shortStart && shortEnd
      ? `${shortStart} → ${shortEnd}`
      : shortEnd
      ? `Até ${shortEnd}`
      : "Contínua";

  // Gera código curto fictício baseado no ID se não houver código explícito
  const shortCode = offer.id.slice(0, 6).toUpperCase();

  return (
    <article
      className={`admin-offer-card ${!offer.active ? "inactive" : ""}`}
      key={offer.id}
    >
      {/* DESKTOP & TABLET LAYOUT (>= 768px) */}
      <div className="admin-offer-card-desktop">
        {/* 1. Imagem do Produto (Container fixo 96x96px com contain) */}
        <div className="offer-card__media">
          {offer.image ? (
            <img
              src={offer.image}
              alt={offer.name}
              className="offer-card__image"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
          ) : (
            <span style={{ fontSize: "28px", opacity: 0.3 }}>🛒</span>
          )}
        </div>

        {/* 2. Informações Principais (Nome e Código) */}
        <div className="offer-card__content">
          <h3 className="offer-card__title" title={offer.name}>
            {offer.name}
          </h3>
          <span className="offer-card__code">Cód. {shortCode}</span>
        </div>

        {/* 3. Bloco de Preço */}
        <div className="offer-card__price">
          <div className="offer-card__price-main">
            <span className="offer-card__price-currency">R$</span>
            <span className="offer-card__price-value">{offer.promotionalPrice}</span>
            <span className="offer-card__price-unit">/{offer.unit}</span>
          </div>
          {offer.regularPrice && (
            <span className="offer-card__price-regular">
              De R$ {offer.regularPrice}
            </span>
          )}
        </div>

        {/* 4. Vigência & Status */}
        <div className="offer-card__meta">
          <OfferStatusChip offer={offer} />
          <span className="offer-card__validity" title={`Vigência: ${validityText}`}>
            <Calendar size={12} style={{ opacity: 0.6, flexShrink: 0 }} />
            <span>{validityText}</span>
          </span>
        </div>

        {/* 5. Ações */}
        <div className="offer-card__actions">
          <button
            type="button"
            className="admin-btn-secondary"
            style={{
              padding: "6px 14px",
              minHeight: "36px",
              fontSize: "13px",
              gap: "6px",
            }}
            onClick={() => onEdit(offer)}
          >
            <Pencil size={13} />
            <span>Editar</span>
          </button>

          <OfferActionsMenu
            offer={offer}
            canMoveUp={index > 0}
            canMoveDown={index < totalOffers - 1}
            onEdit={() => onEdit(offer)}
            onToggleActive={(active) => onToggleActive(offer.id, active)}
            onMoveUp={() => onMoveOffer(index, -1)}
            onMoveDown={() => onMoveOffer(index, 1)}
            onDuplicate={() => onDuplicateOffer(offer)}
            onDelete={() => onDeleteOffer(offer.id)}
          />
        </div>
      </div>

      {/* MOBILE LAYOUT (< 768px) */}
      <div className="admin-offer-card-mobile">
        {/* Top: Imagem (68px) + Nome + Menu */}
        <div className="offer-card-mobile__top">
          <div className="offer-card-mobile__media">
            {offer.image ? (
              <img
                src={offer.image}
                alt={offer.name}
                className="offer-card__image"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <span style={{ fontSize: "22px", opacity: 0.3 }}>🛒</span>
            )}
          </div>

          <div className="offer-card-mobile__info">
            <h3 className="offer-card__title" title={offer.name}>
              {offer.name}
            </h3>
            <span className="offer-card__code">Cód. {shortCode}</span>
          </div>

          <OfferActionsMenu
            offer={offer}
            canMoveUp={index > 0}
            canMoveDown={index < totalOffers - 1}
            onEdit={() => onEdit(offer)}
            onToggleActive={(active) => onToggleActive(offer.id, active)}
            onMoveUp={() => onMoveOffer(index, -1)}
            onMoveDown={() => onMoveOffer(index, 1)}
            onDuplicate={() => onDuplicateOffer(offer)}
            onDelete={() => onDeleteOffer(offer.id)}
          />
        </div>

        {/* Middle: Preço */}
        <div className="offer-card-mobile__price-row">
          <div className="offer-card__price-main">
            <span className="offer-card__price-currency">R$</span>
            <span className="offer-card__price-value" style={{ fontSize: "24px" }}>
              {offer.promotionalPrice}
            </span>
            <span className="offer-card__price-unit">/{offer.unit}</span>
          </div>
          {offer.regularPrice && (
            <span className="offer-card__price-regular">
              De R$ {offer.regularPrice}
            </span>
          )}
        </div>

        {/* Bottom: Status & Vigência */}
        <div className="offer-card-mobile__bottom">
          <OfferStatusChip offer={offer} />
          <span className="offer-card__validity">
            <Calendar size={12} style={{ opacity: 0.6 }} />
            <span>{validityText}</span>
          </span>
        </div>
      </div>
    </article>
  );
};
