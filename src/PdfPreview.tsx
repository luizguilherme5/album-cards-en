import { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import worker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc = worker;

// Render the actual PDF, not a separate approximation of the print layout.
// This works in browsers without a native embedded-PDF viewer.
export function PdfPreview({ url, en }: { url: string; en: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('');
  useEffect(() => {
    let cancelled = false;
    const loading = getDocument({ url });
    setStatus(en ? 'Rendering PDF…' : 'Renderizando PDF…');
    const render = async () => {
      const pdf = await loading.promise;
      container.current?.replaceChildren();
      for (let i = 1; i <= pdf.numPages; i++) {
        if (cancelled) return;
        const page = await pdf.getPage(i);
        const canvas = document.createElement('canvas');
        // Match the displayed width at Retina resolution, including small single-card PDFs.
        const pageWidth = page.view[2] - page.view[0];
        const displayWidth = pageWidth < 200 ? 360 : (container.current?.clientWidth || 1000);
        const scale = Math.min(6, Math.max(2, (displayWidth / pageWidth) * (window.devicePixelRatio || 1)));
        const viewport = page.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.setAttribute('aria-label', `${en ? 'Page' : 'Página'} ${i} / ${pdf.numPages}`);
        canvas.style.maxWidth = page.view[2] < 200 ? '360px' : '100%';
        await page.render({ canvas, viewport }).promise;
        if (!cancelled) container.current?.appendChild(canvas);
        setStatus(`${i}/${pdf.numPages}`);
      }
    };
    render().catch((error) => {
      if (!cancelled) setStatus(String(error.message));
    });
    return () => {
      cancelled = true;
      void loading.destroy();
    };
  }, [url, en]);
  return (
    <div className="pdf-pages">
      <p role="status">{status}</p>
      <div ref={container} />
    </div>
  );
}
