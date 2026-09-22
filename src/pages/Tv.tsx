import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  cachedContent,
  databaseConfigured,
  loadSectorTheme,
  loadTvContent,
  subscribeToTvContent,
  loadCachedVisualConfig,
  isVisualConfigNewer,
  loadVisualConfig,
  subscribeToVisualConfig,
  type VisualConfigData,
} from "../supabase";
import type { TvContent } from "../types";
import { TvPlayer } from "../components/TvPlayer";
import {
  getSectorThemeSlug,
  resolveTheme,
  subscribeToSectorTheme,
} from "../themes/resolveTheme";
import type { ThemeDefinition } from "../themes/types";
import type { MotionConfig } from "../motion/types";

export default function Tv() {
  const { sector: routeSector } = useParams<{ sector?: string }>();
  const [searchParams] = useSearchParams();
  const activeSector = (routeSector || "acougue").toLowerCase();
  const queryTheme = searchParams.get("theme");

  const [content, setContent] = useState<TvContent>(() => cachedContent(activeSector));
  const [theme, setTheme] = useState<ThemeDefinition>(() =>
    resolveTheme(queryTheme || getSectorThemeSlug(activeSector)),
  );
  const [motionConfig, setMotionConfig] = useState<MotionConfig>(() => {
    const cachedVisual = loadCachedVisualConfig(activeSector);
    return cachedVisual.publishedConfig;
  });
  const visualConfigRef = useRef<VisualConfigData>(loadCachedVisualConfig(activeSector));
  const [connection, setConnection] = useState<"online" | "syncing" | "offline">(
    databaseConfigured ? "syncing" : "offline",
  );
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    setContent(cachedContent(activeSector));

    // 1. Initial published snapshot loading
    const cachedVisual = loadCachedVisualConfig(activeSector);
    visualConfigRef.current = cachedVisual;
    if (import.meta.env.DEV) {
      console.log(`[MOTION] Cache carregado: version ${cachedVisual.publishedVersion}`);
    }
    if (cachedVisual.publishedConfig) {
      setMotionConfig(cachedVisual.publishedConfig);
      if (!queryTheme && cachedVisual.publishedConfig.themeSlug) {
        setTheme(resolveTheme(cachedVisual.publishedConfig.themeSlug));
      }
    } else {
      setTheme(resolveTheme(queryTheme || getSectorThemeSlug(activeSector)));
    }

    const applyVisualConfig = (visual: VisualConfigData, force = false) => {
      if (!force && !isVisualConfigNewer(visual, visualConfigRef.current)) return;

      visualConfigRef.current = visual;
      setMotionConfig(visual.publishedConfig);
      if (!queryTheme && visual.publishedConfig.themeSlug) {
        setTheme(resolveTheme(visual.publishedConfig.themeSlug));
      }
    };

    // Server configuration always wins over the local fallback on initial load.
    void loadVisualConfig(activeSector).then((visual) => {
      if (import.meta.env.DEV) {
        console.log(`[MOTION] Servidor carregado: version ${visual.publishedVersion}`);
        console.log(`[MOTION] Aplicando servidor: version ${visual.publishedVersion}`);
      }
      applyVisualConfig(visual, true);
    });

    const unsubscribeVisual = subscribeToVisualConfig(
      activeSector,
      (visual) => {
        if (isVisualConfigNewer(visual, visualConfigRef.current)) {
          if (import.meta.env.DEV) {
            console.log(`[MOTION] Nova publicação recebida: version ${visual.publishedVersion}`);
          }
          applyVisualConfig(visual);
        }
      },
      setConnection,
    );

    // 2. Realtime Theme subscription
    const unsubscribeTheme = subscribeToSectorTheme(activeSector, (newTheme) => {
      if (!queryTheme) setTheme(newTheme);
    });

    void loadSectorTheme(activeSector).then((slug) => {
      if (!queryTheme) setTheme(resolveTheme(slug));
    });

    if (!databaseConfigured) {
      return () => {
        unsubscribeTheme();
        unsubscribeVisual();
      };
    }

    // 4. TV Content loading & subscription
    loadTvContent(activeSector, true)
      .then((data) => {
        setContent(data);
        setConnection("online");
        setLastSync(new Date());
      })
      .catch((err) => {
        console.error("Erro ao carregar conteúdo da TV:", err);
        setConnection("offline");
      });

    const unsubscribeContent = subscribeToTvContent(
      activeSector,
      (data) => {
        setContent(data);
        setLastSync(new Date());
      },
      setConnection,
      true,
    );

    return () => {
      unsubscribeTheme();
      unsubscribeContent();
      unsubscribeVisual();
    };
  }, [activeSector, queryTheme]);

  return (
    <main className="standalone">
      <TvPlayer
        content={content}
        mode="tv"
        connection={connection}
        lastSync={lastSync}
        theme={theme}
        motionConfig={motionConfig}
      />
    </main>
  );
}
