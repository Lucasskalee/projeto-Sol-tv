import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Upload, Film, Image as ImageIcon, CheckCircle, AlertCircle } from "lucide-react";
import { uploadMediaFile } from "../supabase";

export type UploadResult = {
  publicUrl: string;
  storagePath: string;
  type: "image" | "video";
};

export function MediaUpload({
  sector = "acougue",
  onUploadSuccess,
  onError,
}: {
  sector?: string;
  onUploadSuccess: (result: UploadResult) => void;
  onError?: (err: string) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>("");
  const [lastUploaded, setLastUploaded] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleProcessFile(file: File) {
    if (uploading) return;

    const isVideo = file.type.startsWith("video/") || file.name.toLowerCase().endsWith(".mp4");
    const isImage =
      file.type.startsWith("image/") ||
      /\.(jpg|jpeg|png|webp)$/i.test(file.name);

    if (!isVideo && !isImage) {
      const msg = "Formato não suportado. Envie imagens (.jpg, .png, .webp) ou vídeos (.mp4).";
      if (onError) onError(msg);
      return;
    }

    const maxBytes = isVideo ? 60 * 1024 * 1024 : 15 * 1024 * 1024;
    if (file.size > maxBytes) {
      const msg = `Arquivo muito grande. Limite máximo: ${isVideo ? "60MB para vídeo" : "15MB para imagem"}.`;
      if (onError) onError(msg);
      return;
    }

    try {
      setUploading(true);
      setProgressStatus(`Enviando ${isVideo ? "vídeo" : "imagem"} (${(file.size / (1024 * 1024)).toFixed(1)}MB)...`);
      const result = await uploadMediaFile(file, sector);
      setLastUploaded(file.name);
      setProgressStatus("Upload concluído!");
      onUploadSuccess(result);
    } catch (err: unknown) {
      console.error("Erro durante o upload:", err);
      const msg =
        err instanceof Error
          ? err.message
          : "Erro ao enviar arquivo para o Supabase Storage.";
      if (onError) onError(msg);
      setProgressStatus("");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      void handleProcessFile(file);
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!uploading) setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleProcessFile(file);
    }
  }

  return (
    <div
      className={`media-upload-dropzone ${isDragging ? "dragging" : ""} ${
        uploading ? "uploading" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        id="media-file-input"
        className="sr-only"
        accept="image/jpeg,image/png,image/webp,video/mp4"
        onChange={handleFileChange}
        disabled={uploading}
      />

      <div className="upload-content">
        <div className="upload-icons">
          <ImageIcon size={22} className="upload-icon-img" />
          <Upload size={28} className="upload-icon-main" />
          <Film size={22} className="upload-icon-vid" />
        </div>

        {uploading ? (
          <div className="upload-status">
            <div className="upload-spinner" />
            <p className="upload-msg">{progressStatus}</p>
          </div>
        ) : lastUploaded ? (
          <div className="upload-status success">
            <CheckCircle size={18} />
            <p className="upload-msg">Pronto: {lastUploaded}</p>
            <button
              type="button"
              className="btn btn-secondary upload-btn mini"
              onClick={() => fileInputRef.current?.click()}
            >
              Trocar arquivo
            </button>
          </div>
        ) : (
          <div className="upload-prompt">
            <p className="upload-title">Arraste uma imagem ou vídeo MP4 aqui</p>
            <p className="upload-hint">Formatos: JPG, PNG, WEBP ou MP4</p>
            <button
              type="button"
              className="btn btn-secondary upload-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={14} /> Selecionar arquivo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

