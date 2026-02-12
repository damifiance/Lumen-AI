import { useRef, useState, useEffect } from 'react';

interface UseDraggableOptions {
  handleSelector?: string; // CSS selector for drag handle, default '.drag-handle'
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

interface UseDraggableReturn {
  containerRef: React.RefObject<HTMLDivElement>;
  offset: { x: number; y: number };
  resetPosition: () => void;
  isDragging: boolean;
}

const DRAG_THRESHOLD = 3; // Minimum movement in pixels before drag starts

export function useDraggable(options: UseDraggableOptions = {}): UseDraggableReturn {
  const { handleSelector = '.drag-handle', onDragStart, onDragEnd } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Transient drag state (not in React state to avoid re-renders)
  const dragState = useRef({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    hasMoved: false,
  });

  const resetPosition = () => {
    setOffset({ x: 0, y: 0 });
    if (containerRef.current) {
      containerRef.current.style.transform = '';
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      const handle = target.closest(handleSelector);
      if (!handle || !container.contains(handle)) return;

      e.preventDefault();

      // Capture pointer on the handle element
      (handle as HTMLElement).setPointerCapture(e.pointerId);
      (handle as HTMLElement).style.touchAction = 'none';

      // Record start position
      dragState.current = {
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
        hasMoved: false,
      };

      // Attach move/up listeners to the handle
      (handle as HTMLElement).addEventListener('pointermove', handlePointerMove);
      (handle as HTMLElement).addEventListener('pointerup', handlePointerUp);
    };

    const handlePointerMove = (e: PointerEvent) => {
      const deltaX = e.clientX - dragState.current.startX;
      const deltaY = e.clientY - dragState.current.startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Only start dragging if threshold exceeded
      if (!dragState.current.hasMoved && distance < DRAG_THRESHOLD) {
        return;
      }

      if (!dragState.current.hasMoved) {
        dragState.current.hasMoved = true;
        setIsDragging(true);
        onDragStart?.();
      }

      dragState.current.currentX = e.clientX;
      dragState.current.currentY = e.clientY;

      // Apply transform directly to DOM (no re-render)
      if (container) {
        const totalX = offset.x + deltaX;
        const totalY = offset.y + deltaY;
        container.style.transform = `translate(${totalX}px, ${totalY}px)`;
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      const handle = target.closest(handleSelector);
      if (!handle) return;

      // Release pointer capture
      (handle as HTMLElement).releasePointerCapture(e.pointerId);
      (handle as HTMLElement).style.touchAction = '';

      // Remove move/up listeners
      (handle as HTMLElement).removeEventListener('pointermove', handlePointerMove);
      (handle as HTMLElement).removeEventListener('pointerup', handlePointerUp);

      if (dragState.current.hasMoved) {
        // Commit final offset to state
        const deltaX = dragState.current.currentX - dragState.current.startX;
        const deltaY = dragState.current.currentY - dragState.current.startY;
        setOffset((prev) => ({ x: prev.x + deltaX, y: prev.y + deltaY }));

        // Clear inline transform (will be reapplied via React state)
        if (container) {
          container.style.transform = '';
        }

        setIsDragging(false);
        onDragEnd?.();
      }

      // Reset drag state
      dragState.current.hasMoved = false;
    };

    // Attach pointerdown to container
    container.addEventListener('pointerdown', handlePointerDown);

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [handleSelector, offset, onDragStart, onDragEnd]);

  return {
    containerRef,
    offset,
    resetPosition,
    isDragging,
  };
}
