import { useState, useRef, useEffect } from 'react';
import { Sparkles, ArrowUp, X } from 'lucide-react';
import { useDraggable } from '../../hooks/useDraggable';

interface AskAIPopupProps {
  onSend: (question: string) => void;
  onClose: () => void;
}

export function AskAIPopup({ onSend, onClose }: AskAIPopupProps) {
  const [question, setQuestion] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { containerRef, offset } = useDraggable({
    handleSelector: '.drag-handle',
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = () => {
    const q = question.trim() || 'Explain this passage.';
    onSend(q);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      ref={containerRef}
      className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200/60 p-3 w-72"
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
    >
      <div className="drag-handle flex items-center justify-between mb-1.5 select-none cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-1.5">
          <Sparkles size={13} className="text-accent" />
          <span className="text-[12px] font-semibold text-gray-700">
            Ask AI
          </span>
        </div>
        <button
          onClick={onClose}
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
  );
}
