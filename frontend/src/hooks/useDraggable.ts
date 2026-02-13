import { useRef, useState, useEffect, useCallback } from 'react';

interface UseDraggableOptions {
  handleSelector?: string; // CSS selector for drag handle, default '.drag-handle'
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

interface UseDraggableReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
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

  // Use ref for offset so document-level listeners always see latest value
  const offsetRef = useRef(offset);
  offsetRef.current = offset;

  // Transient drag state (not in React state to avoid re-renders)
  const dragState = useRef({
    active: false, // pointerdown happened on handle
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    dragging: false, // threshold exceeded, actually dragging
  });

  const resetPosition = useCallback(() => {
    setOffset({ x: 0, y: 0 });
    if (containerRef.current) {
      containerRef.current.style.transform = '';
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      const handle = target.closest(handleSelector);
      if (!handle || !container.contains(handle)) return;

      // Just record — don't preventDefault, don't setPointerCapture
      // This lets clicks on buttons inside the handle work normally
      dragState.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
        dragging: false,
      };
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!dragState.current.active) return;

      const deltaX = e.clientX - dragState.current.startX;
      const deltaY = e.clientY - dragState.current.startY;

      if (!dragState.current.dragging) {
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (distance < DRAG_THRESHOLD) return;

        // Threshold exceeded — NOW we start dragging
        dragState.current.dragging = true;
        setIsDragging(true);
        onDragStart?.();
      }

      dragState.current.currentX = e.clientX;
      dragState.current.currentY = e.clientY;

      // Apply transform directly to DOM (no re-render)
      const totalX = offsetRef.current.x + deltaX;
      const totalY = offsetRef.current.y + deltaY;
      container.style.transform = `translate(${totalX}px, ${totalY}px)`;
    };

    const handlePointerUp = () => {
      if (!dragState.current.active) return;

      if (dragState.current.dragging) {
        // Commit final offset to state
        const deltaX = dragState.current.currentX - dragState.current.startX;
        const deltaY = dragState.current.currentY - dragState.current.startY;
        setOffset((prev) => ({ x: prev.x + deltaX, y: prev.y + deltaY }));

        // Clear inline transform (React state re-render will reapply via style prop)
        container.style.transform = '';

        setIsDragging(false);
        onDragEnd?.();
      }

      dragState.current.active = false;
      dragState.current.dragging = false;
    };

    // pointerdown on container, move/up on document so drag continues even when pointer leaves
    container.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handleSelector, onDragStart, onDragEnd]);

  return {
    containerRef,
    offset,
    resetPosition,
    isDragging,
  };
}
