import type { HsvColor, XyzColor } from './types';

function srgbToLinear(value: number): number {
  if (value < 0.04045) {
    return value / 12.92;
  }

  return ((value + 0.055) / 1.055) ** 2.4;
}

export function hsvToXyz({ h, s, v }: HsvColor): XyzColor {
  const normalizedH = ((h % 360) + 360) % 360;

  const normalizedS = Math.min(Math.max(s, 0), 100) / 100;
  const normalizedV = Math.min(Math.max(v, 0), 100) / 100;

  const chroma = normalizedV * normalizedS;
  const secondComponent = chroma * (1 - Math.abs(((normalizedH / 60) % 2) - 1));
  const match = normalizedV - chroma;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (normalizedH < 60) {
    r1 = chroma;
    g1 = secondComponent;
  } else if (normalizedH < 120) {
    r1 = secondComponent;
    g1 = chroma;
  } else if (normalizedH < 180) {
    g1 = chroma;
    b1 = secondComponent;
  } else if (normalizedH < 240) {
    g1 = secondComponent;
    b1 = chroma;
  } else if (normalizedH < 300) {
    r1 = secondComponent;
    b1 = chroma;
  } else {
    r1 = chroma;
    b1 = secondComponent;
  }

  const redSrgb = r1 + match;
  const greenSrgb = g1 + match;
  const blueSrgb = b1 + match;

  const rn = srgbToLinear(redSrgb) * 100;
  const gn = srgbToLinear(greenSrgb) * 100;
  const bn = srgbToLinear(blueSrgb) * 100;

  const x = 0.4124564 * rn + 0.3575761 * gn + 0.1804375 * bn;

  const y = 0.2126729 * rn + 0.7151522 * gn + 0.072175 * bn;

  const z = 0.0193339 * rn + 0.119192 * gn + 0.9503041 * bn;

  return { x, y, z };
}
