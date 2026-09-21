import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FastForward,
  Film,
  Flame,
  HelpCircle,
  Image as ImageIcon,
  Info,
  Layers,
  LayoutGrid,
  Play,
  RefreshCw,
  Sparkles,
  Tag,
  Tv,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import type { Offer, SolTvMedia, TvContent, TvPlaylistItem } from "../../../types";
import {
  calculateNextTransitionTimestamp,
  formatProgramSchedulePeriod,
  getProgramCounters,
  getRecurrenceTier,
  resolveActiveProgram,
  type ActiveProgramResolution,
  type TvProgram,
} from "../../../offers/programs";
import { TvPlayer } from "../../TvPlayer";
import { normalTheme } from "../../../themes/normal";
import { formatDate } from "../../../data";

export type ProgramSimulatorProps = {
  programs: TvProgram[];
  currentSector: string;
  sectorLabel: string;
  availableOffers?: readonly Offer[];
  availableMedia?: readonly SolTvMedia[];
  onClose: () => void;
};

// Gera cenários pré-configurados para testes rápidos e demonstração
function generateMockScenarios(sector: string): { name: string; description: string; date: string; time: string; customPrograms?: TvProgram[] }[] {
  const todayStr = formatDate(new Date());

  const pAlways: TvProgram = {
    id: "scen-always",
    name: "Açougue Padrão Institucional",
    store: "Loja 03",
    sector,
    status: "published",
    priority: 50,
    schedule: { recurrence: "always" },
    screens: [
      { id: "s-al-1", kind: "image", title: "Cortes Nobres SOL", mediaUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1920&q=85", duration: 8, position: 0, active: true },
      { id: "s-al-2", kind: "video", title: "Institucional SOL TV", mediaUrl: "https://cdn.coverr.co/videos/coverr-a-chef-preparing-meat-1577/1080p.mp4", duration: 12, position: 1, active: true },
    ],
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  };

  const pWednesday: TvProgram = {
    id: "scen-wed",
    name: "Quarta da Carne",
    store: "Loja 03",
    sector,
    status: "published",
    priority: 50,
    schedule: {
      recurrence: "weekly",
      weekdays: [3], // Quarta-feira
      startTime: "07:00",
      endTime: "22:00",
    },
    screens: [
      { id: "s-wed-1", kind: "image", title: "Alcatra Especial R$ 34,90/kg", mediaUrl: "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=1200&q=85", duration: 8, position: 0, active: true },
      { id: "s-wed-2", kind: "image", title: "Fraldinha Grill R$ 29,90/kg", mediaUrl: "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=1200&q=85", duration: 8, position: 1, active: true },
    ],
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  };

  const pBlackFriday: TvProgram = {
    id: "scen-bf",
    name: "Black Friday 2026",
    store: "Loja 03",
    sector,
    status: "published",
    priority: 90,
    schedule: {
      recurrence: "date_range",
      startDate: "2026-11-20",
      endDate: "2026-11-30",
      startTime: "07:00",
      endTime: "22:00",
    },
    screens: [
      { id: "s-bf-1", kind: "image", title: "BLACK FRIDAY: Picanha R$ 39,90/kg", mediaUrl: "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=1200&q=85", duration: 8, position: 0, active: true },
      { id: "s-bf-2", kind: "image", title: "BLACK FRIDAY: Contra Filé R$ 32,90/kg", mediaUrl: "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=1200&q=85", duration: 8, position: 1, active: true },
      { id: "s-bf-3", kind: "image", title: "BLACK FRIDAY: Costela Gaúcha R$ 22,90/kg", mediaUrl: "https://images.unsplash.com/photo-1585325701956-60dd9c8553bc?auto=format&fit=crop&w=1200&q=85", duration: 8, position: 2, active: true },
    ],
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  };

  const pFlashTakeover: TvProgram = {
    id: "scen-flash-to",
    name: "PICANHA R$ 39,90 URGENTE",
    store: "Loja 03",
    sector,
    status: "published",
    priority: 95,
    schedule: {
      recurrence: "flash_offer",
      startDate: todayStr,
      endDate: todayStr,
      startTime: "16:20",
      endTime: "19:00",
      overrideMode: "takeover",
    },
    screens: [
      { id: "s-fl-1", kind: "image", title: "🔥 URGENTE: Picanha Angus R$ 39,90/kg até 19h!", mediaUrl: "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=1200&q=85", duration: 10, position: 0, active: true },
    ],
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  };

  const pFlashInterleave: TvProgram = {
    id: "scen-flash-il",
    name: "HORA EXTRA INTERCALADA (1 a cada 2)",
    store: "Loja 03",
    sector,
    status: "published",
    priority: 95,
    schedule: {
      recurrence: "flash_offer",
      startDate: todayStr,
      endDate: todayStr,
      startTime: "16:20",
      endTime: "19:00",
      overrideMode: "interleave",
      interleaveFrequency: 2,
    },
    screens: [
      { id: "s-fl-il-1", kind: "image", title: "⚡ OFERTA RELÂMPAGO: Linguiça R$ 14,90/kg", mediaUrl: "https://images.unsplash.com/photo-1585325701956-60dd9c8553bc?auto=format&fit=crop&w=1200&q=85", duration: 7, position: 0, active: true },
    ],
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  };

  const pNight: TvProgram = {
    id: "scen-night",
    name: "Turno Noturno Especial",
    store: "Loja 03",
    sector,
    status: "published",
    priority: 50,
    schedule: {
      recurrence: "always",
      startTime: "22:00",
      endTime: "06:00",
    },
    screens: [
      { id: "s-n-1", kind: "image", title: "Loja 24h SOL: Padaria e Carnes", mediaUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1920&q=85", duration: 8, position: 0, active: true },
    ],
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  };

  return [
    {
      name: "1. Cenário Normal (Always 24/7)",
      description: "Nenhuma campanha especial ativa. O motor resolve o Açougue Padrão contínuo (Tier 1).",
      date: "2026-09-22", // Terça-feira
      time: "14:00",
      customPrograms: [pAlways, pWednesday, pBlackFriday],
    },
    {
      name: "2. Quarta da Carne (Weekly > Always)",
      description: "Em dia de Quarta-feira às 10:00, o programa semanal de Quarta (Tier 2) sobrepõe o Always (Tier 1).",
      date: "2026-09-23", // Quarta-feira
      time: "10:00",
      customPrograms: [pAlways, pWednesday, pBlackFriday],
    },
    {
      name: "3. Black Friday (Date Range > Weekly > Always)",
      description: "Durante 20 a 30 de Novembro, a Black Friday (Tier 3) assume controle mesmo em dia de Quarta-feira.",
      date: "2026-11-25", // Quarta durante Black Friday
      time: "14:00",
      customPrograms: [pAlways, pWednesday, pBlackFriday],
    },
    {
      name: "4. Hora Extra Takeover (Flash Offer 100%)",
      description: "Às 17:30 surge uma Hora Extra com Takeover. Ocupa 100% da tela sobre a Black Friday (Tier 4 > 3).",
      date: todayStr,
      time: "17:30",
      customPrograms: [pAlways, pWednesday, pBlackFriday, pFlashTakeover],
    },
    {
      name: "5. Hora Extra Intercalada (1 flash a cada 2 normais)",
      description: "Hora Extra em modo 'interleave'. Intercala 1 slide de urgência a cada 2 slides da Black Friday.",
      date: todayStr,
      time: "17:30",
      customPrograms: [pAlways, pBlackFriday, pFlashInterleave],
    },
    {
      name: "6. Teste de Limite: 18:59 (Ativo) → 19:00 (Encerrado)",
      description: "Demonstra o encerramento exato da Hora Extra às 19:00:00 e o retorno imediato à Black Friday.",
      date: todayStr,
      time: "18:59",
      customPrograms: [pAlways, pBlackFriday, pFlashTakeover],
    },
    {
      name: "7. Virada Noturna (22:00 às 06:00)",
      description: "Validação de horário que atravessa meia-noite (23:59 -> 00:00 -> 05:59 -> 06:00 encerra).",
      date: "2026-09-20",
      time: "23:59",
      customPrograms: [pNight],
    },
    {
      name: "8. Nenhum Programa Válido (Fallback)",
      description: "Quando todos os programas estão fora de horário ou em rascunho, o motor entrega o Fallback seguro (Tier 0).",
      date: "2026-09-22",
      time: "03:00",
      customPrograms: [pWednesday],
    },
  ];
}

export function ProgramSimulator({
  programs,
  currentSector,
  sectorLabel,
  availableOffers = [],
  availableMedia = [],
  onClose,
}: ProgramSimulatorProps) {
  const now = new Date();
  const [simDate, setSimDate] = useState(() => formatDate(now));
  const [simTime, setSimTime] = useState(() => {
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  });
  const [selectedSector, setSelectedSector] = useState(currentSector);
  const [useCustomScenario, setUseCustomScenario] = useState<boolean>(false);
  const [customPrograms, setCustomPrograms] = useState<TvProgram[]>([]);
  const [activeScenarioName, setActiveScenarioName] = useState<string>("");
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);

  // Mapa de ofertas para resolução de preços atualizados
  const offersMap = useMemo(() => {
    return new Map(availableOffers.map((o) => [o.id, o]));
  }, [availableOffers]);

  // Lista de programas ativos para a simulação
  const effectiveProgramsList = useMemo(() => {
    if (useCustomScenario && customPrograms.length > 0) {
      return customPrograms;
    }
    return programs;
  }, [useCustomScenario, customPrograms, programs]);

  // Data/Hora de referência simulada
  const referenceDate = useMemo(() => {
    try {
      const [year, month, day] = simDate.split("-").map((v) => parseInt(v, 10));
      const [hour, minute] = simTime.split(":").map((v) => parseInt(v, 10));
      return new Date(year, month - 1, day, hour || 0, minute || 0, 0, 0);
    } catch {
      return new Date();
    }
  }, [simDate, simTime]);

  // Execução do Motor de Resolução Central
  const resolution: ActiveProgramResolution = useMemo(() => {
    return resolveActiveProgram(effectiveProgramsList, referenceDate, {
      sector: selectedSector,
      offersMap,
    });
  }, [effectiveProgramsList, referenceDate, selectedSector, offersMap]);

  // Lista de cenários predefinidos
  const scenarios = useMemo(() => generateMockScenarios(selectedSector), [selectedSector]);

  // Handlers para atalhos
  function handleSetNow() {
    const current = new Date();
    setSimDate(formatDate(current));
    const h = String(current.getHours()).padStart(2, "0");
    const m = String(current.getMinutes()).padStart(2, "0");
    setSimTime(`${h}:${m}`);
    setUseCustomScenario(false);
    setActiveScenarioName("Horário Atual em Tempo Real");
  }

  function handleApplyShortcut(date: string, time: string, label: string) {
    setSimDate(date);
    setSimTime(time);
    setActiveScenarioName(label);
  }

  function handleSelectScenario(scen: ReturnType<typeof generateMockScenarios>[0]) {
    setSimDate(scen.date);
    setSimTime(scen.time);
    if (scen.customPrograms) {
      setCustomPrograms(scen.customPrograms);
      setUseCustomScenario(true);
    } else {
      setUseCustomScenario(false);
    }
    setActiveScenarioName(scen.name);
  }

  const { baseProgram, activeOverride, computedStatus, effectivePlaylist, diagnostics } = resolution;

  return (
    <div className="program-simulator-view">
      {/* Top Header */}
      <header className="simulator-header">
        <div className="simulator-title-group">
          <div className="simulator-badge">
            <Sparkles size={16} /> MOTOR DE RESOLUÇÃO
          </div>
          <div>
            <h2>Simulador de Programação e Agendamento</h2>
            <p>
              Valide e diagnostique visualmente como a grade da TV responde a qualquer data, horário, Hora Extra e conflitos de campanhas.
            </p>
          </div>
        </div>

        <div className="simulator-header-actions">
          <button
            type="button"
            className="btn btn-primary preview-tv-btn"
            onClick={() => setShowPreviewModal(true)}
          >
            <Play size={16} /> Ver Prévia na TV ({effectivePlaylist.length} telas)
          </button>
          <button
            type="button"
            className="btn btn-secondary action-btn-compact"
            onClick={onClose}
          >
            <ArrowLeft size={16} /> Voltar às Programações
          </button>
        </div>
      </header>

      {/* Main Grid: Left Controls / Right Diagnostic Results */}
      <div className="simulator-grid">
        {/* Left Column: Simulation Controls & Scenarios */}
        <div className="simulator-controls-col">
          {/* Controls Card */}
          <div className="simulator-card">
            <div className="simulator-card-header">
              <Clock size={16} />
              <h3>Controles da Simulação</h3>
            </div>

            <div className="simulator-form-row">
              <div className="form-group" style={{ flex: 1.2 }}>
                <label htmlFor="sim-date">Data Simulada</label>
                <div className="input-with-icon">
                  <Calendar size={15} />
                  <input
                    id="sim-date"
                    type="date"
                    value={simDate}
                    onChange={(e) => {
                      setSimDate(e.target.value);
                      setActiveScenarioName("Personalizado");
                    }}
                    className="simulator-input"
                  />
                </div>
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="sim-time">Hora Simulada</label>
                <div className="input-with-icon">
                  <Clock size={15} />
                  <input
                    id="sim-time"
                    type="time"
                    value={simTime}
                    onChange={(e) => {
                      setSimTime(e.target.value);
                      setActiveScenarioName("Personalizado");
                    }}
                    className="simulator-input"
                  />
                </div>
              </div>

              <div className="form-group" style={{ display: "flex", alignItems: "flex-end" }}>
                <button
                  type="button"
                  className="btn btn-secondary action-btn-compact"
                  onClick={handleSetNow}
                  title="Sincronizar com a hora atual do computador"
                  style={{ height: "38px" }}
                >
                  <RefreshCw size={14} /> Agora
                </button>
              </div>
            </div>

            {/* Quick Time Jump Shortcuts */}
            <div className="simulator-shortcuts-section">
              <span className="shortcuts-label">Atalhos de Teste de Horário:</span>
              <div className="shortcuts-chips-grid">
                <button
                  type="button"
                  className="shortcut-chip"
                  onClick={() => handleApplyShortcut(simDate, "16:20", "Início Hora Extra (16:20)")}
                >
                  16:20 <span className="chip-sub">Início Flash</span>
                </button>
                <button
                  type="button"
                  className="shortcut-chip"
                  onClick={() => handleApplyShortcut(simDate, "18:59", "Último Minuto Flash (18:59)")}
                >
                  18:59 <span className="chip-sub">Flash Ativa</span>
                </button>
                <button
                  type="button"
                  className="shortcut-chip highlight"
                  onClick={() => handleApplyShortcut(simDate, "19:00", "Encerramento Flash (19:00)")}
                >
                  19:00 <span className="chip-sub">Fim Flash → Base</span>
                </button>
                <button
                  type="button"
                  className="shortcut-chip"
                  onClick={() => handleApplyShortcut(simDate, "21:59", "Fim do Dia (21:59)")}
                >
                  21:59 <span className="chip-sub">Diurno Ativo</span>
                </button>
                <button
                  type="button"
                  className="shortcut-chip"
                  onClick={() => handleApplyShortcut(simDate, "22:00", "Fechamento (22:00)")}
                >
                  22:00 <span className="chip-sub">Fim Expediente</span>
                </button>
                <button
                  type="button"
                  className="shortcut-chip"
                  onClick={() => handleApplyShortcut(simDate, "23:59", "Pré Meia-Noite (23:59)")}
                >
                  23:59 <span className="chip-sub">Noite</span>
                </button>
                <button
                  type="button"
                  className="shortcut-chip"
                  onClick={() => handleApplyShortcut(simDate, "00:00", "Meia-Noite (00:00)")}
                >
                  00:00 <span className="chip-sub">Virada Dia</span>
                </button>
              </div>
            </div>

            {/* Mode switch (Local Programs vs Guided Scenarios) */}
            <div className="simulator-mode-switch">
              <span className="mode-label">Origem dos Dados:</span>
              <div className="mode-buttons-row">
                <button
                  type="button"
                  className={`mode-btn ${!useCustomScenario ? "active" : ""}`}
                  onClick={() => {
                    setUseCustomScenario(false);
                    setActiveScenarioName("Programações Salvas do Setor");
                  }}
                >
                  Programações do Setor ({programs.length})
                </button>
                <button
                  type="button"
                  className={`mode-btn ${useCustomScenario ? "active" : ""}`}
                  onClick={() => {
                    setCustomPrograms(scenarios[0].customPrograms || []);
                    setUseCustomScenario(true);
                    setActiveScenarioName(scenarios[0].name);
                  }}
                >
                  Cenários de Teste Guiados
                </button>
              </div>
            </div>
          </div>

          {/* Preset Scenarios Card */}
          <div className="simulator-card">
            <div className="simulator-card-header">
              <Layers size={16} />
              <h3>Cenários Prontos para Simulação</h3>
            </div>

            <div className="scenarios-list">
              {scenarios.map((scen, idx) => {
                const isSelected = activeScenarioName === scen.name;
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`scenario-item-btn ${isSelected ? "active" : ""}`}
                    onClick={() => handleSelectScenario(scen)}
                  >
                    <div className="scenario-item-top">
                      <strong>{scen.name}</strong>
                      <span className="scenario-time-badge">
                        {scen.date} às {scen.time}
                      </span>
                    </div>
                    <p className="scenario-item-desc">{scen.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Mathematical Resolution Results & Diagnostics */}
        <div className="simulator-results-col">
          {/* High-Level Result Banner */}
          <div className={`simulator-banner-card tier-${diagnostics.priorityTier}`}>
            <div className="banner-top-row">
              <div className="banner-status-badge">
                {computedStatus === "live" ? (
                  <>
                    <span className="live-pulse-dot" /> EM EXIBIÇÃO NA TV
                  </>
                ) : (
                  <>
                    <XCircle size={14} /> FORA DO AR / FALLBACK
                  </>
                )}
              </div>

              <div className="banner-tier-badge">
                Tier {diagnostics.priorityTier}: {diagnostics.priorityTier === 4 ? "HORA EXTRA / FLASH" : diagnostics.priorityTier === 3 ? "CAMPANHA DE PERÍODO" : diagnostics.priorityTier === 2 ? "PROGRAMAÇÃO SEMANAL" : diagnostics.priorityTier === 1 ? "INSTITUCIONAL 24H" : "FALLBACK"}
              </div>
            </div>

            <h2 className="banner-winner-title">
              {activeOverride
                ? `⚡ ${activeOverride.name}`
                : baseProgram
                  ? baseProgram.name
                  : "Nenhuma Programação Ativa (Fallback Seguro)"}
            </h2>

            <p className="banner-rule-description">
              <strong>Regra Aplicada:</strong> {diagnostics.ruleMatched}
            </p>

            {/* Next Scheduled Transition */}
            {diagnostics.nextTransitionDescription && (
              <div className="banner-next-transition">
                <div className="transition-icon">
                  <FastForward size={16} />
                </div>
                <div>
                  <strong>Próxima Transição Automática:</strong>
                  <p>{diagnostics.nextTransitionDescription}</p>
                </div>
              </div>
            )}
          </div>

          {/* Breakdown Cards Grid */}
          <div className="resolution-summary-grid">
            {/* Base Program Card */}
            <div className="summary-card">
              <div className="summary-card-header">
                <Tv size={15} />
                <h4>Programa Base Selecionado</h4>
              </div>
              {baseProgram ? (
                <div className="summary-card-content">
                  <div className="summary-prog-name">{baseProgram.name}</div>
                  <div className="summary-prog-meta">
                    <span className="meta-pill">Recorrência: {baseProgram.schedule.recurrence}</span>
                    <span className="meta-pill">Tier {getRecurrenceTier(baseProgram.schedule.recurrence)}</span>
                    <span className="meta-pill">Prioridade: {baseProgram.priority ?? 50}</span>
                    <span className="meta-pill">{baseProgram.screens.length} telas</span>
                  </div>
                  <div className="summary-prog-period">
                    {formatProgramSchedulePeriod(baseProgram)}
                  </div>
                </div>
              ) : (
                <div className="summary-empty">Nenhum programa base ativo para este horário.</div>
              )}
            </div>

            {/* Flash Offer / Override Card */}
            <div className="summary-card override-card">
              <div className="summary-card-header">
                <Flame size={15} />
                <h4>Hora Extra / Oferta Urgente</h4>
              </div>
              {activeOverride ? (
                <div className="summary-card-content">
                  <div className="summary-prog-name" style={{ color: "var(--accent, #f59e0b)" }}>
                    ⚡ {activeOverride.name}
                  </div>
                  <div className="summary-prog-meta">
                    <span className="meta-pill highlight">
                      Modo: {activeOverride.schedule.overrideMode === "interleave" ? `Intercalado (1 a cada ${activeOverride.schedule.interleaveFrequency || 2})` : "Takeover 100%"}
                    </span>
                    <span className="meta-pill">Tier 4</span>
                    <span className="meta-pill">Prioridade: {activeOverride.priority ?? 90}</span>
                  </div>
                  <div className="summary-prog-period">
                    {formatProgramSchedulePeriod(activeOverride)}
                  </div>
                </div>
              ) : (
                <div className="summary-empty">Nenhuma Hora Extra ativa neste momento.</div>
              )}
            </div>
          </div>

          {/* Resulting Effective Playlist (Ordem Exata de Exibição) */}
          <div className="simulator-card">
            <div className="simulator-card-header" style={{ justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <LayoutGrid size={16} />
                <h3>Playlist Efetiva Resultante ({effectivePlaylist.length} slides)</h3>
              </div>
              <span className="playlist-total-time">
                Ciclo Completo: {effectivePlaylist.reduce((acc, it) => acc + (it.duration || 8), 0)}s
              </span>
            </div>

            {effectivePlaylist.length > 0 ? (
              <div className="effective-playlist-track">
                {effectivePlaylist.map((item, idx) => {
                  const isOverrideItem = activeOverride && (
                    activeOverride.schedule.overrideMode === "takeover" ||
                    item.id.includes("interleave") ||
                    activeOverride.screens.some((s) => s.id === item.id)
                  );

                  return (
                    <div
                      key={`${item.id}-${idx}`}
                      className={`playlist-slide-card ${isOverrideItem ? "slide-override" : "slide-base"}`}
                    >
                      <div className="slide-card-top">
                        <span className="slide-index">#{idx + 1}</span>
                        <span className={`slide-origin-badge ${isOverrideItem ? "badge-override" : "badge-base"}`}>
                          {isOverrideItem ? "HORA EXTRA" : "PROGRAMA BASE"}
                        </span>
                        <span className="slide-duration">{item.duration || 8}s</span>
                      </div>

                      <div className="slide-card-body">
                        {item.kind === "composition" ? (
                          <div className="slide-content-preview">
                            <Tag size={14} />
                            <span>
                              Ofertas ({item.composition.offers.length} produtos · Layout {item.composition.layout})
                            </span>
                          </div>
                        ) : item.kind === "offer" ? (
                          <div className="slide-content-preview">
                            <Tag size={14} />
                            <span>Oferta: {item.offer.name}</span>
                          </div>
                        ) : item.kind === "video" ? (
                          <div className="slide-content-preview">
                            <Film size={14} />
                            <span>Vídeo: {item.title || "Vídeo Promocional"}</span>
                          </div>
                        ) : item.kind === "image" ? (
                          <div className="slide-content-preview">
                            <ImageIcon size={14} />
                            <span>Imagem: {item.title || "Banner Promocional"}</span>
                          </div>
                        ) : (
                          <div className="slide-content-preview">
                            <Play size={14} />
                            <span>Abertura</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-playlist-msg">
                <AlertTriangle size={18} />
                <span>Nenhum slide disponível na playlist resultante. A TV exibirá tela de contingência.</span>
              </div>
            )}
          </div>

          {/* Complete Diagnostics Tree / Evaluation Table */}
          <div className="simulator-card">
            <div className="simulator-card-header">
              <Info size={16} />
              <h3>Árvore de Diagnóstico & Motivos de Resolução ({diagnostics.evaluatedCount} programas avaliados)</h3>
            </div>

            <div className="diagnostics-table-wrapper">
              <table className="diagnostics-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Programa</th>
                    <th>Tipo / Tier</th>
                    <th>Prioridade</th>
                    <th>Horário / Agendamento</th>
                    <th>Diagnóstico do Motor</th>
                  </tr>
                </thead>
                <tbody>
                  {diagnostics.evaluatedPrograms.map((ep) => {
                    let statusBadgeClass = "diag-badge-discarded";
                    let statusText = "Descartado";

                    if (ep.isWinnerOverride) {
                      statusBadgeClass = "diag-badge-winner-override";
                      statusText = "⚡ Vencedor Override";
                    } else if (ep.isWinnerBase) {
                      statusBadgeClass = "diag-badge-winner-base";
                      statusText = "✓ Vencedor Base";
                    } else if (ep.isOverridden) {
                      statusBadgeClass = "diag-badge-overridden";
                      statusText = "Sobreposto";
                    } else if (!ep.eligible) {
                      statusBadgeClass = "diag-badge-ineligible";
                      statusText = "Inelegível";
                    }

                    return (
                      <tr key={ep.programId} className={ep.isWinnerOverride || ep.isWinnerBase ? "row-winner" : ""}>
                        <td>
                          <span className={`diag-status-pill ${statusBadgeClass}`}>
                            {statusText}
                          </span>
                        </td>
                        <td>
                          <strong>{ep.name}</strong>
                        </td>
                        <td>
                          <span className="tier-tag">Tier {ep.tier}</span> {ep.recurrence}
                        </td>
                        <td>{ep.priority}</td>
                        <td className="period-cell">{ep.scheduleDescription}</td>
                        <td className="reason-cell">
                          {ep.isWinnerOverride ? (
                            <span className="reason-winner">Ativo como Hora Extra / Oferta Urgente (Tier 4).</span>
                          ) : ep.isWinnerBase ? (
                            <span className="reason-winner">Ativo e selecionado como programação base da TV.</span>
                          ) : ep.isOverridden ? (
                            <span className="reason-overridden">{ep.overrideReason}</span>
                          ) : (
                            <span className="reason-rejection">{ep.rejectionReason}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal Isolado */}
      {showPreviewModal && (
        <div className="program-tester-modal-overlay">
          <div className="program-tester-modal">
            <header className="tester-modal-header">
              <div className="tester-title-group">
                <span className="tester-badge">
                  <Play size={14} /> Pré-Visualização da Playlist Resolvida
                </span>
                <h2>{activeOverride ? activeOverride.name : baseProgram ? baseProgram.name : "Fallback"}</h2>
                <p>
                  Data Simulada: <strong>{simDate} às {simTime}</strong> · {effectivePlaylist.length} slides na playlist
                </p>
              </div>

              <div className="tester-header-actions" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  className="btn btn-secondary action-btn-compact"
                  onClick={() => setShowPreviewModal(false)}
                >
                  <ArrowLeft size={16} /> Fechar Prévia
                </button>
                <button
                  type="button"
                  className="editor-close-btn"
                  onClick={() => setShowPreviewModal(false)}
                >
                  <X size={20} />
                </button>
              </div>
            </header>

            <div className="tester-player-body">
              <div className="tester-player-wrapper">
                <TvPlayer
                  content={resolution.effectiveContent}
                  mode="preview"
                  sectorLabel={selectedSector.toUpperCase()}
                  theme={normalTheme}
                />
              </div>
            </div>

            <footer className="tester-modal-footer">
              <div className="tester-footer-info">
                <span>
                  ℹ️ <strong>Player Isolado do Simulador:</strong> Esta pré-visualização executa a playlist exata calculada pelo motor matemático sem afetar a rota de produção `/tv/acougue`.
                </span>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowPreviewModal(false)}
              >
                Concluir
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
