import { rgbToXyz } from '../math/rgbToXyz';
import { xyzToHsv } from '../math/xyzToHsv';
import { xyzToRgb } from '../math/xyzToRgb';
import { hsvToXyz } from '../math/hsvToXyz';

import type { HsvColor, RgbColor, XyzColor } from '../math/types';

export type ColorResult = {
  rgb: RgbColor;
  xyz: XyzColor;
  hsv: HsvColor;
  isOutOfGamut: boolean;
};

export function changeColor(hex: string): ColorResult {
  const newRed = Number.parseInt(hex.slice(1, 3), 16);
  const newGreen = Number.parseInt(hex.slice(3, 5), 16);
  const newBlue = Number.parseInt(hex.slice(5, 7), 16);

  const newRgb: RgbColor = {
    r: newRed,
    g: newGreen,
    b: newBlue,
  };

  const newXyz = rgbToXyz(newRgb);
  const newHsv = xyzToHsv(newXyz);

  return {
    rgb: newRgb,
    xyz: newXyz,
    hsv: newHsv,
    isOutOfGamut: false,
  };
}

export function changeRgb(
  red: number,
  green: number,
  blue: number,
  channel: 'r' | 'g' | 'b',
  value: number,
): ColorResult {
  const newRgb: RgbColor = {
    r: red,
    g: green,
    b: blue,
    [channel]: value,
  };

  const newXyz = rgbToXyz(newRgb);
  const newHsv = xyzToHsv(newXyz);

  return {
    rgb: newRgb,
    xyz: newXyz,
    hsv: newHsv,
    isOutOfGamut: false,
  };
}

export function changeXyz(
  x: number,
  y: number,
  z: number,
  channel: 'x' | 'y' | 'z',
  value: number,
): ColorResult {
  const newXyz: XyzColor = {
    x,
    y,
    z,
    [channel]: value,
  };

  const result = xyzToRgb(newXyz);
  const newRgb = result.rgb;
  const newHsv = xyzToHsv(newXyz);

  return {
    rgb: newRgb,
    xyz: newXyz,
    hsv: newHsv,
    isOutOfGamut: result.isOutOfGamut,
  };
}

export function changeHsv(
  h: number,
  s: number,
  v: number,
  channel: 'h' | 's' | 'v',
  value: number,
): ColorResult {
  const newHsv: HsvColor = {
    h,
    s,
    v,
    [channel]: value,
  };

  const newXyz = hsvToXyz(newHsv);
  const result = xyzToRgb(newXyz);
  const newRgb = result.rgb;

  return {
    rgb: newRgb,
    xyz: newXyz,
    hsv: newHsv,
    isOutOfGamut: result.isOutOfGamut,
  };
}
