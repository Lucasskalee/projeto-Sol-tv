import type { SolTvMedia } from "../types";
import { MediaLibrary } from "./admin/media/MediaLibrary";

export function MediaManager({
  mediaList,
  currentSector,
  onSaveMedia,
  onDeleteMedia,
  onToggleActiveMedia,
}: {
  mediaList: SolTvMedia[];
  currentSector: string;
  onSaveMedia: (media: SolTvMedia) => Promise<void>;
  onDeleteMedia: (id: string, storagePath?: string) => Promise<void>;
  onToggleActiveMedia?: (id: string, active: boolean) => Promise<void> | void;
}) {
  return (
    <MediaLibrary
      mediaList={mediaList}
      currentSector={currentSector}
      onSaveMedia={onSaveMedia}
      onDeleteMedia={onDeleteMedia}
      onToggleActiveMedia={onToggleActiveMedia}
    />
  );
}
