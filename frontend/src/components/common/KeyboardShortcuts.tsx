import { useState, useEffect, useCallback } from 'react';
import { X, Keyboard, RotateCcw } from 'lucide-react';
import { useShortcutStore, type ShortcutBinding } from '../../stores/shortcutStore';

const isMac = navigator.platform.toUpperCase().includes('MAC');

function modLabel(mod: string): string {
  if (mod === 'meta') return isMac ? 'Cmd' : 'Meta';
  if (mod === 'ctrl') return 'Ctrl';
  return isMac ? 'Option' : 'Alt';
}

export function KeyboardShortcuts() {
  const { shortcuts, isOpen, closeShortcuts, updateBinding, resetAll } =
    useShortcutStore();
  const [recording, setRecording] = useState<string | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!recording) return;

      // Ignore bare modifier presses
      if (['Meta', 'Control', 'Alt', 'Shift'].includes(e.key)) return;

      e.preventDefault();
      e.stopPropagation();

      let modifier: 'meta' | 'ctrl' | 'alt' = 'ctrl';
      if (e.metaKey) modifier = 'meta';
      else if (e.ctrlKey) modifier = 'ctrl';
      else if (e.altKey) modifier = 'alt';

      // Use e.code to get the physical key (immune to Option+key transformations on macOS)
      const code = e.code;
      // Derive a readable key name from the code
      let displayKey = code
        .replace(/^Digit/, '')
        .replace(/^Key/, '')
        .replace(/^Slash$/, '/')
        .replace(/^Backslash$/, '\\')
        .replace(/^Minus$/, '-')
        .replace(/^Equal$/, '=')
        .replace(/^Comma$/, ',')
        .replace(/^Period$/, '.')
        .replace(/^Semicolon$/, ';')
        .replace(/^Quote$/, "'")
        .replace(/^Backquote$/, '`')
        .replace(/^BracketLeft$/, '[')
        .replace(/^BracketRight$/, ']');
      const key = displayKey.length === 1 ? displayKey.toLowerCase() : displayKey;
      const label = `${modLabel(modifier)}+${displayKey.toUpperCase()}`;
      const binding: ShortcutBinding = { label, modifier, key, code };

      updateBinding(recording, binding);
      setRecording(null);
    },
    [recording, updateBinding]
  );

  useEffect(() => {
    if (recording) {
      window.addEventListener('keydown', handleKeyDown, true);
      return () => window.removeEventListener('keydown', handleKeyDown, true);
    }
  }, [recording, handleKeyDown]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !recording) {
        closeShortcuts();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, recording, closeShortcuts]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent/10 to-teal-500/10 flex items-center justify-center">
              <Keyboard size={16} className="text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800">
                Keyboard Shortcuts
              </h2>
              <p className="text-[10px] text-gray-400">
                Click any shortcut to change it
              </p>
            </div>
          </div>
          <button
            onClick={closeShortcuts}
            className="p-1.5 text-gray-300 hover:text-gray-500 rounded-lg hover:bg-gray-50 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.id}
              className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0"
            >
              <span className="text-[13px] text-gray-600">
                {shortcut.description}
              </span>
              <button
                onClick={() =>
                  setRecording(recording === shortcut.id ? null : shortcut.id)
                }
                className={`px-3 py-1.5 text-xs font-mono rounded-lg cursor-pointer transition-all ${
                  recording === shortcut.id
                    ? 'bg-accent text-white animate-pulse'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {recording === shortcut.id
                  ? 'Press keys...'
                  : shortcut.binding.label}
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={resetAll}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <RotateCcw size={12} />
            Reset to defaults
          </button>
          <span className="text-[10px] text-gray-300">
            {isMac ? 'Option' : 'Alt'}+K to toggle this panel
          </span>
        </div>
      </div>
    </div>
  );
}
