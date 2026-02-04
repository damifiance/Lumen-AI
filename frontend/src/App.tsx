import { useCallback } from 'react';
import { FileBrowser } from './components/file-browser/FileBrowser';
import { PdfViewer } from './components/pdf-viewer/PdfViewer';
import { ChatPanel } from './components/chat/ChatPanel';
import { usePaperStore } from './stores/paperStore';
import { useHighlightStore } from './stores/highlightStore';
import { useChatStore } from './stores/chatStore';
import { getPaperMetadata } from './api/papers';
import { BookOpen, ArrowLeft, Sparkles } from 'lucide-react';

export default function App() {
  const { activePaperPath, isLoading, setActivePaper, setLoading } =
    usePaperStore();
  const { loadHighlights, clearHighlights } = useHighlightStore();
  const { clearMessages } = useChatStore();

  const handleFileSelect = useCallback(
    async (path: string) => {
      if (path === activePaperPath) return;
      setLoading(true);
      clearHighlights();
      clearMessages();
      try {
        const metadata = await getPaperMetadata(path);
        setActivePaper(path, metadata);
        await loadHighlights(path);
      } catch (err) {
        console.error('Failed to open paper:', err);
        setLoading(false);
      }
    },
    [activePaperPath, setActivePaper, setLoading, loadHighlights, clearHighlights, clearMessages]
  );

  return (
    <div className="flex h-screen bg-gray-100/50">
      {/* Sidebar */}
      <div className="shrink-0" style={{ width: 'var(--sidebar-width)' }}>
        <FileBrowser onFileSelect={handleFileSelect} activePath={activePaperPath} />
      </div>

      {/* Main — PDF Viewer */}
      <div className="flex-1 min-w-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-gray-200 border-t-accent rounded-full animate-spin" />
              <span className="text-sm text-gray-400">Loading paper...</span>
            </div>
          </div>
        ) : activePaperPath ? (
          <PdfViewer paperPath={activePaperPath} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-accent/5 to-purple-500/5 flex items-center justify-center mb-5">
              <BookOpen size={36} className="text-accent/25" />
            </div>
            <h2 className="text-lg font-semibold text-gray-600 mb-2">
              Welcome to Paper Reader
            </h2>
            <p className="text-sm text-gray-400 mb-6 max-w-sm text-center leading-relaxed">
              Browse your files in the sidebar and select a PDF to start reading with AI assistance.
            </p>
            <div className="flex items-center gap-6 text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <ArrowLeft size={14} />
                <span>Browse files</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles size={14} />
                <span>Ask AI about any passage</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Panel */}
      <ChatPanel />
    </div>
  );
}
