import './App.css';
import { useState } from 'react';

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
        value={value}
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

  const selectedColor = `rgb(${red}, ${green}, ${blue})`;

  function toHex(value: number) {
    return Math.round(value).toString(16).padStart(2, '0');
  }

  const selectedHex = `#${toHex(red)}${toHex(green)}${toHex(blue)}`;

  function changeColor(hex: string) {
    const newRed = Number.parseInt(hex.slice(1, 3), 16);
    const newGreen = Number.parseInt(hex.slice(3, 5), 16);
    const newBlue = Number.parseInt(hex.slice(5, 7), 16);

    setRed(newRed);
    setGreen(newGreen);
    setBlue(newBlue);
  }

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
              onChange={(event) => changeColor(event.target.value)}
            />
          </label>

          <p className="picker-rgb">
            RGB: {red}, {green}, {blue}
          </p>
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
              onChange={setRed}
            />

            <ColorField
              label="G"
              value={green}
              min={0}
              max={255}
              step={1}
              onChange={setGreen}
            />

            <ColorField
              label="B"
              value={blue}
              min={0}
              max={255}
              step={1}
              onChange={setBlue}
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
              onChange={setX}
            />

            <ColorField
              label="Y"
              value={y}
              min={0}
              max={100}
              step={0.01}
              onChange={setY}
            />

            <ColorField
              label="Z"
              value={z}
              min={0}
              max={100}
              step={0.01}
              onChange={setZ}
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
              onChange={setH}
            />

            <ColorField
              label="S"
              value={s}
              min={0}
              max={100}
              step={1}
              onChange={setS}
            />

            <ColorField
              label="V"
              value={v}
              min={0}
              max={100}
              step={1}
              onChange={setV}
            />
          </section>
        </div>
      </div>
    </main>
  );
}

export default App;
