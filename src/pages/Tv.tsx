import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  cachedContent,
  databaseConfigured,
  loadTvContent,
  subscribeToTvContent,
} from "../supabase";
import type { TvContent } from "../types";
import { TvPlayer } from "../components/TvPlayer";

export default function Tv() {
  const { sector: routeSector } = useParams<{ sector?: string }>();
  const activeSector = (routeSector || "acougue").toLowerCase();

  const [content, setContent] = useState<TvContent>(() => cachedContent(activeSector));
  const [connection, setConnection] = useState<"online" | "syncing" | "offline">(
    databaseConfigured ? "syncing" : "offline",
  );
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    setContent(cachedContent(activeSector));

    if (!databaseConfigured) return;

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

    return subscribeToTvContent(
      activeSector,
      (data) => {
        setContent(data);
        setLastSync(new Date());
      },
      setConnection,
      true,
    );
  }, [activeSector]);

  return (
    <main className="standalone">
      <TvPlayer
        content={content}
        mode="tv"
        connection={connection}
        lastSync={lastSync}
      />
    </main>
  );
}
