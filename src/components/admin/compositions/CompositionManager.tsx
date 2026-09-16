import { useEffect, useState } from "react";
import {
  Plus,
  Copy,
  Trash2,
  Pencil,
  Eye,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Info,
  Clock,
  Layers,
  Power,
} from "lucide-react";
import type { Offer, SolTvMedia } from "../../../types";
import {
  buildCompositionPlaylist,
  checkCompositionProductStatus,
  duplicateComposition,
  newComposition,
  synthesizeCompositionsFromOffers,
  type OfferComposition,
} from "../../../offers/compositions";
import { OFFER_LAYOUTS, type OfferLayout } from "../../../offers/layouts";
import { CompositionEditor } from "./CompositionEditor";
import { TvPlayer } from "../../TvPlayer";
import { normalTheme } from "../../../themes/normal";
import { blackFridayTheme } from "../../../themes/blackFriday";
import { ProductImage } from "../../OfferProduct";
import { getErrorMessage } from "../../../supabase";

export type CompositionManagerProps = {
  sector: string;
  sectorLabel?: string;
  offers: readonly Offer[];
  media: readonly SolTvMedia[];
  compositions?: readonly OfferComposition[];
  hidePreview?: boolean;
  onSaveComposition?: (comp: OfferComposition) => Promise<void> | void;
  onDeleteComposition?: (id: string) => Promise<void> | void;
  onReorderCompositions?: (compositions: OfferComposition[]) => Promise<void> | void;
};

const LAYOUT_DISPLAY: Record<OfferLayout, { name: string; count: string }> = {
  hero: { name: "DESTAQUE", count: "1 produto" },
  duo: { name: "DUPLA", count: "2 produtos" },
  grid4: { name: "GRADE 4", count: "4 produtos" },
  grid8: { name: "GRADE 8", count: "8 produtos" },
};

