import { useState } from "react";
import {
  Calendar,
  Clock,
  Copy,
  Edit3,
  Layers,
  Play,
  Plus,
  Search,
  Trash2,
  Tv,
  CheckCircle2,
  Clock4,
  FileEdit,
  XCircle,
} from "lucide-react";
import type { ProgramFilter, ProgramStatus, TvProgram } from "../../../offers/programs";
import {
  calculateProgramStatus,
  formatProgramSchedulePeriod,
  getProgramCounters,
} from "../../../offers/programs";

export type ProgramListProps = {
  programs: TvProgram[];
  currentSector: string;
  sectorLabel: string;
  onNewProgram: () => void;
  onEditProgram: (program: TvProgram) => void;
  onDuplicateProgram: (program: TvProgram) => void;
  onTestProgram: (program: TvProgram) => void;
  onDeleteProgram: (id: string) => void;
};

export function ProgramList({
  programs,
  currentSector,
  sectorLabel,
  onNewProgram,
  onEditProgram,
  onDuplicateProgram,
  onTestProgram,
  onDeleteProgram,
}: ProgramListProps) {
  const [activeFilter, setActiveFilter] = useState<ProgramFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const now = new Date();

  // Mapeia programas com seus status calculados em tempo real
  const programsWithStatus = programs.map((p) => ({
    program: p,
    calculatedStatus: calculateProgramStatus(p, now),
    counters: getProgramCounters(p),
    periodText: formatProgramSchedulePeriod(p),
  }));

  // Contagens para os filtros
  const liveCount = programsWithStatus.filter((p) => p.calculatedStatus === "live").length;
  const scheduledCount = programsWithStatus.filter((p) => p.calculatedStatus === "scheduled").length;
  const draftCount = programsWithStatus.filter((p) => p.calculatedStatus === "draft").length;
  const endedCount = programsWithStatus.filter((p) => p.calculatedStatus === "ended").length;

  // Filtragem
  const filtered = programsWithStatus.filter(({ program, calculatedStatus }) => {
    if (activeFilter === "live" && calculatedStatus !== "live") return false;
    if (activeFilter === "scheduled" && calculatedStatus !== "scheduled") return false;
    if (activeFilter === "draft" && calculatedStatus !== "draft") return false;
    if (activeFilter === "ended" && calculatedStatus !== "ended") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = program.name.toLowerCase().includes(q);
      const matchStore = program.store.toLowerCase().includes(q);
      return matchName || matchStore;
    }

    return true;
  });

  return (
    <div className="programs-area">
      {/* Top Header Bar */}
      <div className="programs-header-bar">
        <div className="programs-title-group">
          <div className="programs-title-badge">
            <Tv size={16} />
          </div>
          <div>
            <h2>Programações da TV</h2>
            <p>
              Setor: <strong>{sectorLabel}</strong> · Gerencie e agende as grades de exibição das TVs
            </p>
          </div>
        </div>

        <div className="programs-actions-group">
          <div className="search-box">
            <Search size={15} className="search-icon" />
            <input
              type="search"
              placeholder="Buscar programação..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="program-search-input"
            />
          </div>

          <button
            type="button"
            className="btn btn-primary new-program-btn"
            onClick={onNewProgram}
          >
            <Plus size={16} />
            Nova programação
          </button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="programs-tabs-row">
        <button
          type="button"
          className={`program-tab-btn ${activeFilter === "all" ? "active" : ""}`}
          onClick={() => setActiveFilter("all")}
        >
          Todas <span className="tab-counter">{programs.length}</span>
        </button>
        <button
          type="button"
          className={`program-tab-btn tab-live ${activeFilter === "live" ? "active" : ""}`}
          onClick={() => setActiveFilter("live")}
        >
          <span className="live-dot" /> Em exibição{" "}
          <span className="tab-counter">{liveCount}</span>
        </button>
        <button
          type="button"
          className={`program-tab-btn ${activeFilter === "scheduled" ? "active" : ""}`}
          onClick={() => setActiveFilter("scheduled")}
        >
          <Clock4 size={13} /> Agendadas{" "}
          <span className="tab-counter">{scheduledCount}</span>
        </button>
        <button
          type="button"
          className={`program-tab-btn ${activeFilter === "draft" ? "active" : ""}`}
          onClick={() => setActiveFilter("draft")}
        >
          <FileEdit size={13} /> Rascunhos{" "}
          <span className="tab-counter">{draftCount}</span>
        </button>
        <button
          type="button"
          className={`program-tab-btn ${activeFilter === "ended" ? "active" : ""}`}
          onClick={() => setActiveFilter("ended")}
        >
          <XCircle size={13} /> Encerradas{" "}
          <span className="tab-counter">{endedCount}</span>
        </button>
      </div>

      {/* Grid of Programs Cards */}
      {filtered.length === 0 ? (
        <div className="empty-programs-card">
          <Layers size={40} className="empty-icon" />
          <h3>Nenhuma programação encontrada</h3>
          <p>
            {searchQuery
              ? `Não há programações correspondentes a "${searchQuery}".`
              : activeFilter !== "all"
                ? "Nenhuma programação com o status selecionado."
                : "Crie sua primeira programação para organizar as ofertas e vídeos da TV."}
          </p>
          <button type="button" className="btn btn-primary" onClick={onNewProgram}>
            <Plus size={16} /> + Criar Nova Programação
          </button>
        </div>
      ) : (
        <div className="programs-cards-grid">
          {filtered.map(({ program, calculatedStatus, counters, periodText }) => (
            <div
              key={program.id}
              className={`program-card program-card-${calculatedStatus}`}
            >
              {/* Card Header */}
              <div className="program-card-header">
                <div>
                  <h3 className="program-card-title">{program.name}</h3>
                  <span className="program-card-subtitle">
                    {sectorLabel} • {program.store || "Loja 01"}
                  </span>
                </div>

                <div className="program-card-status-wrapper">
                  {calculatedStatus === "live" && (
                    <span className="status-badge status-live">
                      <span className="live-dot" /> EM EXIBIÇÃO
                    </span>
                  )}
                  {calculatedStatus === "scheduled" && (
                    <span className="status-badge status-scheduled">
                      <Clock4 size={12} /> AGENDADA
                    </span>
                  )}
                  {calculatedStatus === "draft" && (
                    <span className="status-badge status-draft">
                      <FileEdit size={12} /> RASCUNHO
                    </span>
                  )}
                  {calculatedStatus === "ended" && (
                    <span className="status-badge status-ended">
                      <XCircle size={12} /> ENCERRADA
                    </span>
                  )}
                </div>
              </div>

              {/* Schedule Period */}
              <div className="program-card-schedule">
                <Clock size={14} className="schedule-icon" />
                <span>{periodText}</span>
              </div>

              {/* Counters Summary */}
              <div className="program-card-counters">
                <span className="counter-chip">
                  <Layers size={13} /> {counters.screensCount}{" "}
                  {counters.screensCount === 1 ? "tela" : "telas"}
                </span>
                {counters.productsCount > 0 && (
                  <span className="counter-chip">
                    🛒 {counters.productsCount}{" "}
                    {counters.productsCount === 1 ? "produto" : "produtos"}
                  </span>
                )}
                {counters.videosCount > 0 && (
                  <span className="counter-chip">
                    🎬 {counters.videosCount}{" "}
                    {counters.videosCount === 1 ? "vídeo" : "vídeos"}
                  </span>
                )}
                {counters.imagesCount > 0 && counters.videosCount === 0 && (
                  <span className="counter-chip">
                    🖼 {counters.imagesCount}{" "}
                    {counters.imagesCount === 1 ? "imagem" : "imagens"}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="program-card-footer">
                <div className="action-buttons-left">
                  <button
                    type="button"
                    className="btn btn-primary program-action-btn"
                    onClick={() => onEditProgram(program)}
                    title="Editar programação"
                  >
                    <Edit3 size={14} /> Editar
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary program-action-btn test-btn"
                    onClick={() => onTestProgram(program)}
                    title="Testar reprodução como na TV"
                  >
                    <Play size={14} /> Testar
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary program-action-btn"
                    onClick={() => onDuplicateProgram(program)}
                    title="Duplicar esta programação"
                  >
                    <Copy size={14} /> Duplicar
                  </button>
                </div>

                <button
                  type="button"
                  className="icon-action-btn danger-action"
                  onClick={() => onDeleteProgram(program.id)}
                  title="Excluir programação"
                  aria-label="Excluir"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

