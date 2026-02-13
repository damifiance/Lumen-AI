import { useState, useEffect, useCallback, useRef } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import type { PdfHighlighterUtils } from 'react-pdf-highlighter-extended';

interface ZoomControlsProps {
  utilsRef: React.RefObject<PdfHighlighterUtils | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;
const STEP = 0.25;

export function ZoomControls({ utilsRef, containerRef }: ZoomControlsProps) {
  const [scale, setScale] = useState(1.0);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const syncScale = useCallback(() => {
    const viewer = utilsRef.current?.getViewer();
    if (viewer) {
      setTimeout(() => setScale(viewer.currentScale), 50);
    }
  }, [utilsRef]);

  useEffect(() => {
    const timer = setTimeout(syncScale, 500);
    return () => clearTimeout(timer);
  }, [syncScale]);

  // Fade highlights out during zoom, fade back in after re-render
  const fadeHighlights = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const parts = el.querySelectorAll('.Highlight__part') as NodeListOf<HTMLElement>;

    // Instantly hide
    parts.forEach((p) => {
      p.style.transition = 'none';
      p.style.opacity = '0';
    });

    // Clear any pending fade-in
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);

    // Fade back in after PDF.js re-renders
    fadeTimerRef.current = setTimeout(() => {
      const freshParts = el.querySelectorAll('.Highlight__part') as NodeListOf<HTMLElement>;
      freshParts.forEach((p) => {
        p.style.transition = 'opacity 0.15s ease';
        p.style.opacity = '';
      });
      // Clean up inline styles after transition
      setTimeout(() => {
        freshParts.forEach((p) => {
          p.style.transition = '';
        });
      }, 200);
    }, 200);
  }, [containerRef]);

  const zoomTo = useCallback((newScale: number) => {
    const viewer = utilsRef.current?.getViewer();
    if (!viewer) return;
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
    if (Math.abs(clamped - viewer.currentScale) < 0.01) return;
    fadeHighlights();
    viewer.currentScale = clamped;
    setScale(clamped);
  }, [utilsRef, fadeHighlights]);

  const zoomIn = useCallback(() => {
    zoomTo(scaleRef.current + STEP);
  }, [zoomTo]);

  const zoomOut = useCallback(() => {
    zoomTo(scaleRef.current - STEP);
  }, [zoomTo]);

  const resetZoom = useCallback(() => {
    const viewer = utilsRef.current?.getViewer();
    if (viewer) {
      fadeHighlights();
      viewer.currentScaleValue = 'page-width';
      setTimeout(() => setScale(viewer.currentScale), 50);
    }
  }, [utilsRef, fadeHighlights]);

  // Ctrl+scroll / trackpad pinch-to-zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();

      const viewer = utilsRef.current?.getViewer();
      if (!viewer) return;

      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, viewer.currentScale + delta));
      if (Math.abs(newScale - viewer.currentScale) < 0.01) return;
      fadeHighlights();
      viewer.currentScale = newScale;
      setScale(newScale);
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [utilsRef, containerRef, fadeHighlights]);

  return (
    <div className="absolute top-4 right-4 z-50 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200/60 px-2 py-1.5">
      <button
        onClick={zoomOut}
        className="p-1 text-gray-500 hover:text-gray-700 cursor-pointer rounded hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-default"
        disabled={scale <= MIN_SCALE}
        title="Zoom out"
      >
        <ZoomOut size={16} />
      </button>
      <button
        onClick={resetZoom}
        className="px-2 py-0.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded cursor-pointer transition-colors min-w-[3.5rem] text-center"
        title="Reset zoom"
      >
        {Math.round(scale * 100)}%
      </button>
      <button
        onClick={zoomIn}
        className="p-1 text-gray-500 hover:text-gray-700 cursor-pointer rounded hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-default"
        disabled={scale >= MAX_SCALE}
        title="Zoom in"
      >
        <ZoomIn size={16} />
      </button>
    </div>
  );
}
