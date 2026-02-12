import { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  MonitoredHighlightContainer,
  TextHighlight,
  useHighlightContainerContext,
  type Tip,
} from 'react-pdf-highlighter-extended';
import { HighlightPopup } from './HighlightPopup';
import { NotePopup } from './NotePopup';
import { useDraggable } from '../../hooks/useDraggable';

interface HighlightContainerProps {
  onDelete: (id: string) => void;
  onAskAI: (text: string, question: string, highlightId?: string) => void;
  onUpdateNote: (id: string, comment: string) => void;
}

export function HighlightContainer({
  onDelete,
  onAskAI,
  onUpdateNote,
}: HighlightContainerProps) {
  const { highlight, isScrolledTo } = useHighlightContainerContext();

  const highlightColor = (highlight as any).color || '#FFFF00';
  const contentText = highlight.content?.text || '';
  const comment = (highlight as any).comment || '';

  const hasNotes = comment.trim().length > 0 && comment !== '[]';
  const bgColor = highlightColor === 'note' ? '#FDE68A' : highlightColor;

  const [notePopupOpen, setNotePopupOpen] = useState(false);
  const [notePopupPosition, setNotePopupPosition] = useState({ x: 0, y: 0 });
  const highlightRef = useRef<HTMLDivElement>(null);

  const [notePopupBelow, setNotePopupBelow] = useState(false);

  const { containerRef: dragRef, offset: dragOffset, resetPosition } = useDraggable({
    handleSelector: '.drag-handle',
  });

  const handleOpenNotes = useCallback(() => {
    resetPosition();
    if (highlightRef.current) {
      const rect = highlightRef.current.getBoundingClientRect();
      const popupWidth = 320; // w-80 = 20rem = 320px
      const margin = 12;

      // Center horizontally on the highlight
      let x = rect.left + rect.width / 2;

      // Clamp X so popup doesn't overflow left/right edges
      const halfPopup = popupWidth / 2;
      x = Math.max(halfPopup + margin, Math.min(x, window.innerWidth - halfPopup - margin));

      // Place above highlight by default
      let y = rect.top - margin;
      let below = false;

      // If too close to top, flip to below
      if (rect.top < 200) {
        y = rect.bottom + margin;
        below = true;
      }

      setNotePopupPosition({ x, y });
      setNotePopupBelow(below);
    }
    setNotePopupOpen(true);
  }, [resetPosition]);

  const handleCloseNotes = useCallback(() => {
    setNotePopupOpen(false);
  }, []);

  const tip: Tip = {
    position: highlight.position,
    content: (
      <HighlightPopup
        contentText={contentText}
        hasNotes={hasNotes}
        highlightId={highlight.id}
        onDelete={() => onDelete(highlight.id)}
        onAskAI={onAskAI}
        onOpenNotes={handleOpenNotes}
      />
    ),
  };

  return (
    <>
      <MonitoredHighlightContainer highlightTip={tip}>
        <div ref={highlightRef}>
          <TextHighlight
            highlight={highlight}
            isScrolledTo={isScrolledTo}
            style={{
              background: bgColor,
              opacity: 0.4,
              ...(hasNotes && {
                borderBottom: '2px dotted rgba(0, 0, 0, 0.35)',
              })
            }}
          />
        </div>
      </MonitoredHighlightContainer>

      {notePopupOpen &&
        createPortal(
          <div
            ref={dragRef}
            style={{
              position: 'fixed',
              left: notePopupPosition.x,
              top: notePopupPosition.y,
              transform: notePopupBelow
                ? `translate(calc(-50% + ${dragOffset.x}px), ${dragOffset.y}px)`
                : `translate(calc(-50% + ${dragOffset.x}px), calc(-100% + ${dragOffset.y}px))`,
              zIndex: 9999,
            }}
          >
            <NotePopup
              comment={comment}
              onUpdateNote={(newComment) =>
                onUpdateNote(highlight.id, newComment)
              }
              onDelete={() => {
                onDelete(highlight.id);
                setNotePopupOpen(false);
              }}
              onClose={handleCloseNotes}
              arrowPosition={notePopupBelow ? 'top' : 'bottom'}
              showArrow={dragOffset.x === 0 && dragOffset.y === 0}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
