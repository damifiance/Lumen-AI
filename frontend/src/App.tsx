import { useCallback, useEffect } from 'react';
import { FileBrowser } from './components/file-browser/FileBrowser';
import { PdfViewer } from './components/pdf-viewer/PdfViewer';
import { ChatPanel } from './components/chat/ChatPanel';
import { TabBar } from './components/layout/TabBar';
import { usePaperStore } from './stores/paperStore';
import { useHighlightStore } from './stores/highlightStore';
import { useChatStore } from './stores/chatStore';
import { useAuthStore } from './stores/authStore';
import { useShortcutStore, isShortcutModifier } from './stores/shortcutStore';
import { getPaperMetadata } from './api/papers';
import { ArrowLeft, Sparkles, Keyboard } from 'lucide-react';
import lumenLogo from './assets/lumen-logo.png';
import { OnboardingModal } from './components/common/OnboardingModal';
import { KeyboardShortcuts } from './components/common/KeyboardShortcuts';
import { AboutModal } from './components/common/AboutModal';
import { OllamaSetupCard } from './components/OllamaSetupCard';
import { LoginModal } from './components/auth/LoginModal';
import { SignupModal } from './components/auth/SignupModal';

export default function App() {
  const { tabs, activeTabIndex, isLoading, setActivePaper, setLoading } =
    usePaperStore();
  const { loadHighlights, clearHighlights } = useHighlightStore();
  const { clearMessages, toggleOpen: toggleChat } = useChatStore();
  const { initialize } = useAuthStore();
  const { openShortcuts } = useShortcutStore();
  const matchesEvent = useShortcutStore((s) => s.matchesEvent);

  const activePaperPath =
    activeTabIndex >= 0 && activeTabIndex < tabs.length
      ? tabs[activeTabIndex].path
      : null;

  // Initialize auth on mount (loads persisted session)
  useEffect(() => {
    initialize();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload highlights when switching tabs
  useEffect(() => {
    if (activePaperPath) {
      loadHighlights(activePaperPath);
    } else {
      clearHighlights();
    }
  }, [activePaperPath]); // eslint-disable-line react-hooks/exhaustive-deps

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isShortcutModifier(e)) return;

      if (matchesEvent('toggle-chat', e)) {
        e.preventDefault();
        toggleChat();
      }
      if (matchesEvent('show-shortcuts', e)) {
        e.preventDefault();
        openShortcuts();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [matchesEvent, toggleChat, openShortcuts]);

  const handleFileSelect = useCallback(
    async (path: string) => {
      const existingIndex = tabs.findIndex((t) => t.path === path);
      if (existingIndex >= 0) {
        usePaperStore.getState().switchTab(existingIndex);
        return;
      }

      setLoading(true);
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
    [tabs, setActivePaper, setLoading, loadHighlights, clearMessages]
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="shrink-0" style={{ width: 'var(--sidebar-width)' }}>
        <FileBrowser onFileSelect={handleFileSelect} activePath={activePaperPath} />
      </div>

      {/* Main — Tab Bar + PDF Viewer */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header bar with tabs and auth button */}
        {tabs.length > 0 && (
          <div className="flex items-center bg-gray-100 border-b border-gray-200">
            <div className="flex-1 min-w-0">
              <TabBar />
            </div>
          </div>
        )}
        <div className="flex-1 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full bg-white">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-3 border-gray-200 border-t-accent rounded-full animate-spin" />
                <span className="text-sm text-gray-400">Loading paper...</span>
              </div>
            </div>
          ) : activePaperPath ? (
            <PdfViewer key={activePaperPath} paperPath={activePaperPath} />
          ) : (
            <div className="flex items-center justify-center h-full bg-white">
              <div className="flex gap-12 max-w-6xl px-8">
                {/* Welcome content */}
                <div className="flex flex-col items-center text-gray-400 flex-shrink-0">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-accent/8 to-teal-400/8 flex items-center justify-center mb-5">
                    <img src={lumenLogo} alt="Lumen AI" className="w-10 h-10 opacity-30" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-700 mb-2">
                    Welcome to Lumen AI
                  </h2>
                  <p className="text-sm text-gray-400 mb-6 max-w-sm text-center leading-relaxed">
                    Browse your files in the sidebar and select a PDF to start reading with AI assistance.
                  </p>
                  <div className="flex flex-col items-start gap-3 text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                      <ArrowLeft size={14} />
                      <span>Browse files</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} />
                      <span>Ask AI about any passage</span>
                    </div>
                    <button
                      onClick={openShortcuts}
                      className="flex items-center gap-2 hover:text-gray-600 cursor-pointer"
                    >
                      <Keyboard size={14} />
                      <span>Shortcuts</span>
                    </button>
                  </div>
                </div>

                {/* Ollama Setup Card */}
                <div className="hidden lg:flex items-center">
                  <OllamaSetupCard />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <ChatPanel />

      {/* Modals */}
      <OnboardingModal />
      <KeyboardShortcuts />
      <AboutModal />
      <LoginModal />
      <SignupModal />
    </div>
  );
}
