import './App.css';
import { useState } from 'react';

import {
  changeColor,
  changeHsv,
  changeRgb,
  changeXyz,
  type ColorResult,
} from './viewModel/colorController';

type ColorFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
};

function ColorField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: ColorFieldProps) {
  function changeValue(newValue: string) {
    onChange(Number(newValue));
  }

  return (
    <label className="color-field">
      <span>{label}:</span>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => changeValue(event.target.value)}
      />

      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={Number(value.toFixed(1))}
        onChange={(event) => changeValue(event.target.value)}
      />
    </label>
  );
}

function App() {
  const [red, setRed] = useState(181);
  const [green, setGreen] = useState(134);
  const [blue, setBlue] = useState(153);

  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [z, setZ] = useState(0);

  const [h, setH] = useState(0);
  const [s, setS] = useState(0);
  const [v, setV] = useState(0);

  const [isOutOfGamut, setIsOutOfGamut] = useState(false);

  function updateValues(result: ColorResult) {
    setRed(result.rgb.r);
    setGreen(result.rgb.g);
    setBlue(result.rgb.b);

    setX(result.xyz.x);
    setY(result.xyz.y);
    setZ(result.xyz.z);

    setH(result.hsv.h);
    setS(result.hsv.s);
    setV(result.hsv.v);
    setIsOutOfGamut(result.isOutOfGamut);
  }

  function handleChangeColor(hex: string) {
    const result = changeColor(hex);

    updateValues(result);
  }

  function handleChangeRgb(channel: 'r' | 'g' | 'b', value: number) {
    const result = changeRgb(red, green, blue, channel, value);

    updateValues(result);
  }

  function handleChangeXyz(channel: 'x' | 'y' | 'z', value: number) {
    const result = changeXyz(x, y, z, channel, value);

    updateValues(result);
  }

  function handleChangeHsv(channel: 'h' | 's' | 'v', value: number) {
    const result = changeHsv(h, s, v, channel, value);

    updateValues(result);
  }

  const selectedColor = `rgb(${red}, ${green}, ${blue})`;

  function toHex(value: number) {
    return Math.round(value).toString(16).padStart(2, '0');
  }

  const selectedHex = `#${toHex(red)}${toHex(green)}${toHex(blue)}`;

  return (
    <main className="app">
      <header className="header">
        <h1>Конвертер цветов</h1>
      </header>

      <div className="layout">
        <aside className="picker-card">
          <h2>Выбранный цвет</h2>

          <div
            className="color-preview"
            style={{ backgroundColor: selectedColor }}
          >
            <span>{selectedHex.toUpperCase()}</span>
          </div>

          <label className="picker-control">
            <span>Палитра</span>

            <input
              type="color"
              value={selectedHex}
              onChange={(event) => handleChangeColor(event.target.value)}
            />
          </label>

          <p className="picker-rgb">
            RGB: {red.toFixed(0)}, {green.toFixed(0)}, {blue.toFixed(0)}
          </p>

          {isOutOfGamut && (
            <p className="gamut-warning">
              Цвет выходит за пределы sRGB. Для отображения RGB-значения были
              ограничены до диапазона 0–255.
            </p>
          )}
        </aside>

        <div className="sections">
          <section className="color-section">
            <h2>RGB</h2>

            <ColorField
              label="R"
              value={red}
              min={0}
              max={255}
              step={1}
              onChange={(value) => handleChangeRgb('r', value)}
            />

            <ColorField
              label="G"
              value={green}
              min={0}
              max={255}
              step={1}
              onChange={(value) => handleChangeRgb('g', value)}
            />

            <ColorField
              label="B"
              value={blue}
              min={0}
              max={255}
              step={1}
              onChange={(value) => handleChangeRgb('b', value)}
            />
          </section>

          <section className="color-section">
            <h2>XYZ</h2>

            <ColorField
              label="X"
              value={x}
              min={0}
              max={100}
              step={0.01}
              onChange={(value) => handleChangeXyz('x', value)}
            />

            <ColorField
              label="Y"
              value={y}
              min={0}
              max={100}
              step={0.01}
              onChange={(value) => handleChangeXyz('y', value)}
            />

            <ColorField
              label="Z"
              value={z}
              min={0}
              max={100}
              step={0.01}
              onChange={(value) => handleChangeXyz('z', value)}
            />
          </section>

          <section className="color-section">
            <h2>HSV</h2>

            <ColorField
              label="H"
              value={h}
              min={0}
              max={360}
              step={1}
              onChange={(value) => handleChangeHsv('h', value)}
            />

            <ColorField
              label="S"
              value={s}
              min={0}
              max={100}
              step={1}
              onChange={(value) => handleChangeHsv('s', value)}
            />

            <ColorField
              label="V"
              value={v}
              min={0}
              max={100}
              step={1}
              onChange={(value) => handleChangeHsv('v', value)}
            />
          </section>
        </div>
      </div>
    </main>
  );
}

export default App;