export function CompositionManager({
  sector,
  sectorLabel = "AÇOUGUE",
  offers,
  media,
  compositions: initialCompositions,
  hidePreview = false,
  onSaveComposition,
  onDeleteComposition,
  onReorderCompositions,
}: CompositionManagerProps) {
  const [compositions, setCompositions] = useState<OfferComposition[]>(() => {
    return initialCompositions ? [...initialCompositions] : [];
  });

  const [editingComposition, setEditingComposition] = useState<OfferComposition | null>(
    null,
  );
  const [previewThemeSlug, setPreviewThemeSlug] = useState<"normal" | "black-friday">(
    "normal",
  );
  const [notice, setNotice] = useState<string>("");

  // Re-sync with sector switch or prop updates from Supabase
  useEffect(() => {
    if (initialCompositions) {
      setCompositions([...initialCompositions]);
    }
  }, [initialCompositions]);

  function handleCreateNew() {
    const fresh = newComposition(sector, "hero", compositions.length);
    setEditingComposition(fresh);
  }

  function handleEdit(comp: OfferComposition) {
    setEditingComposition(comp);
  }

  async function handleDuplicate(comp: OfferComposition) {
    const dup = duplicateComposition(comp, compositions.length);
    if (onSaveComposition) {
      try {
        await onSaveComposition(dup);
        showNotice("Camada duplicada com sucesso.");
      } catch (err) {
        console.error("[SKALEE CAMADAS] erro completo ao salvar:", err);
        console.error("[SKALEE CAMADAS] erro normalizado:", getErrorMessage(err));
      }
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Deseja realmente excluir esta camada de ofertas?")) return;
    if (onDeleteComposition) {
      try {
        await onDeleteComposition(id);
        showNotice("Camada de ofertas excluída.");
      } catch (err) {
        console.error("[SKALEE CAMADAS] erro completo ao excluir:", err);
        console.error("[SKALEE CAMADAS] erro normalizado:", getErrorMessage(err));
      }
    }
  }

  async function handleToggleActive(id: string) {
    const target = compositions.find((c) => c.id === id);
    if (!target) return;
    const updated = { ...target, active: !target.active, updatedAt: new Date().toISOString() };
    if (onSaveComposition) {
      try {
        await onSaveComposition(updated);
        showNotice(updated.active ? "Camada exibindo na TV." : "Camada ocultada da TV.");
      } catch (err) {
        console.error("[SKALEE CAMADAS] erro completo ao salvar:", err);
        console.error("[SKALEE CAMADAS] erro normalizado:", getErrorMessage(err));
      }
    }
  }

  async function handleMove(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= compositions.length) return;

    const next = [...compositions];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;

    // Recalculate positions
    const reordered = next.map((c, i) => ({ ...c, position: i }));
    if (onReorderCompositions) {
      try {
        await onReorderCompositions(reordered);
      } catch (err) {
        console.error("[SKALEE CAMADAS] erro completo ao reordenar:", err);
        console.error("[SKALEE CAMADAS] erro normalizado:", getErrorMessage(err));
      }
    }
  }

  async function handleSaveEditor(saved: OfferComposition) {
    if (onSaveComposition) {
      await onSaveComposition(saved);
    }
    setEditingComposition(null);
    showNotice("Camada de ofertas salva com sucesso.");
  }

  async function handleSynthesizeFromCatalog() {
    if (
      compositions.length > 0 &&
      !window.confirm(
        "Isso irá reconstruir as camadas a partir das ofertas ativas do catálogo. Deseja continuar?",
      )
    ) {
      return;
    }

    const synthesized = synthesizeCompositionsFromOffers(offers as Offer[]);
    if (onSaveComposition) {
      try {
        for (const comp of synthesized) {
          await onSaveComposition(comp);
        }
        showNotice(`${synthesized.length} camada(s) sintetizada(s) e salvas no banco de dados.`);
      } catch (err) {
        console.error("[SKALEE CAMADAS] Erro ao sincronizar camadas sintetizadas no Supabase:", err);
      }
    }
  }

  function showNotice(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3500);
  }

  const activeTheme = previewThemeSlug === "black-friday" ? blackFridayTheme : normalTheme;

  // Build real preview content using composition playlist
  const fullPlaylist = buildCompositionPlaylist(
    compositions,
    media as SolTvMedia[],
  );

  const unifiedTvContent = {
    sector,
    offers: offers as Offer[],
    media: media as SolTvMedia[],
    compositions,
    playlist: fullPlaylist,
    publishedAt: new Date().toISOString(),
  };

  return (
    <div className="composition-manager-page">
      {notice && (
        <div className="toast-inline success" role="status">
          {notice}
        </div>
      )}

      {/* Top Action Bar */}
      <div className="composition-action-bar">
        <div className="action-bar-titles">
          <h3>CAMADAS DA TV</h3>
          <p>
            {compositions.length} camada(s) configurada(s)
          </p>
        </div>

        <div className="action-bar-buttons">
          <button
            type="button"
            className="btn btn-secondary action-btn-compact"
            onClick={handleSynthesizeFromCatalog}
            title="Recria as camadas agrupando as ofertas ativas atuais do catálogo"
          >
            <Layers size={14} />
            Sintetizar
          </button>
          <button
            type="button"
            className="btn btn-primary action-btn-compact"
            onClick={handleCreateNew}
          >
            <Plus size={15} />
            + Nova camada
          </button>
        </div>
      </div>

      {/* Compositions List */}
      {compositions.length === 0 ? (
        <div className="empty-compositions-card">
          <Layers size={36} />
          <h4>Nenhuma camada configurada</h4>
          <p>
            Crie sua primeira camada escolhendo o formato e selecionando os produtos, ou clique em
            "Sintetizar" para gerar automaticamente a partir do catálogo.
          </p>
          <div className="empty-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreateNew}
            >
              <Plus size={16} />
              + Criar Primeira Camada
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleSynthesizeFromCatalog}
            >
              Sintetizar do Catálogo
            </button>
          </div>
        </div>
      ) : (
        <div className="compositions-list">
          {compositions.map((comp, index) => {
            const layoutDef = LAYOUT_DISPLAY[comp.layout];
            const status = checkCompositionProductStatus(comp, offers);

            return (
              <div
                key={comp.id}
                className={`composition-card ${comp.active ? "active" : "inactive"}`}
              >
                <div className="comp-card-header">
                  <div className="comp-card-badge-row">
                    <span className="comp-index-tag">#{index + 1}</span>
                    <span className="comp-layout-badge">
                      {layoutDef ? `${layoutDef.name} (${layoutDef.count})` : comp.layout.toUpperCase()}
                    </span>
                    <span className="comp-duration-tag">
                      <Clock size={12} />
                      {comp.duration}s
                    </span>
                    <span
                      className={`comp-status-tag ${comp.active ? "active" : "inactive"}`}
                    >
                      {comp.active ? "● EXIBINDO" : "OCULTA"}
                    </span>
                    {status.hasInactive && (
                      <span
                        className="comp-warning-badge"
                        title="Esta camada contém produto(s) inativo(s) no catálogo"
                      >
                        ⚠ {status.inactiveCount} inativo(s)
                      </span>
                    )}
                    {status.hasMissing && (
                      <span
                        className="comp-danger-badge"
                        title="Esta camada contém produto(s) removido(s) do catálogo"
                      >
                        ⚠ {status.missingCount} ausente(s)
                      </span>
                    )}
                  </div>

                  <div className="comp-card-actions">
                    <button
                      type="button"
                      className="comp-action-btn"
                      disabled={index === 0}
                      onClick={() => handleMove(index, "up")}
                      title="Mover camada para cima"
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      type="button"
                      className="comp-action-btn"
                      disabled={index === compositions.length - 1}
                      onClick={() => handleMove(index, "down")}
                      title="Mover camada para baixo"
                    >
                      <ArrowDown size={15} />
                    </button>
                    <button
                      type="button"
                      className={`comp-action-btn ${comp.active ? "active-toggle" : ""}`}
                      onClick={() => handleToggleActive(comp.id)}
                      title={comp.active ? "Ocultar camada na TV" : "Exibir camada na TV"}
                    >
                      <Power size={15} />
                    </button>
                    <button
                      type="button"
                      className="comp-action-btn"
                      onClick={() => handleEdit(comp)}
                      title="Editar esta camada"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="comp-action-btn"
                      onClick={() => handleDuplicate(comp)}
                      title="Duplicar camada"
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      type="button"
                      className="comp-action-btn danger"
                      onClick={() => handleDelete(comp.id)}
                      title="Excluir camada"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Products in Composition */}
                <div className="comp-card-products">
                  {comp.offers.map((offer, slotIdx) => {
                    const catalogOffer = offers.find((o) => o.id === offer.id);
                    const isInactive = !catalogOffer || !catalogOffer.active;
                    const isMissing = !catalogOffer;

                    return (
                      <div
                        key={offer.id}
                        className={`comp-product-chip ${isInactive ? "product-inactive" : ""}`}
                        title={
                          isMissing
                            ? "Produto não encontrado no catálogo"
                            : !catalogOffer.active
                            ? "Produto inativo no catálogo"
                            : undefined
                        }
                      >
                        <span className="chip-slot">Slot {slotIdx + 1}</span>
                        <ProductImage
                          src={offer.image}
                          name={offer.name}
                          className="chip-thumb"
                        />
                        <div className="chip-text">
                          <strong>{offer.name}</strong>
                          <span>
                            R$ {offer.promotionalPrice}/{offer.unit}
                          </span>
                          {isInactive && (
                            <small className="chip-inactive-label">
                              {isMissing ? "Ausente" : "Inativo"}
                            </small>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Live Playlist Preview */}
      {!hidePreview && (
        <section className="compositions-live-preview-box">
          <div className="live-preview-header">
            <div>
              <h4>Programação Completa da TV (Composições + Mídias)</h4>
              <p>
                Reprodução simulada da playlist unificada com avanço automático e transições reais.
              </p>
            </div>

            <div className="preview-theme-selector">
              <span>Tema:</span>
              <button
                type="button"
                className={`theme-btn ${previewThemeSlug === "normal" ? "selected" : ""}`}
                onClick={() => setPreviewThemeSlug("normal")}
              >
                Tema Normal
              </button>
              <button
                type="button"
                className={`theme-btn ${previewThemeSlug === "black-friday" ? "selected" : ""}`}
                onClick={() => setPreviewThemeSlug("black-friday")}
              >
                Black Friday
              </button>
            </div>
          </div>

          <TvPlayer
            content={unifiedTvContent}
            mode="preview"
            connection="online"
            sectorLabel={sectorLabel}
            theme={activeTheme}
          />
        </section>
      )}

      {/* Editor Modal */}
      {editingComposition && (
        <CompositionEditor
          initialComposition={editingComposition}
          availableOffers={offers}
          sectorLabel={sectorLabel}
          onSave={handleSaveEditor}
          onCancel={() => setEditingComposition(null)}
        />
      )}
    </div>
  );
}

