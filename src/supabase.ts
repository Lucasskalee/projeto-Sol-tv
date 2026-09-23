import {
  createClient,
  type AuthChangeEvent,
  type RealtimeChannel,
  type Session,
  type User,
} from "@supabase/supabase-js";
import { contentFromData, demoContent } from "./data";
import type { Offer, SolTvMedia, TvContent } from "./types";
import type { OfferComposition } from "./offers/compositions";
import { getSectorThemeSlug, setSectorThemeSlug } from "./themes/resolveTheme";
import type { MotionConfig, VisualConfigData } from "./motion/types";
import { DEFAULT_MOTION_CONFIG, cloneMotionConfig } from "./motion/defaults";
import { safeLocalStorageSetItem, sanitizeMotionConfigForStorage } from "./motion/storage";

export type { AuthChangeEvent, Session, User, VisualConfigData };

export const TV_MEDIA_BUCKET = "tv-media";

export class SkaleeDatabaseError extends Error {
  code?: string;
  details?: string;
  hint?: string;
  operation?: string;
  sessionInfo?: string;
  dbMessage?: string;
  rawError?: unknown;

  constructor(
    message: string,
    info: {
      code?: string;
      message?: string;
      details?: string;
      hint?: string;
      operation?: string;
      sessionInfo?: string;
      rawError?: unknown;
    },
  ) {
    super(message);
    this.name = "SkaleeDatabaseError";
    this.code = info.code;
    this.dbMessage = info.message;
    this.details = info.details;
    this.hint = info.hint;
    this.operation = info.operation;
    this.sessionInfo = info.sessionInfo;
    this.rawError = info.rawError;
    Object.setPrototypeOf(this, SkaleeDatabaseError.prototype);
  }
}

export function getErrorMessage(error: unknown, fallbackOperation?: string): string {
  if (!error) return "Erro desconhecido.";

  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object") {
    const value = error as {
      operation?: unknown;
      code?: unknown;
      message?: unknown;
      dbMessage?: unknown;
      details?: unknown;
      hint?: unknown;
      sessionInfo?: unknown;
      status?: unknown;
      rawError?: unknown;
    };

    const raw = (value.rawError && typeof value.rawError === "object"
      ? value.rawError
      : value) as {
      code?: unknown;
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      operation?: unknown;
    };

    const operation = value.operation || raw.operation || fallbackOperation;
    const sessionInfo = value.sessionInfo;
    const code = value.code || raw.code;
    const details = value.details || raw.details;
    const hint = value.hint || raw.hint;
    const message = value.dbMessage || raw.message || value.message;

    const hasStructuredData = Boolean(operation || sessionInfo || code || details || hint);

    if (hasStructuredData) {
      const parts: string[] = [];
      if (operation) parts.push(`Operação: ${String(operation)}`);
      if (sessionInfo) parts.push(`Sessão: ${String(sessionInfo)}`);
      if (code) parts.push(`Código: ${String(code)}`);
      if (message) parts.push(`Mensagem: ${String(message)}`);
      if (details) parts.push(`Detalhes: ${String(details)}`);
      if (hint) parts.push(`Hint: ${String(hint)}`);
      return parts.join(" | ");
    }

    if (error instanceof Error) {
      return error.message;
    }

    if (message) {
      return String(message);
    }

    try {
      const json = JSON.stringify(error);
      if (json !== "{}" && json !== "[]") {
        return json;
      }
    } catch {
      // ignore JSON errors
    }
  }

  return String(error);
}

const projectUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
const publishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const databaseConfigured = Boolean(projectUrl && publishableKey);
export const supabase = databaseConfigured
  ? createClient(projectUrl!, publishableKey!, {
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null;

export function getSupabaseDiagnosticInfo() {
  let projectRef = "não identificado";
  let hostname = "não configurado";

  if (projectUrl) {
    try {
      const urlObj = new URL(projectUrl);
      hostname = urlObj.hostname;
      projectRef = urlObj.hostname.split(".")[0] || "desconhecido";
    } catch {
      hostname = "URL inválida";
    }
  }

  return {
    hostname,
    projectRef,
    bucket: TV_MEDIA_BUCKET,
    isConfigured: databaseConfigured,
  };
}

export async function runStorageDiagnostic() {
  const diag = getSupabaseDiagnosticInfo();
  console.log(
    `[SOL TV Diagnostic]\nProject: ${diag.projectRef}\nHost: ${diag.hostname}\nBucket: ${diag.bucket}\nConfigurado: ${diag.isConfigured ? "SIM" : "NÃO"}`,
  );

  if (!supabase) {
    console.warn("[SOL TV Storage Diagnostic] Supabase client não inicializado.");
    return {
      success: false,
      error: "Supabase não configurado",
      ...diag,
    };
  }

  try {
    const { data, error } = await supabase.storage
      .from(TV_MEDIA_BUCKET)
      .list("", { limit: 1 });

    if (error) {
      const errObj = error as unknown as Record<string, unknown>;
      const statusCode = errObj.statusCode || errObj.status || "N/A";
      const details = errObj.details || null;

      console.error("[SOL TV Storage Diagnostic] Falha ao consultar bucket:", {
        projectRef: diag.projectRef,
        bucket: diag.bucket,
        errorName: error.name,
        message: error.message,
        statusCode,
        details,
      });
      return {
        success: false,
        code: error.name,
        message: error.message,
        statusCode: statusCode !== "N/A" ? statusCode : undefined,
        details,
        ...diag,
      };
    }

    console.log("[SOL TV Storage Diagnostic] Conexão com bucket bem-sucedida!", {
      projectRef: diag.projectRef,
      bucket: diag.bucket,
      status: "OK",
      filesFound: data?.length ?? 0,
    });

    return {
      success: true,
      filesFound: data?.length ?? 0,
      ...diag,
    };
  } catch (err: unknown) {
    console.error("[SOL TV Storage Diagnostic] Exceção inesperada:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : String(err),
      ...diag,
    };
  }
}

type DbOffer = {
  id: string;
  sector: string;
  name: string;
  normal_price: number | null;
  offer_price: number;
  unit: string;
  image_url: string | null;
  video_url: string | null;
  media_type: string | null;
  duration_seconds: number;
  display_order: number;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  layout: "single" | "pair" | "grid";
  image_scale?: number | null;
  created_at: string;
};

type DbMedia = {
  id: string;
  title: string | null;
  type: "image" | "video";
  media_url: string;
  storage_path: string | null;
  sector: string;
  duration_seconds: number;
  position: number;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

type DbComposition = {
  id: string;
  sector: string;
  layout: "hero" | "duo" | "grid4" | "grid8";
  duration_seconds: number;
  position: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type DbCompositionItem = {
  id: string;
  composition_id: string;
  offer_id: string;
  slot_index: number;
  created_at: string;
};

const money = (value: number | null | undefined) =>
  value == null ? undefined : value.toFixed(2).replace(".", ",");

function fromDbOffer(row: DbOffer): Offer {
  return {
    id: row.id,
    sector: row.sector,
    name: row.name,
    image: row.image_url || "",
    video: row.video_url || undefined,
    regularPrice: money(row.normal_price),
    promotionalPrice: money(row.offer_price) || "0,00",
    unit: row.unit,
    startsAt: row.starts_at ? row.starts_at.slice(0, 10) : "",
    endsAt: row.ends_at ? row.ends_at.slice(0, 10) : "",
    duration: row.duration_seconds || 8,
    active: row.active,
    displayOrder: row.display_order || 0,
    layout: row.layout || "single",
    imageScale: typeof row.image_scale === "number" && row.image_scale > 0 ? Number(row.image_scale) : 1,
  };
}

function toDbOffer(offer: Offer): Omit<DbOffer, "created_at"> {
  const parseMoney = (value?: string) =>
    value ? Number(value.replace(/\./g, "").replace(",", ".")) : null;
  return {
    id: offer.id,
    sector: offer.sector || "acougue",
    name: offer.name,
    normal_price: parseMoney(offer.regularPrice),
    offer_price: parseMoney(offer.promotionalPrice) || 0,
    unit: offer.unit,
    image_url: offer.image || null,
    video_url: offer.video || null,
    media_type: offer.video ? "video" : "image",
    duration_seconds: offer.duration,
    display_order: offer.displayOrder,
    active: offer.active,
    starts_at: offer.startsAt
      ? new Date(`${offer.startsAt}T00:00:00`).toISOString()
      : null,
    ends_at: offer.endsAt
      ? new Date(`${offer.endsAt}T23:59:59`).toISOString()
      : null,
    layout: offer.layout,
    image_scale: typeof offer.imageScale === "number" && offer.imageScale > 0 ? offer.imageScale : 1,
  };
}

function fromDbMedia(row: DbMedia): SolTvMedia {
  return {
    id: row.id,
    title: row.title || undefined,
    type: row.type,
    mediaUrl: row.media_url,
    storagePath: row.storage_path || undefined,
    sector: row.sector,
    duration: row.duration_seconds || 10,
    position: row.position || 0,
    active: row.active,
    startsAt: row.starts_at ? row.starts_at.slice(0, 10) : undefined,
    endsAt: row.ends_at ? row.ends_at.slice(0, 10) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toDbMedia(media: SolTvMedia): Omit<DbMedia, "created_at" | "updated_at"> {
  return {
    id: media.id,
    title: media.title || null,
    type: media.type,
    media_url: media.mediaUrl,
    storage_path: media.storagePath || null,
    sector: media.sector || "acougue",
    duration_seconds: media.duration || 10,
    position: media.position || 0,
    active: media.active,
    starts_at: media.startsAt
      ? new Date(`${media.startsAt}T00:00:00`).toISOString()
      : null,
    ends_at: media.endsAt
      ? new Date(`${media.endsAt}T23:59:59`).toISOString()
      : null,
  };
}

function fromDbComposition(
  row: DbComposition,
  items: DbCompositionItem[],
  offersMap: Map<string, Offer>,
): OfferComposition {
  const compItems = items
    .filter((it) => it.composition_id === row.id)
    .sort((a, b) => a.slot_index - b.slot_index);

  const matchedOffers: Offer[] = [];
  for (const item of compItems) {
    const offer = offersMap.get(item.offer_id);
    if (offer) {
      matchedOffers.push(offer);
    }
  }

  return {
    id: row.id,
    sector: row.sector,
    layout: row.layout,
    duration: row.duration_seconds || 8,
    position: row.position || 0,
    active: row.active,
    offers: Object.freeze(matchedOffers),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function cacheKey(sector = "acougue") {
  return `sol-tv-${sector}-cache`;
}
function cacheMediaKey(sector = "acougue") {
  return `sol-tv-${sector}-media-cache`;
}
function cacheCompositionsKey(sector = "acougue") {
  return `sol-tv-${sector}-compositions-cache`;
}

export function cacheTvCompositions(
  sector: string,
  compositions: OfferComposition[],
) {
  try {
    localStorage.setItem(cacheCompositionsKey(sector), JSON.stringify(compositions));
  } catch {
    // Cache is only a contingency
  }
}

export function loadCachedCompositions(sector = "acougue"): OfferComposition[] {
  try {
    const value = JSON.parse(localStorage.getItem(cacheCompositionsKey(sector)) || "null");
    if (Array.isArray(value)) {
      return value.map((c: OfferComposition) => ({
        ...c,
        offers: Object.freeze(c.offers || []),
      }));
    }
    return [];
  } catch {
    return [];
  }
}

export function cacheTvContent(
  sector: string,
  offers: Offer[],
  media: SolTvMedia[] = [],
  compositions: OfferComposition[] = [],
) {
  try {
    localStorage.setItem(cacheKey(sector), JSON.stringify(offers));
    localStorage.setItem(cacheMediaKey(sector), JSON.stringify(media));
    localStorage.setItem(cacheCompositionsKey(sector), JSON.stringify(compositions));
  } catch {
    // Cache is only a contingency and must never block the player.
  }
}

export function loadCachedOffers(sector = "acougue"): Offer[] {
  try {
    const value = JSON.parse(localStorage.getItem(cacheKey(sector)) || "null");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function loadCachedMedia(sector = "acougue"): SolTvMedia[] {
  try {
    const value = JSON.parse(localStorage.getItem(cacheMediaKey(sector)) || "null");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function loadCachedContent(sector = "acougue"): TvContent {
  const offers = loadCachedOffers(sector);
  const media = loadCachedMedia(sector);
  const compositions = loadCachedCompositions(sector);
  if (!databaseConfigured && offers.length === 0 && media.length === 0 && compositions.length === 0) {
    return demoContent(sector);
  }
  return contentFromData({ sector, offers, media, compositions });
}

export function cachedContent(sector = "acougue"): TvContent {
  return loadCachedContent(sector);
}

export async function loadCompositions(
  sector = "acougue",
  activeOnly = false,
  knownOffers?: Offer[],
  includeCatalogs = false,
): Promise<OfferComposition[]> {
  if (!supabase) return loadCachedCompositions(sector);

  try {
    const offers = knownOffers || (await loadOffers(sector, false));
    const offersMap = new Map(offers.map((o) => [o.id, o]));

    let query = supabase
      .from("sol_tv_compositions")
      .select("*")
      .eq("sector", sector)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });

    if (activeOnly) {
      query = query.eq("active", true);
    }

    const { data: rawComps, error: compError } = await query;
    const compData = rawComps?.filter(c => includeCatalogs || !c.catalog_id);
    if (compError) {
      console.error("[SKALEE CAMADAS] erro Supabase ao consultar sol_tv_compositions:", compError);
      if (compError.code === "42P01" || compError.code === "PGRST205") {
        console.warn("[SKALEE CAMADAS] MIGRATION sol_tv_compositions.sql AINDA NÃO FOI APLICADA NO SUPABASE.");
        return loadCachedCompositions(sector);
      }
      throw compError;
    }

    if (!compData || compData.length === 0) {
      return [];
    }

    const compIds = (compData as DbComposition[]).map((c) => c.id);

    const { data: itemsData, error: itemsError } = await supabase
      .from("sol_tv_composition_items")
      .select("*")
      .in("composition_id", compIds)
      .order("slot_index", { ascending: true });

    if (itemsError) {
      console.error("[SKALEE CAMADAS] erro Supabase ao consultar sol_tv_composition_items:", itemsError);
      if (itemsError.code === "42P01" || itemsError.code === "PGRST205") {
        console.warn("[SKALEE CAMADAS] MIGRATION sol_tv_compositions.sql AINDA NÃO FOI APLICADA NO SUPABASE.");
        return loadCachedCompositions(sector);
      }
      throw itemsError;
    }

    const items = (itemsData as DbCompositionItem[]) || [];
    const compositions = (compData as DbComposition[]).map((c) =>
      fromDbComposition(c, items, offersMap),
    );

    if (!includeCatalogs) cacheTvCompositions(sector, compositions);
    return compositions;
  } catch (err) {
    console.error("[SKALEE CAMADAS] Erro ao carregar composições do Supabase:", err);
    return loadCachedCompositions(sector);
  }
}

export async function upsertComposition(composition: OfferComposition): Promise<void> {
  if (!supabase) throw new Error("Supabase não configurado.");

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const sessionSummary = session
    ? `AUTENTICADO (email: ${session.user.email || "n/d"}, id: ${session.user.id.slice(0, 8)}...)`
    : "NÃO AUTENTICADO (anon / sem sessão)";

  const compPayload = {
    id: composition.id,
    sector: composition.sector || "acougue",
    layout: composition.layout,
    duration_seconds: composition.duration || 8,
    position: composition.position || 0,
    active: composition.active,
  };

  console.log("[SKALEE CAMADAS] salvando composition:", composition.id);
  console.log("[SKALEE CAMADAS] composition payload:", compPayload);

  // ETAPA A: sol_tv_compositions INSERT/UPDATE (upsert)
  const { error: compError } = await supabase
    .from("sol_tv_compositions")
    .upsert(compPayload);

  if (compError) {
    const errorDetails = {
      operation: "sol_tv_compositions INSERT/UPDATE (upsert)",
      sessionInfo: sessionSummary,
      code: compError.code,
      message: compError.message,
      details: compError.details,
      hint: compError.hint,
      rawError: compError,
    };
    console.error("[SKALEE CAMADAS] erro completo ao salvar:", compError);
    console.error(
      "[SKALEE CAMADAS] erro normalizado:",
      getErrorMessage(errorDetails),
    );
    if (compError.code === "42P01" || compError.code === "PGRST205") {
      throw new SkaleeDatabaseError(
        "MIGRATION sol_tv_compositions.sql AINDA NÃO FOI APLICADA NO SUPABASE.",
        errorDetails,
      );
    }
    throw new SkaleeDatabaseError(getErrorMessage(errorDetails), errorDetails);
  }

  console.log("[SKALEE CAMADAS] composition salva com sucesso:", composition.id);

  // ETAPA B: sol_tv_composition_items DELETE
  console.log("[SKALEE CAMADAS] removendo/substituindo items anteriores");
  const { error: delError } = await supabase
    .from("sol_tv_composition_items")
    .delete()
    .eq("composition_id", composition.id);

  if (delError) {
    const errorDetails = {
      operation: "sol_tv_composition_items DELETE",
      sessionInfo: sessionSummary,
      code: delError.code,
      message: delError.message,
      details: delError.details,
      hint: delError.hint,
      rawError: delError,
    };
    console.error("[SKALEE CAMADAS] erro completo ao salvar:", delError);
    console.error(
      "[SKALEE CAMADAS] erro normalizado:",
      getErrorMessage(errorDetails),
    );
    if (delError.code === "42P01" || delError.code === "PGRST205") {
      throw new SkaleeDatabaseError(
        "MIGRATION sol_tv_compositions.sql AINDA NÃO FOI APLICADA NO SUPABASE.",
        errorDetails,
      );
    }
    throw new SkaleeDatabaseError(getErrorMessage(errorDetails), errorDetails);
  }

  // ETAPA C: sol_tv_composition_items INSERT
  if (composition.offers.length > 0) {
    const itemsPayload = composition.offers.map((offer, slotIndex) => ({
      composition_id: composition.id,
      offer_id: offer.id,
      slot_index: slotIndex,
    }));

    console.log("[SKALEE CAMADAS] salvando composition_items:", itemsPayload);

    const { error: itemsError } = await supabase
      .from("sol_tv_composition_items")
      .insert(itemsPayload);

    if (itemsError) {
      const errorDetails = {
        operation: "sol_tv_composition_items INSERT",
        sessionInfo: sessionSummary,
        code: itemsError.code,
        message: itemsError.message,
        details: itemsError.details,
        hint: itemsError.hint,
        rawError: itemsError,
      };
      console.error("[SKALEE CAMADAS] erro completo ao salvar:", itemsError);
      console.error(
        "[SKALEE CAMADAS] erro normalizado:",
        getErrorMessage(errorDetails),
      );
      if (itemsError.code === "42P01" || itemsError.code === "PGRST205") {
        throw new SkaleeDatabaseError(
          "MIGRATION sol_tv_compositions.sql AINDA NÃO FOI APLICADA NO SUPABASE.",
          errorDetails,
        );
      }
      throw new SkaleeDatabaseError(getErrorMessage(errorDetails), errorDetails);
    }

    console.log("[SKALEE CAMADAS] items salvos com sucesso:", itemsPayload.length);
  }

  console.log(
    "[SKALEE CAMADAS] resultado Supabase: Camada e itens salvos com sucesso!",
    composition.id,
  );
}

export async function deleteComposition(id: string): Promise<void> {
  if (!supabase) throw new Error("Supabase não configurado.");
  console.log("[SKALEE CAMADAS] excluindo:", id);
  const { error } = await supabase
    .from("sol_tv_compositions")
    .delete()
    .eq("id", id);
  if (error) {
    const errorDetails = {
      operation: "sol_tv_compositions DELETE",
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      rawError: error,
    };
    console.error("[SKALEE CAMADAS] erro completo ao excluir:", error);
    console.error(
      "[SKALEE CAMADAS] erro normalizado:",
      getErrorMessage(errorDetails),
    );
    if (error.code === "42P01" || error.code === "PGRST205") {
      throw new SkaleeDatabaseError(
        "MIGRATION sol_tv_compositions.sql AINDA NÃO FOI APLICADA NO SUPABASE.",
        errorDetails,
      );
    }
    throw new SkaleeDatabaseError(getErrorMessage(errorDetails), errorDetails);
  }
  console.log("[SKALEE CAMADAS] resultado Supabase: Camada excluída com sucesso!", id);
}

export async function updateCompositionsOrder(
  compositions: OfferComposition[],
): Promise<void> {
  if (!supabase) return;
  console.log(
    "[SKALEE CAMADAS] reordenando composições:",
    compositions.map((c) => ({ id: c.id, pos: c.position })),
  );
  try {
    const updates = compositions.map((c) =>
      supabase!
        .from("sol_tv_compositions")
        .update({ position: c.position })
        .eq("id", c.id),
    );
    const results = await Promise.all(updates);
    const hasError = results.find((r) => r.error);
    if (hasError && hasError.error) {
      const err = hasError.error;
      const errorDetails = {
        operation: "sol_tv_compositions UPDATE (position)",
        code: err.code,
        message: err.message,
        details: err.details,
        hint: err.hint,
        rawError: err,
      };
      console.error("[SKALEE CAMADAS] erro completo ao reordenar:", err);
      console.error(
        "[SKALEE CAMADAS] erro normalizado:",
        getErrorMessage(errorDetails),
      );
      if (err.code === "42P01" || err.code === "PGRST205") {
        throw new SkaleeDatabaseError(
          "MIGRATION sol_tv_compositions.sql AINDA NÃO FOI APLICADA NO SUPABASE.",
          errorDetails,
        );
      }
      throw new SkaleeDatabaseError(getErrorMessage(errorDetails), errorDetails);
    }
    console.log("[SKALEE CAMADAS] resultado Supabase: Ordem das camadas salva com sucesso!");
  } catch (err) {
    console.error("[SKALEE CAMADAS] Erro ao reordenar composições no Supabase:", err);
    throw err;
  }
}

export async function loadSectorTheme(sector = "acougue"): Promise<string> {
  if (!supabase) return getSectorThemeSlug(sector);

  try {
    const { data, error } = await supabase
      .from("sol_tv_themes")
      .select("active_theme")
      .eq("sector", sector.toLowerCase())
      .maybeSingle();

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") {
        console.warn("Tabela sol_tv_themes ainda não configurada no Supabase.");
        return getSectorThemeSlug(sector);
      }
      throw error;
    }

    const themeSlug = (data as { active_theme?: string } | null)?.active_theme || "normal";
    setSectorThemeSlug(sector, themeSlug);
    return themeSlug;
  } catch (err) {
    console.error("[SOL TV] Erro ao carregar tema do setor:", err);
    return getSectorThemeSlug(sector);
  }
}

export async function upsertSectorTheme(
  sector = "acougue",
  activeTheme: string = "normal",
): Promise<void> {
  setSectorThemeSlug(sector, activeTheme);
  if (!supabase) return;

  try {
    const { error } = await supabase.from("sol_tv_themes").upsert({
      sector: sector.toLowerCase(),
      active_theme: activeTheme,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") {
        console.warn("Tabela sol_tv_themes ainda não configurada no Supabase.");
        return;
      }
      console.error("[SOL TV] Erro ao atualizar sol_tv_themes:", error);
      throw error;
    }
  } catch (err) {
    console.error("[SOL TV] Erro ao persistir tema do setor:", err);
    throw err;
  }
}

function cacheVisualConfigKey(sector = "acougue") {
  return `sol-tv-${sector.toLowerCase()}-visual-config-v2`;
}

export function isVisualConfigNewer(
  candidate: VisualConfigData,
  current: VisualConfigData | null | undefined,
): boolean {
  if (!current) return true;
  if (candidate.publishedVersion !== current.publishedVersion) {
    return candidate.publishedVersion > current.publishedVersion;
  }
  return Date.parse(candidate.updatedAt) > Date.parse(current.updatedAt);
}

export function cacheVisualConfig(sector: string, data: VisualConfigData) {
  try {
    const sanitizedData: VisualConfigData = {
      ...data,
      draftConfig: sanitizeMotionConfigForStorage(data.draftConfig),
      publishedConfig: sanitizeMotionConfigForStorage(data.publishedConfig),
    };
    safeLocalStorageSetItem(cacheVisualConfigKey(sector), JSON.stringify(sanitizedData));
  } catch {
    // Cache is only a contingency
  }
}

export function loadCachedVisualConfig(sector = "acougue"): VisualConfigData {
  const normalizedSector = sector.toLowerCase();
  try {
    const raw = localStorage.getItem(cacheVisualConfigKey(normalizedSector));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.publishedConfig) {
        return {
          sector: normalizedSector,
          draftConfig: cloneMotionConfig(parsed.draftConfig || parsed.publishedConfig || DEFAULT_MOTION_CONFIG),
          publishedConfig: cloneMotionConfig(parsed.publishedConfig || DEFAULT_MOTION_CONFIG),
          publishedVersion: Number(parsed.publishedVersion) || 1,
          publishedAt: parsed.publishedAt || new Date().toISOString(),
          updatedAt: parsed.updatedAt || new Date().toISOString(),
        };
      }
    }
  } catch {
    // ignore parse error
  }

  const fallbackConfig = cloneMotionConfig(DEFAULT_MOTION_CONFIG);
  return {
    sector: normalizedSector,
    draftConfig: fallbackConfig,
    publishedConfig: fallbackConfig,
    publishedVersion: 1,
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function loadVisualConfig(sector = "acougue"): Promise<VisualConfigData> {
  const normalizedSector = sector.toLowerCase();
  const cached = loadCachedVisualConfig(normalizedSector);

  if (!supabase) return cached;

  try {
    const columns = 'sector,published_config,published_version,published_at,updated_at';
    let result = await supabase.from('sol_tv_visual_configs').select(columns)
      .eq('sector', normalizedSector).is('catalog_id', null).maybeSingle();
    if (result.error?.code === '42703' || result.error?.code === 'PGRST204') {
      result = await supabase.from('sol_tv_visual_configs').select(columns).eq('sector', normalizedSector).maybeSingle();
    }
    const { data, error } = result;

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") {
        console.warn("[SOL TV] Tabela sol_tv_visual_configs ainda não criada no Supabase. Usando cache/padrão.");
        return cached;
      }
      throw error;
    }

    if (!data) {
      return cached;
    }

    const row = data as {
      sector: string;
      draft_config: MotionConfig;
      published_config: MotionConfig;
      published_version: number;
      published_at: string;
      updated_at: string;
    };

    const visualData: VisualConfigData = {
      sector: normalizedSector,
      draftConfig: cloneMotionConfig(row.draft_config || row.published_config || DEFAULT_MOTION_CONFIG),
      publishedConfig: cloneMotionConfig(row.published_config || DEFAULT_MOTION_CONFIG),
      publishedVersion: Number(row.published_version) || 1,
      publishedAt: row.published_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };

    cacheVisualConfig(normalizedSector, visualData);
    return visualData;
  } catch (err) {
    console.error("[SOL TV] Erro ao carregar configuração visual:", err);
    return cached;
  }
}

export async function saveDraftVisualConfig(
  sector = "acougue",
  draftConfig: MotionConfig,
): Promise<void> {
  const normalizedSector = sector.toLowerCase();
  const current = loadCachedVisualConfig(normalizedSector);
  const sanitizedDraft = sanitizeMotionConfigForStorage(draftConfig);
  const sanitizedPublished = sanitizeMotionConfigForStorage(current.publishedConfig || draftConfig);

  const updatedData: VisualConfigData = {
    ...current,
    draftConfig: sanitizedDraft,
    updatedAt: new Date().toISOString(),
  };
  cacheVisualConfig(normalizedSector, updatedData);

  if (!supabase) return;

  try {
    const payload = {
      sector: normalizedSector,
      draft_config: sanitizedDraft,
      published_config: sanitizedPublished,
      published_version: current.publishedVersion || 1,
      published_at: current.publishedAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let result = await supabase.from("sol_tv_visual_configs").upsert({ ...payload, catalog_id: null }, { onConflict: 'sector,catalog_id' });
    if (result.error?.code === '42703' || result.error?.code === 'PGRST204') result = await supabase.from("sol_tv_visual_configs").upsert(payload);
    const { error } = result;

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") {
        console.warn("[SOL TV] Tabela sol_tv_visual_configs ainda não criada no Supabase.");
        return;
      }
      throw error;
    }
  } catch (err) {
    console.warn("[SOL TV] Não foi possível salvar rascunho visual no Supabase:", err);
  }
}

export async function publishVisualConfig(
  sector = "acougue",
  configToPublish: MotionConfig,
): Promise<VisualConfigData> {
  const normalizedSector = sector.toLowerCase();
  if (!supabase) {
    throw new Error("Supabase não configurado. A configuração não foi salva no servidor.");
  }

  let currentResult = await supabase.from("sol_tv_visual_configs").select("published_version, published_at")
    .eq("sector", normalizedSector).is('catalog_id', null).maybeSingle();
  if (currentResult.error?.code === '42703' || currentResult.error?.code === 'PGRST204') {
    currentResult = await supabase.from("sol_tv_visual_configs").select("published_version, published_at").eq("sector", normalizedSector).maybeSingle();
  }
  const { data: currentRow, error: currentError } = currentResult;

  if (currentError) throw currentError;

  const currentVersion = Number(currentRow?.published_version) || 0;
  const currentPublishedAt = currentRow?.published_at || new Date().toISOString();
  const nextVersion = currentVersion + 1;
  const now = new Date().toISOString();
  const sanitizedConfig = sanitizeMotionConfigForStorage(configToPublish);

  const payload = {
    sector: normalizedSector,
    draft_config: sanitizedConfig,
    published_config: sanitizedConfig,
    published_version: nextVersion,
    published_at: now,
    updated_at: now,
  };

  if (import.meta.env.DEV) {
    console.log(`[MOTION] Publicando versão ${nextVersion} para ${normalizedSector}`);
  }

  let result = await supabase.from("sol_tv_visual_configs")
    .upsert({ ...payload, catalog_id: null }, { onConflict: 'sector,catalog_id' }).select().single();
  if (result.error?.code === '42703' || result.error?.code === 'PGRST204') result = await supabase.from("sol_tv_visual_configs").upsert(payload).select().single();
  const { data, error } = result;

  if (error) {
    console.error("[MOTION] Falha ao publicar:", error);
    if (error.code === "42P01" || error.code === "PGRST205") {
      console.warn("[SOL TV Visual] Execute database/sol_tv_visual_configs.sql no SQL Editor do Supabase.");
      throw new Error(
        "A tabela 'sol_tv_visual_configs' precisa ser criada no Supabase para sincronizar entre diferentes computadores e telas. Execute o arquivo SQL 'database/sol_tv_visual_configs.sql' no SQL Editor do Supabase."
      );
    }
    throw error;
  }

  const publishedData: VisualConfigData = {
    sector: normalizedSector,
    draftConfig: cloneMotionConfig(data.draft_config || data.published_config || sanitizedConfig),
    publishedConfig: cloneMotionConfig(data.published_config || sanitizedConfig),
    publishedVersion: Number(data.published_version) || nextVersion,
    publishedAt: data.published_at || currentPublishedAt,
    updatedAt: data.updated_at || now,
  };

  cacheVisualConfig(normalizedSector, publishedData);

  if (configToPublish.themeSlug) {
    void upsertSectorTheme(normalizedSector, configToPublish.themeSlug).catch(() => {});
  }

  if (import.meta.env.DEV) {
    console.log("[MOTION] Publicação confirmada pelo Supabase");
  }
  return publishedData;
}

export function subscribeToVisualConfig(
  sector = "acougue",
  onVisualUpdate: (data: VisualConfigData) => void,
  onStatus?: (status: "online" | "syncing" | "offline") => void,
): () => void {
  const normalizedSector = sector.toLowerCase();
  if (!supabase) return () => undefined;

  const channelName = `sol-tv-visual-${normalizedSector}-${Math.random().toString(36).slice(2, 9)}`;

  const handleReload = async () => {
    onStatus?.("syncing");
    try {
      const data = await loadVisualConfig(normalizedSector);
      onVisualUpdate(data);
      onStatus?.("online");
    } catch {
      onStatus?.("offline");
    }
  };

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "sol_tv_visual_configs",
      },
      (payload) => {
        if (import.meta.env.DEV) {
          console.log("[MOTION] Nova publicação recebida:", payload);
        }
        if ((payload.new as { catalog_id?: string }).catalog_id || (payload.old as { catalog_id?: string }).catalog_id) return;
        const newRecord = payload.new as {
          sector?: string;
          draft_config?: MotionConfig;
          published_config?: MotionConfig;
          published_version?: number;
          published_at?: string;
          updated_at?: string;
        } | undefined;

        if (newRecord && newRecord.sector && newRecord.sector.toLowerCase() !== normalizedSector) {
          return;
        }

        if (newRecord?.published_config) {
          const updated: VisualConfigData = {
            sector: normalizedSector,
            draftConfig: cloneMotionConfig(newRecord.draft_config || newRecord.published_config),
            publishedConfig: cloneMotionConfig(newRecord.published_config),
            publishedVersion: Number(newRecord.published_version) || 1,
            publishedAt: newRecord.published_at || new Date().toISOString(),
            updatedAt: newRecord.updated_at || new Date().toISOString(),
          };
          const cached = loadCachedVisualConfig(normalizedSector);
          if (isVisualConfigNewer(updated, cached)) {
            cacheVisualConfig(normalizedSector, updated);
            onVisualUpdate(updated);
          }
        } else {
          void handleReload();
        }
      },
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        if (import.meta.env.DEV) {
          console.log("[MOTION] Realtime conectado");
        }
        onStatus?.("online");
        void handleReload();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        onStatus?.("offline");
      }
    });

  return () => {
    if (supabase) {
      void supabase.removeChannel(channel);
    }
  };
}

export async function loadOffers(
  sector = "acougue",
  activeOnly = false,
): Promise<Offer[]> {
  if (!supabase) return loadCachedOffers(sector);
  let query = supabase
    .from("sol_tv_offers")
    .select("*")
    .eq("sector", sector)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (activeOnly) {
    query = query.eq("active", true);
  }
  const { data, error } = await query;
  if (error) throw error;
  const offers = (data as DbOffer[]).map(fromDbOffer);
  cacheTvContent(sector, offers, loadCachedMedia(sector));
  return offers;
}

export async function upsertOffer(offer: Offer) {
  if (!supabase) throw new Error("Supabase não configurado.");
  const payload = toDbOffer(offer);
  const { error } = await supabase.from("sol_tv_offers").upsert(payload);
  if (error) {
    if (error.code === "42703" || error.code === "PGRST204" || error.message?.includes("image_scale")) {
      console.warn("[SOL TV] Coluna image_scale ainda não criada no sol_tv_offers. Salvando sem a coluna.");
      const fallbackPayload = { ...payload };
      delete (fallbackPayload as Record<string, unknown>).image_scale;
      const { error: fallbackError } = await supabase.from("sol_tv_offers").upsert(fallbackPayload);
      if (fallbackError) throw fallbackError;
      return;
    }
    throw error;
  }
}

export async function deleteOffer(id: string) {
  if (!supabase) throw new Error("Supabase não configurado.");
  try {
    await supabase.from("sol_tv_composition_items").delete().eq("offer_id", id);
  } catch {
    // ignore if table does not exist
  }
  const { error } = await supabase.from("sol_tv_offers").delete().eq("id", id);
  if (error) throw error;
}

export async function loadMedia(
  sector = "acougue",
  activeOnly = false,
): Promise<SolTvMedia[]> {
  if (!supabase) return loadCachedMedia(sector);
  let query = supabase
    .from("sol_tv_media")
    .select("*")
    .eq("sector", sector)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (activeOnly) {
    query = query.eq("active", true);
  }
  const { data, error } = await query;
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") {
      console.warn("Tabela sol_tv_media ainda não configurada no Supabase.");
      return [];
    }
    throw error;
  }
  const media = (data as DbMedia[]).map(fromDbMedia);
  cacheTvContent(sector, loadCachedOffers(sector), media);
  return media;
}

