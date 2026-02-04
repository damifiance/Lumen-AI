import { useState, useRef, useEffect } from 'react';
import { ArrowUp, Square } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled: boolean;
}

export function ChatInput({ onSend, onStop, isStreaming, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-2 focus-within:border-accent/40 focus-within:ring-2 focus-within:ring-accent/10 transition-all">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Open a paper to start chatting...' : 'Ask about this paper...'}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-transparent px-2 py-1.5 text-[13px] text-gray-700 focus:outline-none disabled:text-gray-400 placeholder:text-gray-400"
        />
        {isStreaming ? (
          <button
            onClick={onStop}
            className="w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded-xl hover:bg-red-600 cursor-pointer shrink-0 transition-colors"
            title="Stop generating"
          >
            <Square size={12} fill="white" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || disabled}
            className="w-8 h-8 flex items-center justify-center bg-accent text-white rounded-xl hover:bg-accent-hover disabled:bg-gray-200 disabled:text-gray-400 cursor-pointer shrink-0 transition-colors"
            title="Send message"
          >
            <ArrowUp size={15} strokeWidth={2.5} />
          </button>
        )}
      </div>
      <p className="text-[10px] text-gray-400 text-center mt-2">
        Shift + Enter for new line
      </p>
    </div>
  );
}
