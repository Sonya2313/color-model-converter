import { binary, grayscale, pixel, type Edge, type Picture } from './pixels';
export type Method = 'sharpen4' | 'sharpen8' | 'otsu' | 'iterative' | 'adaptive';
export type Options = { method: Method; edge: Edge; amount: number; radius: number; offset: number };
export type Result = { image: Picture; threshold?: number };

function sharpen(image: Picture, edge: Edge, amount: number, eight: boolean): Picture {
  const data = new Uint8ClampedArray(image.data.length);
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const index = (y * image.width + x) * 4;
      for (let c = 0; c < 3; c++) {
        const center = image.data[index + c];
        let laplacian = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (!eight && Math.abs(dx) + Math.abs(dy) !== 1) continue;
            laplacian += center - pixel(image, x + dx, y + dy, c, edge);
          }
        }
        data[index + c] = Math.round(center + amount * laplacian);
      }
      data[index + 3] = image.data[index + 3];
    }
  }
  return { width: image.width, height: image.height, data };
}

function histogram(gray: Uint8Array): Float64Array {
  const hist = new Float64Array(256);
  for (const value of gray) hist[value]++;
  return hist;
}

export function otsu(gray: Uint8Array): number {
  const hist = histogram(gray);
  let totalSum = 0;
  for (let i = 0; i < 256; i++) totalSum += i * hist[i];
  let count = 0, sum = 0, best = -1;
  let threshold = Math.round(totalSum / gray.length);
  for (let t = 0; t < 256; t++) {
    count += hist[t];
    sum += t * hist[t];
    const other = gray.length - count;
    if (count === 0 || other === 0) continue;
    const difference = sum / count - (totalSum - sum) / other;
    const variance = count * other * difference * difference;
    if (variance > best) { best = variance; threshold = t; }
  }
  return threshold;
}

export function iterative(gray: Uint8Array): number {
  const hist = histogram(gray);
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let threshold = sum / gray.length;
  for (let step = 0; step < 100; step++) {
    let countA = 0, countB = 0, sumA = 0, sumB = 0;
    for (let i = 0; i < 256; i++) {
      if (i <= threshold) { countA += hist[i]; sumA += i * hist[i]; }
      else { countB += hist[i]; sumB += i * hist[i]; }
    }
    if (!countA || !countB) break;
    const next = (sumA / countA + sumB / countB) / 2;
    if (Math.abs(next - threshold) < 0.01) { threshold = next; break; }
    threshold = next;
  }
  return threshold;
}

function adaptive(image: Picture, gray: Uint8Array, radius: number, offset: number): Picture {
  const { width: w, height: h } = image;
  const stride = w + 1;
  const sat = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    for (let x = 0; x < w; x++) {
      rowSum += gray[y * w + x];
      sat[(y + 1) * stride + x + 1] = sat[y * stride + x + 1] + rowSum;
    }
  }
  return binary(image, gray, i => {
    const x = i % w, y = Math.floor(i / w);
    const x1 = Math.max(0, x - radius), y1 = Math.max(0, y - radius);
    const x2 = Math.min(w, x + radius + 1), y2 = Math.min(h, y + radius + 1);
    const sum = sat[y2 * stride + x2] - sat[y1 * stride + x2]
      - sat[y2 * stride + x1] + sat[y1 * stride + x1];
    return sum / ((x2 - x1) * (y2 - y1)) - offset;
  });
}

export function process(image: Picture, options: Options): Result {
  if (options.method === 'sharpen4' || options.method === 'sharpen8') {
    return { image: sharpen(image, options.edge, options.amount, options.method === 'sharpen8') };
  }
  const gray = grayscale(image);
  if (options.method === 'adaptive') return { image: adaptive(image, gray, options.radius, options.offset) };
  const threshold = options.method === 'otsu' ? otsu(gray) : iterative(gray);
  return { image: binary(image, gray, () => threshold), threshold };
}
