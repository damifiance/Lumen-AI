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

interface HighlightContainerProps {
  onDelete: (id: string) => void;
  onAskAI: (text: string, question: string) => void;
  onUpdateNote: (id: string, comment: string) => void;
}

export function HighlightContainer({
  onDelete,
  onAskAI,
  onUpdateNote,
}: HighlightContainerProps) {
  const { highlight, isScrolledTo } = useHighlightContainerContext();

  const highlightColor = (highlight as any).color || '#FFFF00';
  const isNote = highlightColor === 'note';
  const contentText = highlight.content?.text || '';
  const comment = (highlight as any).comment || '';

  const [notePopupOpen, setNotePopupOpen] = useState(false);
  const [notePopupPosition, setNotePopupPosition] = useState({ x: 0, y: 0 });
  const highlightRef = useRef<HTMLDivElement>(null);

  const handleOpenNotes = useCallback(() => {
    if (highlightRef.current) {
      const rect = highlightRef.current.getBoundingClientRect();
      const popupWidth = 288; // w-72 = 18rem = 288px
      const margin = 12;

      let x = rect.right + margin;
      let y = rect.top + rect.height / 2;

      // If popup would overflow right edge, place it to the left
      if (x + popupWidth > window.innerWidth) {
        x = rect.left - popupWidth - margin;
      }

      // Clamp x to stay on screen
      x = Math.max(margin, Math.min(x, window.innerWidth - popupWidth - margin));

      setNotePopupPosition({ x, y });
    }
    setNotePopupOpen(true);
  }, []);

  const handleCloseNotes = useCallback(() => {
    setNotePopupOpen(false);
  }, []);

  const tip: Tip = {
    position: highlight.position,
    content: (
      <HighlightPopup
        note={isNote ? '' : comment}
        contentText={contentText}
        isNote={isNote}
        onDelete={() => onDelete(highlight.id)}
        onAskAI={onAskAI}
        onOpenNotes={isNote ? handleOpenNotes : undefined}
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
            style={
              isNote
                ? {
                    background: '#FDE68A',
                    opacity: 0.4,
                  }
                : {
                    background: highlightColor,
                    opacity: 0.4,
                  }
            }
          />
        </div>
      </MonitoredHighlightContainer>

      {notePopupOpen &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              left: notePopupPosition.x,
              top: notePopupPosition.y,
              transform: 'translateY(-50%)',
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
            />
          </div>,
          document.body,
        )}
    </>
  );
}
