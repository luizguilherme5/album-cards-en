import { useEffect, useRef, useState } from 'react';
import { CARD, type LibraryAlbum } from '../shared/schema';
import { api } from './api';
type Props = {
  album: LibraryAlbum;
  en: boolean;
  close: () => void;
  saved: () => void;
  report: (e: unknown) => void;
};
export function CropEditor({ album, en, close, saved, report }: Props) {
  const [source, setSource] = useState(
    album.artSource
      ? '/images/' + album.artSource
      : album.vertical
        ? '/images/' + album.vertical
        : album.original
          ? '/images/' + album.original
          : '',
  );
  const [image, setImage] = useState<HTMLImageElement>();
  const [upload, setUpload] = useState('');
  const [zoom, setZoom] = useState(1),
    [x, setX] = useState(0),
    [y, setY] = useState(0),
    [busy, setBusy] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | undefined>(undefined);
  useEffect(() => {
    if (!source) return;
    const img = new Image();
    let active = true;
    img.onload = () => {
      if (active) {
        setImage(img);
        setZoom(1);
        setX(0);
        setY(0);
      }
    };
    img.onerror = () =>
      report(new Error(en ? 'Could not open image' : 'Não foi possível abrir a imagem'));
    img.src = source;
    return () => {
      active = false;
    };
  }, [source]);
  const scale = image
    ? Math.max(CARD.widthPx / image.width, CARD.heightPx / image.height) * zoom
    : 1;
  const excessX = image ? Math.max(0, image.width * scale - CARD.widthPx) : 0;
  const excessY = image ? Math.max(0, image.height * scale - CARD.heightPx) : 0;
  useEffect(() => {
    const context = canvas.current?.getContext('2d');
    if (!context || !image) return;
    context.clearRect(0, 0, CARD.widthPx, CARD.heightPx);
    context.drawImage(
      image,
      -excessX / 2 + (x * excessX) / 2,
      -excessY / 2 + (y * excessY) / 2,
      image.width * scale,
      image.height * scale,
    );
  }, [image, zoom, x, y]);
  async function save() {
    if (!canvas.current || !image) return;
    setBusy(true);
    try {
      if (upload) await api(`/albums/${album.id}/image`, { kind: 'artSource', data: upload });
      await api(`/albums/${album.id}/image`, {
        kind: 'vertical',
        data: canvas.current.toDataURL('image/png'),
      });
      saved();
      close();
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="overlay">
      <section
        className="dialog crop-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={en ? 'Crop cover' : 'Enquadrar capa'}
      >
        <div className="dialog-title">
          <div>
            <span className="eyebrow">54 × 85.6 MM</span>
            <h2>{album.title}</h2>
          </div>
          <button onClick={close} aria-label={en ? 'Close' : 'Fechar'}>
            ✕
          </button>
        </div>
        <div className="crop-layout">
          <canvas
            ref={canvas}
            width={CARD.widthPx}
            height={CARD.heightPx}
            aria-label={en ? 'Print preview' : 'Prévia de impressão'}
            onPointerDown={(event) => {
              drag.current = { x: event.clientX, y: event.clientY, px: x, py: y };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerUp={() => {
              drag.current = undefined;
            }}
            onPointerMove={(event) => {
              if (!drag.current) return;
              const factor = CARD.widthPx / event.currentTarget.clientWidth;
              setX(
                Math.max(
                  -1,
                  Math.min(
                    1,
                    drag.current.px +
                      ((event.clientX - drag.current.x) * factor * 2) / (excessX || 1),
                  ),
                ),
              );
              setY(
                Math.max(
                  -1,
                  Math.min(
                    1,
                    drag.current.py +
                      ((event.clientY - drag.current.y) * factor * 2) / (excessY || 1),
                  ),
                ),
              );
            }}
          />
          <div className="controls">
            <h3>{en ? 'Make it your own.' : 'Enquadre do seu jeito.'}</h3>
            <p>
              {en
                ? 'Drag the image. The frame is the exact printed card. No stretching or empty borders.'
                : 'Arraste a imagem. A moldura tem a proporção exata do cartão impresso, sem distorção ou bordas vazias.'}
            </p>
            <label className="file-button">
              {en ? 'Upload artwork' : 'Enviar arte'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (file.size > 10000000) {
                    report(new Error('Maximum 10 MB'));
                    return;
                  }
                  const r = new FileReader();
                  r.onload = () => {
                    setSource(String(r.result));
                    setUpload(String(r.result));
                  };
                  r.readAsDataURL(file);
                }}
              />
            </label>
            <label>
              Zoom <output>{zoom.toFixed(2)}×</output>
              <input
                type="range"
                min="1"
                max="4"
                step=".01"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
            </label>
            <label>
              {en ? 'Horizontal position' : 'Posição horizontal'}
              <input
                type="range"
                min="-1"
                max="1"
                step=".01"
                value={x}
                onChange={(e) => setX(Number(e.target.value))}
              />
            </label>
            <label>
              {en ? 'Vertical position' : 'Posição vertical'}
              <input
                type="range"
                min="-1"
                max="1"
                step=".01"
                value={y}
                onChange={(e) => setY(Number(e.target.value))}
              />
            </label>
            <button
              onClick={() => {
                setZoom(1);
                setX(0);
                setY(0);
              }}
            >
              {en ? 'Reset framing' : 'Redefinir enquadramento'}
            </button>
            <p className="hint">
              {en
                ? 'Output: 1080 × 1712 pixels. Your source image stays saved separately.'
                : 'Saída: 1080 × 1712 pixels. A imagem de origem é salva separadamente.'}
            </p>
            <button className="primary" onClick={save} disabled={busy || !image}>
              {busy
                ? en
                  ? 'Saving…'
                  : 'Salvando…'
                : en
                  ? 'Save vertical artwork'
                  : 'Salvar arte vertical'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
