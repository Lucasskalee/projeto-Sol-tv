import React, { type FormEvent, type RefObject } from "react";
import { X, Upload, Check, Save } from "lucide-react";
import type { Offer } from "../../../types";
import { RemoveImageBackground } from "../../RemoveImageBackground";

export interface OfferFormDrawerProps {
  isOpen: boolean;
  editing: boolean;
  draft: Offer;
  field: (key: keyof Offer, value: string | number | boolean) => void;
  submit: (e: FormEvent) => void;
  onClose: () => void;
  offerFileInputRef: RefObject<HTMLInputElement | null>;
  handleOfferFileUpload: (file: File) => Promise<void>;
  uploadingOfferImage: boolean;
}

export const OfferFormDrawer: React.FC<OfferFormDrawerProps> = ({
  isOpen,
  editing,
  draft,
  field,
  submit,
  onClose,
  offerFileInputRef,
  handleOfferFileUpload,
  uploadingOfferImage,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop Overlay */}
      <div
        className="admin-drawer-form-overlay"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Content */}
      <div
        className="admin-drawer-form-content"
        role="dialog"
        aria-modal="true"
        aria-label={editing ? "Editar Oferta" : "Cadastrar Nova Oferta"}
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
              {editing ? "Editar Oferta" : "Cadastrar Nova Oferta"}
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--skalee-text-secondary)" }}>
              {editing
                ? "Atualize os dados comerciais e de exibição do produto"
                : "Preencha as informações do produto para exibição na TV"}
            </p>
          </div>

          <button
            type="button"
            className="admin-btn-secondary"
            style={{ padding: "6px 8px", minHeight: "32px" }}
            onClick={onClose}
            aria-label="Fechar formulário"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* SECTION 1: PRODUTO */}
          <div>
            <div className="admin-form-section-title">1. Dados do Produto</div>

            <label htmlFor="offer-name" style={{ fontSize: "13px", fontWeight: 600 }}>
              Nome do Produto / Oferta *
            </label>
            <input
              id="offer-name"
              required
              maxLength={65}
              value={draft.name}
              onChange={(e) => field("name", e.target.value)}
              placeholder="Ex.: Picanha Bovina Especial"
              style={{ marginTop: "4px", marginBottom: "12px" }}
            />

            {/* Imagem da Oferta */}
            <label htmlFor="offer-image" style={{ fontSize: "13px", fontWeight: 600 }}>
              Imagem do Produto *
            </label>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px", marginBottom: "8px" }}>
              <input
                id="offer-image"
                type="text"
                required
                value={draft.image}
                onChange={(e) => field("image", e.target.value)}
                placeholder="Cole uma URL ou selecione um arquivo..."
                style={{ flex: 1 }}
              />
              <input
                type="file"
                ref={offerFileInputRef as RefObject<HTMLInputElement>}
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleOfferFileUpload(file);
                }}
              />
              <button
                type="button"
                className="admin-btn-secondary"
                style={{ whiteSpace: "nowrap", padding: "8px 12px", minHeight: "38px" }}
                onClick={() => offerFileInputRef.current?.click()}
                disabled={uploadingOfferImage}
              >
                <Upload size={14} />
                <span>{uploadingOfferImage ? "Enviando..." : "📁 Escolher"}</span>
              </button>
            </div>

            {draft.image && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px",
                  background: "rgba(255, 255, 255, 0.03)",
                  borderRadius: "8px",
                  marginBottom: "10px",
                  border: "1px solid var(--skalee-border)",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "6px",
                    background: "rgba(0, 0, 0, 0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={draft.image}
                    alt="Prévia da oferta"
                    style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: "12px", color: "#3ddc97", fontWeight: 700, display: "block" }}>
                    ✓ Imagem selecionada
                  </span>
                  <small
                    style={{
                      fontSize: "11px",
                      color: "var(--skalee-text-secondary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "block",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {draft.image.startsWith("data:") ? "Arquivo local" : draft.image}
                  </small>
                </div>
                <button
                  type="button"
                  className="admin-btn-secondary"
                  style={{ padding: "4px 8px", fontSize: "11px", minHeight: "28px" }}
                  onClick={() => field("image", "")}
                >
                  Remover
                </button>
              </div>
            )}

            {draft.image && (
              <RemoveImageBackground
                key={draft.image}
                source={draft.image}
                disabled={uploadingOfferImage}
                onApply={handleOfferFileUpload}
              />
            )}

            {/* Ajuste de Escala / Tamanho */}
            <div
              style={{
                marginTop: "10px",
                padding: "10px 12px",
                background: "rgba(255, 255, 255, 0.03)",
                borderRadius: "8px",
                border: "1px solid var(--skalee-border)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "6px",
                }}
              >
                <label
                  htmlFor="offer-scale"
                  style={{ fontSize: "12px", fontWeight: 600, color: "var(--skalee-text-primary)", margin: 0 }}
                >
                  🔍 Ajuste de Tamanho (Zoom)
                </label>
                <span className="admin-chip admin-chip-purple" style={{ fontSize: "10px" }}>
                  {Math.round((draft.imageScale || 1) * 100)}%
                </span>
              </div>
              <input
                id="offer-scale"
                type="range"
                min="0.8"
                max="2.5"
                step="0.05"
                value={draft.imageScale || 1}
                onChange={(e) => field("imageScale", parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "var(--skalee-purple)" }}
              />
            </div>
          </div>

          {/* SECTION 2: PREÇO */}
          <div>
            <div className="admin-form-section-title">2. Valores Comerciais</div>

            <div className="row" style={{ gap: "10px" }}>
              <div style={{ flex: 1 }}>
                <label htmlFor="offer-regular-price" style={{ fontSize: "13px", fontWeight: 600 }}>
                  Preço Normal (De)
                </label>
                <input
                  id="offer-regular-price"
                  inputMode="decimal"
                  value={draft.regularPrice || ""}
                  onChange={(e) => field("regularPrice", e.target.value)}
                  placeholder="59,90"
                  style={{ marginTop: "4px" }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label htmlFor="offer-promotional-price" style={{ fontSize: "13px", fontWeight: 600 }}>
                  Preço de Oferta (Por) *
                </label>
                <input
                  id="offer-promotional-price"
                  required
                  inputMode="decimal"
                  value={draft.promotionalPrice}
                  onChange={(e) => field("promotionalPrice", e.target.value)}
                  placeholder="44,99"
                  style={{ marginTop: "4px", borderColor: "var(--skalee-purple)" }}
                />
              </div>

              <div style={{ width: "110px" }}>
                <label htmlFor="offer-unit" style={{ fontSize: "13px", fontWeight: 600 }}>
                  Unidade
                </label>
                <select
                  id="offer-unit"
                  value={draft.unit}
                  onChange={(e) => field("unit", e.target.value)}
                  style={{ marginTop: "4px" }}
                >
                  {["kg", "un", "bandeja", "peça", "pct"].map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 3: VIGÊNCIA */}
          <div>
            <div className="admin-form-section-title">3. Período de Vigência</div>

            <div className="row" style={{ gap: "10px" }}>
              <div style={{ flex: 1 }}>
                <label htmlFor="offer-start" style={{ fontSize: "13px", fontWeight: 600 }}>
                  Início *
                </label>
                <input
                  id="offer-start"
                  type="date"
                  required
                  value={draft.startsAt}
                  onChange={(e) => field("startsAt", e.target.value)}
                  style={{ marginTop: "4px" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label htmlFor="offer-end" style={{ fontSize: "13px", fontWeight: 600 }}>
                  Término *
                </label>
                <input
                  id="offer-end"
                  type="date"
                  required
                  value={draft.endsAt}
                  onChange={(e) => field("endsAt", e.target.value)}
                  style={{ marginTop: "4px" }}
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: EXIBIÇÃO & VÍDEO */}
          <div>
            <div className="admin-form-section-title">4. Exibição na TV</div>

            <label className="check" style={{ display: "flex", alignItems: "center", gap: "8px", margin: "6px 0 12px" }}>
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => field("active", e.target.checked)}
              />{" "}
              <span style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--skalee-text-primary)" }}>
                Oferta ativa e pronta para transmissão na TV
              </span>
            </label>

            <details>
              <summary style={{ cursor: "pointer", color: "var(--skalee-text-secondary)", fontSize: "13px" }}>
                Opções avançadas (Vídeo e tempo em tela)
              </summary>
              <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div>
                  <label htmlFor="offer-video" style={{ fontSize: "12px" }}>
                    URL do Vídeo Promocional (Opcional)
                  </label>
                  <input
                    id="offer-video"
                    type="url"
                    value={draft.video || ""}
                    onChange={(e) => field("video", e.target.value)}
                    placeholder="https://.../video.mp4"
                    style={{ marginTop: "4px" }}
                  />
                </div>
                <div>
                  <label htmlFor="offer-duration" style={{ fontSize: "12px" }}>
                    Tempo de exibição na TV (segundos)
                  </label>
                  <input
                    id="offer-duration"
                    type="number"
                    min={3}
                    max={60}
                    value={draft.duration || 8}
                    onChange={(e) => field("duration", parseInt(e.target.value, 10))}
                    style={{ marginTop: "4px" }}
                  />
                </div>
              </div>
            </details>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "16px",
              paddingTop: "14px",
              borderTop: "1px solid var(--skalee-border)",
            }}
          >
            <button
              type="submit"
              className="admin-btn-primary"
              style={{ flex: 1, justifyContent: "center" }}
            >
              <Save size={16} />
              <span>{editing ? "Salvar Alterações" : "Cadastrar Oferta"}</span>
            </button>
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={onClose}
              style={{ padding: "0 18px" }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

