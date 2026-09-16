import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  Film,
  LogOut,
  Package,
  Palette,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
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
  deleteComposition,
  deleteMedia,
  deleteOffer,
  getErrorMessage,
  loadSectorTheme,
  loadTvContent,
  runStorageDiagnostic,
  signOut,
  subscribeToTvContent,
  updateCompositionsOrder,
  upsertComposition,
  upsertMedia,
  upsertOffer,
  upsertSectorTheme,
} from "../supabase";
import type { Offer, SolTvMedia, TvContent } from "../types";
import type { OfferComposition } from "../offers/compositions";
import { TvPlayer } from "../components/TvPlayer";
import { ProductImage } from "../components/OfferSlide";
import { MediaManager } from "../components/MediaManager";
import { CompositionManager } from "../components/admin/compositions/CompositionManager";
import { normalTheme } from "../themes/normal";
import { blackFridayTheme } from "../themes/blackFriday";
import { getSectorThemeSlug, setSectorThemeSlug } from "../themes/resolveTheme";
import type { MotionConfig } from "../motion/types";
import { loadActiveMotionConfig, subscribeToActiveMotionConfig } from "../motion/storage";

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
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [tvThemeSlug, setTvThemeSlug] = useState<"normal" | "black-friday">(() =>
    (getSectorThemeSlug(sector) as "normal" | "black-friday") || "normal",
  );
  const [motionConfig, setMotionConfig] = useState<MotionConfig>(() =>
    loadActiveMotionConfig(),
  );

  const [content, setContent] = useState<TvContent>(() => cachedContent(sector));
  const [connection, setConnection] = useState<"online" | "syncing" | "offline">(
    databaseConfigured ? "syncing" : "offline",
  );
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [draft, setDraft] = useState<Offer>(() => newOffer(sector));
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [resetting, setResetting] = useState(false);
  const [productSearch, setProductSearch] = useState("");
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

  async function handleSelectTheme(slug: "normal" | "black-friday") {
    setTvThemeSlug(slug);
    setSectorThemeSlug(sector, slug);
    try {
      await upsertSectorTheme(sector, slug);
      setNotice(
        slug === "black-friday"
          ? "Tema Black Friday aplicado à TV."
          : "Tema Normal aplicado à TV.",
      );
    } catch (err) {
      console.error("Erro ao persistir tema no Supabase:", err);
      setNotice(
        slug === "black-friday"
          ? "Tema Black Friday aplicado localmente."
          : "Tema Normal aplicado localmente.",
      );
    }
  }

  useEffect(() => {
    setContent(cachedContent(sector));
    setDraft(newOffer(sector));
    setTvThemeSlug(
      (getSectorThemeSlug(sector) as "normal" | "black-friday") || "normal",
    );

    if (!databaseConfigured) return;

    void runStorageDiagnostic();

    loadTvContent(sector)
      .then((data) => {
        setContent(data);
        setConnection("online");
        setLastSync(new Date());
      })
      .catch(() => setConnection("offline"));

    void loadSectorTheme(sector).then((slug) => {
      if (slug === "normal" || slug === "black-friday") {
        setTvThemeSlug(slug);
      }
    });

    const unsubscribeMotion = subscribeToActiveMotionConfig((newConfig) => {
      setMotionConfig(newConfig);
    });

    const unsubscribeContent = subscribeToTvContent(
      sector,
      (data) => {
        setContent(data);
        setLastSync(new Date());
      },
      setConnection,
    );

    return () => {
      unsubscribeMotion();
      unsubscribeContent();
    };
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
      setContent(
        contentFromData({
          sector,
          offers: content.offers,
          media: updatedMedia,
          compositions: content.compositions,
        }),
      );
      setConnection("online");
      setLastSync(new Date());
      setError("");
    } catch (err: unknown) {
      const errObj = err && typeof err === "object" ? (err as Record<string, unknown>) : {};
      const msg = err instanceof Error ? err.message : String(err);

      console.error("Erro detalhado ao salvar mídia no Supabase:", {
        code: errObj.code,
        message: errObj.message || msg,
        details: errObj.details,
        hint: errObj.hint,
        status: errObj.status,
      });

      setConnection("offline");
      setError(`Erro ao salvar mídia: ${msg}`);
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
      setContent(
        contentFromData({
          sector,
          offers: content.offers,
          media: updatedMedia,
          compositions: content.compositions,
        }),
      );
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

  async function handleToggleActiveMedia(id: string, active: boolean) {
    if (!databaseConfigured) {
      setError("Banco não configurado.");
      return;
    }
    const target = content.media.find((m) => m.id === id);
    if (!target) return;

    const isVideo = target.type === "video";
    const toastMsg = active
      ? isVideo
        ? "Vídeo exibido na TV"
        : "Imagem exibida na TV"
      : isVideo
        ? "Vídeo ocultado da TV"
        : "Imagem ocultada da TV";

    const updatedItem = { ...target, active };
    const updatedMedia = content.media.map((m) =>
      m.id === id ? updatedItem : m,
    );

    setContent(
      contentFromData({
        sector,
        offers: content.offers,
        media: updatedMedia,
        compositions: content.compositions,
      }),
    );
    setConnection("syncing");

    try {
      await upsertMedia(updatedItem);
      setConnection("online");
      setLastSync(new Date());
      setNotice(toastMsg);
      setError("");
    } catch (err: unknown) {
      console.error("Erro ao alterar visibilidade da mídia:", err);
      setConnection("offline");
      setError("Não foi possível atualizar a mídia no banco.");
    }
  }

  async function handleSaveComposition(composition: OfferComposition) {
    if (!databaseConfigured) {
      setError("Banco de dados não configurado.");
      return;
    }
    setConnection("syncing");
    try {
      await upsertComposition(composition);
      const updatedComps = content.compositions.some((c) => c.id === composition.id)
        ? content.compositions.map((c) => (c.id === composition.id ? composition : c))
        : [...content.compositions, composition];
      setContent(
        contentFromData({
          sector,
          offers: content.offers,
          media: content.media,
          compositions: updatedComps,
        }),
      );
      setConnection("online");
      setLastSync(new Date());
      setNotice("Camada de ofertas salva com sucesso.");
      setError("");
    } catch (err: unknown) {
      console.error("[SKALEE CAMADAS] erro completo ao salvar:", err);
      console.error("[SKALEE CAMADAS] erro normalizado:", getErrorMessage(err));
      setConnection("offline");
      setError(`Erro ao salvar camada: ${getErrorMessage(err)}`);
      throw err;
    }
  }

  async function handleDeleteComposition(id: string) {
    if (!databaseConfigured) {
      setError("Banco de dados não configurado.");
      return;
    }
    setConnection("syncing");
    try {
      await deleteComposition(id);
      const updatedComps = content.compositions.filter((c) => c.id !== id);
      setContent(
        contentFromData({
          sector,
          offers: content.offers,
          media: content.media,
          compositions: updatedComps,
        }),
      );
      setConnection("online");
      setLastSync(new Date());
      setNotice("Camada de ofertas excluída com sucesso.");
      setError("");
    } catch (err: unknown) {
      console.error("[SKALEE CAMADAS] erro completo ao excluir:", err);
      console.error("[SKALEE CAMADAS] erro normalizado:", getErrorMessage(err));
      setConnection("offline");
      setError(`Erro ao excluir camada: ${getErrorMessage(err)}`);
      throw err;
    }
  }

  async function handleReorderCompositions(reordered: OfferComposition[]) {
    if (!databaseConfigured) {
      setError("Banco de dados não configurado.");
      return;
    }
    setConnection("syncing");
    try {
      await updateCompositionsOrder(reordered);
      setContent(
        contentFromData({
          sector,
          offers: content.offers,
          media: content.media,
          compositions: reordered,
        }),
      );
      setConnection("online");
      setLastSync(new Date());
      setNotice("Ordem das camadas atualizada com sucesso.");
      setError("");
    } catch (err: unknown) {
      console.error("[SKALEE CAMADAS] erro completo ao reordenar:", err);
      console.error("[SKALEE CAMADAS] erro normalizado:", getErrorMessage(err));
      setConnection("offline");
      setError(`Erro ao reordenar camadas: ${getErrorMessage(err)}`);
      throw err;
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

    setContent(
      contentFromData({
        sector,
        offers,
        media: content.media,
        compositions: content.compositions,
      }),
    );
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

    const safeDuration =
      Number.isFinite(draft.duration) && draft.duration >= 3 && draft.duration <= 60
        ? draft.duration
        : 8;

    const offer: Offer = {
      ...draft,
      sector,
      name: draft.name.trim(),
      promotionalPrice: price.toFixed(2).replace(".", ","),
      regularPrice: regular?.toFixed(2).replace(".", ","),
      duration: safeDuration,
      layout: draft.layout || "single",
    };

    const nextOffers = editing
      ? content.offers.map((o) => (o.id === offer.id ? offer : o))
      : [...content.offers, offer];

    if (
      commit(
        nextOffers,
        editing ? "Produto atualizado com sucesso." : "Produto cadastrado no catálogo.",
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
    if (commit(nextOffers, "Produto removido.")) {
      if (draft.id === offerId) setDraft(newOffer(sector));
    }
  }

  function toggleOfferActive(id: string, active: boolean) {
    const nextOffers = content.offers.map((o) =>
      o.id === id ? { ...o, active } : o,
    );
    const msg = active ? "Produto ativado no catálogo" : "Produto desativado do catálogo";
    commit(nextOffers, msg);
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
        <div className="admin-tabs admin-tabs-2">
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === "offers" ? "active" : ""}`}
            onClick={() => setActiveTab("offers")}
          >
            <Package size={14} /> Ofertas ({content.offers.length})
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === "media" ? "active" : ""}`}
            onClick={() => setActiveTab("media")}
          >
            <Film size={14} /> Mídias ({content.media.length})
          </button>
        </div>

        {/* Ofertas Tab (Camadas da TV + Catálogo de Ofertas) */}
        {activeTab === "offers" && (
          <>
            {/* SEÇÃO 1: CAMADAS DA TV */}
            <div className="admin-camadas-section">
              <CompositionManager
                sector={sector}
                sectorLabel={currentSectorLabel}
                offers={content.offers}
                media={content.media}
                compositions={content.compositions}
                hidePreview={true}
                onSaveComposition={handleSaveComposition}
                onDeleteComposition={handleDeleteComposition}
                onReorderCompositions={handleReorderCompositions}
              />
            </div>

            {/* SEÇÃO 2: CATÁLOGO DE OFERTAS */}
            <section className="card admin-catalog-section">
              <div className="section-heading">
                <h2>Catálogo de Ofertas ({currentSectorLabel})</h2>
                <span>{content.offers.length} ofertas</span>
              </div>

              <div className="catalog-toolbar" style={{ display: "flex", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
                <input
                  type="search"
                  className="search-input"
                  placeholder="Buscar oferta no catálogo..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  style={{ flex: 1, minWidth: "160px" }}
                />
                <button
                  type="button"
                  className="btn btn-primary action-btn-compact"
                  onClick={() => {
                    setDraft(newOffer(sector));
                    setShowOfferForm(true);
                    setTimeout(() => {
                      form.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                      document.getElementById("name")?.focus();
                    }, 50);
                  }}
                >
                  <Plus size={15} />
                  + Nova oferta
                </button>
              </div>

              {/* Form de Cadastro / Edição de Oferta */}
              {(showOfferForm || editing) && (
                <form className="card offer-form-nested" ref={form} onSubmit={submit} style={{ marginBottom: "16px", background: "#11141a" }}>
                  <div className="section-heading" style={{ marginBottom: "10px" }}>
                    <h3 style={{ margin: 0, fontSize: "14px" }}>{editing ? "Editar Oferta" : "Cadastrar Nova Oferta"}</h3>
                  </div>
                  <label htmlFor="name">Nome da oferta / produto</label>
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
                      <label htmlFor="price">Preço promocional</label>
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
                  </div>
                  <label htmlFor="image">Imagem da oferta (URL)</label>
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
                        <label htmlFor="start">Início da vigência</label>
                        <input
                          id="start"
                          type="date"
                          required
                          value={draft.startsAt}
                          onChange={(e) => field("startsAt", e.target.value)}
                        />
                      </div>
                      <div>
                        <label htmlFor="end">Término da vigência</label>
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
                      Oferta ativa no catálogo
                    </label>
                  </details>
                  <div className="row" style={{ marginTop: "12px" }}>
                    <button className="btn btn-primary submit">
                      {editing ? "Salvar alterações" : "Cadastrar oferta"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary submit"
                      onClick={() => {
                        setDraft(newOffer(sector));
                        setShowOfferForm(false);
                        setError("");
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              <div className="offers">
                {content.offers.length === 0 && (
                  <p className="hint">
                    Nenhuma oferta cadastrada no setor {currentSectorLabel}.
                  </p>
                )}
                {content.offers.length > 0 &&
                  content.offers.filter((o) =>
                    o.name.toLowerCase().includes(productSearch.toLowerCase().trim()),
                  ).length === 0 && (
                    <p className="hint">
                      Nenhuma oferta encontrada para "{productSearch}".
                    </p>
                  )}
                {content.offers
                  .filter((o) =>
                    o.name.toLowerCase().includes(productSearch.toLowerCase().trim()),
                  )
                  .map((o, i, filteredArr) => (
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
                            R$ {o.promotionalPrice}/{o.unit}
                            {o.regularPrice ? ` · De: R$ ${o.regularPrice}` : ""}
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
                            aria-label={`Ativar ${o.name}`}
                          />{" "}
                          Ativo
                        </label>
                        <div className="icon-actions">
                          <button
                            type="button"
                            className="mini-btn"
                            aria-label={`Subir ${o.name}`}
                            disabled={i === 0 || productSearch.trim().length > 0}
                            onClick={() => moveOffer(content.offers.indexOf(o), -1)}
                          >
                            <ArrowUp size={15} />
                          </button>
                          <button
                            type="button"
                            className="mini-btn"
                            aria-label={`Descer ${o.name}`}
                            disabled={i === filteredArr.length - 1 || productSearch.trim().length > 0}
                            onClick={() => moveOffer(content.offers.indexOf(o), 1)}
                          >
                            <ArrowDown size={15} />
                          </button>
                          <button
                            type="button"
                            className="mini-btn"
                            aria-label={`Editar ${o.name}`}
                            onClick={() => {
                              setDraft({ ...o });
                              setShowOfferForm(true);
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
            onToggleActiveMedia={handleToggleActiveMedia}
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
                  setShowOfferForm(false);
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
          theme={tvThemeSlug === "black-friday" ? blackFridayTheme : normalTheme}
          motionConfig={motionConfig}
        />

        {/* Controle Global do Tema da TV */}
        <section className="card admin-theme-card">
          <div className="section-heading">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Palette size={18} style={{ color: "var(--accent)" }} />
              <div>
                <h2 style={{ margin: 0, fontSize: "15px" }}>
                  TEMA DA TV — {currentSectorLabel}
                </h2>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--muted)" }}>
                  Aparência visual aplicada globalmente à programação deste setor.
                </p>
              </div>
            </div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: "700",
                padding: "4px 10px",
                borderRadius: "8px",
                background: tvThemeSlug === "black-friday" ? "rgba(255, 92, 92, 0.15)" : "rgba(242, 201, 76, 0.15)",
                color: tvThemeSlug === "black-friday" ? "#ff7b72" : "var(--accent)",
                border: `1px solid ${tvThemeSlug === "black-friday" ? "rgba(255, 92, 92, 0.3)" : "rgba(242, 201, 76, 0.3)"}`,
              }}
            >
              Tema ativo: <strong>{tvThemeSlug === "black-friday" ? "Black Friday" : "Normal"}</strong>
            </span>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "14px", flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              className={`btn ${tvThemeSlug === "normal" ? "btn-primary" : "btn-secondary"}`}
              style={{ width: "auto", minWidth: "150px" }}
              onClick={() => void handleSelectTheme("normal")}
            >
              Tema Normal
            </button>
            <button
              type="button"
              className={`btn ${tvThemeSlug === "black-friday" ? "btn-primary" : "btn-secondary"}`}
              style={{ width: "auto", minWidth: "150px" }}
              onClick={() => void handleSelectTheme("black-friday")}
            >
              Black Friday
            </button>
          </div>
        </section>

        {/* Skalee Motion Studio Highlighted Card */}
        <section className="card admin-motion-studio-card">
          <div className="studio-card-content">
            <div className="studio-card-icon">🎬</div>
            <div className="studio-card-body">
              <h2>Skalee Motion Studio</h2>
              <p>Crie, teste e salve a identidade visual das TVs.</p>
            </div>
          </div>
          <Link to="/studio/motion" className="btn btn-primary studio-launch-btn">
            Abrir Motion Studio ↗
          </Link>
        </section>

        <div className="info-card">
          <span>☼</span>
          <div>
            <strong>Programação da TV — {currentSectorLabel}</strong>
            <p>
              Camadas de ofertas, imagens institucionais e vídeos promocionais. A TV reproduz todos os conteúdos de forma automática e contínua.
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
