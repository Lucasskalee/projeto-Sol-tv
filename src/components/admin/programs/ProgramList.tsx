import React, { useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  Database,
  Flame,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tv,
  WifiOff,
} from "lucide-react";
import type { TvProgram } from "../../../offers/programs";
import {
  calculateProgramStatus,
  resolveActiveProgram,
} from "../../../offers/programs";
import type { ProgramSyncState } from "../../../services/programService";
import { ProgramLiveHeroCard } from "./ProgramLiveHeroCard";
import { ProgramCard } from "./ProgramCard";

export type ProgramListFilter = "all" | "live" | "scheduled" | "flash" | "draft";

export type ProgramListProps = {
  programs: TvProgram[];
  currentSector: string;
  sectorLabel: string;
  syncState?: ProgramSyncState;
  lastSyncAt?: string | null;
  legacyLocalCount?: number;
  onMigrateLegacyLocal?: () => void;
  onDismissLegacyLocal?: () => void;
  onNewProgram: () => void;
  onNewFlashOffer?: () => void;
  onEditProgram: (program: TvProgram) => void;
  onDuplicateProgram: (program: TvProgram) => void;
  onToggleStatus?: (program: TvProgram) => void;
  onTestProgram: (program: TvProgram) => void;
  onDeleteProgram: (id: string) => void;
  onOpenSimulator?: (program?: TvProgram) => void;
};

