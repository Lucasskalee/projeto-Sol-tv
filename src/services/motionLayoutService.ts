import { supabase } from "../supabase";
import type { MotionConfig } from "../motion/types";
import { DEFAULT_MOTION_CONFIG, cloneMotionConfig } from "../motion/defaults";
import { DEFAULT_PRESETS } from "../motion/presets";
import {
  sanitizeMotionConfigForStorage,
  safeLocalStorageSetItem,
} from "../motion/storage";
import type {
  MotionLayout,
  MotionPublication,
  CreateLayoutInput,
  UpdateLayoutInput,
  PublishLayoutInput,
} from "../motion/layoutTypes";
import {
  loadCachedVisualConfig,
  cacheVisualConfig,
  type VisualConfigData,
} from "../supabase";

const LAYOUTS_STORAGE_KEY = "skalee_motion_layouts_v1";
const PUBLICATIONS_STORAGE_KEY = "skalee_motion_publications_v1";

// In-memory cache for ultra-fast access
let memoryLayouts: MotionLayout[] | null = null;
let memoryPublications: Record<string, MotionPublication> = {};

/**
 * Built-in Initial Layouts Seed
 */
function getInitialSeedLayouts(): MotionLayout[] {
  const now = "2026-09-01T00:00:00.000Z";
  return [
    {
      id: "layout-sol-premium",
      name: "Sol Premium (Canônico)",
      description: "Identidade clássica do Supermercado Sol com dourado e badge vibrante",
      category: "canonico",
      config: cloneMotionConfig(
        DEFAULT_PRESETS.find((p) => p.id === "preset-sol-premium")?.config ||
          DEFAULT_MOTION_CONFIG
      ),
      isSystem: true,
      createdBy: "Sistema",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "layout-sol-branco-sunburst",
      name: "Fundo Branco & Sunburst",
      description: "Identidade visual clean com fundo branco, títulos pretos e raios solares sutis",
      category: "canonico",
      config: cloneMotionConfig({
        ...DEFAULT_MOTION_CONFIG,
        themeSlug: "normal",
        background: {
          type: "sunburst",
          color: "#ffffff",
          gradientStart: "#ffffff",
          gradientEnd: "#f3f4f6",
          gradientAngle: 180,
          sunburst: {
            primaryColor: "#ffffff",
            secondaryColor: "#f3f4f6",
            raysCount: 24,
            speed: 30,
          },
        },
        colorOverrides: {
          enabled: true,
          productName: "#111111",
          price: "#000000",
          background: "#ffffff",
          badgeBg: "#e21b2d",
          badgeText: "#ffffff",
        },
        logo: {
          position: "top-left",
          size: 68,
          sectorText: "",
          sectorTextColor: "#111111",
          sectorTextSize: 13,
          sectorLayout: "hidden",
        },
        badge: {
          type: "text",
          visible: false,
          text: "",
          size: 0,
          rotation: 0,
          background: "#e21b2d",
          color: "#ffffff",
        },
      }),
      isSystem: true,
      createdBy: "Sistema",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "layout-black-friday",
      name: "Black Friday 2026",
      description: "Tema escuro de alto impacto com acentos dourados e física de preço impactante",
      category: "promocional",
      config: cloneMotionConfig(
        DEFAULT_PRESETS.find((p) => p.id === "preset-black-friday")?.config ||
          DEFAULT_MOTION_CONFIG
      ),
      isSystem: false,
      createdBy: "Sistema",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "layout-dia-s",
      name: "Dia S — Super Ofertas",
      description: "Fundo amarelo e laranja vibrante para grandes dias de promoção",
      category: "promocional",
      config: cloneMotionConfig(
        DEFAULT_PRESETS.find((p) => p.id === "preset-dia-s")?.config ||
          DEFAULT_MOTION_CONFIG
      ),
      isSystem: false,
      createdBy: "Sistema",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "layout-natal",
      name: "Natal Especial",
      description: "Layout festivo de fim de ano com tons de vermelho e dourado",
      category: "sazonal",
      config: cloneMotionConfig({
        ...DEFAULT_MOTION_CONFIG,
        themeSlug: "normal",
        background: {
          type: "gradient",
          color: "#7f1d1d",
          gradientStart: "#991b1b",
          gradientEnd: "#450a0a",
          gradientAngle: 145,
        },
        colorOverrides: {
          enabled: true,
          productName: "#ffffff",
          price: "#fde047",
          background: "#7f1d1d",
          badgeBg: "#15803d",
          badgeText: "#ffffff",
        },
        badge: {
          type: "text",
          text: "ESPECIAL DE NATAL",
          size: 72,
          rotation: -2,
          background: "#15803d",
          color: "#ffffff",
        },
      }),
      isSystem: false,
      createdBy: "Sistema",
      createdAt: now,
      updatedAt: now,
    },
  ];
}

