import { useState, useRef, useEffect } from 'react';
import { Trash2, Sparkles, ArrowUp, X, MessageSquare } from 'lucide-react';

interface HighlightPopupProps {
  contentText: string;
  hasNotes: boolean;
  highlightId?: string;
  onDelete: () => void;
  onAskAI: (text: string, question: string, highlightId?: string) => void;
  onOpenNotes?: () => void;
}

export function HighlightPopup({
  contentText,
  hasNotes,
  highlightId,
  onDelete,
  onAskAI,
  onOpenNotes,
}: HighlightPopupProps) {
  const [askMode, setAskMode] = useState(false);
  const [question, setQuestion] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (askMode) inputRef.current?.focus();
  }, [askMode]);

  const handleSend = () => {
    const q = question.trim() || 'Explain this passage.';
    onAskAI(contentText, q, highlightId);
    setAskMode(false);
    setQuestion('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      setAskMode(false);
      setQuestion('');
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200/60 p-3 max-w-xs">
      {askMode ? (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-accent" />
              <span className="text-[12px] font-semibold text-gray-700">
                Ask AI
              </span>
            </div>
            <button
              onClick={() => {
                setAskMode(false);
                setQuestion('');
              }}
              className="p-0.5 text-gray-300 hover:text-gray-500 cursor-pointer rounded"
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex items-end gap-1.5">
            <textarea
              ref={inputRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What does this mean? (Enter to send)"
              rows={2}
              className="flex-1 resize-none bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[12px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-accent/40 placeholder:text-gray-400"
            />
            <button
              onClick={handleSend}
              className="w-7 h-7 flex items-center justify-center text-white bg-accent hover:bg-accent-hover rounded-lg cursor-pointer shrink-0 transition-colors"
              title="Send"
            >
              <ArrowUp size={13} strokeWidth={2.5} />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            Press Enter to send, Esc to cancel
          </p>
        </div>
      ) : (
        <button
          onClick={() => setAskMode(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-white bg-gradient-to-r from-accent to-purple-500 rounded-lg px-3 py-1.5 mb-2 hover:shadow-lg hover:shadow-accent/25 cursor-pointer transition-shadow"
        >
          <Sparkles size={12} />
          Ask AI
        </button>
      )}

      {onOpenNotes && (
        <button
          onClick={onOpenNotes}
          className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg px-3 py-1.5 mb-2 cursor-pointer transition-colors"
        >
          <MessageSquare size={12} />
          {hasNotes ? 'Open notes' : 'Add note'}
        </button>
      )}

      <button
        onClick={onDelete}
        className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 cursor-pointer transition-colors"
      >
        <Trash2 size={12} />
        Remove highlight
      </button>
    </div>
  );
}
