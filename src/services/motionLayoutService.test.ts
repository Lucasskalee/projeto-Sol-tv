import { describe, it, expect, beforeEach } from "vitest";
import {
  listLayouts,
  getLayoutById,
  createLayout,
  updateLayout,
  duplicateLayout,
  deleteLayout,
  getPublicationForSector,
  publishLayoutToSector,
} from "./motionLayoutService";
import { DEFAULT_MOTION_CONFIG } from "../motion/defaults";

// Mock localStorage for Node/Vitest environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("Motion Layout Service — Desacoplamento Estrito (Salvar != Publicar)", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("1. Lista layouts iniciais com presets canônicos", async () => {
    const layouts = await listLayouts();
    expect(layouts.length).toBeGreaterThanOrEqual(3);
    const solPremium = layouts.find((l) => l.name.includes("Sol Premium"));
    expect(solPremium).toBeDefined();
    expect(solPremium?.isSystem).toBe(true);
  });

  it("2. Cria um novo layout independente", async () => {
    const newLayout = await createLayout({
      name: "Dia das Mães 2026",
      description: "Layout promocional especial",
      category: "promocional",
      config: {
        ...DEFAULT_MOTION_CONFIG,
        themeSlug: "normal",
        background: {
          type: "solid",
          color: "#ff69b4",
          gradientStart: "#ff69b4",
          gradientEnd: "#ff1493",
          gradientAngle: 135,
        },
      },
    });

    expect(newLayout.id).toBeDefined();
    expect(newLayout.name).toBe("Dia das Mães 2026");
    expect(newLayout.config.background.color).toBe("#ff69b4");

    const fetched = await getLayoutById(newLayout.id);
    expect(fetched?.name).toBe("Dia das Mães 2026");
  });

  it("3. Duplica um layout criando uma cópia totalmente independente", async () => {
    const source = (await listLayouts())[0];
    const cloned = await duplicateLayout(source.id, "Sol Premium 2027");

    expect(cloned.id).not.toBe(source.id);
    expect(cloned.name).toBe("Sol Premium 2027");
    expect(cloned.isSystem).toBe(false);

    // Alterar o clone não afeta o original
    await updateLayout(cloned.id, {
      name: "Sol Premium 2027 Modificado",
      config: {
        ...cloned.config,
        speed: 0.5,
      },
    });

    const originalCheck = await getLayoutById(source.id);
    const clonedCheck = await getLayoutById(cloned.id);

    expect(originalCheck?.name).toBe(source.name);
    expect(clonedCheck?.name).toBe("Sol Premium 2027 Modificado");
    expect(clonedCheck?.config.speed).toBe(0.5);
    expect(originalCheck?.config.speed).toBe(source.config.speed);
  });

  it("4. REGRA DE OURO: Salvar um layout NÃO altera o visual publicado em cache", async () => {
    const layouts = await listLayouts();
    const solPremium = layouts.find((l) => l.name.includes("Sol Premium"))!;

    // 2. O usuário abre o Sol Premium e faz alterações drásticas no editor e clica em SALVAR
    const modifiedConfig = {
      ...solPremium.config,
      background: {
        type: "solid" as const,
        color: "#990000",
        gradientStart: "#990000",
        gradientEnd: "#660000",
        gradientAngle: 180,
      },
      speed: 0.25,
    };

    await updateLayout(solPremium.id, {
      config: modifiedConfig,
    });

    // 3. Verifica que o rascunho do layout foi atualizado
    const layoutAfterSave = await getLayoutById(solPremium.id);
    expect(layoutAfterSave?.config.background.color).toBe("#990000");

    // 4. A configuração publicada segue sendo o fallback anterior.
    const tvPublication = await getPublicationForSector("acougue");
    expect(tvPublication.publishedConfig.background.color).toBe(
      DEFAULT_MOTION_CONFIG.background.color,
    );
    expect(tvPublication.publishedConfig.background.color).not.toBe("#990000");
  });

  it("5. Publicação sem Supabase falha e não cria um falso snapshot local", async () => {
    const layouts = await listLayouts();
    const layout = layouts[0];

    const newConfig = {
      ...layout.config,
      background: {
        type: "solid" as const,
        color: "#0055aa",
        gradientStart: "#0055aa",
        gradientEnd: "#003366",
        gradientAngle: 180,
      },
    };

    await expect(
      publishLayoutToSector({
        sector: "acougue",
        layoutId: layout.id,
        layoutName: layout.name,
        configToPublish: newConfig,
      }),
    ).rejects.toThrow("A configuração não foi salva no servidor");

    expect(localStorage.getItem("sol-tv-acougue-visual-config-v2")).toBeNull();
  });

  it("6. Impede exclusão de layouts canônicos do sistema", async () => {
    const layouts = await listLayouts();
    const systemLayout = layouts.find((l) => l.isSystem)!;

    await expect(deleteLayout(systemLayout.id)).rejects.toThrow(
      "Layouts canônicos do sistema não podem ser excluídos."
    );
  });
});
