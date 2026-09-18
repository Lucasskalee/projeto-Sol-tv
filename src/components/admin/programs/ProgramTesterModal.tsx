import { useMemo } from "react";
import { Play, X, Layers, Clock, ArrowRight, ArrowLeft } from "lucide-react";
import type { TvProgram } from "../../../offers/programs";
import { formatProgramSchedulePeriod, getProgramCounters, programToTvContent } from "../../../offers/programs";
import { TvPlayer } from "../../TvPlayer";
import { normalTheme } from "../../../themes/normal";

export type ProgramTesterModalProps = {
  program: TvProgram;
  onClose: () => void;
};

export function ProgramTesterModal({ program, onClose }: ProgramTesterModalProps) {
  const content = useMemo(() => {
    return programToTvContent(program, program.sector);
  }, [program]);

  const counters = getProgramCounters(program);
  const periodText = formatProgramSchedulePeriod(program);

  return (
    <div className="program-tester-modal-overlay">
      <div className="program-tester-modal">
        {/* Header */}
        <header className="tester-modal-header">
          <div className="tester-title-group">
            <span className="tester-badge">
              <Play size={14} /> Modo de Teste da Programação
            </span>
            <h2>{program.name}</h2>
            <p>
              {program.sector.toUpperCase()} • {program.store} · {counters.summaryText} · {periodText}
            </p>
          </div>

          <div className="tester-header-actions" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              className="btn btn-secondary action-btn-compact"
              onClick={onClose}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: 700, padding: "8px 14px", cursor: "pointer" }}
            >
              <ArrowLeft size={16} /> Voltar
            </button>
            <button
              type="button"
              className="editor-close-btn"
              onClick={onClose}
              title="Fechar teste de programação"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Player Container */}
        <div className="tester-player-body">
          <div className="tester-player-wrapper">
            <TvPlayer
              content={content}
              mode="preview"
              sectorLabel={program.sector.toUpperCase()}
              theme={normalTheme}
            />
          </div>
        </div>

        {/* Footer Info */}
        <footer className="tester-modal-footer">
          <div className="tester-footer-info">
            <span>
              ℹ️ <strong>Simulação em tempo real:</strong> Esta pré-visualização reproduz todas as telas, tempos,
              vídeos, transições e animações exatamente como serão exibidos nas TVs dos clientes.
            </span>
          </div>

          <div className="tester-footer-actions" style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: 700 }}
            >
              <ArrowLeft size={16} /> Voltar
            </button>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Concluir Teste
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

