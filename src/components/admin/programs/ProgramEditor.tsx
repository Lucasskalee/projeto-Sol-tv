import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Calendar,
  Check,
  Clock,
  Copy,
  DollarSign,
  Edit2,
  Eye,
  Film,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Play,
  Plus,
  Search,
  Tag,
  Trash2,
  Tv,
  Upload,
  X,
} from "lucide-react";
import type { Offer, SolTvMedia } from "../../../types";
import type {
  ProgramRecurrence,
  ProgramScreen,
  ProgramStatus,
  ScreenKind,
  TvProgram,
} from "../../../offers/programs";
import {
  formatProgramSchedulePeriod,
  getProgramCounters,
  programToTvContent,
  WEEKDAY_NAMES,
} from "../../../offers/programs";
import { TvPlayer } from "../../TvPlayer";
import { normalTheme } from "../../../themes/normal";
import { SECTORS } from "../../../data";
import { ProductImage } from "../../OfferProduct";
import type { OfferLayout } from "../../../offers/layouts";

export type ProgramEditorProps = {
  initialProgram: TvProgram;
  availableOffers: readonly Offer[];
  availableMedia: readonly SolTvMedia[];
  onSave: (program: TvProgram) => void;
  onCancel: () => void;
  onTest: (program: TvProgram) => void;
};

