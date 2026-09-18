import { useState } from "react";
import { createPortal } from "react-dom";
import { Check, X, Clock, Eye } from "lucide-react";
import type { Offer } from "../../../types";
import {
  getOfferLayoutCapacity,
  type OfferLayout,
} from "../../../offers/layouts";
import type { OfferComposition } from "../../../offers/compositions";
import { LayoutSelector } from "./LayoutSelector";
import { OfferSelector } from "./OfferSelector";
import { CompositionSlots } from "./CompositionSlots";
import { CompositionPreview } from "./CompositionPreview";
import { getErrorMessage } from "../../../supabase";

export type CompositionEditorProps = {
  initialComposition: OfferComposition;
  availableOffers: readonly Offer[];
  sectorLabel?: string;
  onSave: (composition: OfferComposition) => Promise<void> | void;
  onCancel: () => void;
};

export function CompositionEditor({
  initialComposition,
  availableOffers,
  sectorLabel = "AÇOUGUE",
  onSave,
  onCancel,
}: CompositionEditorProps) {
  const [layout, setLayout] = useState<OfferLayout>(initialComposition.layout);
  const [selectedOffers, setSelectedOffers] = useState<Offer[]>([
    ...initialComposition.offers,
  ]);
  const [duration, setDuration] = useState<number>(
    initialComposition.duration || 8,
  );
  const [error, setError] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [testing, setTesting] = useState(false);

  const maxCapacity = getOfferLayoutCapacity(layout);

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
          `Capacidade máxima de ${maxCapacity} produtos atingida para o layout selecionado.`,
        );
        return;
      }
      setSelectedOffers((prev) => [...prev, offer]);
    }
  }

  function handleMoveUp(index: number) {
    if (index <= 0) return;
    setSelectedOffers((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  }

  function handleMoveDown(index: number) {
    if (index >= selectedOffers.length - 1) return;
    setSelectedOffers((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  }

  function handleRemoveFromSlot(index: number) {
    setError("");
    setSelectedOffers((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (selectedOffers.length === 0) {
      setError("Selecione ao menos 1 produto para salvar a camada de ofertas.");
      return;
    }

    if (selectedOffers.length > maxCapacity) {
      setError(
        `A camada possui mais produtos (${selectedOffers.length}) do que o formato suporta (${maxCapacity}).`,
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
    } catch (err: unknown) {
      console.error("[SKALEE CAMADAS] erro completo ao salvar:", err);
      console.error("[SKALEE CAMADAS] erro normalizado:", getErrorMessage(err));
      setError(`Erro ao salvar camada: ${getErrorMessage(err)}`);
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

  const modalElement = (
    <div className="composition-editor-modal-overlay">
      <div className={`composition-editor-modal ${testing ? "is-testing" : ""}`} role="dialog" aria-modal="true" aria-label="Editor de camada">
        <header className="composition-editor-header">
          <div>
            <h2>
              {initialComposition.offers.length > 0
                ? "Editar Camada"
                : "Nova Camada"}
            </h2>
            <p>
              Setor: <strong>{sectorLabel}</strong> · Camada de Ofertas
            </p>
          </div>
          <button
            type="button"
            className="editor-close-btn"
            onClick={onCancel}
            title="Cancelar e Fechar"
          >
            <X size={20} />
          </button>
        </header>

        {error && (
          <div className="composition-editor-error-banner" role="alert">
            {error}
          </div>
        )}

        <div className="composition-editor-body">
          <div className="composition-edit-fields" hidden={testing}>
          {/* PASSO 1: Escolha do Formato */}
          <section className="editor-step-section">
            <div className="step-header">
              <span className="step-number">1</span>
              <div>
                <h3>Escolha o Formato da Camada</h3>
                <p>Selecione quantos produtos serão exibidos simultaneamente nesta camada.</p>
              </div>
            </div>
            <LayoutSelector
              selectedLayout={layout}
              currentOffersCount={selectedOffers.length}
              onSelectLayout={handleSelectLayout}
            />
          </section>

          {/* PASSO 2: Seleção de Produtos */}
          <section className="editor-step-section">
            <div className="step-header">
              <span className="step-number">2</span>
              <div>
                <h3>Selecione os Produtos</h3>
                <p>
                  Escolha até {maxCapacity} produto(s) ativos do setor para compor esta camada.
                </p>
              </div>
            </div>
            <OfferSelector
              availableOffers={availableOffers}
              selectedOffers={selectedOffers}
              maxCapacity={maxCapacity}
              onToggleOffer={handleToggleOffer}
            />
          </section>

          {/* PASSO 3: Ordem dos Produtos nos Slots */}
          {selectedOffers.length > 0 && (
            <section className="editor-step-section">
              <div className="step-header">
                <span className="step-number">3</span>
                <div>
                  <h3>Posição dos Produtos na Camada</h3>
                  <p>Ajuste a ordem em que os produtos aparecerão nos espaços da camada.</p>
                </div>
              </div>
              <CompositionSlots
                selectedOffers={selectedOffers}
                maxCapacity={maxCapacity}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onRemove={handleRemoveFromSlot}
              />
            </section>
          )}

          {/* PASSO 4: Duração da Camada */}
          <section className="editor-step-section">
            <div className="step-header">
              <span className="step-number">4</span>
              <div>
                <h3>Duração da Camada</h3>
                <p>Tempo que esta camada de ofertas permanecerá visível na TV antes de avançar.</p>
              </div>
            </div>
            <div className="duration-input-row">
              <Clock size={18} className="duration-icon" />
              <input
                type="number"
                min={3}
                max={60}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="duration-input"
              />
              <span className="duration-unit">segundos</span>
              <small>(Mínimo: 3s · Máximo: 60s · Padrão: 8s)</small>
            </div>
          </section>

          </div>
          {/* PASSO 5: Pré-visualização Real */}
          <section className="editor-step-section">
            <div className="step-header">
              <span className="step-number">5</span>
              <div>
                <h3>{testing ? "Modo teste da camada" : "Pré-visualização da Camada"}</h3>
                <p>{testing ? "Teste o rascunho antes de salvar. A programação da TV permanece igual." : "Verifique o resultado visual da organização dos produtos na televisão."}</p>
              </div>
            </div>
            <CompositionPreview
              key={testing ? "test" : "inline"}
              composition={previewComposition}
              sectorLabel={sectorLabel}
            />
          </section>
        </div>

        <footer className="composition-editor-footer">
          <button
            type="button"
            className="btn btn-secondary composition-test-btn"
            onClick={() => setTesting((value) => !value)}
            disabled={selectedOffers.length === 0 || saving}
            aria-pressed={testing}
          >
            <Eye size={16} />
            {testing ? "Voltar à edição" : "Testar camada"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={selectedOffers.length === 0 || saving}
          >
            <Check size={16} />
            {saving ? "Salvando no Supabase..." : "Salvar Camada"}
          </button>
        </footer>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalElement, document.body)
    : modalElement;
}
