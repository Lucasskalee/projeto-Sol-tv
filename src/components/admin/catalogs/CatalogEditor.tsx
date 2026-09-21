import React, { useState } from "react";
import {
  ArrowLeft,
  Plus,
  Play,
  Layers,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import type { Offer, SolTvMedia } from "../../../types";
import {
  newComposition,
  duplicateComposition,
  synthesizeCompositionsFromOffers,
  type OfferComposition,
} from "../../../offers/compositions";
import { CatalogScreenCard } from "./CatalogScreenCard";
import { CatalogScreenDrawer } from "./CatalogScreenDrawer";
import { CatalogPreviewModal } from "./CatalogPreviewModal";

export interface CatalogEditorProps {
  catalogId?: string;
  catalogTitle: string;
  sector: string;
  sectorLabel: string;
  offers: readonly Offer[];
  media?: readonly SolTvMedia[];
  compositions: OfferComposition[];
  onBackToList: () => void;
  onSaveComposition: (comp: OfferComposition) => Promise<void> | void;
  onDeleteComposition: (id: string) => Promise<void> | void;
  onReorderCompositions: (compositions: OfferComposition[]) => Promise<void> | void;
}

export const CatalogEditor: React.FC<CatalogEditorProps> = ({
  catalogTitle,
  sector,
  sectorLabel,
  offers,
  media = [],
  compositions,
  onBackToList,
  onSaveComposition,
  onDeleteComposition,
  onReorderCompositions,
}) => {
  const [editingComposition, setEditingComposition] = useState<OfferComposition | null>(
    null,
  );
  const [showDrawer, setShowDrawer] = useState<boolean>(false);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [notice, setNotice] = useState<string>("");

  function showNotice(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3500);
  }

  // Contagem de produtos únicos incluídos nas telas
  const uniqueProductIds = new Set<string>();
  compositions.forEach((c) => {
    c.offers.forEach((o) => uniqueProductIds.add(o.id));
  });

  function handleCreateScreen() {
    const fresh = newComposition(sector, "hero", compositions.length);
    setEditingComposition(fresh);
    setShowDrawer(true);
  }

  function handleEditScreen(comp: OfferComposition) {
    setEditingComposition(comp);
    setShowDrawer(true);
  }

  async function handleDuplicateScreen(comp: OfferComposition) {
    const dup = duplicateComposition(comp, compositions.length);
    try {
      await onSaveComposition(dup);
      showNotice("Tela duplicada com sucesso.");
    } catch {
      showNotice("Erro ao duplicar tela.");
    }
  }

  async function handleDeleteScreen(id: string) {
    if (!window.confirm("Deseja realmente excluir esta tela do catálogo?")) return;
    try {
      await onDeleteComposition(id);
      showNotice("Tela excluída com sucesso.");
    } catch {
      showNotice("Erro ao excluir tela.");
    }
  }

  async function handleToggleActiveScreen(id: string) {
    const target = compositions.find((c) => c.id === id);
    if (!target) return;
    const updated = {
      ...target,
      active: !target.active,
      updatedAt: new Date().toISOString(),
    };
    try {
      await onSaveComposition(updated);
      showNotice(updated.active ? "Tela ativada na TV." : "Tela ocultada da TV.");
    } catch {
      showNotice("Erro ao alterar visibilidade da tela.");
    }
  }

  async function handleMoveScreen(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= compositions.length) return;

    const next = [...compositions];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;

    const reordered = next.map((c, i) => ({ ...c, position: i }));
    try {
      await onReorderCompositions(reordered);
    } catch {
      showNotice("Erro ao reordenar telas.");
    }
  }

  async function handleSynthesizeFromOffers() {
    if (
      compositions.length > 0 &&
      !window.confirm(
        "Isso irá reconstruir as telas agrupando as ofertas ativas atuais do setor. Deseja continuar?",
      )
    ) {
      return;
    }

    const synthesized = synthesizeCompositionsFromOffers(offers as Offer[]);
    try {
      for (const comp of synthesized) {
        await onSaveComposition(comp);
      }
      showNotice(`${synthesized.length} tela(s) gerada(s) a partir das ofertas.`);
    } catch {
      showNotice("Erro ao sintetizar telas.");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {notice && (
        <div className="toast-inline success" role="status">
          ✓ {notice}
        </div>
      )}

      {/* 1. Header do Editor de Catálogo */}
      <div className="admin-page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={onBackToList}
            style={{ padding: "8px 12px", minHeight: "38px", gap: "6px" }}
            title="Voltar para a lista de catálogos"
          >
            <ArrowLeft size={16} />
            <span>Catálogos</span>
          </button>

          <div>
            <h1 className="admin-page-title" style={{ fontSize: "clamp(20px, 2.8vw, 26px)" }}>
              {catalogTitle}
            </h1>
            <p className="admin-page-description">
              {uniqueProductIds.size} {uniqueProductIds.size === 1 ? "produto" : "produtos"} • {compositions.length} {compositions.length === 1 ? "tela configurada" : "telas configuradas"}
            </p>
          </div>
        </div>

        {/* Ações do Catálogo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={() => setShowPreviewModal(true)}
            style={{ padding: "8px 14px", minHeight: "40px", gap: "7px" }}
          >
            <Play size={15} />
            <span>Preview da TV</span>
          </button>

          <button
            type="button"
            className="admin-btn-primary"
            onClick={handleCreateScreen}
            style={{ padding: "8px 16px", minHeight: "40px", gap: "7px" }}
          >
            <Plus size={16} />
            <span>+ Adicionar Tela</span>
          </button>
        </div>
      </div>

      {/* 2. Lista Visual de Telas */}
      {compositions.length === 0 ? (
        /* Empty State */
        <div
          className="admin-card"
          style={{
            padding: "48px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "14px",
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
            <Layers size={28} />
          </div>

          <div>
            <h3 style={{ margin: 0, fontSize: "16px", color: "var(--skalee-text-primary)" }}>
              Nenhuma tela configurada neste catálogo
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--skalee-text-secondary)" }}>
              Adicione a primeira tela escolhendo o layout desejado (1, 2, 3, 4 ou 8 produtos) ou gere automaticamente a partir das ofertas do setor.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              className="admin-btn-primary"
              onClick={handleCreateScreen}
            >
              <Plus size={16} />
              <span>+ Adicionar Primeira Tela</span>
            </button>

            <button
              type="button"
              className="admin-btn-secondary"
              onClick={handleSynthesizeFromOffers}
            >
              <Sparkles size={15} />
              <span>Sintetizar das Ofertas</span>
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {compositions.map((composition, index) => (
            <CatalogScreenCard
              key={composition.id}
              composition={composition}
              index={index}
              totalScreens={compositions.length}
              catalogOffers={offers}
              onEdit={handleEditScreen}
              onToggleActive={handleToggleActiveScreen}
              onMoveUp={(i) => handleMoveScreen(i, "up")}
              onMoveDown={(i) => handleMoveScreen(i, "down")}
              onDuplicate={handleDuplicateScreen}
              onDelete={handleDeleteScreen}
            />
          ))}

          {/* Botão final para adicionar nova tela */}
          <div style={{ display: "flex", justifyContent: "center", marginTop: "8px" }}>
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={handleCreateScreen}
              style={{
                width: "100%",
                maxWidth: "360px",
                justifyContent: "center",
                padding: "12px",
                borderStyle: "dashed",
              }}
            >
              <Plus size={16} />
              <span>+ Adicionar Outra Tela</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Modal / Drawer para Criação e Edição de Telas */}
      {editingComposition && (
        <CatalogScreenDrawer
          isOpen={showDrawer}
          initialComposition={editingComposition}
          availableOffers={offers}
          sectorLabel={sectorLabel}
          onSave={async (savedComp) => {
            await onSaveComposition(savedComp);
            showNotice("Tela salva com sucesso.");
          }}
          onClose={() => {
            setShowDrawer(false);
            setEditingComposition(null);
          }}
        />
      )}

      {/* 4. Modal de Pré-visualização da TV */}
      {showPreviewModal && (
        <CatalogPreviewModal
          isOpen={showPreviewModal}
          catalogTitle={catalogTitle}
          sector={sector}
          sectorLabel={sectorLabel}
          compositions={compositions}
          offers={offers}
          media={media}
          onClose={() => setShowPreviewModal(false)}
        />
      )}
    </div>
  );
};

