import { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  MonitoredHighlightContainer,
  TextHighlight,
  useHighlightContainerContext,
  type Tip,
} from 'react-pdf-highlighter-extended';
import { HighlightPopup } from './HighlightPopup';
import { AskAIPopup } from './AskAIPopup';
import { NotePopup } from './NotePopup';

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

  // Portal-based popups
  const [askAIOpen, setAskAIOpen] = useState(false);
  const [askAIPos, setAskAIPos] = useState({ x: 0, y: 0 });

  const [notePopupOpen, setNotePopupOpen] = useState(false);
  const [notePopupPos, setNotePopupPos] = useState({ x: 0, y: 0 });

  // Ref on the tip wrapper to grab its position
  const tipWrapperRef = useRef<HTMLDivElement>(null);

  const getTipPosition = useCallback(() => {
    if (tipWrapperRef.current) {
      const rect = tipWrapperRef.current.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.bottom + 4 };
    }
    return { x: window.innerWidth / 2, y: 200 };
  }, []);

  const handleAskAI = useCallback(() => {
    const pos = getTipPosition();
    setAskAIPos(pos);
    setAskAIOpen(true);
  }, [getTipPosition]);

  const handleAskAISend = useCallback((question: string) => {
    onAskAI(contentText, question, highlight.id);
    setAskAIOpen(false);
  }, [onAskAI, contentText, highlight.id]);

  const handleOpenNotes = useCallback(() => {
    const pos = getTipPosition();
    setNotePopupPos(pos);
    setNotePopupOpen(true);
  }, [getTipPosition]);

  const handleCloseNotes = useCallback(() => {
    setNotePopupOpen(false);
  }, []);

  const tip: Tip = {
    position: highlight.position,
    content: (
      <div ref={tipWrapperRef}>
        <HighlightPopup
          hasNotes={hasNotes}
          onDelete={() => onDelete(highlight.id)}
          onAskAI={handleAskAI}
          onOpenNotes={handleOpenNotes}
        />
      </div>
    ),
  };

  return (
    <>
      <MonitoredHighlightContainer highlightTip={tip}>
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
      </MonitoredHighlightContainer>

      {askAIOpen &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              left: askAIPos.x,
              top: askAIPos.y,
              transform: 'translate(-50%, 0)',
              zIndex: 9999,
            }}
          >
            <AskAIPopup
              onSend={handleAskAISend}
              onClose={() => setAskAIOpen(false)}
            />
          </div>,
          document.body,
        )}

      {notePopupOpen &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              left: notePopupPos.x,
              top: notePopupPos.y,
              transform: 'translate(-50%, 0)',
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
