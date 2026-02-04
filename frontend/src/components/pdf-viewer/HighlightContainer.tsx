import {
  MonitoredHighlightContainer,
  TextHighlight,
  useHighlightContainerContext,
  type Tip,
} from 'react-pdf-highlighter-extended';
import { HighlightPopup } from './HighlightPopup';

interface HighlightContainerProps {
  onDelete: (id: string) => void;
}

export function HighlightContainer({ onDelete }: HighlightContainerProps) {
  const { highlight, isScrolledTo } =
    useHighlightContainerContext();

  const highlightColor = (highlight as any).color || '#FFFF00';

  const tip: Tip = {
    position: highlight.position,
    content: (
      <HighlightPopup
        comment={(highlight as any).comment || ''}
        onDelete={() => onDelete(highlight.id)}
      />
    ),
  };

  return (
    <MonitoredHighlightContainer highlightTip={tip}>
      <TextHighlight
        highlight={highlight}
        isScrolledTo={isScrolledTo}
        style={{
          background: highlightColor,
          opacity: 0.4,
        }}
      />
    </MonitoredHighlightContainer>
  );
}
