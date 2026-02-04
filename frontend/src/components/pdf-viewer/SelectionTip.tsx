import { Sparkles } from 'lucide-react';

const COLORS = [
  { color: '#FDE68A', label: 'Yellow' },
  { color: '#86EFAC', label: 'Green' },
  { color: '#93C5FD', label: 'Blue' },
  { color: '#FCA5A5', label: 'Pink' },
  { color: '#C4B5FD', label: 'Purple' },
];

interface SelectionTipProps {
  onHighlight: (color: string) => void;
  onAskAI: () => void;
}

export function SelectionTip({ onHighlight, onAskAI }: SelectionTipProps) {
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
        onClick={onAskAI}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-accent to-purple-500 rounded-lg hover:shadow-lg hover:shadow-accent/25 cursor-pointer transition-shadow"
      >
        <Sparkles size={12} />
        Ask AI
      </button>
    </div>
  );
}
