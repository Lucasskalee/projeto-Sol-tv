/** Remove only light pixels connected to the border, preserving white labels. */
export function clearLightBorder(data: Uint8ClampedArray, width: number, height: number, tolerance: number) {
  const count = width * height;
  const seen = new Uint8Array(count);
  const queue = new Int32Array(count);
  const threshold = 255 - Math.max(0, Math.min(120, tolerance));
  let head = 0;
  let tail = 0;
  const visit = (pixel: number) => {
    if (seen[pixel]) return;
    seen[pixel] = 1;
    const offset = pixel * 4;
    const low = Math.min(data[offset], data[offset + 1], data[offset + 2]);
    const high = Math.max(data[offset], data[offset + 1], data[offset + 2]);
    if (data[offset + 3] === 0 || (low >= threshold && high - low <= 35)) {
      queue[tail++] = pixel;
    }
  };
  for (let x = 0; x < width; x++) { visit(x); visit((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { visit(y * width); visit(y * width + width - 1); }
  while (head < tail) {
    const pixel = queue[head++];
    data[pixel * 4 + 3] = 0;
    const x = pixel % width;
    if (x > 0) visit(pixel - 1);
    if (x < width - 1) visit(pixel + 1);
    if (pixel >= width) visit(pixel - width);
    if (pixel < count - width) visit(pixel + width);
  }
  return tail;
}

export async function removeWhiteBackground(source: string, tolerance: number): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = source;
  try { await image.decode(); } catch {
    throw new Error("Não foi possível abrir a imagem. Se a URL bloquear a edição, use Escolher arquivo para enviar a foto.");
  }
  const scale = Math.min(1, 2000 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Este navegador não permite editar a imagem.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  let pixels: ImageData;
  try { pixels = context.getImageData(0, 0, canvas.width, canvas.height); } catch {
    throw new Error("A URL da imagem bloqueia a edição. Envie a foto usando Escolher arquivo.");
  }
  if (!clearLightBorder(pixels.data, canvas.width, canvas.height, tolerance)) {
    throw new Error("Não encontrei um fundo branco nas bordas. Tente aumentar a intensidade.");
  }
  context.putImageData(pixels, 0, 0);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => {
    if (blob) resolve(blob); else reject(new Error("Não foi possível gerar a imagem transparente."));
  }, "image/png"));
}
