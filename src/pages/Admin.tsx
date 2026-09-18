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
  Tv as TvIcon,
  Upload,
} from "lucide-react";
import {
  createNewProgram,
  duplicateProgram,
  loadStoredPrograms,
  saveStoredPrograms,
  type TvProgram,
} from "../offers/programs";
import { ProgramList } from "../components/admin/programs/ProgramList";
import { ProgramEditor } from "../components/admin/programs/ProgramEditor";
import { ProgramTesterModal } from "../components/admin/programs/ProgramTesterModal";
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
  uploadMediaFile,
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
import { RemoveImageBackground } from "../components/RemoveImageBackground";
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
  if (!value) return false;
  if (value.startsWith("data:image/") || value.startsWith("blob:") || value.startsWith("/")) return true;
  try {
    return ["https:", "http:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

export default function Admin() {
  const navigate = useNavigate();
  const [sector, setSector] = useState("acougue");
  const [activeTab, setActiveTab] = useState<"programs" | "offers" | "media">("programs");
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [tvThemeSlug, setTvThemeSlug] = useState<"normal" | "black-friday">(() =>
    (getSectorThemeSlug(sector) as "normal" | "black-friday") || "normal",
  );
  const [motionConfig, setMotionConfig] = useState<MotionConfig>(() =>
    loadActiveMotionConfig(),
  );

  const [content, setContent] = useState<TvContent>(() => cachedContent(sector));
  const [programs, setPrograms] = useState<TvProgram[]>(() =>
    loadStoredPrograms(sector, cachedContent(sector).offers, cachedContent(sector).media),
  );
  const [editingProgram, setEditingProgram] = useState<TvProgram | null>(null);
  const [testingProgram, setTestingProgram] = useState<TvProgram | null>(null);

  const [connection, setConnection] = useState<"online" | "syncing" | "offline">(
    databaseConfigured ? "syncing" : "offline",
  );
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [draft, setDraft] = useState<Offer>(() => newOffer(sector));
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [resetting, setResetting] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [uploadingOfferImage, setUploadingOfferImage] = useState(false);
  const offerFileInputRef = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const editing = content.offers.some((o) => o.id === draft.id);

  function handleNewProgram() {
    const fresh = createNewProgram(sector, "Loja 03");
    setEditingProgram(fresh);
  }

  function handleEditProgram(prog: TvProgram) {
    setEditingProgram(prog);
  }

  function handleDuplicateProgram(prog: TvProgram) {
    const clone = duplicateProgram(prog);
    const next = [...programs, clone];
    setPrograms(next);
    saveStoredPrograms(sector, next);
    setNotice(`Programação "${clone.name}" duplicada como rascunho.`);
  }

  function handleDeleteProgram(id: string) {
    if (!window.confirm("Deseja realmente excluir esta programação?")) return;
    const next = programs.filter((p) => p.id !== id);
    setPrograms(next);
    saveStoredPrograms(sector, next);
    setNotice("Programação excluída com sucesso.");
  }

  function handleSaveProgram(saved: TvProgram) {
    const exists = programs.some((p) => p.id === saved.id);
    const next = exists
      ? programs.map((p) => (p.id === saved.id ? saved : p))
      : [...programs, saved];
    setPrograms(next);
    saveStoredPrograms(sector, next);
    setEditingProgram(null);
    setNotice(`Programação "${saved.name}" salva com sucesso!`);
  }

  function handleTestProgram(prog: TvProgram) {
    setTestingProgram(prog);
  }

  async function handleOfferFileUpload(file: File) {
    const isImage =
      file.type.startsWith("image/") ||
      /\.(jpg|jpeg|png|webp|svg)$/i.test(file.name);

    if (!isImage) {
      setError("Selecione um arquivo de imagem válido (.png, .jpg, .webp, .svg).");
      return;
    }

    const maxBytes = 15 * 1024 * 1024;
    if (file.size > maxBytes) {
      setError("A imagem deve ter no máximo 15MB.");
      return;
    }

    setUploadingOfferImage(true);
    setError("");

    try {
      if (databaseConfigured) {
        const result = await uploadMediaFile(file, sector);
        field("image", result.publicUrl);
        setNotice(`Imagem "${file.name}" enviada com sucesso!`);
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            field("image", reader.result);
            setNotice(`Imagem "${file.name}" carregada localmente!`);
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err: unknown) {
      console.error("Erro no upload da imagem da oferta:", err);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          field("image", reader.result);
          setNotice(`Imagem "${file.name}" carregada como arquivo.`);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingOfferImage(false);
      if (offerFileInputRef.current) {
        offerFileInputRef.current.value = "";
      }
    }
  }

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
    const fresh = cachedContent(sector);
    setContent(fresh);
    setDraft(newOffer(sector));
    setPrograms(loadStoredPrograms(sector, fresh.offers, fresh.media));
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

    const offersMap = new Map(offers.map((o) => [o.id, o]));
    const updatedComps = content.compositions.map((comp) => ({
      ...comp,
      offers: Object.freeze(
        comp.offers
          .map((o) => offersMap.get(o.id) || o)
          .filter((o): o is Offer => !removed.some((rem) => rem.id === o.id)),
      ),
    }));

    setContent(
      contentFromData({
        sector,
        offers,
        media: content.media,
        compositions: updatedComps,
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
      imageScale:
        typeof draft.imageScale === "number" && draft.imageScale > 0
          ? draft.imageScale
          : 1,
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
        <div className="admin-tabs admin-tabs-3" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "6px" }}>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === "programs" ? "active" : ""}`}
            onClick={() => setActiveTab("programs")}
          >
            <TvIcon size={14} /> Programações ({programs.length})
          </button>
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

        {/* Programações Tab (Visão Geral de Grades e Pastas de Ofertas) */}
        {activeTab === "programs" && (
          <ProgramList
            programs={programs}
            currentSector={sector}
            sectorLabel={currentSectorLabel}
            onNewProgram={handleNewProgram}
            onEditProgram={handleEditProgram}
            onDuplicateProgram={handleDuplicateProgram}
            onTestProgram={handleTestProgram}
            onDeleteProgram={handleDeleteProgram}
          />
        )}

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
                  <label htmlFor="image">Imagem da oferta (Upload de arquivo ou URL)</label>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                    <input
                      id="image"
                      type="text"
                      required
                      value={draft.image}
                      onChange={(e) => field("image", e.target.value)}
                      placeholder="Cole uma URL ou selecione um arquivo do computador..."
                      style={{ flex: 1 }}
                    />
                    <input
                      type="file"
                      ref={offerFileInputRef}
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleOfferFileUpload(file);
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{
                        whiteSpace: "nowrap",
                        padding: "10px 14px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer",
                        background: "#25292f",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                      }}
                      onClick={() => offerFileInputRef.current?.click()}
                      disabled={uploadingOfferImage}
                    >
                      <Upload size={14} />
                      {uploadingOfferImage ? "Enviando..." : "📁 Escolher arquivo"}
                    </button>
                  </div>

                  {draft.image && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "8px 12px",
                        background: "rgba(255, 255, 255, 0.03)",
                        borderRadius: "6px",
                        marginBottom: "12px",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                      }}
                    >
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "4px",
                          background: "rgba(0, 0, 0, 0.3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                        }}
                      >
                        <img
                          src={draft.image}
                          alt="Prévia da oferta"
                          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                          }}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: "12px", color: "#3ddc97", fontWeight: 700, display: "block" }}>
                          ✓ Imagem carregada
                        </span>
                        <small style={{ fontSize: "11px", color: "#9da5b0", overflow: "hidden", textOverflow: "ellipsis", display: "block", whiteSpace: "nowrap" }}>
                          {draft.image.startsWith("data:") ? "Arquivo local (Base64)" : draft.image}
                        </small>
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary mini"
                        style={{ padding: "4px 8px", fontSize: "11px" }}
                        onClick={() => field("image", "")}
                      >
                        Remover
                      </button>
                    </div>
                  )}

                  {draft.image && <RemoveImageBackground key={draft.image} source={draft.image} disabled={uploadingOfferImage} onApply={handleOfferFileUpload} />}
                  {/* Controle Opcional de Tamanho / Zoom da Imagem */}
                  <div
                    style={{
                      marginTop: "10px",
                      marginBottom: "14px",
                      padding: "12px",
                      background: "rgba(255, 255, 255, 0.04)",
                      borderRadius: "8px",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "6px",
                      }}
                    >
                      <label
                        htmlFor="imageScale"
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#f1f1f1",
                          margin: 0,
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span>🔍 Ajuste de Tamanho da Imagem</span>
                        <span style={{ fontSize: "11px", color: "#9da5b0", fontWeight: 400 }}>
                          (Opcional)
                        </span>
                      </label>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 800,
                          color: "#f2c94c",
                          background: "rgba(242, 201, 76, 0.12)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        {Math.round((draft.imageScale || 1) * 100)}%
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <input
                        id="imageScale"
                        type="range"
                        min="0.8"
                        max="2.5"
                        step="0.05"
                        value={draft.imageScale || 1}
                        onChange={(e) => field("imageScale", parseFloat(e.target.value))}
                        style={{ flex: 1, accentColor: "#f2c94c", cursor: "pointer" }}
                      />
                    </div>

                    <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                      {[
                        { label: "100% (Padrão)", value: 1 },
                        { label: "+20%", value: 1.2 },
                        { label: "+40%", value: 1.4 },
                        { label: "+60%", value: 1.6 },
                        { label: "+80%", value: 1.8 },
                        { label: "Dobro (200%)", value: 2 },
                        { label: "+140% (2.4x)", value: 2.4 },
                      ].map((preset) => {
                        const isCurrent = Math.abs((draft.imageScale || 1) - preset.value) < 0.02;
                        return (
                          <button
                            key={preset.value}
                            type="button"
                            className={`btn btn-secondary ${isCurrent ? "active" : ""}`}
                            style={{
                              padding: "4px 8px",
                              fontSize: "11px",
                              borderRadius: "4px",
                              background: isCurrent ? "#f2c94c" : "rgba(255, 255, 255, 0.08)",
                              color: isCurrent ? "#111111" : "#ffffff",
                              border: "none",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                            onClick={() => field("imageScale", preset.value)}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>

                    {draft.image && (
                      <div
                        style={{
                          marginTop: "10px",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "8px 10px",
                          background: "#0d0f13",
                          borderRadius: "6px",
                          border: "1px solid rgba(255, 255, 255, 0.06)",
                        }}
                      >
                        <div
                          style={{
                            width: "64px",
                            height: "64px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                            background: "rgba(255, 255, 255, 0.02)",
                            borderRadius: "4px",
                            border: "1px dashed rgba(255, 255, 255, 0.15)",
                            flexShrink: 0,
                          }}
                        >
                          <img
                            src={draft.image}
                            alt="Prévia do tamanho"
                            style={{
                              maxWidth: "100%",
                              maxHeight: "100%",
                              objectFit: "contain",
                              transform: `scale(${draft.imageScale || 1})`,
                              transformOrigin: "center center",
                              transition: "transform 0.15s ease-out",
                            }}
                          />
                        </div>
                        <small style={{ color: "#9da5b0", fontSize: "11px", lineHeight: 1.35 }}>
                          Útil para imagens estreitas (ex: linguiça, garrafas) ou fotos recortadas sem fundo que precisam de mais destaque na TV.
                        </small>
                      </div>
                    )}
                  </div>

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
          <Link
            to="/studio/motion"
            className="btn btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: 700 }}
          >
            <span>🎨 Editor Visual (Motion Lab) ↗</span>
          </Link>
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

        {/* Sol TV Motion Studio Highlighted Card */}
        <section className="card admin-motion-studio-card">
          <div className="studio-card-content">
            <div className="studio-card-icon">⚡</div>
            <div className="studio-card-body">
              <h2>Sol TV Motion Lab & Editor Visual 16:9</h2>
              <p>Edite livremente em 16:9, arraste a logo, configure cores de fundo, física de preços e publique instantaneamente na TV via Realtime.</p>
            </div>
          </div>
          <Link to="/studio/motion" className="btn btn-primary studio-launch-btn">
            Abrir Motion Lab ↗
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

      {/* Program Editor Modal */}
      {editingProgram && (
        <ProgramEditor
          initialProgram={editingProgram}
          availableOffers={content.offers}
          availableMedia={content.media}
          onSave={handleSaveProgram}
          onCancel={() => setEditingProgram(null)}
          onTest={handleTestProgram}
        />
      )}

      {/* Program Tester Modal */}
      {testingProgram && (
        <ProgramTesterModal
          program={testingProgram}
          onClose={() => setTestingProgram(null)}
        />
      )}

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
