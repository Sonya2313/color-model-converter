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
    3.2404542 * normalizedX - 1.5371385 * normalizedY - 0.4985314 * normalizedZ;

  const greenLinear =
    -0.969266 * normalizedX + 1.8760108 * normalizedY + 0.041556 * normalizedZ;

  const blueLinear =
    0.0556434 * normalizedX - 0.2040259 * normalizedY + 1.0572252 * normalizedZ;

  const rawRgb: RgbColor = {
    r: linearToSrgb(redLinear) * 255,
    g: linearToSrgb(greenLinear) * 255,
    b: linearToSrgb(blueLinear) * 255,
  };

  const epsilon = 0.01;

  const isOutOfGamut =
    rawRgb.r < -epsilon ||
    rawRgb.r > 255 + epsilon ||
    rawRgb.g < -epsilon ||
    rawRgb.g > 255 + epsilon ||
    rawRgb.b < -epsilon ||
    rawRgb.b > 255 + epsilon;

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
