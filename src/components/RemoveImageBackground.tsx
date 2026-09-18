import { useEffect, useState } from "react";
import { Eraser } from "lucide-react";
import { removeWhiteBackground } from "../images/removeWhiteBackground";

export function RemoveImageBackground({ source, disabled, onApply }: {
  source: string;
  disabled: boolean;
  onApply: (file: File) => Promise<void>;
}) {
  const [tolerance, setTolerance] = useState(45);
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { setResult(null); setError(""); }, [source]);
  useEffect(() => {
    if (!result) { setPreview(""); return; }
    const url = URL.createObjectURL(result);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [result]);
  async function process() {
    setWorking(true);
    setError("");
    setResult(null);
    try { setResult(await removeWhiteBackground(source, tolerance)); }
    catch (err) { setError(err instanceof Error ? err.message : "Não foi possível remover o fundo."); }
    finally { setWorking(false); }
  }
  async function apply() {
    if (!result) return;
    setWorking(true);
    try { await onApply(new File([result], "produto-sem-fundo.png", { type: "image/png" })); }
    catch { setError("Não foi possível aplicar a imagem. Tente novamente."); }
    finally { setWorking(false); }
  }
  return (
    <section className="remove-image-background" aria-label="Remover fundo da imagem">
      <strong>Imagem sem fundo branco</strong>
      <p>Remove o fundo claro ao redor do produto. Confira a prévia antes de aplicar.</p>
      <label>Intensidade: {tolerance}
        <input type="range" min="10" max="110" value={tolerance} disabled={working || disabled} onChange={(event) => { setTolerance(Number(event.target.value)); setResult(null); }} />
      </label>
      <button type="button" className="btn btn-secondary" disabled={working || disabled || !source} onClick={() => void process()}>
        <Eraser size={16} /> {working ? "Processando..." : "Remover fundo branco"}
      </button>
      {error && <p role="alert">{error}</p>}
      {preview && <>
        <div className="transparent-image-preview"><img src={preview} alt="Prévia do produto com fundo transparente" /></div>
        <div className="background-removal-actions">
          <button type="button" className="btn btn-primary" disabled={working || disabled} onClick={() => void apply()}>Usar imagem sem fundo</button>
          <button type="button" className="btn btn-secondary" disabled={working || disabled} onClick={() => setResult(null)}>Descartar teste</button>
        </div>
        <small>Depois de aplicar, salve a oferta para atualizar a TV.</small>
      </>}
    </section>
  );
}
