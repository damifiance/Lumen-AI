import { useCallback, useRef } from 'react';
import {
  PdfLoader,
  PdfHighlighter,
  type PdfHighlighterUtils,
  type Highlight,
  type PdfSelection,
} from 'react-pdf-highlighter-extended';
import 'react-pdf-highlighter-extended/dist/esm/style/PdfHighlighter.css';
import 'react-pdf-highlighter-extended/dist/esm/style/TextHighlight.css';
import 'react-pdf-highlighter-extended/dist/esm/style/AreaHighlight.css';
import 'react-pdf-highlighter-extended/dist/esm/style/MouseSelection.css';
import 'react-pdf-highlighter-extended/dist/esm/style/pdf_viewer.css';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { getPdfUrl } from '../../api/papers';
import { useHighlightStore } from '../../stores/highlightStore';
import { useChatStore } from '../../stores/chatStore';
import { SelectionTip } from './SelectionTip';
import { HighlightContainer } from './HighlightContainer';
import { ZoomControls } from './ZoomControls';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { createNoteEntry, serializeNotes } from '../../utils/noteHelpers';

interface PdfViewerProps {
  paperPath: string;
}

export function PdfViewer({ paperPath }: PdfViewerProps) {
  const utilsRef = useRef<PdfHighlighterUtils | null>(null);
  const selectionRef = useRef<PdfSelection | null>(null);

  const { highlights, addHighlight, removeHighlight, updateHighlight } =
    useHighlightStore();
  const { askAboutSelection, setOpen } = useChatStore();

  const pdfHighlights: Highlight[] = highlights.map((h) => {
    const position = JSON.parse(h.position_json);
    return {
      id: h.id,
      position,
      content: { text: h.content_text },
      type: 'text' as const,
      color: h.color,
      comment: h.comment,
    } as Highlight & { color: string; comment: string };
  });

  const handleSelection = useCallback((selection: PdfSelection) => {
    selectionRef.current = selection;
  }, []);

  const handleHighlight = useCallback(
    async (color: string) => {
      const selection = selectionRef.current;
      if (!selection) return;

      const ghost = selection.makeGhostHighlight();
      await addHighlight({
        paper_path: paperPath,
        content_text: ghost.content.text || '',
        position_json: JSON.stringify(ghost.position),
        color,
        comment: '',
      });

      utilsRef.current?.removeGhostHighlight();
      selectionRef.current = null;
    },
    [paperPath, addHighlight]
  );

  const handleNote = useCallback(
    async (note: string) => {
      const selection = selectionRef.current;
      if (!selection) return;

      const ghost = selection.makeGhostHighlight();
      await addHighlight({
        paper_path: paperPath,
        content_text: ghost.content.text || '',
        position_json: JSON.stringify(ghost.position),
        color: 'note',
        comment: serializeNotes([createNoteEntry(note)]),
      });

      utilsRef.current?.removeGhostHighlight();
      selectionRef.current = null;
    },
    [paperPath, addHighlight]
  );

  const handleAskAI = useCallback(
    async (question: string, selectedColor?: string) => {
      const selection = selectionRef.current;
      if (!selection) return;

      const ghost = selection.makeGhostHighlight();
      const text = ghost.content.text || '';

      // Create a highlight so the AI answer can be saved as a note later
      const highlight = await addHighlight({
        paper_path: paperPath,
        content_text: text,
        position_json: JSON.stringify(ghost.position),
        color: selectedColor || '#FDE68A',
        comment: '',
      });

      askAboutSelection(paperPath, text, question, highlight.id);
      setOpen(true);
      utilsRef.current?.removeGhostHighlight();
      selectionRef.current = null;
    },
    [paperPath, addHighlight, askAboutSelection, setOpen]
  );

  const handleHighlightAskAI = useCallback(
    (text: string, question: string, highlightId?: string) => {
      askAboutSelection(paperPath, text, question, highlightId);
      setOpen(true);
    },
    [paperPath, askAboutSelection, setOpen]
  );

  const handleUpdateNote = useCallback(
    async (id: string, comment: string) => {
      await updateHighlight(id, { comment });
    },
    [updateHighlight]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await removeHighlight(id);
    },
    [removeHighlight]
  );

  const pdfUrl = getPdfUrl(paperPath);

  return (
    <div className="h-full w-full relative">
      <PdfLoader
        document={pdfUrl}
        workerSrc={pdfjsWorkerUrl}
        beforeLoad={() => <LoadingSpinner message="Loading PDF..." />}
        errorMessage={(error) => (
          <div className="flex items-center justify-center h-full text-red-500">
            Failed to load PDF: {error.message}
          </div>
        )}
      >
        {(pdfDocument) => (
          <PdfHighlighter
            pdfDocument={pdfDocument}
            highlights={pdfHighlights}
            onSelection={handleSelection}
            utilsRef={(utils) => {
              utilsRef.current = utils;
            }}
            selectionTip={
              <SelectionTip
                onHighlight={handleHighlight}
                onAskAI={handleAskAI}
                onNote={handleNote}
              />
            }
            pdfScaleValue="page-width"
            style={{ height: '100%' }}
          >
            <HighlightContainer
              onDelete={handleDelete}
              onAskAI={handleHighlightAskAI}
              onUpdateNote={handleUpdateNote}
            />
            <ZoomControls />
          </PdfHighlighter>
        )}
      </PdfLoader>
    </div>
  );
}
