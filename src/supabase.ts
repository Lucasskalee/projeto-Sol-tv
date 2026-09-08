import {
  createClient,
  type AuthChangeEvent,
  type RealtimeChannel,
  type Session,
  type User,
} from "@supabase/supabase-js";
import { contentFromData, contentFromOffers } from "./data";
import type { Offer, SolTvMedia, TvContent } from "./types";

export type { Session, User };

export const TV_MEDIA_BUCKET = "tv-media";

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

function cacheKey(sector = "acougue") {
  return `sol-tv-${sector}-cache`;
}
function cacheMediaKey(sector = "acougue") {
  return `sol-tv-${sector}-media-cache`;
}

export function cacheTvContent(
  sector: string,
  offers: Offer[],
  media: SolTvMedia[] = [],
) {
  try {
    localStorage.setItem(cacheKey(sector), JSON.stringify(offers));
    localStorage.setItem(cacheMediaKey(sector), JSON.stringify(media));
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
  return contentFromData({ sector, offers, media });
}

export function cachedContent(sector = "acougue"): TvContent {
  return loadCachedContent(sector);
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
    const now = new Date().toISOString();
    query = query
      .eq("active", true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`);
  }
  const { data, error } = await query;
  if (error) throw error;
  const offers = (data as DbOffer[]).map(fromDbOffer);
  cacheTvContent(sector, offers, loadCachedMedia(sector));
  return offers;
}

export async function upsertOffer(offer: Offer) {
  if (!supabase) throw new Error("Supabase não configurado.");
  const { error } = await supabase.from("sol_tv_offers").upsert(toDbOffer(offer));
  if (error) throw error;
}

export async function deleteOffer(id: string) {
  if (!supabase) throw new Error("Supabase não configurado.");
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
    const now = new Date().toISOString();
    query = query
      .eq("active", true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`);
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

export async function upsertMedia(media: SolTvMedia) {
  if (!supabase) throw new Error("Supabase não configurado.");
  const { error } = await supabase.from("sol_tv_media").upsert(toDbMedia(media));
  if (error) throw error;
}

export async function deleteMedia(id: string, storagePath?: string) {
  if (!supabase) throw new Error("Supabase não configurado.");
  const { error } = await supabase.from("sol_tv_media").delete().eq("id", id);
  if (error) throw error;
  if (storagePath) {
    try {
      const cleanPath = storagePath.replace(/^(sol-tv-media|tv-media)\//, "");
      await supabase.storage.from(TV_MEDIA_BUCKET).remove([cleanPath]);
    } catch (err) {
      console.warn("Aviso ao remover arquivo do Storage:", err);
    }
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
): Promise<TvContent> {
  if (!supabase) return loadCachedContent(sector);
  const [offers, media] = await Promise.all([
    loadOffers(sector, activeOnly),
    loadMedia(sector, activeOnly).catch(() => []),
  ]);
  cacheTvContent(sector, offers, media);
  return contentFromData({ sector, offers, media });
}

export function subscribeToTvContent(
  sector = "acougue",
  onContent: (content: TvContent) => void,
  onStatus: (status: "online" | "syncing" | "offline") => void,
  activeOnly = false,
) {
  if (!supabase) return () => undefined;
  let offersChannel: RealtimeChannel;
  let mediaChannel: RealtimeChannel;

  const reload = async () => {
    onStatus("syncing");
    try {
      const content = await loadTvContent(sector, activeOnly);
      onContent(content);
      onStatus("online");
    } catch {
      onStatus("offline");
    }
  };

  offersChannel = supabase
    .channel(`sol-tv-offers-${sector}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "sol_tv_offers",
        filter: `sector=eq.${sector}`,
      },
      () => void reload(),
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        onStatus("online");
        void reload();
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        onStatus("offline");
      }
    });

  mediaChannel = supabase
    .channel(`sol-tv-media-${sector}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "sol_tv_media",
        filter: `sector=eq.${sector}`,
      },
      () => void reload(),
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void reload();
      }
    });

  return () => {
    void supabase.removeChannel(offersChannel);
    void supabase.removeChannel(mediaChannel);
  };
}

export function subscribeToOffers(
  onOffers: (offers: Offer[]) => void,
  onStatus: (status: "online" | "syncing" | "offline") => void,
  activeOnly = false,
  sector = "acougue",
) {
  if (!supabase) return () => undefined;
  let channel: RealtimeChannel;
  const reload = async () => {
    onStatus("syncing");
    try {
      onOffers(await loadOffers(sector, activeOnly));
      onStatus("online");
    } catch {
      onStatus("offline");
    }
  };
  channel = supabase
    .channel(`sol-tv-offers-${sector}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "sol_tv_offers",
        filter: `sector=eq.${sector}`,
      },
      () => void reload(),
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        onStatus("online");
        void reload();
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT")
        onStatus("offline");
    });
  return () => {
    void supabase.removeChannel(channel);
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
