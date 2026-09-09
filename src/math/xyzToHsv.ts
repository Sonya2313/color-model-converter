import type { HsvColor, XyzColor } from './types';

function linearToSrgb(value: number): number {
  if (value >= 0.0031308) {
    return 1.055 * value ** (1 / 2.4) - 0.055;
  }

  return value * 12.92;
}

export function xyzToHsv({ x, y, z }: XyzColor): HsvColor {
  const normalizedX = x / 100;
  const normalizedY = y / 100;
  const normalizedZ = z / 100;

  const redLinear =
    3.2406 * normalizedX - 1.5372 * normalizedY - 0.4986 * normalizedZ;

  const greenLinear =
    -0.9689 * normalizedX + 1.8758 * normalizedY + 0.0415 * normalizedZ;

  const blueLinear =
    0.0557 * normalizedX - 0.204 * normalizedY + 1.057 * normalizedZ;

  const rawRedSrgb = linearToSrgb(redLinear);
  const rawGreenSrgb = linearToSrgb(greenLinear);
  const rawBlueSrgb = linearToSrgb(blueLinear);

  const redSrgb = Math.min(Math.max(rawRedSrgb, 0), 1);
  const greenSrgb = Math.min(Math.max(rawGreenSrgb, 0), 1);
  const blueSrgb = Math.min(Math.max(rawBlueSrgb, 0), 1);

  const max = Math.max(redSrgb, greenSrgb, blueSrgb);
  const min = Math.min(redSrgb, greenSrgb, blueSrgb);
  const delta = max - min;

  const value = max * 100;
  const saturation = max === 0 ? 0 : (delta / max) * 100;

  let hue = 0;

  if (delta !== 0) {
    if (max === redSrgb) {
      hue = 60 * (((greenSrgb - blueSrgb) / delta) % 6);
    } else if (max === greenSrgb) {
      hue = 60 * ((blueSrgb - redSrgb) / delta + 2);
    } else {
      hue = 60 * ((redSrgb - greenSrgb) / delta + 4);
    }
  }

  if (hue < 0) {
    hue += 360;
  }

  return { h: hue, s: saturation, v: value };
}
