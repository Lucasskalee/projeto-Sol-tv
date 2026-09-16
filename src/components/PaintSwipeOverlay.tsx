import type { PaintSwipeColorMode, PaintSwipeDirection, PaintSwipeSpeed } from "../motion/types";

export type PaintSwipeOverlayProps = {
  phase: "idle" | "covering" | "revealing";
  direction?: PaintSwipeDirection;
  colorMode?: PaintSwipeColorMode;
  speed?: PaintSwipeSpeed;
};

export function PaintSwipeOverlay({
  phase,
  direction = "left-to-right",
  colorMode = "dual",
  speed = "normal",
}: PaintSwipeOverlayProps) {
  if (phase === "idle") {
    return null;
  }

  const isDual = colorMode === "dual";
  const isRedOnly = colorMode === "red";
  const isBlackOnly = colorMode === "black";

  return (
    <div
      className={`paint-swipe-overlay phase-${phase} dir-${direction} mode-${colorMode} speed-${speed}`}
      aria-hidden="true"
    >
      {/* Camada 1: Preto de Fundo (ou cor única) */}
      {(isDual || isBlackOnly) && (
        <div className="paint-layer paint-layer-black">
          <svg
            className="paint-svg-brush"
            viewBox="0 0 1920 1080"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Corpo principal do pincel com cerdas irregulares */}
            <path
              d="M -100 0 
                 L 1780 0 
                 Q 1860 35, 1820 70 
                 Q 1910 110, 1840 160 
                 Q 1930 220, 1860 270 
                 Q 1890 340, 1810 390 
                 Q 1940 450, 1850 510 
                 Q 1880 580, 1800 630 
                 Q 1920 690, 1830 750 
                 Q 1950 820, 1860 880 
                 Q 1900 950, 1810 1000 
                 Q 1870 1050, 1780 1080 
                 L -100 1080 Z"
              fill="#111111"
            />
            {/* Ranhuras de cerdas secas avançadas */}
            <path
              d="M 1830 85 L 1890 85 M 1850 240 L 1915 240 M 1820 420 L 1885 420 M 1860 660 L 1930 660 M 1840 850 L 1910 850"
              stroke="#111111"
              strokeWidth="6"
              strokeLinecap="round"
              opacity="0.8"
            />
          </svg>
        </div>
      )}

      {/* Camada 2: Vermelho Black Friday Cartaz */}
      {(isDual || isRedOnly) && (
        <div className="paint-layer paint-layer-red">
          <svg
            className="paint-svg-brush"
            viewBox="0 0 1920 1080"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Corpo principal do pincel vermelho com cerdas orgânicas */}
            <path
              d="M -100 0 
                 L 1740 0 
                 Q 1830 45, 1790 90 
                 Q 1880 140, 1810 190 
                 Q 1900 250, 1830 310 
                 Q 1860 380, 1780 430 
                 Q 1910 490, 1820 550 
                 Q 1850 620, 1770 670 
                 Q 1890 730, 1800 790 
                 Q 1920 860, 1830 920 
                 Q 1870 990, 1780 1040 
                 Q 1840 1065, 1750 1080 
                 L -100 1080 Z"
              fill="#F2381E"
            />
            {/* Ranhuras de cerdas secas vermelhas */}
            <path
              d="M 1800 115 L 1870 115 M 1820 280 L 1895 280 M 1790 470 L 1865 470 M 1830 710 L 1900 710 M 1810 900 L 1880 900"
              stroke="#F2381E"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.9"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

