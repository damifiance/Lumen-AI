import { useState, useRef, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import {
  parseNotes,
  serializeNotes,
  createNoteEntry,
  type NoteEntry,
} from '../../utils/noteHelpers';
import { useDraggable } from '../../hooks/useDraggable';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface NotePopupProps {
  comment: string;
  onUpdateNote: (comment: string) => void;
  onDelete: () => void;
  onClose?: () => void;
}

export function NotePopup({
  comment,
  onUpdateNote,
  onDelete,
  onClose,
}: NotePopupProps) {
  const [notes, setNotes] = useState<NoteEntry[]>(() => parseNotes(comment));
  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);

  const { containerRef, offset } = useDraggable({
    handleSelector: '.drag-handle',
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!onClose) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !editingId) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, editingId]);

  // Close on click outside
  useEffect(() => {
    if (!onClose) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    // Delay to avoid catching the click that opened this popup
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, containerRef]);

  useEffect(() => {
    if (editingId) editRef.current?.focus();
  }, [editingId]);

  const persist = (updated: NoteEntry[]) => {
    setNotes(updated);
    if (updated.length === 0) {
      onDelete();
    } else {
      onUpdateNote(serializeNotes(updated));
    }
  };

  const handleAdd = () => {
    const text = newText.trim();
    if (!text) return;
    const entry = createNoteEntry(text);
    persist([...notes, entry]);
    setNewText('');
    inputRef.current?.focus();
  };

  const handleEditSave = (id: string) => {
    const text = editText.trim();
    if (!text) return;
    persist(notes.map((n) => (n.id === id ? { ...n, text } : n)));
    setEditingId(null);
    setEditText('');
  };

  const handleDeleteEntry = (id: string) => {
    persist(notes.filter((n) => n.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      action();
    }
    if (e.key === 'Escape') {
      if (editingId) {
        setEditingId(null);
        setEditText('');
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200/60 w-80"
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="drag-handle px-3 pt-3 pb-2 border-b border-gray-100 flex items-center justify-between select-none cursor-grab active:cursor-grabbing">
        <span className="text-[12px] font-semibold text-gray-700">
          Notes ({notes.length})
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className="p-0.5 text-gray-300 hover:text-gray-500 cursor-pointer rounded"
            title="Close"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Thread */}
      <div className="max-h-52 overflow-y-auto px-3 py-2 space-y-2">
        {notes.map((note) => (
          <div
            key={note.id}
            className="group bg-gray-50 rounded-lg px-2.5 py-2 border border-gray-100"
          >
            {editingId === note.id ? (
              <div className="flex items-end gap-1.5">
                <textarea
                  ref={editRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) =>
                    handleKeyDown(e, () => handleEditSave(note.id))
                  }
                  rows={2}
                  className="flex-1 resize-none bg-white border border-amber-200 rounded-lg px-2 py-1.5 text-[12px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                />
                <button
                  onClick={() => handleEditSave(note.id)}
                  className="w-6 h-6 flex items-center justify-center text-white bg-amber-500 hover:bg-amber-600 rounded-lg cursor-pointer shrink-0"
                  title="Save"
                >
                  <Check size={12} />
                </button>
              </div>
            ) : (
              <>
                <p className="text-[12px] text-gray-700 whitespace-pre-wrap break-words">
                  {note.text}
                </p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-gray-400">
                    {relativeTime(note.createdAt)}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingId(note.id);
                        setEditText(note.text);
                      }}
                      className="p-0.5 text-gray-400 hover:text-amber-500 cursor-pointer"
                      title="Edit"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      onClick={() => handleDeleteEntry(note.id)}
                      className="p-0.5 text-gray-400 hover:text-red-500 cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add note input */}
      <div className="px-3 pb-3 pt-2 border-t border-gray-100">
        <div className="flex items-end gap-1.5">
          <textarea
            ref={inputRef}
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, handleAdd)}
            placeholder="Add a note... (Enter to save)"
            rows={2}
            className="flex-1 resize-none bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[12px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-500/40 placeholder:text-gray-400"
          />
          <button
            onClick={handleAdd}
            className="w-7 h-7 flex items-center justify-center text-white bg-amber-500 hover:bg-amber-600 rounded-lg cursor-pointer shrink-0 transition-colors"
            title="Add note"
          >
            <Plus size={13} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
