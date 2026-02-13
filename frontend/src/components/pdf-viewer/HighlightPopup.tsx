import { Trash2, Sparkles, MessageSquare } from 'lucide-react';

interface HighlightPopupProps {
  hasNotes: boolean;
  onDelete: () => void;
  onAskAI: () => void;
  onOpenNotes?: () => void;
}

export function HighlightPopup({
  hasNotes,
  onDelete,
  onAskAI,
  onOpenNotes,
}: HighlightPopupProps) {
  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200/60 p-3 max-w-xs">
      <button
        onClick={onAskAI}
        className="flex items-center gap-1.5 text-xs font-semibold text-white bg-gradient-to-r from-accent to-purple-500 rounded-lg px-3 py-1.5 mb-2 hover:shadow-lg hover:shadow-accent/25 cursor-pointer transition-shadow"
      >
        <Sparkles size={12} />
        Ask AI
      </button>

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
