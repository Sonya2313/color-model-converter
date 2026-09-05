export type RgbColor = {
  r: number;
  g: number;
  b: number;
};

export type XyzColor = {
  x: number;
  y: number;
  z: number;
};

export type HsvColor = {
  h: number;
  s: number;
  v: number;
};

export type XyzToRgbResult = {
  rawRgb: RgbColor;
  rgb: RgbColor;
  isOutOfGamut: boolean;
};
