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

  const tip: Tip = {
    position: highlight.position,
    content: isNote ? (
      <NotePopup
        comment={comment}
        onUpdateNote={(newComment) =>
          onUpdateNote(highlight.id, newComment)
        }
        onDelete={() => onDelete(highlight.id)}
      />
    ) : (
      <HighlightPopup
        note={comment}
        contentText={contentText}
        isNote={false}
        onDelete={() => onDelete(highlight.id)}
        onAskAI={onAskAI}
      />
    ),
  };

  return (
    <MonitoredHighlightContainer highlightTip={tip}>
      <TextHighlight
        highlight={highlight}
        isScrolledTo={isScrolledTo}
        style={
          isNote
            ? {
                background: 'transparent',
                borderBottom: '2px dashed #f59e0b',
                opacity: 0.8,
              }
            : {
                background: highlightColor,
                opacity: 0.4,
              }
        }
      />
    </MonitoredHighlightContainer>
  );
}