export function ProgramList({
  programs,
  currentSector,
  sectorLabel,
  syncState = "online",
  lastSyncAt,
  legacyLocalCount = 0,
  onMigrateLegacyLocal,
  onDismissLegacyLocal,
  onNewProgram,
  onNewFlashOffer,
  onEditProgram,
  onDuplicateProgram,
  onToggleStatus,
  onTestProgram,
  onDeleteProgram,
  onOpenSimulator,
}: ProgramListProps) {
  const [activeFilter, setActiveFilter] = useState<ProgramListFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const now = new Date();

  // Resolve o programa atualmente no ar via motor real resolveActiveProgram()
  const activeResolution = useMemo(() => {
    return resolveActiveProgram(programs, now, { sector: currentSector });
  }, [programs, currentSector]);

  const activeWinner = activeResolution.activeOverride || activeResolution.baseProgram;
  const isInterleaved = activeResolution.activeOverride?.schedule.overrideMode === "interleave";

  // Calcula o status determinístico de cada programação
  const itemsWithStatus = useMemo(() => {
    return programs.map((p) => {
      const isWinner = activeWinner?.id === p.id;
      const status = calculateProgramStatus(p, now);
      return {
        program: p,
        calculatedStatus: isWinner ? "live" : status,
        isWinner,
      };
    });
  }, [programs, activeWinner]);

  // Contagens para os filtros rápidos
  const counts = useMemo(() => {
    return {
      all: programs.length,
      live: itemsWithStatus.filter((item) => item.calculatedStatus === "live" || item.isWinner).length,
      scheduled: itemsWithStatus.filter(
        (item) => item.calculatedStatus === "scheduled" && item.program.schedule.recurrence !== "flash_offer"
      ).length,
      flash: itemsWithStatus.filter((item) => item.program.schedule.recurrence === "flash_offer").length,
      draft: itemsWithStatus.filter((item) => item.calculatedStatus === "draft" || item.program.status === "draft").length,
    };
  }, [programs.length, itemsWithStatus]);

  // Filtragem dos cards
  const filteredItems = useMemo(() => {
    return itemsWithStatus.filter(({ program, calculatedStatus, isWinner }) => {
      if (activeFilter === "live" && !isWinner && calculatedStatus !== "live") return false;
      if (activeFilter === "scheduled" && (calculatedStatus !== "scheduled" || program.schedule.recurrence === "flash_offer")) return false;
      if (activeFilter === "flash" && program.schedule.recurrence !== "flash_offer") return false;
      if (activeFilter === "draft" && calculatedStatus !== "draft" && program.status !== "draft") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = program.name.toLowerCase().includes(q);
        const matchStore = (program.store || "").toLowerCase().includes(q);
        return matchName || matchStore;
      }

      return true;
    });
  }, [itemsWithStatus, activeFilter, searchQuery]);

  return (
    <div className="admin-programs-container">
      {/* Top Header Bar */}
      <div className="admin-programs-header">
        <div className="admin-programs-title-block">
          <div className="admin-programs-title-row">
            <h2 className="admin-programs-title">Programação</h2>
            {/* Sync Badge */}
            <span
              className={`admin-programs-sync-badge sync-${syncState}`}
              title={
                lastSyncAt
                  ? `Última sincronização: ${new Date(lastSyncAt).toLocaleTimeString()}`
                  : undefined
              }
            >
              {syncState === "online" && (
                <>
                  <span className="sync-dot-green" />
                  Sincronizado
                </>
              )}
              {syncState === "syncing" && (
                <>
                  <RefreshCw size={11} className="spin-icon" />
                  Sincronizando...
                </>
              )}
              {(syncState === "stale_offline" || syncState === "error") && (
                <>
                  <WifiOff size={11} />
                  Offline • Cache local
                </>
              )}
            </span>
          </div>
          <p className="admin-programs-subtitle">
            Controle o que aparece nas TVs e em quais horários.
          </p>
        </div>

        {/* Action Buttons Top */}
        <div className="admin-programs-header-actions">
          {onOpenSimulator && (
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={() => onOpenSimulator()}
              title="Abrir o simulador de grade"
            >
              <Sparkles size={15} />
              <span>Simulador de Grade</span>
            </button>
          )}

          {onNewFlashOffer && (
            <button
              type="button"
              className="admin-flash-button"
              onClick={onNewFlashOffer}
              title="Criar Oferta Relâmpago / Hora Extra imediata"
            >
              <Flame size={15} />
              <span>+ Hora Extra</span>
            </button>
          )}

          <button
            type="button"
            className="admin-primary-button"
            onClick={onNewProgram}
          >
            <Plus size={16} />
            <span>+ Nova Programação</span>
          </button>
        </div>
      </div>

      {/* Legacy Migration Banner (se aplicável) */}
      {legacyLocalCount > 0 && onMigrateLegacyLocal && (
        <div className="admin-legacy-banner">
          <div className="admin-legacy-banner-text">
            <Database size={18} className="legacy-icon" />
            <div>
              <strong>Programações locais encontradas neste dispositivo</strong>
              <p>
                Encontramos {legacyLocalCount}{" "}
                {legacyLocalCount === 1 ? "programação local" : "programações locais"}. Deseja importá-las para o Supabase?
              </p>
            </div>
          </div>
          <div className="admin-legacy-banner-actions">
            <button
              type="button"
              className="admin-primary-button admin-btn-sm"
              onClick={onMigrateLegacyLocal}
            >
              Importar
            </button>
            {onDismissLegacyLocal && (
              <button
                type="button"
                className="admin-btn-secondary admin-btn-sm"
                onClick={onDismissLegacyLocal}
              >
                Dispensar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hero: "AGORA NA TV" */}
      {activeWinner && (
        <section className="admin-programs-hero-section">
          <div className="admin-section-label-row">
            <h3 className="admin-section-heading">AGORA NA TV</h3>
          </div>

          <ProgramLiveHeroCard
            program={activeWinner}
            sectorLabel={sectorLabel}
            isInterleaved={isInterleaved}
            onEdit={onEditProgram}
            onDuplicate={onDuplicateProgram}
            onToggleStatus={onToggleStatus}
            onTest={onTestProgram}
            onOpenSimulator={onOpenSimulator}
            onDelete={onDeleteProgram}
          />
        </section>
      )}

      {/* Filter and Search Bar */}
      <div className="admin-programs-filters-row">
        {/* Filter Pills */}
        <div className="admin-filter-pills-group" role="tablist">
          <button
            type="button"
            className={`admin-filter-pill ${activeFilter === "all" ? "active" : ""}`}
            onClick={() => setActiveFilter("all")}
            role="tab"
            aria-selected={activeFilter === "all"}
          >
            Todas <span className="pill-count">{counts.all}</span>
          </button>

          <button
            type="button"
            className={`admin-filter-pill pill-live ${activeFilter === "live" ? "active" : ""}`}
            onClick={() => setActiveFilter("live")}
            role="tab"
            aria-selected={activeFilter === "live"}
          >
            <span className="live-mini-dot" /> No ar <span className="pill-count">{counts.live}</span>
          </button>

          <button
            type="button"
            className={`admin-filter-pill ${activeFilter === "scheduled" ? "active" : ""}`}
            onClick={() => setActiveFilter("scheduled")}
            role="tab"
            aria-selected={activeFilter === "scheduled"}
          >
            <Clock size={12} /> Agendadas <span className="pill-count">{counts.scheduled}</span>
          </button>

          <button
            type="button"
            className={`admin-filter-pill pill-flash ${activeFilter === "flash" ? "active" : ""}`}
            onClick={() => setActiveFilter("flash")}
            role="tab"
            aria-selected={activeFilter === "flash"}
          >
            <Flame size={12} /> Hora Extra <span className="pill-count">{counts.flash}</span>
          </button>

          <button
            type="button"
            className={`admin-filter-pill ${activeFilter === "draft" ? "active" : ""}`}
            onClick={() => setActiveFilter("draft")}
            role="tab"
            aria-selected={activeFilter === "draft"}
          >
            Rascunhos <span className="pill-count">{counts.draft}</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="admin-programs-search-box">
          <Search size={15} className="admin-search-icon" />
          <input
            type="search"
            placeholder="Buscar programação..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="admin-programs-search-input"
            aria-label="Buscar programação"
          />
        </div>
      </div>

      {/* Program Grid Section */}
      <section className="admin-programs-grid-section">
        <div className="admin-section-label-row">
          <h3 className="admin-section-heading">
            {activeFilter === "all"
              ? "TODAS AS PROGRAMAÇÕES"
              : activeFilter === "live"
                ? "PROGRAMAÇÕES NO AR"
                : activeFilter === "scheduled"
                  ? "PROGRAMAÇÕES AGENDADAS"
                  : activeFilter === "flash"
                    ? "HORA EXTRA & OFERTAS RELÂMPAGO"
                    : "RASCUNHOS"}
          </h3>
          <span className="admin-section-count-badge">
            {filteredItems.length} {filteredItems.length === 1 ? "programação" : "programações"}
          </span>
        </div>

        {filteredItems.length === 0 ? (
          <div className="admin-empty-programs-state">
            <Layers size={36} className="empty-icon-purple" />
            <h4>Nenhuma programação encontrada</h4>
            <p>
              {searchQuery
                ? `Não encontramos programações com o termo "${searchQuery}".`
                : activeFilter !== "all"
                  ? "Nenhuma programação cadastrada neste filtro."
                  : "Crie sua primeira programação para organizar as ofertas na TV."}
            </p>
            <button
              type="button"
              className="admin-primary-button"
              onClick={onNewProgram}
            >
              <Plus size={16} />
              <span>+ Criar Nova Programação</span>
            </button>
          </div>
        ) : (
          <div className="admin-programs-grid">
            {filteredItems.map(({ program, calculatedStatus, isWinner }) => (
              <ProgramCard
                key={program.id}
                program={program}
                calculatedStatus={calculatedStatus}
                isLiveWinner={isWinner}
                onEdit={onEditProgram}
                onDuplicate={onDuplicateProgram}
                onToggleStatus={onToggleStatus}
                onTest={onTestProgram}
                onOpenSimulator={onOpenSimulator}
                onDelete={onDeleteProgram}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