export async function deleteMediaStorageFile(storagePath?: string) {
  if (!supabase || !storagePath) return;
  try {
    const cleanPath = storagePath.replace(/^(sol-tv-media|tv-media)\//, "");
    const { error } = await supabase.storage.from(TV_MEDIA_BUCKET).remove([cleanPath]);
    if (error) {
      console.warn("[SOL TV Storage] Falha ao remover arquivo do Storage:", error);
    }
  } catch (err) {
    console.warn("[SOL TV Storage] Exceção ao remover arquivo do Storage:", err);
  }
}

export async function upsertMedia(media: SolTvMedia) {
  if (!supabase) throw new Error("Supabase não configurado.");

  const payload = toDbMedia(media);

  console.log("[SOL TV DB] Enviando INSERT/UPSERT para sol_tv_media:", {
    id: payload.id,
    title: payload.title,
    type: payload.type,
    media_url: payload.media_url,
    storage_path: payload.storage_path,
    sector: payload.sector,
    duration_seconds: payload.duration_seconds,
    position: payload.position,
    active: payload.active,
    starts_at: payload.starts_at,
    ends_at: payload.ends_at,
  });

  const { error, status, statusText } = await supabase
    .from("sol_tv_media")
    .upsert(payload);

  if (error) {
    const errorDetails = {
      code: error.code || "UNKNOWN",
      message: error.message || "Erro desconhecido",
      details: error.details || null,
      hint: error.hint || null,
      status: status || null,
      statusText: statusText || null,
    };

    console.error("[SOL TV DB Error] Falha ao inserir na tabela sol_tv_media:", errorDetails);

    const dbError = new Error(error.message || "Erro ao salvar mídia no Supabase.");
    Object.assign(dbError, errorDetails);
    throw dbError;
  }
}

export async function deleteMedia(id: string, storagePath?: string) {
  if (!supabase) throw new Error("Supabase não configurado.");
  const { error } = await supabase.from("sol_tv_media").delete().eq("id", id);
  if (error) throw error;
  if (storagePath) {
    await deleteMediaStorageFile(storagePath);
  }
}

export async function uploadMediaFile(
  file: File,
  sector = "acougue",
): Promise<{ publicUrl: string; storagePath: string; type: "image" | "video" }> {
  if (!supabase) throw new Error("Supabase não configurado.");

  const isVideo = file.type.startsWith("video/") || file.name.toLowerCase().endsWith(".mp4");
  const isImage =
    file.type.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp)$/i.test(file.name);

  if (!isVideo && !isImage) {
    throw new Error(
      "Formato inválido. Envie imagens (.jpg, .png, .webp) ou vídeos (.mp4).",
    );
  }

  // File size checks (e.g. 15MB for images, 60MB for videos)
  const maxBytes = isVideo ? 60 * 1024 * 1024 : 15 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(
      `Arquivo muito grande. Limite máximo: ${isVideo ? "60MB para vídeo" : "15MB para imagem"}.`,
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || (isVideo ? "mp4" : "jpg");
  const cleanSector = sector.toLowerCase().replace(/[^a-z0-9_-]/g, "") || "acougue";
  const fileName = `${cleanSector}/${isVideo ? "videos" : "imagens"}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  const { data, error } = await supabase.storage
    .from(TV_MEDIA_BUCKET)
    .upload(fileName, file, {
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) {
    console.error("Erro no upload para o Supabase Storage:", error);
    throw error;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(TV_MEDIA_BUCKET).getPublicUrl(data.path);

  return {
    publicUrl,
    storagePath: data.path,
    type: isVideo ? "video" : "image",
  };
}

export async function loadTvContent(
  sector = "acougue",
  activeOnly = false,
  includeCatalogs = false,
): Promise<TvContent> {
  if (!supabase) return loadCachedContent(sector);
  const [offers, media] = await Promise.all([
    loadOffers(sector, false),
    loadMedia(sector, activeOnly).catch(() => []),
  ]);
  const compositions = await loadCompositions(sector, activeOnly, offers, includeCatalogs).catch(() => []);
  if (!includeCatalogs) cacheTvContent(sector, offers, media, compositions);
  return contentFromData({ sector, offers, media, compositions });
}

export function subscribeToTvContent(
  sector = "acougue",
  onContent: (content: TvContent) => void,
  onStatus: (status: "online" | "syncing" | "offline") => void,
  activeOnly = false,
) {
  if (!supabase) return () => undefined;

  let debounceTimer: number | null = null;
  const channelName = `sol-tv-sync-${sector}-${Math.random().toString(36).slice(2, 9)}`;

  const executeReload = async () => {
    onStatus("syncing");
    try {
      const content = await loadTvContent(sector, activeOnly);
      console.log("[SOL TV] Conteúdo atualizado", {
        offersCount: content.offers.length,
        mediaCount: content.media.length,
        compositionsCount: content.compositions.length,
        playlistCount: content.playlist.length,
      });
      onContent(content);
      onStatus("online");
    } catch (err) {
      console.error("[SOL TV Realtime] Falha ao sincronizar conteúdo:", err);
      onStatus("offline");
    }
  };

  const scheduleReload = () => {
    if (debounceTimer) {
      window.clearTimeout(debounceTimer);
    }
    debounceTimer = window.setTimeout(() => {
      void executeReload();
    }, 250);
  };

  const handleEvent = (payload: {
    eventType: string;
    new?: Record<string, unknown>;
    old?: Record<string, unknown>;
    table: string;
  }) => {
    console.log(`[SOL TV realtime] Evento em ${payload.table} (${payload.eventType})`, payload);

    // For INSERT and UPDATE, if sector is provided and belongs to another sector, ignore
    const targetSector = (payload.new?.sector || payload.old?.sector) as string | undefined;
    if (targetSector && targetSector.toLowerCase() !== sector.toLowerCase()) {
      return;
    }
    // For DELETE (where old.sector may be omitted) or matching sector, always reload metadata
    scheduleReload();
  };

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "sol_tv_offers",
      },
      (payload) => handleEvent({ ...payload, table: "sol_tv_offers" }),
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "sol_tv_media",
      },
      (payload) => handleEvent({ ...payload, table: "sol_tv_media" }),
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "sol_tv_compositions",
      },
      (payload) => handleEvent({ ...payload, table: "sol_tv_compositions" }),
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "sol_tv_composition_items",
      },
      (payload) => handleEvent({ ...payload, table: "sol_tv_composition_items" }),
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "sol_tv_themes",
      },
      (payload) => {
        console.log(`[SOL TV realtime] Evento em sol_tv_themes (${payload.eventType})`, payload);
        const newRecord = payload.new as { sector?: string; active_theme?: string } | undefined;
        const oldRecord = payload.old as { sector?: string } | undefined;
        const targetSector = newRecord?.sector || oldRecord?.sector;
        if (targetSector && targetSector.toLowerCase() !== sector.toLowerCase()) {
          return;
        }
        const newTheme = newRecord?.active_theme;
        if (newTheme) {
          setSectorThemeSlug(sector, newTheme);
        }
      },
    )
    .subscribe((status, err) => {
      console.log(`[SOL TV Realtime] Status do canal ${channelName}: ${status}`, err || "");
      if (status === "SUBSCRIBED") {
        onStatus("online");
        void executeReload();
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn(`[SOL TV Realtime] Canal ${channelName} falhou: status=${status}`, err);
        onStatus("offline");
      }
    });

  return () => {
    if (debounceTimer) {
      window.clearTimeout(debounceTimer);
    }
    if (supabase) {
      void supabase.removeChannel(channel);
    }
  };
}

export function subscribeToOffers(
  onOffers: (offers: Offer[]) => void,
  onStatus: (status: "online" | "syncing" | "offline") => void,
  activeOnly = false,
  sector = "acougue",
) {
  if (!supabase) return () => undefined;
  let debounceTimer: number | null = null;
  const channelName = `sol-tv-offers-${sector}-${Math.random().toString(36).slice(2, 9)}`;

  const executeReload = async () => {
    onStatus("syncing");
    try {
      onOffers(await loadOffers(sector, activeOnly));
      onStatus("online");
    } catch {
      onStatus("offline");
    }
  };

  const scheduleReload = () => {
    if (debounceTimer) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => void executeReload(), 150);
  };

  const handleEvent = (payload: {
    eventType: string;
    new?: Record<string, unknown>;
    old?: Record<string, unknown>;
  }) => {
    const targetSector = (payload.new?.sector || payload.old?.sector) as string | undefined;
    if (targetSector && targetSector.toLowerCase() !== sector.toLowerCase()) return;
    scheduleReload();
  };

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "sol_tv_offers",
      },
      handleEvent,
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        onStatus("online");
        void executeReload();
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        onStatus("offline");
      }
    });

  return () => {
    if (debounceTimer) window.clearTimeout(debounceTimer);
    if (supabase) void supabase.removeChannel(channel);
  };
}

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error("Supabase não configurado.");
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session;
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) {
  if (!supabase) return { unsubscribe: () => undefined };
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback);
  return subscription;
}
