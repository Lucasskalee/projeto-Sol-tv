import { useEffect, useRef, useState } from "react";
import { isEligible, isMediaEligible } from "../data";
import type { TvContent, TvPlaylistItem } from "../types";
import { ImageSlide } from "./ImageSlide";
import { OfferSlide, OpeningSlide } from "./OfferSlide";
import { VideoSlide } from "./VideoSlide";

export type TvPlayerProps = {
  content: TvContent;
  mode?: "tv" | "preview";
  connection?: "online" | "syncing" | "offline";
  lastSync?: Date | null;
  sectorLabel?: string;
};

export function TvPlayer({
  content,
  mode = "tv",
  connection = "online",
  lastSync = null,
  sectorLabel,
}: TvPlayerProps) {
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState("");
  const shell = useRef<HTMLDivElement>(null);
  const preloadedUrlsRef = useRef<Set<string>>(new Set());

  // Filter active and eligible offers and media
  const eligibleOffers = content.offers.filter((o) => isEligible(o));
  const eligibleMedia = content.media.filter((m) => isMediaEligible(m));

  // Filter playlist items whose underlying offer/media is eligible
  const playlist: TvPlaylistItem[] = content.playlist.filter((item) => {
    if (!item.active) return false;
    if (item.kind === "offer") {
      return eligibleOffers.some((o) => o.id === item.offer.id);
    }
    if (item.kind === "image" || item.kind === "video") {
      return eligibleMedia.some((m) => m.id === item.id);
    }
    return true;
  });

  const safeIndex = playlist.length ? index % playlist.length : 0;
  const currentItem = playlist[safeIndex];
  const isVideo = currentItem?.kind === "video";
  const duration = Math.max(2, Number(currentItem?.duration) || 8) * 1000;

  // Preload the next item to prevent black screens (without redundant requests)
  useEffect(() => {
    if (playlist.length <= 1) return;
    const nextIdx = (safeIndex + 1) % playlist.length;
    const nextItem = playlist[nextIdx];
    if (!nextItem) return;

    const urlToPreload =
      nextItem.kind === "image"
        ? nextItem.src
        : nextItem.kind === "offer"
          ? nextItem.offer.image
          : null;

    if (urlToPreload && !preloadedUrlsRef.current.has(urlToPreload)) {
      preloadedUrlsRef.current.add(urlToPreload);
      const img = new Image();
      img.src = urlToPreload;
    }
  }, [safeIndex, playlist]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setElapsed(0);
  }, [currentItem?.id]);

  useEffect(() => {
    if (playlist.length && index >= playlist.length) {
      setIndex((current) => current % playlist.length);
    }
  }, [index, playlist.length]);

  // Timer for non-video slides (or fallback for videos with fixed duration)
  useEffect(() => {
    if (paused || !currentItem || isVideo) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const time = performance.now();
      setElapsed((e) => e + time - last);
      last = time;
    }, 100);
    return () => clearInterval(timer);
  }, [paused, currentItem?.id, isVideo]);

  // Auto-advance for timed items (offers & images)
  useEffect(() => {
    if (isVideo) return;
    if (elapsed >= duration) {
      setIndex((i) => (i + 1) % Math.max(playlist.length, 1));
      setElapsed(0);
    }
  }, [elapsed, duration, playlist.length, isVideo]);

  const advanceNext = () => {
    setIndex((i) => (i + 1) % Math.max(playlist.length, 1));
    setElapsed(0);
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await shell.current?.requestFullscreen();
      }
    } catch {
      setError("Não foi possível alternar o modo tela cheia.");
    }
  };

  useEffect(() => {
    if (mode !== "tv") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") {
        void toggleFullscreen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode]);

  const sectorTitle =
    sectorLabel ||
    (content.sector === "acougue"
      ? "AÇOUGUE"
      : content.sector === "padaria"
        ? "PADARIA"
        : content.sector === "caixas"
          ? "FRENTE DE CAIXAS"
          : content.sector.toUpperCase());

  function renderSlideContent(item: TvPlaylistItem) {
    if (item.kind === "offer") {
      return (
        <OfferSlide
          key={item.id}
          offer={item.offer}
          offers={eligibleOffers}
          layout={item.offer.layout}
          paused={paused}
        />
      );
    }

    if (item.kind === "image") {
      return (
        <ImageSlide
          key={item.id}
          src={item.src}
          title={item.title}
          onError={advanceNext}
        />
      );
    }

    if (item.kind === "video") {
      return (
        <VideoSlide
          key={item.id}
          src={item.src}
          title={item.title}
          paused={paused}
          onEnded={advanceNext}
          onError={advanceNext}
        />
      );
    }

    if (item.kind === "opening") {
      return <OpeningSlide key={item.id} sector={sectorTitle} />;
    }

    return null;
  }

  if (mode === "tv") {
    return (
      <div
        className="tv-shell"
        ref={shell}
        onDoubleClick={toggleFullscreen}
        title="Dê um duplo clique ou pressione F para tela cheia"
      >
        <div className="tv-screen">
          {currentItem ? (
            renderSlideContent(currentItem)
          ) : (
            <div className="empty-state">
              <div>
                <strong>SOL TV</strong>
                <p>Nenhum conteúdo disponível agora para o setor {sectorTitle}.</p>
                <small>A programação será iniciada automaticamente assim que houver conteúdos ativos.</small>
              </div>
            </div>
          )}
        </div>
        <div className="tv-logo">
          SUPERMERCADO SOL • {sectorTitle}
        </div>
        <div
          className="progress"
          style={{
            width: currentItem && !isVideo ? `${Math.min(100, (elapsed / duration) * 100)}%` : 0,
          }}
        />
      </div>
    );
  }

  return (
    <div className="player">
      <div className="topbar">
        <div>
          <h2>Pré-visualização da TV ({sectorTitle})</h2>
          <p>
            Formato 16:9 · {playlist.length} itens na playlist ·{" "}
            {paused ? "Pausado" : "Reprodução automática"}
          </p>
        </div>
        <div className="actions">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!currentItem}
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? "Continuar" : "Pausar"}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!currentItem}
            onClick={advanceNext}
          >
            Próximo item
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={toggleFullscreen}
          >
            Tela cheia
          </button>
        </div>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="tv-shell" ref={shell}>
        <div className="tv-screen">
          {currentItem ? (
            renderSlideContent(currentItem)
          ) : (
            <div className="empty-state">
              <div>
                <strong>SOL TV</strong>
                <p>Nenhum conteúdo disponível agora.</p>
                <small>
                  Cadastre uma oferta ou mídia ativa para este setor.
                </small>
              </div>
            </div>
          )}
        </div>
        <div className="tv-logo">
          SUPERMERCADO SOL • {sectorTitle}
        </div>
        <div
          className="progress"
          style={{
            width: currentItem && !isVideo ? `${Math.min(100, (elapsed / duration) * 100)}%` : 0,
          }}
        />
      </div>
      <div className="player-footer">
        <span>
          {currentItem
            ? `Item ${safeIndex + 1} de ${playlist.length} · ${currentItem.kind.toUpperCase()}${
                currentItem.duration ? ` · ${currentItem.duration}s` : ""
              }`
            : "Playlist vazia"}
        </span>
        <time>
          {lastSync
            ? `Sincronizado ${lastSync.toLocaleTimeString("pt-BR")}`
            : new Date(now).toLocaleTimeString("pt-BR")}
        </time>
      </div>
    </div>
  );
}
