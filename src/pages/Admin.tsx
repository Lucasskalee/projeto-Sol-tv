import { fetchCatalogs, subscribeCatalogChanges } from "../services/catalogService";
import type { Catalog } from "../catalogs";
import { CatalogAgendaPreview } from "../components/admin/programs/CatalogAgendaPreview";
import { CatalogScheduleEditor } from "../components/admin/programs/CatalogScheduleEditor";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  createNewProgram,
  duplicateProgram,
  type TvProgram,
} from "../offers/programs";
import {
  bootstrapPrograms,
  createProgram,
  deleteProgram,
  fetchPrograms,
  OptimisticConcurrencyError,
  type ProgramSyncState,
  updateProgram,
} from "../services/programService";
import { ProgramList } from "../components/admin/programs/ProgramList";
import { ProgramEditor } from "../components/admin/programs/ProgramEditor";
import { ProgramTesterModal } from "../components/admin/programs/ProgramTesterModal";
import { ProgramSimulator } from "../components/admin/programs/ProgramSimulator";
import {
  demoContent,
  contentFromData,
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
import { MediaManager } from "../components/MediaManager";
import { CompositionManager } from "../components/admin/compositions/CompositionManager";
import { normalTheme } from "../themes/normal";
import { blackFridayTheme } from "../themes/blackFriday";
import { getSectorThemeSlug, setSectorThemeSlug } from "../themes/resolveTheme";
import type { MotionConfig } from "../motion/types";
import { loadActiveMotionConfig, subscribeToActiveMotionConfig } from "../motion/storage";
import { AdminShell } from "../components/admin/shell/AdminShell";
import type { AdminTab } from "../components/admin/shell/DesktopSidebar";
import { AdminOverview } from "../components/admin/overview/AdminOverview";
import { AdminOffersTab } from "../components/admin/sections/AdminOffersTab";
import { AdminThemesTab } from "../components/admin/sections/AdminThemesTab";
import { AdminTvsTab } from "../components/admin/sections/AdminTvsTab";
import { AdminSettingsTab } from "../components/admin/sections/AdminSettingsTab";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const store = searchParams.get("store")?.trim() || "Loja 01";
  const [sector, setSector] = useState("acougue");
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [tvThemeSlug, setTvThemeSlug] = useState<"normal" | "black-friday">(() =>
    (getSectorThemeSlug(sector) as "normal" | "black-friday") || "normal",
  );
  const [motionConfig, setMotionConfig] = useState<MotionConfig>(() =>
    loadActiveMotionConfig(),
  );

  const [content, setContent] = useState<TvContent>(() => cachedContent(sector));
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [programs, setPrograms] = useState<TvProgram[]>([]);
  const [programSyncState, setProgramSyncState] = useState<ProgramSyncState>("syncing");
  const [programLastSyncAt, setProgramLastSyncAt] = useState<string | null>(null);
  const [concurrencyConflict, setConcurrencyConflict] = useState<string | null>(null);
  const [legacyLocalCount, setLegacyLocalCount] = useState<number>(0);

  const [editingProgram, setEditingProgram] = useState<TvProgram | null>(null);
  const [testingProgram, setTestingProgram] = useState<TvProgram | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);

  const [connection, setConnection] = useState<"online" | "syncing" | "offline">(
    databaseConfigured ? "syncing" : "offline",
  );
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [draft, setDraft] = useState<Offer>(() => newOffer(sector));
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [uploadingOfferImage, setUploadingOfferImage] = useState(false);
  const offerFileInputRef = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const editing = content.offers.some((o) => o.id === draft.id);

  useEffect(() => {
    let disposed = false;
    setCatalogs([]);
    const reload = () => fetchCatalogs(store, sector).then(rows => { if (!disposed) setCatalogs(rows); }).catch(() => {});
    void reload(); const unsubscribe = subscribeCatalogChanges(() => { void reload(); });
    return () => { disposed = true; unsubscribe(); };
  }, [store, sector]);

  function handleNewProgram() {
    const fresh = createNewProgram(sector, store);
    setConcurrencyConflict(null);
    setEditingProgram(fresh);
  }

  function handleNewFlashOffer() {
    const fresh = createNewProgram(sector, store, "flash_offer");
    setConcurrencyConflict(null);
    setEditingProgram(fresh);
  }

  function handleEditProgram(prog: TvProgram) {
    setConcurrencyConflict(null);
    setEditingProgram(prog);
  }

  async function handleDuplicateProgram(prog: TvProgram) {
    try {
      const clone = duplicateProgram(prog);
      const created = await createProgram({
        ...clone,
        name: `${prog.name} (Cópia)`,
        status: "draft",
        version: 1,
      });
      setPrograms((prev) => [created, ...prev]);
      setNotice(`Programação "${created.name}" duplicada no Supabase.`);
    } catch (err) {
      setError(`Erro ao duplicar programação: ${getErrorMessage(err)}`);
    }
  }

  async function handleToggleProgramStatus(prog: TvProgram) {
    try {
      const nextStatus = prog.status === "disabled" ? "published" : prog.status === "draft" ? "published" : "disabled";
      const updated = await updateProgram(
        {
          ...prog,
          status: nextStatus,
        },
        prog.version
      );
      setPrograms((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setNotice(
        nextStatus === "published"
          ? `Programação "${updated.name}" publicada com sucesso!`
          : `Programação "${updated.name}" pausada com sucesso!`
      );
    } catch (err) {
      setError(`Erro ao alterar status da programação: ${getErrorMessage(err)}`);
    }
  }

  async function handleDeleteProgram(id: string) {
    if (!window.confirm("Deseja realmente excluir esta programação do Supabase?")) return;
    try {
      await deleteProgram(id);
      setPrograms((prev) => prev.filter((p) => p.id !== id));
      setNotice("Programação excluída com sucesso.");
    } catch (err) {
      setError(`Erro ao excluir programação: ${getErrorMessage(err)}`);
    }
  }

  async function handleSaveProgram(saved: TvProgram) {
    setConcurrencyConflict(null);
    try {
      if (saved.catalogId && !databaseConfigured) throw new Error('Supabase não configurado.');
      const exists = programs.some((p) => p.id === saved.id);
      if (exists) {
        const updated = await updateProgram(saved, saved.version);
        setPrograms((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        setEditingProgram(null);
        setNotice(`Programação "${updated.name}" atualizada com sucesso no Supabase!`);
      } else {
        const created = await createProgram(saved);
        setPrograms((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
        setEditingProgram(null);
        setNotice(`Programação "${created.name}" criada com sucesso no Supabase!`);
      }
    } catch (err: unknown) {
      if (err instanceof OptimisticConcurrencyError) {
        setConcurrencyConflict(err.message);
        setError(err.message);
      } else {
        console.error("Erro ao salvar programação:", err);
        setError(`Erro ao salvar programação: ${getErrorMessage(err)}`);
      }
    }
  }

  async function handleReloadLatestProgram() {
    if (!editingProgram) return;
    try {
      const remoteList = await fetchPrograms(store, sector);
      const fresh = remoteList.find((p) => p.id === editingProgram.id);
      if (fresh) {
        setEditingProgram(fresh);
        setConcurrencyConflict(null);
        setNotice(`Versão v${fresh.version} da programação "${fresh.name}" recarregada com sucesso!`);
      } else {
        setError("A programação não foi encontrada no banco.");
      }
    } catch (err) {
      setError(`Erro ao recarregar versão recente: ${getErrorMessage(err)}`);
    }
  }

  async function handleMigrateLegacyLocal() {
    try {
      const legacyKey = `sol_tv_programs_${sector}`;
      const raw = localStorage.getItem(legacyKey);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) return;

      let migratedCount = 0;
      for (const item of parsed) {
        const alreadyInDb = programs.some((p) => p.id === item.id || p.name === item.name);
        if (!alreadyInDb) {
          await createProgram({
            ...item,
            store: item.store || "Loja 01",
            sector,
            version: 1,
          });
          migratedCount++;
        }
      }

      localStorage.setItem(`sol_tv_migration_completed_${sector}`, "true");
      setLegacyLocalCount(0);
      setNotice(`${migratedCount} ${migratedCount === 1 ? "programação local migrada" : "programações locais migradas"} para o Supabase!`);
    } catch (err) {
      setError(`Erro na migração de dados locais: ${getErrorMessage(err)}`);
    }
  }

  function handleDismissLegacyLocal() {
    localStorage.setItem(`sol_tv_migration_completed_${sector}`, "true");
    setLegacyLocalCount(0);
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
    setTvThemeSlug(
      (getSectorThemeSlug(sector) as "normal" | "black-friday") || "normal",
    );

    let isProgramMounted = true;
    setConcurrencyConflict(null);

    // 1. Bootstrap e subscrição Realtime de programações via IndexedDB e Supabase
    const unsubProgramsPromise = bootstrapPrograms(
      store,
      sector,
      (updatedPrograms, syncState) => {
        if (!isProgramMounted) return;
        setPrograms(updatedPrograms);
        setProgramSyncState(syncState);
        if (syncState === "online") {
          setProgramLastSyncAt(new Date().toISOString());
        }
      },
    );

    // 2. Detecção de programações legadas no localStorage
    try {
      const legacyKey = `sol_tv_programs_${sector}`;
      const migratedKey = `sol_tv_migration_completed_${sector}`;
      const raw = localStorage.getItem(legacyKey);
      const isMigrated = localStorage.getItem(migratedKey);
      if (raw && !isMigrated) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLegacyLocalCount(parsed.length);
        } else {
          setLegacyLocalCount(0);
        }
      } else {
        setLegacyLocalCount(0);
      }
    } catch {
      setLegacyLocalCount(0);
    }

    if (!databaseConfigured) return () => { isProgramMounted = false; void unsubProgramsPromise.then(unsub => unsub()); };

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
      isProgramMounted = false;
      void unsubProgramsPromise.then((unsub) => unsub());
      unsubscribeMotion();
      unsubscribeContent();
    };
  }, [sector, store]);

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
      setNotice(`Mídia "${media.title}" salva com sucesso.`);
      setError("");
    } catch (err: unknown) {
      console.error("Erro ao salvar mídia:", err);
      setConnection("offline");
      setError(`Erro ao salvar mídia: ${getErrorMessage(err)}`);
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
      setNotice("Mídia excluída com sucesso.");
      setError("");
    } catch (err: unknown) {
      console.error("Erro ao excluir mídia:", err);
      setConnection("offline");
      setError(`Erro ao excluir mídia: ${getErrorMessage(err)}`);
      throw err;
    }
  }

  async function handleToggleActiveMedia(id: string, active: boolean) {
    const target = content.media.find((m) => m.id === id);
    if (!target) return;
    const updated = { ...target, active };
    await handleSaveMedia(updated);
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

    const payload: Offer = {
      ...draft,
      sector,
      name: draft.name.trim(),
      image: draft.image.trim(),
      video: draft.video?.trim() || undefined,
      regularPrice: draft.regularPrice?.trim() || undefined,
      promotionalPrice: draft.promotionalPrice.trim(),
      duration: safeDuration,
      displayOrder: editing ? draft.displayOrder : content.offers.length,
      imageScale: draft.imageScale && draft.imageScale > 0 ? draft.imageScale : 1,
    };

    const nextOffers = editing
      ? content.offers.map((offer) =>
          offer.id === payload.id ? payload : offer,
        )
      : [...content.offers, payload];

    const message = editing
      ? "Oferta atualizada com sucesso!"
      : "Oferta cadastrada com sucesso!";

    if (commit(nextOffers, message)) {
      setDraft(newOffer(sector));
      setShowOfferForm(false);
      setError("");
    }
  }

  function toggleOfferActive(id: string, active: boolean) {
    const nextOffers = content.offers.map((offer) =>
      offer.id === id ? { ...offer, active } : offer,
    );
    const target = content.offers.find((o) => o.id === id);
    const label = target ? target.name : "Oferta";
    commit(
      nextOffers,
      active
        ? `"${label}" ativada no catálogo.`
        : `"${label}" desativada do catálogo.`,
    );
  }

  function removeOffer(id: string) {
    const target = content.offers.find((o) => o.id === id);
    if (!target) return;
    if (!window.confirm(`Excluir "${target.name}"?`)) return;
    const nextOffers = content.offers.filter((offer) => offer.id !== id);
    commit(nextOffers, `Oferta "${target.name}" removida com sucesso.`);
    if (draft.id === id) {
      setDraft(newOffer(sector));
      setShowOfferForm(false);
    }
  }

  function moveOffer(index: number, delta: number) {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= content.offers.length) return;
    const nextOffers = [...content.offers];
    const [item] = nextOffers.splice(index, 1);
    nextOffers.splice(nextIndex, 0, item);
    const msg =
      delta < 0
        ? `"${item.name}" adiantada na sequência.`
        : `"${item.name}" adiada na sequência.`;
    commit(nextOffers, msg);
  }

  const currentSectorLabel =
    SECTORS.find((s) => s.id === sector)?.label || sector.toUpperCase();

  const currentTheme =
    tvThemeSlug === "black-friday" ? blackFridayTheme : normalTheme;

  return (
    <AdminShell
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      currentStore={store}
      onSelectStore={value => { setEditingProgram(null); setSearchParams({ store: value }); }}
      currentSector={sector}
      onSelectSector={setSector}
      connection={connection}
      lastSync={lastSync}
      onLogout={handleLogout}
      counts={{
        programs: programs.length,
        offers: content.offers.length,
        media: content.media.length,
        catalogs: catalogs.length,
      }}
    >
      {/* TAB 1: VISÃO GERAL (NOVA HOME) */}
      {activeTab === "overview" && (
        <AdminOverview
          currentStore={store}
          currentSector={sector}
          currentSectorLabel={currentSectorLabel}
          connection={connection}
          lastSync={lastSync}
          content={content}
          programs={programs}
          tvThemeSlug={tvThemeSlug}
          currentTheme={currentTheme}
          motionConfig={motionConfig}
          onOpenPrograms={() => setActiveTab("programs")}
          onOpenOffers={() => setActiveTab("offers")}
          onOpenMedia={() => setActiveTab("media")}
          onOpenCatalogs={() => setActiveTab("catalogs")}
          onOpenThemes={() => setActiveTab("themes")}
        />
      )}

      {/* TAB 2: PROGRAMAÇÃO / AGENDA */}
      {activeTab === "programs" &&
        (showSimulator ? (
          <CatalogAgendaPreview store={store} sector={sector} onClose={() => setShowSimulator(false)} />
        ) : (
          <ProgramList
            catalogs={catalogs}
            programs={programs}
            currentSector={sector}
            sectorLabel={currentSectorLabel}
            syncState={programSyncState}
            lastSyncAt={programLastSyncAt}
            legacyLocalCount={legacyLocalCount}
            onMigrateLegacyLocal={handleMigrateLegacyLocal}
            onDismissLegacyLocal={handleDismissLegacyLocal}
            onNewProgram={handleNewProgram}
            onNewFlashOffer={handleNewFlashOffer}
            onEditProgram={handleEditProgram}
            onDuplicateProgram={handleDuplicateProgram}
            onToggleStatus={handleToggleProgramStatus}
            onTestProgram={handleTestProgram}
            onDeleteProgram={handleDeleteProgram}
            onOpenSimulator={() => setShowSimulator(true)}
          />
        ))}

      {/* TAB 3: CATÁLOGOS / CAMADAS DA TV */}
      {activeTab === "catalogs" && (
        <CompositionManager
          key={`${store}:${sector}`}
          store={store}
          sector={sector}
          sectorLabel={currentSectorLabel}
          offers={content.offers}
          media={content.media}
          compositions={content.compositions}
          hidePreview={false}
          onSaveComposition={handleSaveComposition}
          onDeleteComposition={handleDeleteComposition}
          onReorderCompositions={handleReorderCompositions}
        />
      )}

      {/* TAB 4: OFERTAS (CATÁLOGO DE PRODUTOS) */}
      {activeTab === "offers" && (
        <AdminOffersTab
          sector={sector}
          currentSectorLabel={currentSectorLabel}
          offers={content.offers}
          productSearch={productSearch}
          setProductSearch={setProductSearch}
          showOfferForm={showOfferForm}
          setShowOfferForm={setShowOfferForm}
          draft={draft}
          editing={editing}
          field={field}
          submit={submit}
          setDraft={setDraft}
          setError={setError}
          offerFileInputRef={offerFileInputRef}
          formRef={form}
          handleOfferFileUpload={handleOfferFileUpload}
          uploadingOfferImage={uploadingOfferImage}
          toggleOfferActive={toggleOfferActive}
          moveOffer={moveOffer}
          removeOffer={removeOffer}
        />
      )}

      {/* TAB 5: MÍDIAS (IMAGENS & VÍDEOS) */}
      {activeTab === "media" && (
        <MediaManager
          mediaList={content.media}
          currentSector={sector}
          onSaveMedia={handleSaveMedia}
          onDeleteMedia={handleDeleteMedia}
          onToggleActiveMedia={handleToggleActiveMedia}
        />
      )}

      {/* TAB 6: TEMAS */}
      {activeTab === "themes" && (
        <AdminThemesTab
          currentSectorLabel={currentSectorLabel}
          tvThemeSlug={tvThemeSlug}
          onSelectTheme={handleSelectTheme}
        />
      )}

      {/* TAB 7: TVS E SETORES */}
      {activeTab === "tvs" && (
        <AdminTvsTab
          currentSector={sector}
          onSelectSector={setSector}
          connection={connection}
        />
      )}

      {/* TAB 8: CONFIGURAÇÕES & SINCRONIZAÇÃO */}
      {activeTab === "settings" && (
        <AdminSettingsTab
          currentSectorLabel={currentSectorLabel}
          connection={connection}
          lastSync={lastSync}
          onRestoreDemo={() => {
            const demo = demoContent(sector);
            commit(demo.offers, "Demonstração restaurada.");
            setDraft(newOffer(sector));
            setShowOfferForm(false);
          }}
        />
      )}

      {/* Program Editor Modal */}
      {editingProgram && (editingProgram.catalogId || !editingProgram.screens.length ? (
        <CatalogScheduleEditor key={editingProgram.id + ':' + editingProgram.version} initialProgram={editingProgram}
          onSave={handleSaveProgram} onCancel={() => setEditingProgram(null)}
          concurrencyConflict={concurrencyConflict} onReloadLatest={handleReloadLatestProgram} />
      ) : (
        <ProgramEditor
          initialProgram={editingProgram}
          existingPrograms={programs}
          availableOffers={content.offers}
          availableMedia={content.media}
          concurrencyConflict={concurrencyConflict}
          onReloadLatest={handleReloadLatestProgram}
          onSave={handleSaveProgram}
          onCancel={() => {
            setEditingProgram(null);
            setConcurrencyConflict(null);
          }}
          onTest={handleTestProgram}
          onOpenSimulatorWithProgram={(prog, _date, _time) => {
            setEditingProgram(null);
            setConcurrencyConflict(null);
            setShowSimulator(true);
          }}
        />
      ))}

      {/* Program Tester Modal */}
      {testingProgram && (testingProgram.catalogId ? (
        <CatalogAgendaPreview store={testingProgram.store} sector={testingProgram.sector} catalogId={testingProgram.catalogId} onClose={() => setTestingProgram(null)} />
      ) : (
        <ProgramTesterModal
          program={testingProgram}
          onClose={() => setTestingProgram(null)}
        />
      ))}

      {/* Toasts */}
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
    </AdminShell>
  );
}
