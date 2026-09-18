import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  cachedContent,
  databaseConfigured,
  loadSectorTheme,
  loadTvContent,
  subscribeToTvContent,
  loadVisualConfig,
  subscribeToVisualConfig,
  loadCachedVisualConfig,
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
import { loadActiveMotionConfig, subscribeToActiveMotionConfig } from "../motion/storage";

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
    return cachedVisual.publishedConfig || loadActiveMotionConfig();
  });
  const [connection, setConnection] = useState<"online" | "syncing" | "offline">(
    databaseConfigured ? "syncing" : "offline",
  );
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    setContent(cachedContent(activeSector));
    
    // 1. Initial cached config loading
    const cachedVisual = loadCachedVisualConfig(activeSector);
    if (cachedVisual.publishedConfig) {
      setMotionConfig(cachedVisual.publishedConfig);
      if (!queryTheme && cachedVisual.publishedConfig.themeSlug) {
        setTheme(resolveTheme(cachedVisual.publishedConfig.themeSlug));
      }
    } else {
      setTheme(resolveTheme(queryTheme || getSectorThemeSlug(activeSector)));
    }

    // 2. Realtime Theme subscription
    const unsubscribeTheme = subscribeToSectorTheme(activeSector, (newTheme) => {
      if (!queryTheme) setTheme(newTheme);
    });

    void loadSectorTheme(activeSector).then((slug) => {
      if (!queryTheme) setTheme(resolveTheme(slug));
    });

    // 3. Fallback Local Motion storage subscription (for local dev)
    const unsubscribeMotion = subscribeToActiveMotionConfig((newConfig) => {
      setMotionConfig(newConfig);
    });

    // 4. Supabase Realtime Visual Config subscription (sol_tv_visual_configs)
    let unsubscribeVisual: () => void = () => {};
    if (databaseConfigured) {
      loadVisualConfig(activeSector)
        .then((data) => {
          if (data.publishedConfig) {
            setMotionConfig(data.publishedConfig);
            if (!queryTheme && data.publishedConfig.themeSlug) {
              setTheme(resolveTheme(data.publishedConfig.themeSlug));
            }
          }
        })
        .catch((err) => {
          console.error("[TV Visual] Erro ao carregar configuração visual:", err);
        });

      unsubscribeVisual = subscribeToVisualConfig(activeSector, (data) => {
        if (data.publishedConfig) {
          console.log(`[TV Visual Realtime] Atualização recebida para setor ${activeSector} (v${data.publishedVersion})`);
          setMotionConfig(data.publishedConfig);
          if (!queryTheme && data.publishedConfig.themeSlug) {
            setTheme(resolveTheme(data.publishedConfig.themeSlug));
          }
        }
      });
    }

    if (!databaseConfigured) {
      return () => {
        unsubscribeTheme();
        unsubscribeMotion();
        unsubscribeVisual();
      };
    }

    // 5. TV Content loading & subscription
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
      unsubscribeMotion();
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
