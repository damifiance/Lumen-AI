import { useState, useEffect, useCallback } from 'react';
import { usePdfHighlighterContext } from 'react-pdf-highlighter-extended';
import { ZoomIn, ZoomOut } from 'lucide-react';

export function ZoomControls() {
  const utils = usePdfHighlighterContext();
  const [scale, setScale] = useState(1.0);

  // Sync scale on mount and when viewer changes
  useEffect(() => {
    const viewer = utils.getViewer();
    if (viewer) {
      setScale(viewer.currentScale);
    }
  }, [utils]);

  const updateScale = useCallback(() => {
    const viewer = utils.getViewer();
    if (viewer) {
      // Small delay to ensure PDF.js has rendered at new scale
      setTimeout(() => {
        setScale(viewer.currentScale);
      }, 50);
    }
  }, [utils]);

  const zoomIn = useCallback(() => {
    const viewer = utils.getViewer();
    if (viewer && viewer.currentScale < 3.0) {
      viewer.currentScale = Math.min(3.0, viewer.currentScale + 0.25);
      updateScale();
    }
  }, [utils, updateScale]);

  const zoomOut = useCallback(() => {
    const viewer = utils.getViewer();
    if (viewer && viewer.currentScale > 0.5) {
      viewer.currentScale = Math.max(0.5, viewer.currentScale - 0.25);
      updateScale();
    }
  }, [utils, updateScale]);

  const resetZoom = useCallback(() => {
    const viewer = utils.getViewer();
    if (viewer) {
      viewer.currentScaleValue = 'page-width';
      updateScale();
    }
  }, [utils, updateScale]);

  return (
    <div className="absolute bottom-4 right-4 z-50 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200/60 px-2 py-1.5">
      <button
        onClick={zoomOut}
        className="p-1 text-gray-500 hover:text-gray-700 cursor-pointer rounded hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-default"
        disabled={scale <= 0.5}
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
        disabled={scale >= 3.0}
        title="Zoom in"
      >
        <ZoomIn size={16} />
      </button>
    </div>
  );
}
