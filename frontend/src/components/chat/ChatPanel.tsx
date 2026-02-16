import { useEffect, useRef } from 'react';
import { Trash2, PanelRightClose } from 'lucide-react';
import lumenLogo from '../../assets/lumen-logo.png';
import { useChatStore } from '../../stores/chatStore';
import { usePaperStore } from '../../stores/paperStore';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ModelSelector } from './ModelSelector';
import { UsageWarningBanner } from '../subscription/UsageWarningBanner';

export function ChatPanel() {
  const {
    messages,
    isStreaming,
    isOpen,
    toggleOpen,
    sendMessage,
    stopStreaming,
    clearMessages,
  } = useChatStore();
  const { activePaperPath, metadata } = usePaperStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) {
    return (
      <button
        onClick={toggleOpen}
        className="fixed bottom-6 right-6 w-12 h-12 bg-accent text-white rounded-2xl shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/30 hover:scale-105 flex items-center justify-center cursor-pointer z-50 transition-all glow-accent"
        title="Open chat"
      >
        <img src={lumenLogo} alt="Lumen AI" className="w-5 h-5 invert" />
      </button>
    );
  }

  return (
    <div
      className="flex flex-col h-full bg-white border-l border-gray-200/80"
      style={{ width: 'var(--chat-width)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-accent/10 to-teal/10 flex items-center justify-center">
            <img src={lumenLogo} alt="Lumen AI" className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-semibold text-gray-800">Lumen Chat</span>
        </div>
        <div className="flex items-center gap-1">
          <ModelSelector />
          <button
            onClick={clearMessages}
            className="p-1.5 text-gray-300 hover:text-gray-500 rounded-lg hover:bg-gray-50 cursor-pointer"
            title="Clear chat"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={toggleOpen}
            className="p-1.5 text-gray-300 hover:text-gray-500 rounded-lg hover:bg-gray-50 cursor-pointer"
            title="Close chat"
          >
            <PanelRightClose size={14} />
          </button>
        </div>
      </div>

      {/* Paper context badge */}
      {activePaperPath && (
        <div className="mx-4 mt-3 mb-1 px-3 py-2 bg-accent/5 border border-accent/10 rounded-xl">
          <span className="text-[11px] font-medium text-accent/70 truncate block">
            {metadata?.title || activePaperPath.split('/').pop()}
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 px-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/5 to-teal/5 flex items-center justify-center mb-4">
              <img src={lumenLogo} alt="Lumen AI" className="w-7 h-7 opacity-30" />
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">
              {activePaperPath ? 'Ask anything about this paper' : 'No paper selected'}
            </p>
            <p className="text-xs text-gray-400 text-center leading-relaxed">
              {activePaperPath
                ? 'Type a question below, or select text in the PDF and click "Ask AI"'
                : 'Open a paper from the sidebar to get started'}
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Usage Warning */}
      <UsageWarningBanner />

      {/* Input */}
      <ChatInput
        onSend={(content) => {
          if (activePaperPath) {
            sendMessage(activePaperPath, content);
          }
        }}
        onStop={stopStreaming}
        isStreaming={isStreaming}
        disabled={!activePaperPath}
      />
    </div>
  );
}
