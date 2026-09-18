import { useEffect, useState, type ReactNode, type RefObject } from "react";

/** Scale the complete 1080p poster, including branding and safe margins. */
export function TvViewport({ children, viewportRef }: {
  children: ReactNode;
  viewportRef: RefObject<HTMLDivElement | null>;
}) {
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setScale(Math.min(entry.contentRect.width / 1920, entry.contentRect.height / 1080));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [viewportRef]);
  return (
    <div className="tv-viewport" ref={viewportRef}>
      <div className="tv-canvas" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