/**
 * Loads layouts from localStorage
 */
function loadLocalLayouts(): MotionLayout[] {
  if (typeof localStorage === "undefined") return getInitialSeedLayouts();
  try {
    const raw = localStorage.getItem(LAYOUTS_STORAGE_KEY);
    if (!raw) {
      const initial = getInitialSeedLayouts();
      safeLocalStorageSetItem(LAYOUTS_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return getInitialSeedLayouts();
  } catch {
    return getInitialSeedLayouts();
  }
}

/**
 * Saves layouts to localStorage
 */
function saveLocalLayouts(layouts: MotionLayout[]): void {
  safeLocalStorageSetItem(LAYOUTS_STORAGE_KEY, JSON.stringify(layouts));
  memoryLayouts = layouts;
}

/**
 * Loads publications from localStorage
 */
function loadLocalPublications(): Record<string, MotionPublication> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(PUBLICATIONS_STORAGE_KEY);
    if (!raw) {
      // Initialize with Açougue publication from cache if available
      const cached = loadCachedVisualConfig("acougue");
      const initialPub: MotionPublication = {
        id: "pub-acougue-initial",
        storeId: "default",
        sector: "acougue",
        layoutId: "layout-sol-branco-sunburst",
        layoutName: "Fundo Branco & Sunburst",
        publishedConfig: cached.publishedConfig || DEFAULT_MOTION_CONFIG,
        publishedVersion: cached.publishedVersion || 1,
        publishedAt: cached.publishedAt || new Date().toISOString(),
        publishedBy: "Sistema",
      };
      const initial = { acougue: initialPub };
      safeLocalStorageSetItem(PUBLICATIONS_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Saves publications to localStorage
 */
function saveLocalPublications(pubs: Record<string, MotionPublication>): void {
  safeLocalStorageSetItem(PUBLICATIONS_STORAGE_KEY, JSON.stringify(pubs));
  memoryPublications = pubs;
}

// -----------------------------------------------------------------------------
// LAYOUT SERVICE FUNCTIONS (CRUD)
// -----------------------------------------------------------------------------

/**
 * Lists all available layouts (from Supabase or local fallback)
 */
export async function listLayouts(): Promise<MotionLayout[]> {
  if (memoryLayouts && memoryLayouts.length > 0) {
    // Background fetch from Supabase if online
    if (supabase) {
      void fetchRemoteLayouts();
    }
    return memoryLayouts;
  }

  const local = loadLocalLayouts();
  memoryLayouts = local;

  if (!supabase) return local;

  try {
    const remote = await fetchRemoteLayouts();
    if (remote && remote.length > 0) {
      return remote;
    }
  } catch (err) {
    console.warn("[MotionLayouts] Falha ao carregar do Supabase, usando local:", err);
  }

  return local;
}

async function fetchRemoteLayouts(): Promise<MotionLayout[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("motion_layouts")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") return null; // table doesn't exist yet
      throw error;
    }

    if (!data || data.length === 0) {
      // Seed remote table with initial layouts
      const initial = getInitialSeedLayouts();
      for (const item of initial) {
        await supabase.from("motion_layouts").upsert({
          id: item.id,
          name: item.name,
          description: item.description || "",
          category: item.category,
          config_json: sanitizeMotionConfigForStorage(item.config),
          thumbnail_url: item.thumbnailUrl || "",
          is_system: item.isSystem || false,
          created_by: item.createdBy || "Sistema",
          created_at: item.createdAt,
          updated_at: item.updatedAt,
        });
      }
      return initial;
    }

    const remoteLayouts: MotionLayout[] = data.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description || "",
      category: row.category || "custom",
      config: cloneMotionConfig(row.config_json || DEFAULT_MOTION_CONFIG),
      thumbnailUrl: row.thumbnail_url || "",
      isSystem: Boolean(row.is_system),
      createdBy: row.created_by || "admin",
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    }));

    saveLocalLayouts(remoteLayouts);
    return remoteLayouts;
  } catch (err) {
    console.warn("[MotionLayouts] Erro ao buscar layouts remotos:", err);
    return null;
  }
}

