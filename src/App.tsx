import { rgbToXyz } from './math/rgbToXyz';

function App() {
  const red = rgbToXyz({ r: 255, g: 0, b: 0 });
  const white = rgbToXyz({ r: 255, g: 255, b: 255 });

  return (
    <main>
      <h1>Проверка RGB → XYZ</h1>

      <p>
        Красный RGB(255, 0, 0): X = {red.x.toFixed(4)}, Y = {red.y.toFixed(4)},{' '}
        Z = {red.z.toFixed(4)}
      </p>

      <p>
        Белый RGB(255, 255, 255): X = {white.x.toFixed(4)}, Y ={' '}
        {white.y.toFixed(4)}, Z = {white.z.toFixed(4)}
      </p>
    </main>
  );
}

export default App;
