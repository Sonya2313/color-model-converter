import type { RgbColor, XyzColor } from './types';

function srgbToLinear(value: number): number {
  if (value < 0.04045) {
    return value / 12.92;
  }

  return ((value + 0.055) / 1.055) ** 2.4;
}

export function rgbToXyz({ r, g, b }: RgbColor): XyzColor {
  const safeR = Math.min(Math.max(r, 0), 255);
  const safeG = Math.min(Math.max(g, 0), 255);
  const safeB = Math.min(Math.max(b, 0), 255);

  const rn = srgbToLinear(safeR / 255) * 100;
  const gn = srgbToLinear(safeG / 255) * 100;
  const bn = srgbToLinear(safeB / 255) * 100;

  const x = 0.4124564 * rn + 0.3575761 * gn + 0.1804375 * bn;

  const y = 0.2126729 * rn + 0.7151522 * gn + 0.072175 * bn;

  const z = 0.0193339 * rn + 0.119192 * gn + 0.9503041 * bn;

  return { x, y, z };
}
