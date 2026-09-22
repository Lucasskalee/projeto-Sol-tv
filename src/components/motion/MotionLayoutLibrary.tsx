import React, { useState, useEffect, useMemo } from "react";
import type { MotionLayout, MotionPublication, LayoutCategory } from "../../motion/layoutTypes";
import {
  listLayouts,
  listPublications,
  createLayout,
  duplicateLayout,
  renameLayout,
  deleteLayout,
  publishLayoutToSector,
} from "../../services/motionLayoutService";
import { SECTORS } from "../../data";
import { MotionPreview } from "./MotionPreview";
import { cloneMotionConfig } from "../../motion/defaults";

interface MotionLayoutLibraryProps {
  onSelectLayoutToEdit: (layout: MotionLayout) => void;
  onPublishSuccess?: (sector: string, version: number) => void;
}

export function MotionLayoutLibrary({
  onSelectLayoutToEdit,
  onPublishSuccess,
}: MotionLayoutLibraryProps) {
  const [layouts, setLayouts] = useState<MotionLayout[]>([]);
  const [publications, setPublications] = useState<Record<string, MotionPublication>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"all" | LayoutCategory>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState<boolean>(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState<boolean>(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);

  // Selected layout for modal action
  const [selectedLayout, setSelectedLayout] = useState<MotionLayout | null>(null);
  const [selectedSectorToPublish, setSelectedSectorToPublish] = useState<string>("acougue");

  // Form states
  const [formName, setFormName] = useState<string>("");
  const [formCategory, setFormCategory] = useState<LayoutCategory>("custom");
  const [formBaseLayoutId, setFormBaseLayoutId] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage((c) => (c === msg ? null : c)), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [allLayouts, allPubs] = await Promise.all([
        listLayouts(),
        listPublications(),
      ]);
      setLayouts(allLayouts);
      setPublications(allPubs);
    } catch (err) {
      console.error("Erro ao carregar biblioteca de layouts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Filtered layouts
  const filteredLayouts = useMemo(() => {
    return layouts.filter((layout) => {
      const matchesTab = activeTab === "all" || layout.category === activeTab;
      const matchesSearch =
        layout.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (layout.description && layout.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesTab && matchesSearch;
    });
  }, [layouts, activeTab, searchQuery]);

  // Active publications mapped with their sector label
  const activeSectorsList = useMemo(() => {
    return SECTORS.map((sec) => {
      const pub = publications[sec.id.toLowerCase()];
      return {
        sector: sec,
        publication: pub || null,
      };
    });
  }, [publications]);

  // Handle Create New Layout
  const handleCreate = async () => {
    if (!formName.trim()) return;
    setActionLoading(true);
    try {
      const created = await createLayout({
        name: formName.trim(),
        category: formCategory,
        baseLayoutId: formBaseLayoutId || undefined,
      });
      setIsCreateModalOpen(false);
      setFormName("");
      showToast(`Layout "${created.name}" criado com sucesso!`);
      await loadData();
      onSelectLayoutToEdit(created);
    } catch (err: any) {
      alert(err.message || "Erro ao criar layout");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Duplicate
  const handleDuplicate = async () => {
    if (!selectedLayout) return;
    setActionLoading(true);
    try {
      const cloned = await duplicateLayout(selectedLayout.id, formName.trim() || undefined);
      setIsDuplicateModalOpen(false);
      setSelectedLayout(null);
      showToast(`Cópia "${cloned.name}" criada com sucesso!`);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Erro ao duplicar layout");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Rename
  const handleRename = async () => {
    if (!selectedLayout || !formName.trim()) return;
    setActionLoading(true);
    try {
      await renameLayout(selectedLayout.id, formName.trim());
      setIsRenameModalOpen(false);
      setSelectedLayout(null);
      showToast(`Layout renomeado para "${formName.trim()}"!`);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Erro ao renomear layout");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!selectedLayout) return;
    setActionLoading(true);
    try {
      await deleteLayout(selectedLayout.id);
      setIsDeleteModalOpen(false);
      setSelectedLayout(null);
      showToast(`Layout excluído com sucesso.`);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Erro ao excluir layout");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Publish
  const handlePublish = async () => {
    if (!selectedLayout) return;
    setActionLoading(true);
    try {
      const pub = await publishLayoutToSector({
        sector: selectedSectorToPublish,
        layoutId: selectedLayout.id,
        layoutName: selectedLayout.name,
        configToPublish: selectedLayout.config,
      });
      setIsPublishModalOpen(false);
      setSelectedLayout(null);
      showToast(
        `Layout "${selectedLayout.name}" publicado com sucesso na TV ${selectedSectorToPublish.toUpperCase()} (v${pub.publishedVersion})!`
      );
      await loadData();
      onPublishSuccess?.(selectedSectorToPublish, pub.publishedVersion);
    } catch (err: any) {
      alert(err.message || "Erro ao publicar layout");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="motion-library-shell">
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          zIndex: 9999,
          background: "#059669",
          color: "#ffffff",
          padding: "12px 20px",
          borderRadius: "8px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontSize: "13px",
          fontWeight: "700",
          border: "1px solid rgba(52, 211, 153, 0.4)"
        }}>
          <span style={{ fontSize: "16px" }}>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="motion-library-header">
        <div className="motion-library-brand">
          <div className="motion-library-logo-icon">
            ☀️
          </div>
          <div className="motion-library-title-area">
            <h1>
              Motion Lab
              <span className="motion-library-tag">
                Biblioteca de Layouts
              </span>
            </h1>
            <p className="motion-library-subtitle">
              Crie, teste e publique experiências visuais para as TVs do Supermercado Sol
            </p>
          </div>
        </div>

        <div className="motion-library-header-actions">
          <a href="/admin" className="btn-admin-back">
            ← Painel Admin
          </a>
          <button
            onClick={() => {
              setFormName("");
              setFormCategory("custom");
              setFormBaseLayoutId(layouts[0]?.id || "");
              setIsCreateModalOpen(true);
            }}
            className="btn-create-layout"
          >
            <span style={{ fontSize: "16px", fontWeight: "900" }}>+</span>
            <span>Novo Layout</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="motion-library-content">
        {/* ========================================================================= */}
        {/* SEÇÃO 1: EM PRODUÇÃO                                                      */}
        {/* ========================================================================= */}
        <section className="library-section">
          <div className="library-section-header">
            <div className="library-section-title-group">
              <span className="pulse-dot" />
              <h2 className="library-section-title">
                Em Produção nas TVs
              </h2>
            </div>
            <span className="library-section-desc">
              Snapshots ativos sincronizados via Realtime
            </span>
          </div>

          <div className="prod-grid">
            {activeSectorsList.map(({ sector, publication }) => {
              const matchingLayout = publication?.layoutId
                ? layouts.find((l) => l.id === publication.layoutId)
                : null;

              return (
                <div key={sector.id} className="prod-card">
                  {/* Card Header */}
                  <div className="prod-card-header">
                    <div className="prod-sector-label">
                      <span>📺</span>
                      <span>{sector.label}</span>
                    </div>
                    <span className="prod-live-badge">
                      EM PRODUÇÃO
                    </span>
                  </div>

                  {/* Card Body / Visual Info */}
                  <div className="prod-card-body">
                    <div>
                      <h3 className="prod-layout-name">
                        {publication?.layoutName || "Fundo Branco & Sunburst"}
                      </h3>
                      <p className="prod-layout-meta">
                        Versão {publication?.publishedVersion || 1} • Publicado em{" "}
                        {publication?.publishedAt
                          ? new Date(publication.publishedAt).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Recente"}
                      </p>
                    </div>

                    <div className="prod-tv-link-box">
                      <span>URL da TV:</span>
                      <a
                        href={`/tv/${sector.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="prod-tv-url"
                      >
                        /tv/{sector.id} ↗
                      </a>
                    </div>

                    {/* Actions */}
                    <div className="prod-card-actions">
                      <button
                        onClick={() => {
                          const configToPreview =
                            publication?.publishedConfig ||
                            matchingLayout?.config ||
                            layouts[0]?.config;
                          setSelectedLayout({
                            id: `preview-${sector.id}`,
                            name: `${sector.label} (Em Produção)`,
                            category: "canonico",
                            config: cloneMotionConfig(configToPreview),
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                          });
                          setIsPreviewModalOpen(true);
                        }}
                        className="btn-card-action"
                      >
                        Visualizar
                      </button>

                      <button
                        onClick={() => {
                          const base =
                            matchingLayout || {
                              id: "current-pub",
                              name: `${publication?.layoutName || sector.label}`,
                              category: "custom" as const,
                              config: cloneMotionConfig(
                                publication?.publishedConfig || layouts[0]?.config
                              ),
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString(),
                            };
                          setSelectedLayout(base);
                          setFormName(`Cópia de ${base.name}`);
                          setIsDuplicateModalOpen(true);
                        }}
                        className="btn-card-action"
                      >
                        Duplicar
                      </button>

                      <button
                        onClick={() => {
                          if (matchingLayout) {
                            onSelectLayoutToEdit(matchingLayout);
                          } else {
                            onSelectLayoutToEdit({
                              id: `layout-${sector.id}-prod`,
                              name: `${publication?.layoutName || sector.label}`,
                              category: "custom",
                              config: cloneMotionConfig(
                                publication?.publishedConfig || layouts[0]?.config
                              ),
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString(),
                            });
                          }
                        }}
                        className="btn-card-action btn-card-edit"
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SEÇÃO 2: MEUS LAYOUTS (BIBLIOTECA COMPLETA)                               */}
        {/* ========================================================================= */}
        <section className="library-section">
          <div className="library-section-header">
            <div>
              <h2 className="library-section-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span>📚</span> Meus Layouts
              </h2>
              <p className="library-section-desc" style={{ marginTop: "4px" }}>
                Layouts independentes prontos para edição, personalização e publicação
              </p>
            </div>

            {/* Filter Tabs & Search */}
            <div className="library-filter-bar">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar layout..."
                className="library-search-input"
              />

              <div className="library-tabs-group">
                {(
                  [
                    { id: "all", label: "Todos" },
                    { id: "canonico", label: "Canônicos" },
                    { id: "promocional", label: "Promocionais" },
                    { id: "sazonal", label: "Sazonais" },
                    { id: "custom", label: "Personalizados" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`tab-pill ${activeTab === tab.id ? "active" : ""}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: "48px", textAlign: "center", color: "#64748b" }}>
              Carregando biblioteca de layouts...
            </div>
          ) : filteredLayouts.length === 0 ? (
            <div style={{ padding: "48px", textAlign: "center", background: "#121720", border: "1px solid #1e293b", borderRadius: "14px" }}>
              <p style={{ color: "#94a3b8", fontSize: "14px", margin: "0 0 16px 0" }}>Nenhum layout encontrado nesta categoria.</p>
              <button
                onClick={() => {
                  setFormName("");
                  setFormCategory("custom");
                  setIsCreateModalOpen(true);
                }}
                className="btn-create-layout"
                style={{ margin: "0 auto" }}
              >
                Criar Novo Layout
              </button>
            </div>
          ) : (
            <div className="layouts-grid">
              {filteredLayouts.map((layout) => {
                const publishedSectors = Object.values(publications)
                  .filter((p) => p.layoutId === layout.id)
                  .map((p) => p.sector.toUpperCase());

                const isPublished = publishedSectors.length > 0;
                const bgType = layout.config.background?.type || "gradient";
                const bgColor = layout.config.background?.color || "#0a0c10";

                return (
                  <div key={layout.id} className="layout-card">
                    {/* Visual Card Header / Thumbnail Banner */}
                    <div
                      className="layout-card-banner"
                      onClick={() => onSelectLayoutToEdit(layout)}
                      style={{
                        backgroundColor: bgColor,
                        background:
                          bgType === "sunburst"
                            ? "radial-gradient(circle, #fde047 0%, #ea580c 100%)"
                            : bgType === "gradient"
                            ? `linear-gradient(135deg, ${layout.config.background?.gradientStart || "#141822"}, ${layout.config.background?.gradientEnd || "#07090c"})`
                            : bgColor,
                      }}
                    >
                      {/* Mini visual mockup element */}
                      <div className="layout-preview-mockup">
                        <span className="layout-mockup-badge">
                          {layout.config.badge?.text || "OFERTA SOL"}
                        </span>
                        <div className="layout-mockup-price">
                          R$ 29,99 /kg
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="layout-banner-top-left">
                        {isPublished ? (
                          <span className="badge-prod-active">
                            🟢 NO AR ({publishedSectors.join(", ")})
                          </span>
                        ) : (
                          <span className="badge-draft-pill">
                            {layout.isSystem ? "CANÔNICO" : "RASCUNHO"}
                          </span>
                        )}
                      </div>

                      <div className="layout-banner-top-right">
                        <span className="badge-cat-tag">
                          {layout.category}
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="layout-card-body">
                      <div>
                        <h3
                          onClick={() => onSelectLayoutToEdit(layout)}
                          className="layout-card-title"
                        >
                          {layout.name}
                        </h3>
                        {layout.description && (
                          <p className="layout-card-desc">
                            {layout.description}
                          </p>
                        )}
                        <p className="layout-card-date">
                          Salvo em{" "}
                          {new Date(layout.updatedAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="layout-card-footer">
                        <div className="layout-card-main-btns">
                          <button
                            onClick={() => onSelectLayoutToEdit(layout)}
                            className="btn-card-action btn-card-edit"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => {
                              setSelectedLayout(layout);
                              setSelectedSectorToPublish("acougue");
                              setIsPublishModalOpen(true);
                            }}
                            className="btn-card-pub"
                          >
                            Publicar
                          </button>
                        </div>

                        {/* Extra Actions */}
                        <div className="layout-card-icon-btns">
                          <button
                            onClick={() => {
                              setSelectedLayout(layout);
                              setFormName(`Cópia de ${layout.name}`);
                              setIsDuplicateModalOpen(true);
                            }}
                            title="Duplicar Layout"
                            className="btn-icon-action"
                          >
                            📋
                          </button>
                          <button
                            onClick={() => {
                              setSelectedLayout(layout);
                              setFormName(layout.name);
                              setIsRenameModalOpen(true);
                            }}
                            title="Renomear Layout"
                            className="btn-icon-action"
                          >
                            ✏️
                          </button>
                          {!layout.isSystem && (
                            <button
                              onClick={() => {
                                setSelectedLayout(layout);
                                setIsDeleteModalOpen(true);
                              }}
                              title="Excluir Layout"
                              className="btn-icon-action btn-delete-action"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* ========================================================================= */}
      {/* MODAIS                                                                    */}
      {/* ========================================================================= */}

      {/* Modal: Novo Layout */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Criar Novo Layout</h3>
              <p>Defina o nome e modelo base para a nova experiência visual.</p>
            </div>

            <div className="modal-form-group">
              <label className="modal-label">Nome do Layout:</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Ofertas de Fim de Semana"
                className="modal-input"
              />
            </div>

            <div className="modal-form-group">
              <label className="modal-label">Categoria:</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as LayoutCategory)}
                className="modal-select"
              >
                <option value="custom">Personalizado</option>
                <option value="promocional">Promocional</option>
                <option value="sazonal">Sazonal</option>
                <option value="canonico">Canônico</option>
              </select>
            </div>

            <div className="modal-form-group">
              <label className="modal-label">Começar com base em:</label>
              <select
                value={formBaseLayoutId}
                onChange={(e) => setFormBaseLayoutId(e.target.value)}
                className="modal-select"
              >
                {layouts.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-actions">
              <button onClick={() => setIsCreateModalOpen(false)} className="btn-modal-cancel">
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={actionLoading || !formName.trim()}
                className="btn-modal-confirm"
              >
                {actionLoading ? "Criando..." : "Criar e Editar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Duplicar Layout */}
      {isDuplicateModalOpen && selectedLayout && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Duplicar Layout</h3>
              <p>Uma nova cópia independente de <strong>"{selectedLayout.name}"</strong> será criada.</p>
            </div>

            <div className="modal-form-group">
              <label className="modal-label">Nome da Cópia:</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="modal-input"
              />
            </div>

            <div className="modal-actions">
              <button onClick={() => setIsDuplicateModalOpen(false)} className="btn-modal-cancel">
                Cancelar
              </button>
              <button
                onClick={handleDuplicate}
                disabled={actionLoading || !formName.trim()}
                className="btn-modal-confirm"
              >
                {actionLoading ? "Duplicando..." : "Confirmar Duplicação"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Renomear */}
      {isRenameModalOpen && selectedLayout && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Renomear Layout</h3>
              <p>Altere o título de identificação do layout.</p>
            </div>

            <div className="modal-form-group">
              <label className="modal-label">Novo Nome:</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="modal-input"
              />
            </div>

            <div className="modal-actions">
              <button onClick={() => setIsRenameModalOpen(false)} className="btn-modal-cancel">
                Cancelar
              </button>
              <button
                onClick={handleRename}
                disabled={actionLoading || !formName.trim()}
                className="btn-modal-confirm"
              >
                {actionLoading ? "Salvando..." : "Salvar Nome"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Excluir */}
      {isDeleteModalOpen && selectedLayout && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ borderColor: "rgba(239, 68, 68, 0.4)" }}>
            <div className="modal-header">
              <h3 style={{ color: "#f87171" }}>Excluir Layout</h3>
              <p>Tem certeza que deseja excluir permanentemente o layout <strong>"{selectedLayout.name}"</strong>? Esta ação não pode ser desfeita.</p>
            </div>

            <div className="modal-actions">
              <button onClick={() => setIsDeleteModalOpen(false)} className="btn-modal-cancel">
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="btn-modal-confirm btn-modal-danger"
              >
                {actionLoading ? "Excluindo..." : "Excluir Definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Publicar na TV */}
      {isPublishModalOpen && selectedLayout && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ borderColor: "rgba(16, 185, 129, 0.4)", maxWidth: "540px" }}>
            <div className="modal-header">
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span>🚀</span> Publicar Layout na TV
              </h3>
              <p>Esta ação enviará este snapshot imediatamente para o setor selecionado via Realtime.</p>
            </div>

            <div className="modal-form-group">
              <label className="modal-label">Selecione o Setor Alvo:</label>
              <select
                value={selectedSectorToPublish}
                onChange={(e) => setSelectedSectorToPublish(e.target.value)}
                className="modal-select"
              >
                {SECTORS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} ({s.id.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              background: "#090d13",
              border: "1px solid #1e293b",
              borderRadius: "10px",
              padding: "14px"
            }}>
              <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "10px", borderRadius: "8px", border: "1px solid #1e293b" }}>
                <span style={{ fontSize: "10px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", display: "block" }}>
                  Layout Atual na TV
                </span>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#e2e8f0", display: "block", marginTop: "4px" }}>
                  {publications[selectedSectorToPublish.toLowerCase()]?.layoutName || "Padrão"}
                </span>
                <span style={{ fontSize: "10px", color: "#64748b" }}>
                  Versão v{publications[selectedSectorToPublish.toLowerCase()]?.publishedVersion || 1}
                </span>
              </div>

              <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                <span style={{ fontSize: "10px", fontWeight: "800", color: "#34d399", textTransform: "uppercase", display: "block" }}>
                  Novo Layout a Publicar
                </span>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#6ee7b7", display: "block", marginTop: "4px" }}>
                  {selectedLayout.name}
                </span>
                <span style={{ fontSize: "10px", color: "#34d399" }}>
                  Próxima Versão: v{(publications[selectedSectorToPublish.toLowerCase()]?.publishedVersion || 0) + 1}
                </span>
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={() => setIsPublishModalOpen(false)} className="btn-modal-cancel">
                Cancelar
              </button>
              <button
                onClick={handlePublish}
                disabled={actionLoading}
                className="btn-modal-confirm btn-modal-publish"
              >
                {actionLoading ? "Publicando..." : "Confirmar e Publicar na TV"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Visualizar Layout Fullscreen */}
      {isPreviewModalOpen && selectedLayout && (
        <div className="modal-overlay" style={{ padding: "16px" }}>
          <div style={{
            background: "#090d13",
            border: "1px solid #1e293b",
            borderRadius: "16px",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden"
          }}>
            <div style={{
              padding: "16px 24px",
              borderBottom: "1px solid #1e293b",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#ffffff", margin: 0 }}>
                  {selectedLayout.name}
                </h3>
                <p style={{ fontSize: "11px", color: "#94a3b8", margin: "2px 0 0 0" }}>
                  Pré-visualização 16:9 em tela cheia
                </p>
              </div>
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="btn-card-action"
                style={{ flex: "none", padding: "8px 16px" }}
              >
                Fechar Visualização (Esc)
              </button>
            </div>

            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", minHeight: 0 }}>
              <MotionPreview
                config={selectedLayout.config}
                sector="acougue"
                zoom="fit"
                isPaused={false}
                showBoxes={false}
                isInteractiveMode={false}
                replayKey={1}
                onReplay={() => {}}
                speed={selectedLayout.config.speed || 1}
                onSpeedChange={() => {}}
                onCopyConfig={() => {}}
                copied={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
