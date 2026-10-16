import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { Job, Progress, Result } from '../core/types';
import { collectJobs } from '../core/collect';
import { createEngine } from '../composition';
const ROW = 46,
  INITIAL: Progress = { done: 0, total: 0, elapsedMs: 0, workers: 0 };
const number = (n: number | null | undefined) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(n);
const bytes = (n: number) =>
  n >= 1073741824
    ? `${number(n / 1073741824)} ГБ`
    : n >= 1048576
      ? `${number(n / 1048576)} МБ`
      : n >= 1024
        ? `${number(n / 1024)} КБ`
        : `${n} Б`;
const dpi = (r: Result) =>
  r.metadata
    ? r.metadata.dpiX === null && r.metadata.dpiY === null
      ? 'Не задано'
      : `${number(r.metadata.dpiX)} × ${number(r.metadata.dpiY)}`
    : '—';
function Preview({ file }: { file?: File }) {
  const [url, setUrl] = useState(''),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
    if (!file) {
      setUrl('');
      return;
    }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  if (!file) return null;
  return (
    <div className="preview">
      {failed ? (
        <p>
          Браузер не умеет показывать это изображение или оно повреждено.
          Метаданные читаются независимо от предпросмотра. TIFF и PCX обычно не
          поддерживаются.
        </p>
      ) : (
        url && <img src={url} alt={file.name} onError={() => setFailed(true)} />
      )}
    </div>
  );
}
function saveCSV(rows: Result[]) {
  const esc = (v: unknown) => {
    let s = String(v ?? '');
    if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  const lines = [
    [
      'Путь',
      'Имя',
      'Формат',
      'Байты',
      'Ширина px',
      'Высота px',
      'DPI X',
      'DPI Y',
      'Глубина bpp',
      'Сжатие',
      'Источник DPI',
      'Ошибка',
    ],
    ...rows.map((r) => [
      r.path,
      r.name,
      r.metadata?.format,
      r.size,
      r.metadata?.width,
      r.metadata?.height,
      r.metadata?.dpiX,
      r.metadata?.dpiY,
      r.metadata?.depth,
      r.metadata?.compression,
      r.metadata?.dpiSource,
      r.error,
    ]),
  ];
  const blob = new Blob(
    ['\ufeff' + lines.map((row) => row.map(esc).join(';')).join('\r\n')],
    { type: 'text/csv;charset=utf-8' },
  );
  const u = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = u;
  a.download = 'image-metadata.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
export default function App() {
  const engine = useMemo(createEngine, []),
    jobs = useRef<Job[]>([]),
    generation = useRef(0),
    scroll = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<Result[]>([]),
    [progress, setProgress] = useState<Progress>(INITIAL),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  const [query, setQuery] = useState(''),
    [format, setFormat] = useState('all'),
    [errorsOnly, setErrorsOnly] = useState(false),
    [sort, setSort] = useState('id'),
    [descending, setDescending] = useState(false);
  const [threads, setThreads] = useState(
      Math.min(8, Math.max(1, (navigator.hardwareConcurrency || 4) - 1)),
    ),
    [selected, setSelected] = useState<Result | null>(null),
    [help, setHelp] = useState(false);
  const [top, setTop] = useState(0),
    [viewHeight, setViewHeight] = useState(480);
  useEffect(
    () => () => {
      generation.current++;
      engine.cancel();
    },
    [engine],
  );
  useEffect(() => {
    const el = scroll.current;
    if (!el) return;
    const o = new ResizeObserver(() => setViewHeight(el.clientHeight));
    o.observe(el);
    return () => o.disconnect();
  }, []);
  const filtered = useMemo(() => {
    const q = query.toLocaleLowerCase('ru');
    const a = rows.filter(
      (r) =>
        (!q || r.path.toLocaleLowerCase('ru').includes(q)) &&
        (format === 'all' || r.metadata?.format === format) &&
        (!errorsOnly || !!r.error),
    );
    a.sort((a, b) => {
      let v = 0;
      if (sort === 'name')
        v = a.path.localeCompare(b.path, 'ru', { numeric: true });
      else if (sort === 'size') v = a.size - b.size;
      else if (sort === 'width')
        v = (a.metadata?.width ?? -1) - (b.metadata?.width ?? -1);
      else if (sort === 'depth')
        v = (a.metadata?.depth ?? -1) - (b.metadata?.depth ?? -1);
      else v = a.id - b.id;
      return descending ? -v : v;
    });
    return a;
  }, [rows, query, format, errorsOnly, sort, descending]);
  useEffect(() => {
    setTop(0);
    if (scroll.current) scroll.current.scrollTop = 0;
  }, [query, format, errorsOnly, sort, descending]);
  const errors = useMemo(() => rows.filter((r) => r.error).length, [rows]);
  const totalBytes = useMemo(
    () => rows.reduce((a, r) => a + r.size, 0),
    [rows],
  );
  const readBytes = useMemo(
    () =>
      rows.reduce(
        (a, r) => a + Number(r.metadata?.extras['Прочитано байт'] || 0),
        0,
      ),
    [rows],
  );
  const begin = async (list: FileList | null) => {
    if (!list?.length) return;
    const chosen = Array.from(list);
    const token = ++generation.current;
    engine.cancel();
    setBusy(true);
    setNotice('Подготовка списка файлов…');
    setRows([]);
    setSelected(null);
    setProgress(INITIAL);
    setTop(0);
    if (scroll.current) scroll.current.scrollTop = 0;
    try {
      const batch = await collectJobs(chosen, (n) => {
        if (token === generation.current)
          setNotice(`Подготовлено ${n} файлов…`);
      });
      if (token !== generation.current) return;
      jobs.current = batch;
      setNotice('');
      setProgress({ ...INITIAL, total: batch.length });
      await engine.run(batch, threads, (incoming, p) => {
        if (token !== generation.current) return;
        setRows((old) => old.concat(incoming));
        setProgress(p);
      });
      if (token === generation.current)
        setNotice('Обработка завершена. Нажмите на строку для подробностей.');
    } catch (e) {
      if (token === generation.current)
        setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      if (token === generation.current) setBusy(false);
    }
  };
  const onChoose = (e: ChangeEvent<HTMLInputElement>) => {
    void begin(e.currentTarget.files);
    e.currentTarget.value = '';
  };
  const stop = () => {
    generation.current++;
    engine.cancel();
    setBusy(false);
    setNotice('Остановлено. Уже полученные результаты сохранены.');
  };
  const clear = () => {
    stop();
    jobs.current = [];
    setRows([]);
    setSelected(null);
    setProgress(INITIAL);
    setNotice('');
  };
  const start = Math.max(0, Math.floor(top / ROW) - 6),
    end = Math.min(filtered.length, Math.ceil((top + viewHeight) / ROW) + 6);
  const percent = progress.total ? (progress.done / progress.total) * 100 : 0;
  return (
    <div className="app">
      <section className="hero">
        <div className="actions">
          <label className={`button primary ${busy ? 'disabled' : ''}`}>
            Выбрать папку
            <input
              type="file"
              multiple
              {...{ webkitdirectory: '', directory: '' }}
              onChange={onChoose}
              disabled={busy}
            />
          </label>
          <label className={`button ${busy ? 'disabled' : ''}`}>
            Выбрать файлы
            <input type="file" multiple onChange={onChoose} disabled={busy} />
          </label>
          <label className="workers">
            Потоки{' '}
            <input
              aria-label="Количество потоков"
              type="number"
              min="1"
              max="16"
              value={threads}
              disabled={busy}
              onChange={(e) =>
                setThreads(
                  Math.min(16, Math.max(1, Number(e.target.value) || 1)),
                )
              }
            />
          </label>
          {busy && (
            <button className="danger" onClick={stop}>
              Остановить
            </button>
          )}
        </div>
      </section>

      <section className="stats">
        <div>
          <span>Обработано</span>
          <strong>
            {number(progress.done)} <small>/ {number(progress.total)}</small>
          </strong>
        </div>
      </section>
      <div
        className="progress"
        role="progressbar"
        aria-label="Обработка файлов"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div style={{ width: `${percent}%` }} />
      </div>
      <p className="status" role="status"></p>
      <section className="results card">
        <div className="toolbar">
          <input
            className="search"
            aria-label="Поиск по имени и пути"
            placeholder="Поиск по имени или пути"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <button disabled={busy || !rows.length} onClick={clear}>
            Очистить
          </button>
        </div>
        <div className="tablewrap">
          <div
            className="table"
            role="table"
            aria-label="Метаданные изображений"
            aria-rowcount={filtered.length + 1}
          >
            <div className="tablehead grid" role="row">
              {[
                'Имя файла / путь',
                'Формат',
                'Размер, px',
                'DPI X × Y',
                'Глубина',
                'Сжатие',
                'Файл / статус',
              ].map((v) => (
                <div role="columnheader" key={v}>
                  {v}
                </div>
              ))}
            </div>
            <div
              className="viewport"
              ref={scroll}
              onScroll={(e) => setTop(e.currentTarget.scrollTop)}
              role="rowgroup"
            >
              <div
                style={{ height: filtered.length * ROW, position: 'relative' }}
              >
                {filtered.slice(start, end).map((r, i) => (
                  <button
                    role="row"
                    aria-rowindex={start + i + 2}
                    aria-selected={selected?.id === r.id}
                    key={r.id}
                    className={`grid tablerow ${selected?.id === r.id ? 'selected' : ''}`}
                    style={{
                      position: 'absolute',
                      top: (start + i) * ROW,
                      height: ROW,
                      width: '100%',
                    }}
                    onClick={() => setSelected(r)}
                    title={r.error || r.path}
                  >
                    <span role="cell" className="filename">
                      <span>{r.name}</span>
                      <small>{r.path}</small>
                    </span>
                    <span role="cell">
                      <span className={`badge ${r.error ? 'bad' : ''}`}>
                        {r.metadata?.format || 'Ошибка'}
                      </span>
                    </span>
                    <span role="cell">
                      {r.metadata
                        ? `${r.metadata.width} × ${r.metadata.height}`
                        : '—'}
                    </span>
                    <span role="cell">{dpi(r)}</span>
                    <span role="cell">
                      {r.metadata?.depth != null
                        ? `${r.metadata.depth} bpp`
                        : '—'}
                    </span>
                    <span role="cell" className="ellipsis">
                      {r.metadata?.compression || '—'}
                    </span>
                    <span role="cell" className={r.error ? 'red' : ''}>
                      {r.error ? '⚠ Ошибка' : bytes(r.size)}
                    </span>
                  </button>
                ))}
              </div>
              {!filtered.length && <div className="empty"></div>}
            </div>
          </div>
        </div>
      </section>
      {selected && (
        <section className="details card">
          <div className="detailheading">
            <div>
              <span className="eyebrow">ПОДРОБНОСТИ ФАЙЛА</span>
              <h3>{selected.name}</h3>
              <p className="path">{selected.path}</p>
            </div>
            <button
              onClick={() => setSelected(null)}
              aria-label="Закрыть подробности"
            >
              ✕
            </button>
          </div>
          {selected.error ? (
            <p className="errorbox">{selected.error}</p>
          ) : (
            selected.metadata && (
              <div className="detailbody">
                <Preview file={jobs.current[selected.id]?.file} />
                <div className="metadetail">
                  <dl>
                    {Object.entries({
                      Формат: selected.metadata.format,
                      'Размер растра': `${selected.metadata.width} × ${selected.metadata.height} px`,
                      Глубина: `${selected.metadata.depth ?? '—'} bpp`,
                      'DPI X × Y': dpi(selected),
                      'Источник DPI': selected.metadata.dpiSource,
                      Сжатие: selected.metadata.compression,
                      ...selected.metadata.extras,
                    }).map(([key, value]) => (
                      <div key={key}>
                        <dt>{key}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  {selected.metadata.warnings.map((w, i) => (
                    <p className="warning" key={i}>
                      {w}
                    </p>
                  ))}
                </div>
              </div>
            )
          )}
        </section>
      )}
    </div>
  );
}
