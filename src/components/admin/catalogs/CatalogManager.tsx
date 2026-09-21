import React, { useState, useEffect } from "react";
import type { Offer, SolTvMedia } from "../../../types";
import {
  type OfferComposition,
  synthesizeCompositionsFromOffers,
} from "../../../offers/compositions";
import { CatalogList } from "./CatalogList";
import { CatalogEditor } from "./CatalogEditor";
import { CatalogPreviewModal } from "./CatalogPreviewModal";

export interface CatalogManagerProps {
  sector: string;
  sectorLabel?: string;
  offers: readonly Offer[];
  media: readonly SolTvMedia[];
  compositions?: readonly OfferComposition[];
  hidePreview?: boolean;
  onSaveComposition?: (comp: OfferComposition) => Promise<void> | void;
  onDeleteComposition?: (id: string) => Promise<void> | void;
  onReorderCompositions?: (compositions: OfferComposition[]) => Promise<void> | void;
}

export const CatalogManager: React.FC<CatalogManagerProps> = ({
  sector,
  sectorLabel = "AÇOUGUE",
  offers,
  media,
  compositions: initialCompositions = [],
  onSaveComposition,
  onDeleteComposition,
  onReorderCompositions,
}) => {
  const [view, setView] = useState<"list" | "editor">("list");
  const [activeCatalogTitle, setActiveCatalogTitle] = useState<string>(
    `OFERTAS DO ${sectorLabel.toUpperCase()}`,
  );
  const [compositions, setCompositions] = useState<OfferComposition[]>(() => [
    ...initialCompositions,
  ]);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [notice, setNotice] = useState<string>("");

  useEffect(() => {
    setCompositions([...initialCompositions]);
    setActiveCatalogTitle(`OFERTAS DO ${sectorLabel.toUpperCase()}`);
  }, [initialCompositions, sectorLabel]);

  function showNotice(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3500);
  }

  function handleOpenCatalog(_catalogId: string, title: string) {
    setActiveCatalogTitle(title);
    setView("editor");
  }

  function handleBackToList() {
    setView("list");
  }

  async function handleSynthesize() {
    if (
      compositions.length > 0 &&
      !window.confirm(
        "Isso irá reconstruir as telas agrupando as ofertas ativas atuais do setor. Deseja continuar?",
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
        showNotice(`${synthesized.length} tela(s) gerada(s) a partir das ofertas.`);
      } catch (err) {
        console.error("[SKALEE CATÁLOGOS] Erro ao sincronizar telas sintetizadas no Supabase:", err);
      }
    }
  }

  async function handleSaveComposition(comp: OfferComposition) {
    if (onSaveComposition) {
      await onSaveComposition(comp);
    }
  }

  async function handleDeleteComposition(id: string) {
    if (onDeleteComposition) {
      await onDeleteComposition(id);
    }
  }

  async function handleReorderCompositions(reordered: OfferComposition[]) {
    if (onReorderCompositions) {
      await onReorderCompositions(reordered);
    }
  }

  return (
    <div>
      {notice && (
        <div className="toast-inline success" role="status" style={{ marginBottom: "16px" }}>
          ✓ {notice}
        </div>
      )}

      {view === "list" ? (
        <CatalogList
          sector={sector}
          sectorLabel={sectorLabel}
          offers={offers}
          compositions={compositions}
          media={media}
          onOpenCatalog={handleOpenCatalog}
          onPreviewCatalog={() => setShowPreviewModal(true)}
          onSynthesize={handleSynthesize}
        />
      ) : (
        <CatalogEditor
          catalogTitle={activeCatalogTitle}
          sector={sector}
          sectorLabel={sectorLabel}
          offers={offers}
          media={media}
          compositions={compositions}
          onBackToList={handleBackToList}
          onSaveComposition={handleSaveComposition}
          onDeleteComposition={handleDeleteComposition}
          onReorderCompositions={handleReorderCompositions}
        />
      )}

      {/* Modal de Prévia Geral */}
      {showPreviewModal && (
        <CatalogPreviewModal
          isOpen={showPreviewModal}
          catalogTitle={activeCatalogTitle}
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