export function ProgramEditor({
  initialProgram,
  availableOffers,
  availableMedia,
  onSave,
  onCancel,
  onTest,
}: ProgramEditorProps) {
  const [program, setProgram] = useState<TvProgram>(() => ({
    ...initialProgram,
    screens: [...initialProgram.screens],
  }));

  const [editingScreenIndex, setEditingScreenIndex] = useState<number | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [mediaSearch, setMediaSearch] = useState("");
  const [notice, setNotice] = useState("");

  // Atualiza program field
  const updateField = <K extends keyof TvProgram>(key: K, value: TvProgram[K]) => {
    setProgram((prev) => ({ ...prev, [key]: value, updatedAt: new Date().toISOString() }));
  };

  // Atualiza schedule field
  const updateSchedule = (key: keyof TvProgram["schedule"], value: any) => {
    setProgram((prev) => ({
      ...prev,
      schedule: { ...prev.schedule, [key]: value },
      updatedAt: new Date().toISOString(),
    }));
  };

  // Toggle dia da semana
  const toggleWeekday = (day: number) => {
    const current = program.schedule.weekdays || [];
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort();
    updateSchedule("weekdays", next.length > 0 ? next : [day]);
  };

  // Adicionar nova tela
  const handleAddScreen = (kind: ScreenKind, layout: OfferLayout = "hero") => {
    const newPos = program.screens.length;
    let defaultOffers: Offer[] = [];

    if (kind === "layout") {
      const needed = layout === "grid4" ? 4 : layout === "duo" ? 2 : 1;
      defaultOffers = availableOffers.slice(0, needed);
    }

    const newScreen: ProgramScreen = {
      id: crypto.randomUUID(),
      kind,
      position: newPos,
      duration: kind === "video" ? 12 : kind === "image" ? 6 : 8,
      active: true,
      layout: kind === "layout" ? layout : undefined,
      offers: kind === "layout" ? defaultOffers : undefined,
      title: kind === "image" ? "Banner Promocional" : kind === "video" ? "Vídeo Institucional" : undefined,
      mediaUrl:
        kind === "image"
          ? availableMedia.find((m) => m.type === "image")?.mediaUrl || ""
          : kind === "video"
            ? availableMedia.find((m) => m.type === "video")?.mediaUrl || ""
            : undefined,
    };

    setProgram((prev) => ({
      ...prev,
      screens: [...prev.screens, newScreen],
    }));

    setShowAddMenu(false);
    setEditingScreenIndex(newPos);
  };

  // Duplicar tela
  const handleDuplicateScreen = (index: number) => {
    const target = program.screens[index];
    if (!target) return;

    const duplicate: ProgramScreen = {
      ...target,
      id: crypto.randomUUID(),
      position: index + 1,
      offers: target.offers ? target.offers.map((o) => ({ ...o })) : undefined,
    };

    const nextScreens = [...program.screens];
    nextScreens.splice(index + 1, 0, duplicate);
    const reordered = nextScreens.map((s, i) => ({ ...s, position: i }));

    setProgram((prev) => ({ ...prev, screens: reordered }));
    setEditingScreenIndex(index + 1);
  };

  // Remover tela
  const handleDeleteScreen = (index: number) => {
    if (program.screens.length <= 1) {
      if (!window.confirm("Esta é a única tela da programação. Deseja realmente removê-la?")) return;
    }
    const next = program.screens.filter((_, i) => i !== index).map((s, i) => ({ ...s, position: i }));
    setProgram((prev) => ({ ...prev, screens: next }));
    if (editingScreenIndex === index) {
      setEditingScreenIndex(null);
    } else if (editingScreenIndex !== null && editingScreenIndex > index) {
      setEditingScreenIndex(editingScreenIndex - 1);
    }
  };

  // Mover tela
  const handleMoveScreen = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= program.screens.length) return;

    const next = [...program.screens];
    const temp = next[index];
    next[index] = next[target];
    next[target] = temp;

    const reordered = next.map((s, i) => ({ ...s, position: i }));
    setProgram((prev) => ({ ...prev, screens: reordered }));

    if (editingScreenIndex === index) {
      setEditingScreenIndex(target);
    } else if (editingScreenIndex === target) {
      setEditingScreenIndex(index);
    }
  };

  // Atualizar tela em edição
  const updateEditingScreen = (patch: Partial<ProgramScreen>) => {
    if (editingScreenIndex === null) return;
    setProgram((prev) => {
      const next = [...prev.screens];
      next[editingScreenIndex] = { ...next[editingScreenIndex], ...patch };
      return { ...prev, screens: next };
    });
  };

  // Alterar layout da tela mantendo produtos até o limite
  const handleChangeScreenLayout = (newLayout: OfferLayout) => {
    if (editingScreenIndex === null) return;
    const currentScreen = program.screens[editingScreenIndex];
    if (currentScreen.kind !== "layout") return;

    const capacity = newLayout === "grid4" ? 4 : newLayout === "duo" ? 2 : 1;
    const currentOffers = currentScreen.offers || [];
    const trimmed = currentOffers.slice(0, capacity);

    updateEditingScreen({
      layout: newLayout,
      offers: trimmed,
    });
  };

  // Atualizar campos de um produto específico desta tela (preços, unidade, etc)
  const handleUpdateScreenOffer = (offerId: string, patch: Partial<Offer>) => {
    if (editingScreenIndex === null) return;
    const currentScreen = program.screens[editingScreenIndex];
    if (currentScreen.kind !== "layout" || !currentScreen.offers) return;

    const updatedOffers = currentScreen.offers.map((offer) => {
      if (offer.id === offerId) {
        return { ...offer, ...patch };
      }
      return offer;
    });

    updateEditingScreen({ offers: updatedOffers });
  };

  // Reordenar produtos dentro do layout da tela
  const handleMoveScreenOffer = (offerIndex: number, direction: "up" | "down") => {
    if (editingScreenIndex === null) return;
    const currentScreen = program.screens[editingScreenIndex];
    if (currentScreen.kind !== "layout" || !currentScreen.offers) return;

    const targetIndex = direction === "up" ? offerIndex - 1 : offerIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentScreen.offers.length) return;

    const nextOffers = [...currentScreen.offers];
    const temp = nextOffers[offerIndex];
    nextOffers[offerIndex] = nextOffers[targetIndex];
    nextOffers[targetIndex] = temp;

    updateEditingScreen({ offers: nextOffers });
  };

  // Remover produto de um slot da tela
  const handleRemoveScreenOffer = (offerId: string) => {
    if (editingScreenIndex === null) return;
    const currentScreen = program.screens[editingScreenIndex];
    if (currentScreen.kind !== "layout" || !currentScreen.offers) return;

    updateEditingScreen({
      offers: currentScreen.offers.filter((o) => o.id !== offerId),
    });
  };

  // Toggle produto na tela em edição a partir do catálogo
  const handleToggleProductInScreen = (offer: Offer) => {
    if (editingScreenIndex === null) return;
    const currentScreen = program.screens[editingScreenIndex];
    if (currentScreen.kind !== "layout") return;

    const currentOffers = currentScreen.offers || [];
    const capacity = currentScreen.layout === "grid4" ? 4 : currentScreen.layout === "duo" ? 2 : 1;
    const exists = currentOffers.some((o) => o.id === offer.id);

    if (exists) {
      updateEditingScreen({ offers: currentOffers.filter((o) => o.id !== offer.id) });
    } else {
      const clonedOffer = { ...offer };
      if (currentOffers.length >= capacity) {
        // Substitui o último produto pelo novo
        const replaced = [...currentOffers.slice(0, capacity - 1), clonedOffer];
        updateEditingScreen({ offers: replaced });
      } else {
        updateEditingScreen({ offers: [...currentOffers, clonedOffer] });
      }
    }
  };

  // Ações de salvamento
  const handleSaveDraft = () => {
    const updated = { ...program, status: "draft" as ProgramStatus };
    onSave(updated);
  };

  const handleScheduleProgram = () => {
    if (program.screens.length === 0) {
      alert("Adicione pelo menos 1 tela à programação antes de agendar.");
      return;
    }
    const updated = { ...program, status: "scheduled" as ProgramStatus };
    onSave(updated);
  };

  // Preview dinâmico para o TvPlayer
  const previewTvContent = useMemo(() => {
    return programToTvContent(program, program.sector);
  }, [program]);

  const totalDurationSeconds = program.screens.reduce((acc, s) => acc + (s.duration || 8), 0);
  const counters = getProgramCounters(program);

  const activeEditingScreen = editingScreenIndex !== null ? program.screens[editingScreenIndex] : null;

  return (
    <div className="program-editor-modal-overlay">
      <div className="program-editor-modal">
        {/* Top Header */}
        <header className="program-editor-header">
          <div className="header-titles">
            <span className="editor-badge">
              <Tv size={14} /> Editor de Programação
            </span>
            <h2>{program.name || "Sem Nome"}</h2>
            <p>
              {counters.summaryText} · Ciclo total: {totalDurationSeconds} segundos
            </p>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="btn btn-secondary action-btn-compact"
              onClick={onCancel}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: 700 }}
            >
              <ArrowLeft size={14} /> Voltar
            </button>
            <button
              type="button"
              className="btn btn-secondary action-btn-compact"
              onClick={() => onTest(program)}
            >
              <Play size={14} /> Testar
            </button>
            <button
              type="button"
              className="editor-close-btn"
              onClick={onCancel}
              title="Fechar editor"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* 3-Column Editor Body */}
        <div className="program-editor-layout">
          {/* COLUNA 1: Configurações da Programação */}
          <aside className="editor-column editor-col-settings">
            <div className="col-header">
              <h3>Configurações</h3>
              <span className="col-tag">Regras da TV</span>
            </div>

            <div className="settings-form">
              {/* Nome */}
              <div className="form-group">
                <label htmlFor="program-name">Nome da Programação</label>
                <input
                  id="program-name"
                  type="text"
                  value={program.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Ex.: OFERTAS DE SEXTA"
                  className="form-input"
                />
              </div>

              {/* Loja e Setor */}
              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="program-store">Loja / Ponto</label>
                  <input
                    id="program-store"
                    type="text"
                    value={program.store}
                    onChange={(e) => updateField("store", e.target.value)}
                    placeholder="Loja 01"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="program-sector">Setor da TV</label>
                  <select
                    id="program-sector"
                    value={program.sector}
                    onChange={(e) => updateField("sector", e.target.value)}
                    className="form-select"
                  >
                    {SECTORS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Recorrência */}
              <div className="form-group">
                <label>Tipo de Agendamento</label>
                <div className="recurrence-selector">
                  <button
                    type="button"
                    className={`recurrence-opt ${program.schedule.recurrence === "weekly" ? "active" : ""}`}
                    onClick={() => updateSchedule("recurrence", "weekly")}
                  >
                    Semanal
                  </button>
                  <button
                    type="button"
                    className={`recurrence-opt ${program.schedule.recurrence === "date_range" ? "active" : ""}`}
                    onClick={() => updateSchedule("recurrence", "date_range")}
                  >
                    Por Datas
                  </button>
                  <button
                    type="button"
                    className={`recurrence-opt ${program.schedule.recurrence === "always" ? "active" : ""}`}
                    onClick={() => updateSchedule("recurrence", "always")}
                  >
                    24h Contínuo
                  </button>
                </div>
              </div>

              {/* Dias da Semana (se weekly) */}
              {program.schedule.recurrence === "weekly" && (
                <div className="form-group">
                  <label>Dias de Exibição</label>
                  <div className="weekdays-toggle-row">
                    {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                      const isSelected = (program.schedule.weekdays || []).includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          className={`weekday-toggle-btn ${isSelected ? "selected" : ""}`}
                          onClick={() => toggleWeekday(day)}
                          title={WEEKDAY_NAMES[day]?.long}
                        >
                          {WEEKDAY_NAMES[day]?.short}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Datas (se date_range) */}
              {program.schedule.recurrence === "date_range" && (
                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="start-date">Data Inicial</label>
                    <input
                      id="start-date"
                      type="date"
                      value={program.schedule.startDate || ""}
                      onChange={(e) => updateSchedule("startDate", e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="end-date">Data Final</label>
                    <input
                      id="end-date"
                      type="date"
                      value={program.schedule.endDate || ""}
                      onChange={(e) => updateSchedule("endDate", e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
              )}

              {/* Horários */}
              {program.schedule.recurrence !== "always" && (
                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="start-time">Horário Início</label>
                    <input
                      id="start-time"
                      type="time"
                      value={program.schedule.startTime || "07:00"}
                      onChange={(e) => updateSchedule("startTime", e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="end-time">Horário Término</label>
                    <input
                      id="end-time"
                      type="time"
                      value={program.schedule.endTime || "22:00"}
                      onChange={(e) => updateSchedule("endTime", e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
              )}

              <div className="schedule-preview-box">
                <Clock size={14} />
                <span>{formatProgramSchedulePeriod(program)}</span>
              </div>
            </div>
          </aside>

          {/* COLUNA 2: Sequência Visual / Linha do Tempo de Telas */}
          <main className="editor-column editor-col-timeline">
            <div className="col-header">
              <div>
                <h3>Sequência de Telas</h3>
                <p>A ordem em que o conteúdo será exibido na TV</p>
              </div>

              {/* Botão evidente Adicionar Tela */}
              <div className="add-screen-dropdown-wrap">
                <button
                  type="button"
                  className="btn btn-primary add-screen-btn"
                  onClick={() => setShowAddMenu((v) => !v)}
                >
                  <Plus size={15} /> + Adicionar tela
                </button>

                {showAddMenu && (
                  <div className="add-screen-menu">
                    <div className="menu-header">Modelos de Layouts Aprovados</div>
                    <button
                      type="button"
                      className="menu-item"
                      onClick={() => handleAddScreen("layout", "hero")}
                    >
                      <Layers size={14} /> 1 Produto (Destaque)
                    </button>
                    <button
                      type="button"
                      className="menu-item"
                      onClick={() => handleAddScreen("layout", "duo")}
                    >
                      <LayoutGrid size={14} /> 2 Produtos (Dupla)
                    </button>
                    <button
                      type="button"
                      className="menu-item"
                      onClick={() => handleAddScreen("layout", "grid4")}
                    >
                      <LayoutGrid size={14} /> 4 Produtos (Grade 4)
                    </button>
                    <div className="menu-divider" />
                    <div className="menu-header">Mídias Institucionais</div>
                    <button
                      type="button"
                      className="menu-item"
                      onClick={() => handleAddScreen("image")}
                    >
                      <ImageIcon size={14} /> Imagem / Banner
                    </button>
                    <button
                      type="button"
                      className="menu-item"
                      onClick={() => handleAddScreen("video")}
                    >
                      <Film size={14} /> Vídeo Promocional
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Linha do Tempo das Telas */}
            <div className="screens-timeline-list">
              {program.screens.length === 0 ? (
                <div className="empty-timeline-box">
                  <Layers size={36} />
                  <h4>Nenhuma tela adicionada</h4>
                  <p>Clique em "+ Adicionar tela" para começar a montar a sequência da sua TV.</p>
                </div>
              ) : (
                program.screens.map((screen, idx) => {
                  const isEditing = editingScreenIndex === idx;
                  const layoutName =
                    screen.layout === "grid4"
                      ? "Layout 4 produtos"
                      : screen.layout === "duo"
                        ? "Layout 2 produtos"
                        : "Layout 1 produto";

                  return (
                    <div key={screen.id} className="timeline-item-wrapper">
                      <div
                        className={`screen-timeline-card ${isEditing ? "is-active-editing" : ""}`}
                        onClick={() => setEditingScreenIndex(idx)}
                      >
                        {/* Header do Card da Tela */}
                        <div className="screen-card-header">
                          <div className="screen-index-badge">
                            TELA {String(idx + 1).padStart(2, "0")}
                          </div>

                          <div className="screen-type-badge">
                            {screen.kind === "layout" && (
                              <span className="type-tag layout-tag">
                                <LayoutGrid size={13} /> {layoutName}
                              </span>
                            )}
                            {screen.kind === "image" && (
                              <span className="type-tag image-tag">
                                <ImageIcon size={13} /> Imagem
                              </span>
                            )}
                            {screen.kind === "video" && (
                              <span className="type-tag video-tag">
                                <Film size={13} /> Vídeo
                              </span>
                            )}
                          </div>

                          <div className="screen-duration-badge">
                            <Clock size={12} /> {screen.duration}s
                          </div>

                          {/* Ações da Tela */}
                          <div
                            className="screen-card-actions"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="screen-mini-btn"
                              disabled={idx === 0}
                              onClick={() => handleMoveScreen(idx, "up")}
                              title="Mover para cima"
                            >
                              <ArrowUp size={13} />
                            </button>
                            <button
                              type="button"
                              className="screen-mini-btn"
                              disabled={idx === program.screens.length - 1}
                              onClick={() => handleMoveScreen(idx, "down")}
                              title="Mover para baixo"
                            >
                              <ArrowDown size={13} />
                            </button>
                            <button
                              type="button"
                              className="screen-mini-btn"
                              onClick={() => handleDuplicateScreen(idx)}
                              title="Duplicar tela"
                            >
                              <Copy size={13} />
                            </button>
                            <button
                              type="button"
                              className="screen-mini-btn danger"
                              onClick={() => handleDeleteScreen(idx)}
                              title="Excluir tela"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Conteúdo visual resumido da Tela */}
                        <div className="screen-card-body">
                          {screen.kind === "layout" && screen.offers && (
                            <div className="screen-products-row">
                              {screen.offers.map((offer, slotIdx) => (
                                <div key={offer.id} className="screen-product-chip">
                                  <ProductImage
                                    src={offer.image}
                                    name={offer.name}
                                    className="mini-product-thumb"
                                  />
                                  <div className="product-chip-info">
                                    <strong>{offer.name}</strong>
                                    <span>R$ {offer.promotionalPrice}/{offer.unit}</span>
                                  </div>
                                </div>
                              ))}
                              {screen.offers.length === 0 && (
                                <div className="no-products-hint">
                                  Nenhum produto selecionado para esta tela. Clique para escolher.
                                </div>
                              )}
                            </div>
                          )}

                          {screen.kind === "image" && (
                            <div className="screen-media-preview-row">
                              {screen.mediaUrl ? (
                                <img
                                  src={screen.mediaUrl}
                                  alt={screen.title}
                                  className="mini-media-thumb"
                                />
                              ) : (
                                <div className="mini-media-placeholder">
                                  <ImageIcon size={20} />
                                </div>
                              )}
                              <div className="media-preview-info">
                                <strong>{screen.title || "Banner Institucional"}</strong>
                                <small>{screen.mediaUrl || "Sem imagem selecionada"}</small>
                              </div>
                            </div>
                          )}

                          {screen.kind === "video" && (
                            <div className="screen-media-preview-row">
                              <div className="mini-media-placeholder video-placeholder">
                                <Film size={20} />
                              </div>
                              <div className="media-preview-info">
                                <strong>{screen.title || "Vídeo Promocional"}</strong>
                                <small>{screen.mediaUrl || "Sem vídeo selecionado"}</small>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Conector visual da seta para o próximo slide */}
                      {idx < program.screens.length - 1 && (
                        <div className="timeline-connector">
                          <span className="connector-arrow">↓</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Painel de Edição da Tela Selecionada */}
            {activeEditingScreen && (
              <div className="screen-inline-editor-card">
                <div className="editor-card-header">
                  <div className="editor-card-title">
                    <Edit2 size={15} />
                    <h4>
                      Editando TELA {String((editingScreenIndex || 0) + 1).padStart(2, "0")} —{" "}
                      {activeEditingScreen.kind === "layout"
                        ? `Layout ${activeEditingScreen.layout === "grid4" ? "4 produtos" : activeEditingScreen.layout === "duo" ? "2 produtos" : "1 produto"}`
                        : activeEditingScreen.kind === "image"
                          ? "Imagem / Banner"
                          : "Vídeo Promocional"}
                    </h4>
                  </div>

                  {/* Seletor rápido de modelo de layout para telas de produtos */}
                  {activeEditingScreen.kind === "layout" && (
                    <div className="screen-layout-switcher">
                      <button
                        type="button"
                        className={`layout-switch-btn ${activeEditingScreen.layout === "hero" || !activeEditingScreen.layout ? "active" : ""}`}
                        onClick={() => handleChangeScreenLayout("hero")}
                        title="1 Produto com grande destaque"
                      >
                        <Layers size={13} /> 1 Produto
                      </button>
                      <button
                        type="button"
                        className={`layout-switch-btn ${activeEditingScreen.layout === "duo" ? "active" : ""}`}
                        onClick={() => handleChangeScreenLayout("duo")}
                        title="2 Produtos lado a lado"
                      >
                        <LayoutGrid size={13} /> 2 Produtos
                      </button>
                      <button
                        type="button"
                        className={`layout-switch-btn ${activeEditingScreen.layout === "grid4" ? "active" : ""}`}
                        onClick={() => handleChangeScreenLayout("grid4")}
                        title="Grade de 4 Produtos"
                      >
                        <LayoutGrid size={13} /> 4 Produtos
                      </button>
                    </div>
                  )}

                  <div className="duration-quick-set">
                    <label htmlFor="screen-duration">Duração:</label>
                    <input
                      id="screen-duration"
                      type="number"
                      min={3}
                      max={60}
                      value={activeEditingScreen.duration}
                      onChange={(e) =>
                        updateEditingScreen({ duration: Math.max(3, Math.min(60, Number(e.target.value))) })
                      }
                      className="duration-input-mini"
                    />
                    <span>segundos</span>
                  </div>
                </div>

                {/* Se for tela de Layout: Edição Direta de Preços + Seletor de Produtos do Catálogo */}
                {activeEditingScreen.kind === "layout" && (
                  <div className="layout-editor-products-section">
                    {/* SEÇÃO 1: Preços e Detalhes dos Produtos nesta tela */}
                    <div className="screen-offers-price-list">
                      <div className="offers-price-list-header">
                        <div className="offers-price-title-row">
                          <Tag size={15} className="accent-icon" />
                          <h5>Preços e Detalhes dos Produtos desta Tela</h5>
                        </div>
                        <p>
                          Ajuste o valor promocional e a unidade para esta programação sem alterar o catálogo global.
                        </p>
                      </div>

                      {(activeEditingScreen.offers || []).length === 0 ? (
                        <div className="empty-screen-offers-hint">
                          <Layers size={24} />
                          <p>Nenhum produto adicionado nesta tela.</p>
                          <small>Selecione os produtos desejados no catálogo logo abaixo.</small>
                        </div>
                      ) : (
                        <div className="screen-products-price-cards">
                          {(activeEditingScreen.offers || []).map((offer, oIdx) => {
                            const isSlotFull =
                              oIdx >= (activeEditingScreen.layout === "grid4" ? 4 : activeEditingScreen.layout === "duo" ? 2 : 1);
                            const slotLabel =
                              activeEditingScreen.layout === "hero"
                                ? "PRODUTO PRINCIPAL (DESTAQUE)"
                                : `PRODUTO ${oIdx + 1} DE ${activeEditingScreen.layout === "grid4" ? "4" : "2"}`;

                            return (
                              <div
                                key={offer.id || oIdx}
                                className={`screen-product-price-card ${isSlotFull ? "slot-overflow" : ""}`}
                              >
                                <div className="price-card-top">
                                  <div className="slot-badge-wrap">
                                    <span className="slot-badge">{slotLabel}</span>
                                    {isSlotFull && (
                                      <span className="slot-warning-tag">Excede capacidade do layout</span>
                                    )}
                                  </div>
                                  <div className="price-card-actions">
                                    <button
                                      type="button"
                                      className="slot-btn"
                                      disabled={oIdx === 0}
                                      onClick={() => handleMoveScreenOffer(oIdx, "up")}
                                      title="Mover produto para cima"
                                    >
                                      <ArrowUp size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      className="slot-btn"
                                      disabled={oIdx === (activeEditingScreen.offers?.length || 1) - 1}
                                      onClick={() => handleMoveScreenOffer(oIdx, "down")}
                                      title="Mover produto para baixo"
                                    >
                                      <ArrowDown size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      className="slot-btn danger"
                                      onClick={() => handleRemoveScreenOffer(offer.id)}
                                      title="Remover produto desta tela"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>

                                <div className="price-card-main">
                                  <div className="price-card-thumb-wrap">
                                    <ProductImage
                                      src={offer.image}
                                      name={offer.name}
                                      className="price-card-thumb"
                                    />
                                  </div>

                                  <div className="price-card-inputs-grid">
                                    {/* Nome do Produto */}
                                    <div className="price-input-cell name-cell">
                                      <label htmlFor={`offer-name-${offer.id}`}>Nome no Cartaz</label>
                                      <input
                                        id={`offer-name-${offer.id}`}
                                        type="text"
                                        value={offer.name}
                                        onChange={(e) =>
                                          handleUpdateScreenOffer(offer.id, { name: e.target.value })
                                        }
                                        className="form-input"
                                        placeholder="Ex: Picanha Fatiada"
                                      />
                                    </div>

                                    {/* Preço Oferta (Destaque Principal) */}
                                    <div className="price-input-cell promo-price-cell">
                                      <label htmlFor={`offer-promo-${offer.id}`} className="highlight-label">
                                        Preço da Oferta (R$) *
                                      </label>
                                      <div className="price-currency-input-wrap promo-wrap">
                                        <span className="currency-prefix">R$</span>
                                        <input
                                          id={`offer-promo-${offer.id}`}
                                          type="text"
                                          value={offer.promotionalPrice}
                                          onChange={(e) =>
                                            handleUpdateScreenOffer(offer.id, {
                                              promotionalPrice: e.target.value,
                                            })
                                          }
                                          className="form-input promo-input"
                                          placeholder="44,99"
                                        />
                                      </div>
                                    </div>

                                    {/* Preço 'De:' Regular */}
                                    <div className="price-input-cell regular-price-cell">
                                      <label htmlFor={`offer-reg-${offer.id}`}>Preço De (R$)</label>
                                      <div className="price-currency-input-wrap">
                                        <span className="currency-prefix">R$</span>
                                        <input
                                          id={`offer-reg-${offer.id}`}
                                          type="text"
                                          value={offer.regularPrice || ""}
                                          onChange={(e) =>
                                            handleUpdateScreenOffer(offer.id, {
                                              regularPrice: e.target.value,
                                            })
                                          }
                                          className="form-input regular-input"
                                          placeholder="59,90"
                                        />
                                      </div>
                                    </div>

                                    {/* Unidade */}
                                    <div className="price-input-cell unit-cell">
                                      <label htmlFor={`offer-unit-${offer.id}`}>Unidade</label>
                                      <select
                                        id={`offer-unit-${offer.id}`}
                                        value={offer.unit}
                                        onChange={(e) =>
                                          handleUpdateScreenOffer(offer.id, { unit: e.target.value })
                                        }
                                        className="form-select unit-select"
                                      >
                                        <option value="kg">kg</option>
                                        <option value="un">un</option>
                                        <option value="100g">100g</option>
                                        <option value="bandeja">bandeja</option>
                                        <option value="peça">peça</option>
                                        <option value="pct">pct</option>
                                        <option value="litro">litro</option>
                                        <option value="cx">cx</option>
                                        <option value="garrafa">garrafa</option>
                                        <option value="lata">lata</option>
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* SEÇÃO 2: Catálogo de Produtos para Adicionar ou Trocar */}
                    <div className="catalog-picker-section">
                      <div className="section-toolbar">
                        <label>
                          Catálogo de Produtos ({availableOffers.length} disponíveis):
                        </label>
                        <div className="catalog-search-wrap">
                          <Search size={14} className="catalog-search-icon" />
                          <input
                            type="search"
                            placeholder="Buscar produto no catálogo..."
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            className="search-input-compact"
                          />
                        </div>
                      </div>

                      <div className="products-selection-grid">
                        {availableOffers
                          .filter((o) =>
                            o.name.toLowerCase().includes(productSearch.toLowerCase().trim()),
                          )
                          .map((offer) => {
                            const isSelected = (activeEditingScreen.offers || []).some(
                              (o) => o.id === offer.id,
                            );
                            return (
                              <div
                                key={offer.id}
                                className={`product-select-card ${isSelected ? "selected" : ""}`}
                                onClick={() => handleToggleProductInScreen(offer)}
                              >
                                <ProductImage
                                  src={offer.image}
                                  name={offer.name}
                                  className="select-thumb"
                                />
                                <div className="select-info">
                                  <strong>{offer.name}</strong>
                                  <span>
                                    R$ {offer.promotionalPrice}/{offer.unit}
                                  </span>
                                </div>
                                <div className="select-checkbox">
                                  {isSelected ? <Check size={14} /> : null}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Se for Imagem ou Vídeo: Seletor de Mídia */}
                {(activeEditingScreen.kind === "image" || activeEditingScreen.kind === "video") && (
                  <div className="media-editor-section">
                    <div className="form-group">
                      <label htmlFor="media-title">Título da Mídia</label>
                      <input
                        id="media-title"
                        type="text"
                        value={activeEditingScreen.title || ""}
                        onChange={(e) => updateEditingScreen({ title: e.target.value })}
                        placeholder="Ex: Campanha Sextou no Sol"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="media-url">URL da Mídia ({activeEditingScreen.kind})</label>
                      <input
                        id="media-url"
                        type="url"
                        value={activeEditingScreen.mediaUrl || ""}
                        onChange={(e) => updateEditingScreen({ mediaUrl: e.target.value })}
                        placeholder="https://... ou escolha abaixo"
                        className="form-input"
                      />
                    </div>

                    {availableMedia.filter((m) => m.type === activeEditingScreen.kind).length > 0 && (
                      <div className="available-media-quick-picker">
                        <label>Escolher da Galeria de Mídias:</label>
                        <div className="media-quick-grid">
                          {availableMedia
                            .filter((m) => m.type === activeEditingScreen.kind)
                            .map((media) => (
                              <button
                                key={media.id}
                                type="button"
                                className={`media-quick-btn ${activeEditingScreen.mediaUrl === media.mediaUrl ? "active" : ""}`}
                                onClick={() =>
                                  updateEditingScreen({
                                    title: media.title || activeEditingScreen.title,
                                    mediaUrl: media.mediaUrl,
                                  })
                                }
                              >
                                {media.type === "image" ? <ImageIcon size={14} /> : <Film size={14} />}
                                <span>{media.title || media.mediaUrl.split("/").pop()}</span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </main>

          {/* COLUNA 3: Preview 16:9 em Tempo Real */}
          <aside className="editor-column editor-col-preview">
            <div className="col-header">
              <div>
                <h3>Preview da TV</h3>
                <p>Visualização real 16:9</p>
              </div>

              <button
                type="button"
                className="btn btn-secondary action-btn-compact"
                onClick={() => onTest(program)}
                title="Abrir em tela de teste completa"
              >
                <Play size={13} /> Testar
              </button>
            </div>

            <div className="preview-player-container">
              <TvPlayer
                content={previewTvContent}
                mode="preview"
                sectorLabel={program.sector.toUpperCase()}
                theme={normalTheme}
              />
            </div>

            <div className="preview-details-card">
              <div className="detail-row">
                <span>Programação:</span>
                <strong>{program.name}</strong>
              </div>
              <div className="detail-row">
                <span>Setor / Loja:</span>
                <strong>{program.sector} • {program.store}</strong>
              </div>
              <div className="detail-row">
                <span>Telas no loop:</span>
                <strong>{program.screens.length} telas ({totalDurationSeconds}s)</strong>
              </div>
              <div className="detail-row">
                <span>Produtos no ar:</span>
                <strong>{counters.productsCount} produtos</strong>
              </div>
            </div>
          </aside>
        </div>

        {/* Rodapé do Editor */}
        <footer className="program-editor-footer">
          <div className="footer-left" style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <ArrowLeft size={15} /> Voltar
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleSaveDraft}
            >
              Salvar como Rascunho
            </button>
          </div>

          <div className="footer-right">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onTest(program)}
            >
              <Play size={15} /> Testar Programação
            </button>
            <button
              type="button"
              className="btn btn-primary primary-schedule-btn"
              onClick={handleScheduleProgram}
            >
              <Check size={16} /> Agendar na TV
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

