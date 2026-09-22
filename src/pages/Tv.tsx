import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  cachedContent,
  databaseConfigured,
  loadSectorTheme,
  loadTvContent,
  subscribeToTvContent,
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
import {
  getPublicationForSector,
  subscribeToSectorPublication,
} from "../services/motionLayoutService";

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
  const [connection, setConnection] = useState<"online" | "syncing" | "offline">(
    databaseConfigured ? "syncing" : "offline",
  );
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    setContent(cachedContent(activeSector));

    // 1. Initial published snapshot loading
    const cachedVisual = loadCachedVisualConfig(activeSector);
    if (cachedVisual.publishedConfig) {
      setMotionConfig(cachedVisual.publishedConfig);
      if (!queryTheme && cachedVisual.publishedConfig.themeSlug) {
        setTheme(resolveTheme(cachedVisual.publishedConfig.themeSlug));
      }
    } else {
      setTheme(resolveTheme(queryTheme || getSectorThemeSlug(activeSector)));
    }

    // Load active published snapshot from publication service
    void getPublicationForSector(activeSector).then((pub) => {
      if (pub.publishedConfig) {
        setMotionConfig(pub.publishedConfig);
        if (!queryTheme && pub.publishedConfig.themeSlug) {
          setTheme(resolveTheme(pub.publishedConfig.themeSlug));
        }
      }
    });

    // 2. Realtime Theme subscription
    const unsubscribeTheme = subscribeToSectorTheme(activeSector, (newTheme) => {
      if (!queryTheme) setTheme(newTheme);
    });

    void loadSectorTheme(activeSector).then((slug) => {
      if (!queryTheme) setTheme(resolveTheme(slug));
    });

    // 3. Realtime Publication Subscription (Listens ONLY to explicit publications!)
    const unsubscribePublication = subscribeToSectorPublication(activeSector, (pub) => {
      if (pub.publishedConfig) {
        console.log(
          `[TV Publication Realtime] Publicação recebida para ${activeSector} (v${pub.publishedVersion} - ${pub.layoutName})`
        );
        setMotionConfig(pub.publishedConfig);
        if (!queryTheme && pub.publishedConfig.themeSlug) {
          setTheme(resolveTheme(pub.publishedConfig.themeSlug));
        }
      }
    });

    if (!databaseConfigured) {
      return () => {
        unsubscribeTheme();
        unsubscribePublication();
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
      unsubscribePublication();
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
