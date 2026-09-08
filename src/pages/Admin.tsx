import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUp, Film, LogOut, Package, Pencil, Plus, Trash2 } from "lucide-react";
import {
  demoContent,
  contentFromData,
  isEligible,
  newOffer,
  SECTORS,
} from "../data";
import {
  databaseConfigured,
  cachedContent,
  deleteMedia,
  deleteOffer,
  loadTvContent,
  runStorageDiagnostic,
  signOut,
  subscribeToTvContent,
  upsertMedia,
  upsertOffer,
} from "../supabase";
import type { Offer, SolTvMedia, TvContent } from "../types";
import { TvPlayer } from "../components/TvPlayer";
import { ProductImage } from "../components/OfferSlide";
import { MediaManager } from "../components/MediaManager";

const priceValue = (value: string) =>
  Number(
    value
      .trim()
      .replace(/\.(?=\d{3}(?:\D|$))/g, "")
      .replace(",", "."),
  );

const validUrl = (value: string) => {
  try {
    return ["https:", "http:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

export default function Admin() {
  const navigate = useNavigate();
  const [sector, setSector] = useState("acougue");
  const [activeTab, setActiveTab] = useState<"offers" | "media">("offers");

  const [content, setContent] = useState<TvContent>(() => cachedContent(sector));
  const [connection, setConnection] = useState<"online" | "syncing" | "offline">(
    databaseConfigured ? "syncing" : "offline",
  );
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [draft, setDraft] = useState<Offer>(() => newOffer(sector));
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [resetting, setResetting] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const editing = content.offers.some((o) => o.id === draft.id);

  async function handleLogout() {
    try {
      await signOut();
    } catch (err) {
      console.error("Erro ao encerrar sessão:", err);
    } finally {
      navigate("/login", { replace: true });
    }
  }

  useEffect(() => {
    setContent(cachedContent(sector));
    setDraft(newOffer(sector));

    if (!databaseConfigured) return;

    void runStorageDiagnostic();

    loadTvContent(sector)
      .then((data) => {
        setContent(data);
        setConnection("online");
        setLastSync(new Date());
      })
      .catch(() => setConnection("offline"));

    return subscribeToTvContent(
      sector,
      (data) => {
        setContent(data);
        setLastSync(new Date());
      },
      setConnection,
    );
  }, [sector]);

  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(""), 4000);
      return () => clearTimeout(t);
    }
  }, [notice]);

  async function handleSaveMedia(media: SolTvMedia) {
    if (!databaseConfigured) {
      setError("Banco não configurado.");
      return;
    }
    setConnection("syncing");
    try {
      await upsertMedia(media);
      const updatedMedia = content.media.some((m) => m.id === media.id)
        ? content.media.map((m) => (m.id === media.id ? media : m))
        : [...content.media, media];
      setContent(contentFromData({ sector, offers: content.offers, media: updatedMedia }));
      setConnection("online");
      setLastSync(new Date());
      setError("");
    } catch (err: unknown) {
      console.error("Erro ao salvar mídia:", err);
      setConnection("offline");
      setError("Não foi possível salvar a mídia no banco.");
      throw err;
    }
  }

  async function handleDeleteMedia(id: string, storagePath?: string) {
    if (!databaseConfigured) {
      setError("Banco não configurado.");
      return;
    }
    setConnection("syncing");
    try {
      await deleteMedia(id, storagePath);
      const updatedMedia = content.media.filter((m) => m.id !== id);
      setContent(contentFromData({ sector, offers: content.offers, media: updatedMedia }));
      setConnection("online");
      setLastSync(new Date());
      setNotice("Mídia removida com sucesso.");
      setError("");
    } catch (err: unknown) {
      console.error("Erro ao excluir mídia:", err);
      setConnection("offline");
      setError("Não foi possível excluir a mídia no banco.");
    }
  }

  function commit(
    nextOffers: Offer[],
    message = "Alteração salva no banco de dados.",
  ) {
    if (!databaseConfigured) {
      setError("Banco não configurado. Não foi feita uma gravação local.");
      return false;
    }

    const offers = nextOffers.map((offer, index) => ({
      ...offer,
      displayOrder: index,
    }));

    const removed = content.offers.filter(
      (offer) => !offers.some((nextOffer) => nextOffer.id === offer.id),
    );

    setContent(contentFromData({ sector, offers, media: content.media }));
    setConnection("syncing");

    void Promise.all([
      ...offers.map((offer) => upsertOffer(offer)),
      ...removed.map((offer) => deleteOffer(offer.id)),
    ])
      .then(() => {
        setConnection("online");
        setLastSync(new Date());
        setNotice(message);
        setError("");
      })
      .catch((err: unknown) => {
        console.error("Erro Supabase ao salvar oferta:", err);
        if (err && typeof err === "object") {
          const { code, message, details, hint } = err as {
            code?: string;
            message?: string;
            details?: string;
            hint?: string;
          };
          if (code || message || details || hint) {
            console.error("Detalhes do erro Supabase:", {
              code,
              message,
              details,
              hint,
            });
          }
        }
        setConnection("offline");
        setError("Não foi possível salvar no banco. A TV manteve o último cache válido.");
      });

    return true;
  }

  const field = (key: keyof Offer, value: string | number | boolean) =>
    setDraft((d) => ({ ...d, [key]: value }));

  function submit(event: FormEvent) {
    event.preventDefault();
    const price = priceValue(draft.promotionalPrice);
    const regular = draft.regularPrice
      ? priceValue(draft.regularPrice)
      : undefined;

    if (
      !draft.name.trim() ||
      !Number.isFinite(price) ||
      price <= 0 ||
      price > 99999.99
    ) {
      return setError(
        "Informe o produto e um preço de oferta entre R$ 0,01 e R$ 99.999,99.",
      );
    }

    if (
      regular !== undefined &&
      (!Number.isFinite(regular) || regular <= price)
    ) {
      return setError("O preço normal deve ser maior que o preço da oferta.");
    }

    if (!validUrl(draft.image) || (draft.video && !validUrl(draft.video))) {
      return setError(
        "Use uma URL http ou https válida para a imagem e o vídeo.",
      );
    }

    if (!draft.startsAt || !draft.endsAt || draft.endsAt < draft.startsAt) {
      return setError(
        "A data de término deve ser igual ou posterior à data de início.",
      );
    }

    if (
      !Number.isFinite(draft.duration) ||
      draft.duration < 3 ||
      draft.duration > 60
    ) {
      return setError("A duração deve estar entre 3 e 60 segundos.");
    }

    const offer: Offer = {
      ...draft,
      sector,
      name: draft.name.trim(),
      promotionalPrice: price.toFixed(2).replace(".", ","),
      regularPrice: regular?.toFixed(2).replace(".", ","),
    };

    const nextOffers = editing
      ? content.offers.map((o) => (o.id === offer.id ? offer : o))
      : [...content.offers, offer];

    if (
      commit(
        nextOffers,
        editing ? "Oferta atualizada." : "Oferta adicionada à playlist.",
      )
    ) {
      setDraft(newOffer(sector));
    }
  }

  function moveOffer(index: number, direction: number) {
    const nextOffers = [...content.offers];
    const target = index + direction;
    if (target < 0 || target >= nextOffers.length) return;
    [nextOffers[index], nextOffers[target]] = [nextOffers[target], nextOffers[index]];
    commit(nextOffers);
  }

  function removeOffer(offerId: string) {
    const nextOffers = content.offers.filter((o) => o.id !== offerId);
    if (commit(nextOffers, "Item removido.")) {
      if (draft.id === offerId) setDraft(newOffer(sector));
    }
  }

  function updateOfferLayout(id: string, layout: "single" | "pair" | "grid") {
    const nextOffers = content.offers.map((o) =>
      o.id === id ? { ...o, layout } : o,
    );
    commit(nextOffers);
  }

  function toggleOfferActive(id: string, active: boolean) {
    const nextOffers = content.offers.map((o) =>
      o.id === id ? { ...o, active } : o,
    );
    commit(nextOffers);
  }

  const currentSectorLabel =
    SECTORS.find((s) => s.id === sector)?.label || sector.toUpperCase();

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-badge">SOL</div>
          <div>
            <h1>SOL TV</h1>
            <p>Painel de Gestão</p>
          </div>
          <div className="brand-actions">
            <button
              type="button"
              className="logout-btn"
              title="Encerrar sessão"
              onClick={handleLogout}
            >
              <LogOut size={13} /> Sair
            </button>
          </div>
        </div>

        {/* Sector Selector */}
        <div className="sector-selector-card">
          <label htmlFor="admin-sector-select">Setor / Ponto de Exibição</label>
          <select
            id="admin-sector-select"
            className="sector-select"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
          >
            {SECTORS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="admin-tabs">
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === "offers" ? "active" : ""}`}
            onClick={() => setActiveTab("offers")}
          >
            <Package size={15} /> Ofertas ({content.offers.length})
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === "media" ? "active" : ""}`}
            onClick={() => setActiveTab("media")}
          >
            <Film size={15} /> Mídia TV ({content.media.length})
          </button>
        </div>

        {/* Offers Tab */}
        {activeTab === "offers" && (
          <>
            <form className="card" ref={form} onSubmit={submit}>
              <h2>{editing ? "Editar oferta" : "Cadastrar oferta"}</h2>
              <label htmlFor="name">Produto</label>
              <input
                id="name"
                required
                maxLength={65}
                value={draft.name}
                onChange={(e) => field("name", e.target.value)}
                placeholder="Ex.: Picanha bovina"
              />
              <div className="row">
                <div>
                  <label htmlFor="regularPrice">Preço normal</label>
                  <input
                    id="regularPrice"
                    inputMode="decimal"
                    value={draft.regularPrice || ""}
                    onChange={(e) => field("regularPrice", e.target.value)}
                    placeholder="59,90"
                  />
                </div>
                <div>
                  <label htmlFor="price">Preço da oferta</label>
                  <input
                    id="price"
                    required
                    inputMode="decimal"
                    value={draft.promotionalPrice}
                    onChange={(e) => field("promotionalPrice", e.target.value)}
                    placeholder="44,99"
                  />
                </div>
              </div>
              <div className="row">
                <div>
                  <label htmlFor="unit">Unidade</label>
                  <select
                    id="unit"
                    value={draft.unit}
                    onChange={(e) => field("unit", e.target.value)}
                  >
                    {["kg", "un", "bandeja", "peça", "pct"].map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="duration">Duração (segundos)</label>
                  <input
                    id="duration"
                    type="number"
                    min="3"
                    max="60"
                    required
                    value={draft.duration}
                    onChange={(e) => field("duration", Number(e.target.value))}
                  />
                </div>
              </div>
              <label htmlFor="image">Imagem da oferta</label>
              <input
                id="image"
                type="url"
                required
                value={draft.image}
                onChange={(e) => field("image", e.target.value)}
                placeholder="Cole uma URL de imagem"
              />
              <details>
                <summary>Agendamento e vídeo da oferta</summary>
                <div className="row">
                  <div>
                    <label htmlFor="start">Início</label>
                    <input
                      id="start"
                      type="date"
                      required
                      value={draft.startsAt}
                      onChange={(e) => field("startsAt", e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="end">Término</label>
                    <input
                      id="end"
                      type="date"
                      required
                      value={draft.endsAt}
                      onChange={(e) => field("endsAt", e.target.value)}
                    />
                  </div>
                </div>
                <label htmlFor="video">URL do vídeo (opcional)</label>
                <input
                  id="video"
                  type="url"
                  value={draft.video || ""}
                  onChange={(e) => field("video", e.target.value)}
                  placeholder="https://…/video.mp4"
                />
                <label className="check">
                  <input
                    type="checkbox"
                    checked={draft.active}
                    onChange={(e) => field("active", e.target.checked)}
                  />{" "}
                  Oferta ativa
                </label>
              </details>
              <button className="btn btn-primary submit">
                {editing ? "Salvar oferta" : "Adicionar à playlist"}
              </button>
              {editing && (
                <button
                  type="button"
                  className="btn btn-secondary submit"
                  onClick={() => {
                    setDraft(newOffer(sector));
                    setError("");
                  }}
                >
                  Cancelar edição
                </button>
              )}
            </form>

            <section className="card">
              <div className="section-heading">
                <h2>Ofertas em Exibição</h2>
                <span>{content.offers.length} ofertas</span>
              </div>
              <div className="offers">
                {content.offers.length === 0 && (
                  <p className="hint">
                    Nenhuma oferta cadastrada no setor {currentSectorLabel}.
                  </p>
                )}
                {content.offers.map((o, i) => (
                  <article className="playlist-entry" key={o.id}>
                    <div className="offer-item">
                      <ProductImage
                        src={o.image}
                        name={o.name}
                        className="offer-thumb"
                      />
                      <div className="offer-info">
                        <strong>{o.name}</strong>
                        <span>
                          R$ {o.promotionalPrice}/{o.unit} · {o.duration}s
                        </span>
                        {!isEligible(o) && (
                          <small className="scheduled">
                            {o.active ? "Fora do período" : "Oferta inativa"}
                          </small>
                        )}
                      </div>
                    </div>
                    <div className="playlist-controls">
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={o.active}
                          onChange={(e) => toggleOfferActive(o.id, e.target.checked)}
                          aria-label={`Exibir ${o.name}`}
                        />{" "}
                        Exibir
                      </label>
                      <div className="icon-actions">
                        <button
                          type="button"
                          className="mini-btn"
                          aria-label={`Subir ${o.name}`}
                          disabled={i === 0}
                          onClick={() => moveOffer(i, -1)}
                        >
                          <ArrowUp size={15} />
                        </button>
                        <button
                          type="button"
                          className="mini-btn"
                          aria-label={`Descer ${o.name}`}
                          disabled={i === content.offers.length - 1}
                          onClick={() => moveOffer(i, 1)}
                        >
                          <ArrowDown size={15} />
                        </button>
                        <button
                          type="button"
                          className="mini-btn"
                          aria-label={`Editar ${o.name}`}
                          onClick={() => {
                            setDraft({ ...o });
                            setError("");
                            form.current?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                            document.getElementById("name")?.focus();
                          }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="mini-btn danger"
                          aria-label={`Excluir ${o.name}`}
                          onClick={() => removeOffer(o.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    <select
                      className="layout-select"
                      aria-label={`Layout de ${o.name}`}
                      value={o.layout}
                      onChange={(e) =>
                        updateOfferLayout(
                          o.id,
                          e.target.value as "single" | "pair" | "grid",
                        )
                      }
                    >
                      <option value="single">Uma oferta</option>
                      <option value="pair">Duas ofertas</option>
                      <option value="grid">Grade de quatro</option>
                    </select>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Media Tab */}
        {activeTab === "media" && (
          <MediaManager
            mediaList={content.media}
            currentSector={sector}
            onSaveMedia={handleSaveMedia}
            onDeleteMedia={handleDeleteMedia}
          />
        )}

        {/* Restore Demo */}
        {resetting ? (
          <div className="card">
            <p>Substituir a programação do setor pelas mídias de demonstração?</p>
            <div className="row">
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  const demo = demoContent(sector);
                  commit(demo.offers, "Demonstração restaurada.");
                  setDraft(newOffer(sector));
                  setResetting(false);
                }}
              >
                Restaurar
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setResetting(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-danger"
            style={{ marginTop: "12px" }}
            onClick={() => setResetting(true)}
          >
            Restaurar demonstração
          </button>
        )}
      </aside>

      {/* Main TV Preview */}
      <main className="main">
        <div className="workspace-heading">
          <span className="status-label">
            ● {connection === "online" ? "Online" : connection === "syncing" ? "Sincronizando..." : "Offline"}
          </span>
          <small>
            {lastSync
              ? `Última sincronização: ${lastSync.toLocaleTimeString("pt-BR")}`
              : "Aguardando sincronização"}
          </small>
          <a
            href={`/tv/${sector}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary open-tv-btn"
          >
            Abrir TV ({currentSectorLabel}) ↗
          </a>
        </div>

        <TvPlayer
          content={content}
          mode="preview"
          lastSync={lastSync}
          connection={connection}
          sectorLabel={currentSectorLabel}
        />

        <div className="info-card">
          <span>☼</span>
          <div>
            <strong>Playlist Unificada do Setor {currentSectorLabel}</strong>
            <p>
              Adicione ofertas de produtos, imagens institucionais ou vídeos promocionais. A TV reproduz todos os conteúdos de forma automática e contínua.
            </p>
          </div>
        </div>
      </main>

      {notice && (
        <div className="toast" role="status">
          ✓ {notice}
        </div>
      )}
      {error && (
        <div className="toast error" role="alert">
          {error}
          <button
            type="button"
            aria-label="Fechar aviso"
            onClick={() => setError("")}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
