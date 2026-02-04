import { useState, useRef, useEffect } from 'react';
import { Sparkles, ArrowUp, X } from 'lucide-react';

const COLORS = [
  { color: '#FDE68A', label: 'Yellow' },
  { color: '#86EFAC', label: 'Green' },
  { color: '#93C5FD', label: 'Blue' },
  { color: '#FCA5A5', label: 'Pink' },
  { color: '#C4B5FD', label: 'Purple' },
];

interface SelectionTipProps {
  onHighlight: (color: string) => void;
  onAskAI: (question: string) => void;
}

export function SelectionTip({ onHighlight, onAskAI }: SelectionTipProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [question, setQuestion] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (showPrompt) {
      inputRef.current?.focus();
    }
  }, [showPrompt]);

  const handleSend = () => {
    const q = question.trim() || 'Explain this passage.';
    onAskAI(q);
    setShowPrompt(false);
    setQuestion('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      setShowPrompt(false);
      setQuestion('');
    }
  };

  if (showPrompt) {
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200/60 p-3 w-72">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Sparkles size={13} className="text-accent" />
            <span className="text-[12px] font-semibold text-gray-700">Ask AI</span>
          </div>
          <button
            onClick={() => {
              setShowPrompt(false);
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
            className="w-7 h-7 flex items-center justify-center bg-accent text-white rounded-lg hover:bg-accent-hover cursor-pointer shrink-0 transition-colors"
            title="Send"
          >
            <ArrowUp size={13} strokeWidth={2.5} />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5">
          Press Enter to send, Esc to cancel
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200/60 px-2.5 py-2">
      {COLORS.map(({ color, label }) => (
        <button
          key={color}
          onClick={() => onHighlight(color)}
          className="w-6 h-6 rounded-full hover:scale-125 transition-transform cursor-pointer ring-2 ring-white shadow-sm"
          style={{ backgroundColor: color }}
          title={`Highlight ${label}`}
        />
      ))}
      <div className="w-px h-5 bg-gray-200 mx-1" />
      <button
        onClick={() => setShowPrompt(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-accent to-purple-500 rounded-lg hover:shadow-lg hover:shadow-accent/25 cursor-pointer transition-shadow"
      >
        <Sparkles size={12} />
        Ask AI
      </button>
    </div>
  );
}
