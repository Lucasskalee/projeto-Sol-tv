import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  cachedContent,
  databaseConfigured,
  loadSectorTheme,
  loadTvContent,
  subscribeToTvContent,
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
  const [motionConfig, setMotionConfig] = useState<MotionConfig>(() =>
    loadActiveMotionConfig(),
  );
  const [connection, setConnection] = useState<"online" | "syncing" | "offline">(
    databaseConfigured ? "syncing" : "offline",
  );
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    setContent(cachedContent(activeSector));
    setTheme(resolveTheme(queryTheme || getSectorThemeSlug(activeSector)));

    // Se houver override por query param, respeita o query param
    if (queryTheme) return;

    const unsubscribeTheme = subscribeToSectorTheme(activeSector, (newTheme) => {
      setTheme(newTheme);
    });

    void loadSectorTheme(activeSector).then((slug) => {
      setTheme(resolveTheme(slug));
    });

    const unsubscribeMotion = subscribeToActiveMotionConfig((newConfig) => {
      setMotionConfig(newConfig);
    });

    if (!databaseConfigured) {
      return () => {
        unsubscribeTheme();
        unsubscribeMotion();
      };
    }

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
