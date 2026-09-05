import type { RgbColor, XyzColor, XyzToRgbResult } from './types';

function linearToSrgb(value: number): number {
  if (value < 0.0031308) {
    return 12.92 * value;
  }

  return 1.055 * value ** (1 / 2.4) - 0.055;
}

function clip(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function xyzToRgb({ x, y, z }: XyzColor): XyzToRgbResult {
  const normalizedX = x / 100;
  const normalizedY = y / 100;
  const normalizedZ = z / 100;

  const redLinear =
    3.2406 * normalizedX - 1.5372 * normalizedY - 0.4986 * normalizedZ;

  const greenLinear =
    -0.9689 * normalizedX + 1.8758 * normalizedY + 0.0415 * normalizedZ;

  const blueLinear =
    0.0557 * normalizedX - 0.204 * normalizedY + 1.057 * normalizedZ;

  const rawRgb: RgbColor = {
    r: linearToSrgb(redLinear) * 255,
    g: linearToSrgb(greenLinear) * 255,
    b: linearToSrgb(blueLinear) * 255,
  };

  const isOutOfGamut =
    rawRgb.r < 0 ||
    rawRgb.r > 255 ||
    rawRgb.g < 0 ||
    rawRgb.g > 255 ||
    rawRgb.b < 0 ||
    rawRgb.b > 255;

  const rgb: RgbColor = {
    r: clip(rawRgb.r, 0, 255),
    g: clip(rawRgb.g, 0, 255),
    b: clip(rawRgb.b, 0, 255),
  };

  return {
    rawRgb,
    rgb,
    isOutOfGamut,
  };
}