/**
 * Gets a layout by its unique ID
 */
export async function getLayoutById(id: string): Promise<MotionLayout | null> {
  const all = await listLayouts();
  const found = all.find((l) => l.id === id);
  if (found) return found;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("motion_layouts")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          name: data.name,
          description: data.description || "",
          category: data.category || "custom",
          config: cloneMotionConfig(data.config_json || DEFAULT_MOTION_CONFIG),
          thumbnailUrl: data.thumbnail_url || "",
          isSystem: Boolean(data.is_system),
          createdBy: data.created_by || "admin",
          createdAt: data.created_at || new Date().toISOString(),
          updatedAt: data.updated_at || new Date().toISOString(),
        };
      }
    } catch {}
  }

  return null;
}

/**
 * Creates a new independent layout
 */
export async function createLayout(input: CreateLayoutInput): Promise<MotionLayout> {
  let baseConfig = DEFAULT_MOTION_CONFIG;
  if (input.config) {
    baseConfig = input.config;
  } else if (input.baseLayoutId) {
    const base = await getLayoutById(input.baseLayoutId);
    if (base) baseConfig = base.config;
  }

  const now = new Date().toISOString();
  const newLayout: MotionLayout = {
    id: `layout-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: input.name.trim() || "Novo Layout",
    description: input.description?.trim() || "",
    category: input.category || "custom",
    config: cloneMotionConfig(baseConfig),
    isSystem: false,
    createdBy: "admin",
    createdAt: now,
    updatedAt: now,
  };

  const currentList = await listLayouts();
  const updatedList = [newLayout, ...currentList];
  saveLocalLayouts(updatedList);

  if (supabase) {
    try {
      await supabase.from("motion_layouts").insert({
        id: newLayout.id,
        name: newLayout.name,
        description: newLayout.description,
        category: newLayout.category,
        config_json: sanitizeMotionConfigForStorage(newLayout.config),
        is_system: false,
        created_by: newLayout.createdBy,
        created_at: now,
        updated_at: now,
      });
    } catch (err) {
      console.warn("[MotionLayouts] Falha ao persistir layout criado no Supabase:", err);
    }
  }

  return newLayout;
}

/**
 * Updates / Saves a layout draft.
 * CRITICAL RULE: SALVAR ≠ PUBLICAR.
 * Updating a layout ONLY saves to motion_layouts. It NEVER alters motion_publications or the live TV!
 */
export async function updateLayout(
  id: string,
  input: UpdateLayoutInput
): Promise<MotionLayout> {
  const currentList = await listLayouts();
  const index = currentList.findIndex((l) => l.id === id);

  if (index === -1) {
    throw new Error(`Layout com ID "${id}" não foi encontrado.`);
  }

  const current = currentList[index];
  const now = new Date().toISOString();

  const updated: MotionLayout = {
    ...current,
    name: input.name !== undefined ? input.name.trim() : current.name,
    description: input.description !== undefined ? input.description.trim() : current.description,
    category: input.category || current.category,
    config: input.config ? cloneMotionConfig(input.config) : current.config,
    updatedAt: now,
  };

  currentList[index] = updated;
  saveLocalLayouts([...currentList]);

  if (supabase) {
    try {
      await supabase
        .from("motion_layouts")
        .update({
          name: updated.name,
          description: updated.description,
          category: updated.category,
          config_json: sanitizeMotionConfigForStorage(updated.config),
          updated_at: now,
        })
        .eq("id", id);
    } catch (err) {
      console.warn("[MotionLayouts] Falha ao atualizar layout no Supabase:", err);
    }
  }

  return updated;
}

/**
 * Duplicates an existing layout into an independent new layout
 */
export async function duplicateLayout(
  id: string,
  customName?: string
): Promise<MotionLayout> {
  const source = await getLayoutById(id);
  if (!source) {
    throw new Error(`Layout fonte com ID "${id}" não encontrado.`);
  }

  const newName = customName || `Cópia de ${source.name}`;
  return createLayout({
    name: newName,
    description: source.description,
    category: source.category === "canonico" ? "custom" : source.category,
    config: cloneMotionConfig(source.config),
  });
}

/**
 * Renames a layout
 */
export async function renameLayout(id: string, newName: string): Promise<MotionLayout> {
  return updateLayout(id, { name: newName });
}

/**
 * Deletes a layout (with protection for system presets)
 */
export async function deleteLayout(id: string): Promise<boolean> {
  const currentList = await listLayouts();
  const target = currentList.find((l) => l.id === id);

  if (!target) return false;
  if (target.isSystem) {
    throw new Error("Layouts canônicos do sistema não podem ser excluídos.");
  }

  const updatedList = currentList.filter((l) => l.id !== id);
  saveLocalLayouts(updatedList);

  if (supabase) {
    try {
      await supabase.from("motion_layouts").delete().eq("id", id);
    } catch (err) {
      console.warn("[MotionLayouts] Falha ao deletar layout no Supabase:", err);
    }
  }

  return true;
}

// -----------------------------------------------------------------------------
// PUBLICATION SERVICE FUNCTIONS (Explicit Production Publication)
// -----------------------------------------------------------------------------

/**
 * Lists all active sector publications
 */
export async function listPublications(): Promise<Record<string, MotionPublication>> {
  const local = loadLocalPublications();
  memoryPublications = local;

  if (!supabase) return local;

  try {
    const { data, error } = await supabase.from("motion_publications").select("*");
    if (!error && data && data.length > 0) {
      const pubs: Record<string, MotionPublication> = {};
      data.forEach((row: any) => {
        const sec = (row.sector || "").toLowerCase();
        if (sec) {
          pubs[sec] = {
            id: row.id,
            storeId: row.store_id || "default",
            sector: sec,
            layoutId: row.layout_id || null,
            layoutName: row.layout_name || "",
            publishedConfig: cloneMotionConfig(row.published_config || DEFAULT_MOTION_CONFIG),
            publishedVersion: Number(row.published_version) || 1,
            publishedAt: row.published_at || new Date().toISOString(),
            publishedBy: row.published_by || "admin",
          };
        }
      });
      saveLocalPublications(pubs);
      return pubs;
    }
  } catch (err) {
    console.warn("[MotionPublications] Falha ao listar publicações do Supabase:", err);
  }

  return local;
}

/**
 * Gets the active publication snapshot for a given sector
 */
export async function getPublicationForSector(
  sector: string
): Promise<MotionPublication> {
  const normalizedSector = sector.toLowerCase();
  const pubs = await listPublications();
  if (pubs[normalizedSector]) {
    return pubs[normalizedSector];
  }

  // Fallback to legacy sol_tv_visual_configs
  const cachedVisual = loadCachedVisualConfig(normalizedSector);
  const fallbackPub: MotionPublication = {
    id: `pub-${normalizedSector}-legacy`,
    storeId: "default",
    sector: normalizedSector,
    layoutId: null,
    layoutName: "Visual Atual",
    publishedConfig: cachedVisual.publishedConfig || DEFAULT_MOTION_CONFIG,
    publishedVersion: cachedVisual.publishedVersion || 1,
    publishedAt: cachedVisual.publishedAt || new Date().toISOString(),
    publishedBy: "Sistema",
  };

  return fallbackPub;
}

/**
 * Explicitly publishes a layout config snapshot to a sector TV.
 * This is the ONLY operation that updates what the live TV renders.
 */
export async function publishLayoutToSector(
  input: PublishLayoutInput
): Promise<MotionPublication> {
  const normalizedSector = input.sector.toLowerCase();
  const currentPub = await getPublicationForSector(normalizedSector);
  const nextVersion = (currentPub.publishedVersion || 0) + 1;
  const now = new Date().toISOString();
  const sanitized = sanitizeMotionConfigForStorage(input.configToPublish);

  const publication: MotionPublication = {
    id: `pub-${normalizedSector}-${Date.now()}`,
    storeId: input.storeId || "default",
    sector: normalizedSector,
    layoutId: input.layoutId || null,
    layoutName: input.layoutName || "Layout Publicado",
    publishedConfig: cloneMotionConfig(sanitized),
    publishedVersion: nextVersion,
    publishedAt: now,
    publishedBy: input.publishedBy || "admin",
  };

  // Update local memory and cache
  const allPubs = loadLocalPublications();
  allPubs[normalizedSector] = publication;
  saveLocalPublications(allPubs);

  // Sync to legacy sol_tv_visual_configs for backward compatibility
  const legacyData: VisualConfigData = {
    sector: normalizedSector,
    draftConfig: cloneMotionConfig(sanitized),
    publishedConfig: cloneMotionConfig(sanitized),
    publishedVersion: nextVersion,
    publishedAt: now,
    updatedAt: now,
  };
  cacheVisualConfig(normalizedSector, legacyData);

  // Broadcast custom event for any live preview listeners
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("skalee_motion_publication_changed", {
        detail: { sector: normalizedSector, publication },
      })
    );
  }

  if (supabase) {
    try {
      // 1. Write to motion_publications
      await supabase.from("motion_publications").upsert({
        store_id: publication.storeId,
        sector: normalizedSector,
        layout_id: publication.layoutId,
        layout_name: publication.layoutName,
        published_config: sanitized,
        published_version: nextVersion,
        published_at: now,
        published_by: publication.publishedBy,
      });

      // 2. Write to sol_tv_visual_configs (backward compatibility)
      await supabase.from("sol_tv_visual_configs").upsert({
        sector: normalizedSector,
        draft_config: sanitized,
        published_config: sanitized,
        published_version: nextVersion,
        published_at: now,
        updated_at: now,
      });
    } catch (err) {
      console.warn("[MotionPublications] Erro ao gravar publicação no Supabase:", err);
    }
  }

  return publication;
}

/**
 * Subscribes to publication changes for a specific sector.
 * The TV calls this to update only when an explicit publication happens.
 */
export function subscribeToSectorPublication(
  sector: string,
  onUpdate: (pub: MotionPublication) => void
): () => void {
  const normalizedSector = sector.toLowerCase();

  // 1. Local window event listener (for same-window / local tests)
  const handleLocalEvent = (e: Event) => {
    const custom = e as CustomEvent<{ sector: string; publication: MotionPublication }>;
    if (custom.detail?.sector === normalizedSector && custom.detail.publication) {
      onUpdate(custom.detail.publication);
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("skalee_motion_publication_changed", handleLocalEvent);
  }

  // 2. Supabase Realtime channel for motion_publications & sol_tv_visual_configs
  let channel: any = null;
  if (supabase) {
    const channelName = `pub-realtime-${normalizedSector}-${Math.random().toString(36).slice(2, 7)}`;
    channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "motion_publications",
        },
        (payload: any) => {
          const rec = payload.new;
          if (rec && rec.sector && rec.sector.toLowerCase() === normalizedSector) {
            const pub: MotionPublication = {
              id: rec.id || `pub-${normalizedSector}`,
              storeId: rec.store_id || "default",
              sector: normalizedSector,
              layoutId: rec.layout_id || null,
              layoutName: rec.layout_name || "",
              publishedConfig: cloneMotionConfig(rec.published_config || DEFAULT_MOTION_CONFIG),
              publishedVersion: Number(rec.published_version) || 1,
              publishedAt: rec.published_at || new Date().toISOString(),
              publishedBy: rec.published_by || "admin",
            };
            onUpdate(pub);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sol_tv_visual_configs",
        },
        (payload: any) => {
          const rec = payload.new;
          if (rec && rec.sector && rec.sector.toLowerCase() === normalizedSector && rec.published_config) {
            const pub: MotionPublication = {
              id: `pub-${normalizedSector}-${rec.published_version}`,
              storeId: "default",
              sector: normalizedSector,
              layoutId: null,
              layoutName: "Visual Publicado",
              publishedConfig: cloneMotionConfig(rec.published_config),
              publishedVersion: Number(rec.published_version) || 1,
              publishedAt: rec.published_at || new Date().toISOString(),
              publishedBy: "admin",
            };
            onUpdate(pub);
          }
        }
      )
      .subscribe();
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("skalee_motion_publication_changed", handleLocalEvent);
    }
    if (channel && supabase) {
      void supabase.removeChannel(channel);
    }
  };
}
