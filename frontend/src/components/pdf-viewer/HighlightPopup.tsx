import { Trash2 } from 'lucide-react';

interface HighlightPopupProps {
  comment: string;
  onDelete: () => void;
}

export function HighlightPopup({ comment, onDelete }: HighlightPopupProps) {
  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200/60 p-3 max-w-xs">
      {comment && <p className="text-sm text-gray-700 mb-2">{comment}</p>}
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
