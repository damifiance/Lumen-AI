import { useEffect, useRef, useState } from 'react';
import { Cpu, Lock, ChevronDown } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { getModels } from '../../api/chat';
import { openUpgradeModal } from '../subscription/UpgradeModal';

export function ModelSelector() {
  const { model, models, setModel, setModels } = useChatStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getModels().then(setModels).catch(console.error);
  }, [setModels]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const selectedModel = models.find((m) => m.id === model);
  const hasLockedModels = models.some((m) => m.locked);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 cursor-pointer font-medium px-1 py-0.5 rounded hover:bg-gray-50 transition-colors"
      >
        <Cpu size={13} className="text-gray-400" />
        <span className="truncate max-w-[120px]">
          {selectedModel?.name || 'Loading...'}
        </span>
        <ChevronDown size={12} className="text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
          {models.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                if (m.locked) {
                  setIsOpen(false);
                  openUpgradeModal();
                } else {
                  setModel(m.id);
                  setIsOpen(false);
                }
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
                m.id === model
                  ? 'bg-accent/5 text-accent font-medium'
                  : m.locked
                  ? 'text-gray-400 hover:bg-gray-50'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="flex-1 truncate">{m.name}</span>
              {m.locked && <Lock size={12} className="text-gray-300 shrink-0" />}
            </button>
          ))}

          {hasLockedModels && (
            <div className="border-t border-gray-100 px-3 py-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  openUpgradeModal();
                }}
                className="text-xs text-accent hover:text-accent/80 font-medium cursor-pointer"
              >
                Upgrade to unlock models
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
