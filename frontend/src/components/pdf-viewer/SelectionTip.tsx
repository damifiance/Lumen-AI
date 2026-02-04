import { useState, useRef, useEffect } from 'react';
import { Sparkles, MessageSquare, ArrowUp, X } from 'lucide-react';

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
  onNote: (note: string) => void;
}

export function SelectionTip({ onHighlight, onAskAI, onNote }: SelectionTipProps) {
  const [mode, setMode] = useState<'default' | 'askAI' | 'note'>('default');
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (mode !== 'default') {
      inputRef.current?.focus();
    }
  }, [mode]);

  const resetMode = () => {
    setMode('default');
    setInputText('');
  };

  const handleSend = () => {
    if (mode === 'askAI') {
      const q = inputText.trim() || 'Explain this passage.';
      onAskAI(q);
    } else if (mode === 'note') {
      const c = inputText.trim();
      if (!c) return;
      onNote(c);
    }
    resetMode();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      resetMode();
    }
  };

  if (mode !== 'default') {
    const isAskAI = mode === 'askAI';
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200/60 p-3 w-72">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            {isAskAI ? (
              <Sparkles size={13} className="text-accent" />
            ) : (
              <MessageSquare size={13} className="text-amber-500" />
            )}
            <span className="text-[12px] font-semibold text-gray-700">
              {isAskAI ? 'Ask AI' : 'Add Note'}
            </span>
          </div>
          <button
            onClick={resetMode}
            className="p-0.5 text-gray-300 hover:text-gray-500 cursor-pointer rounded"
          >
            <X size={14} />
          </button>
        </div>
        <div className="flex items-end gap-1.5">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isAskAI
                ? 'What does this mean? (Enter to send)'
                : 'Type your note... (Enter to save)'
            }
            rows={2}
            className={`flex-1 resize-none bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[12px] text-gray-700 focus:outline-none focus:ring-1 placeholder:text-gray-400 ${
              isAskAI ? 'focus:ring-accent/40' : 'focus:ring-amber-500/40'
            }`}
          />
          <button
            onClick={handleSend}
            className={`w-7 h-7 flex items-center justify-center text-white rounded-lg cursor-pointer shrink-0 transition-colors ${
              isAskAI
                ? 'bg-accent hover:bg-accent-hover'
                : 'bg-amber-500 hover:bg-amber-600'
            }`}
            title="Send"
          >
            <ArrowUp size={13} strokeWidth={2.5} />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5">
          Press Enter to {isAskAI ? 'send' : 'save'}, Esc to cancel
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
        onClick={() => setMode('note')}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 cursor-pointer transition-colors"
      >
        <MessageSquare size={12} />
        Note
      </button>
      <button
        onClick={() => setMode('askAI')}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-accent to-purple-500 rounded-lg hover:shadow-lg hover:shadow-accent/25 cursor-pointer transition-shadow"
      >
        <Sparkles size={12} />
        Ask AI
      </button>
    </div>
  );
}
