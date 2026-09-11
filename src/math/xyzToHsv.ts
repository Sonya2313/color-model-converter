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
    3.2404542 * normalizedX - 1.5371385 * normalizedY - 0.4985314 * normalizedZ;

  const greenLinear =
    -0.969266 * normalizedX + 1.8760108 * normalizedY + 0.041556 * normalizedZ;

  const blueLinear =
    0.0556434 * normalizedX - 0.2040259 * normalizedY + 1.0572252 * normalizedZ;

  const rawRedSrgb = linearToSrgb(redLinear);
  const rawGreenSrgb = linearToSrgb(greenLinear);
  const rawBlueSrgb = linearToSrgb(blueLinear);

  const redSrgb = Math.min(Math.max(rawRedSrgb, 0), 1);
  const greenSrgb = Math.min(Math.max(rawGreenSrgb, 0), 1);
  const blueSrgb = Math.min(Math.max(rawBlueSrgb, 0), 1);

  const max = Math.max(redSrgb, greenSrgb, blueSrgb);
  const min = Math.min(redSrgb, greenSrgb, blueSrgb);
  const delta = max - min;

  const epsilon = 0.00001;

  const value = max * 100;

  const saturation = max === 0 || delta < epsilon ? 0 : (delta / max) * 100;

  let hue = 0;

  if (delta > epsilon) {
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
