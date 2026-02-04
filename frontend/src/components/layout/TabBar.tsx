import { useEffect } from 'react';
import { X, FileText } from 'lucide-react';
import { usePaperStore } from '../../stores/paperStore';
import { useShortcutStore, isShortcutModifier } from '../../stores/shortcutStore';

export function TabBar() {
  const { tabs, activeTabIndex, switchTab, closeTab } = usePaperStore();
  const matchesEvent = useShortcutStore((s) => s.matchesEvent);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isShortcutModifier(e)) return;

      // Switch tabs 1-9
      for (let i = 1; i <= 9 && i <= tabs.length; i++) {
        if (matchesEvent(`switch-tab-${i}`, e)) {
          e.preventDefault();
          switchTab(i - 1);
          return;
        }
      }

      // Close current tab
      if (matchesEvent('close-tab', e)) {
        e.preventDefault();
        if (activeTabIndex >= 0) {
          closeTab(activeTabIndex);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabs.length, activeTabIndex, switchTab, closeTab, matchesEvent]);

  if (tabs.length === 0) return null;

  const closeLabel =
    useShortcutStore.getState().getBinding('close-tab')?.label ?? '';
  const switchLabel =
    useShortcutStore.getState().getBinding('switch-tab-1')?.label ?? '';
  const modPrefix = switchLabel.split('+')[0];

  return (
    <div className="flex items-center bg-gray-100 border-b border-gray-200 overflow-x-auto">
      {tabs.map((tab, index) => {
        const isActive = index === activeTabIndex;
        const fileName = tab.path.split('/').pop() || 'Untitled';
        const displayName = tab.metadata.title || fileName.replace('.pdf', '');

        return (
          <div
            key={tab.path}
            className={`group flex items-center gap-1.5 px-3 py-2 text-[12px] border-r border-gray-200 cursor-pointer max-w-[200px] shrink-0 ${
              isActive
                ? 'bg-white text-gray-800 border-b-2 border-b-accent -mb-px'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-50'
            }`}
            onClick={() => switchTab(index)}
          >
            <FileText
              size={13}
              className={`shrink-0 ${isActive ? 'text-accent' : 'text-gray-400'}`}
            />
            <span className="truncate" title={fileName}>
              {displayName}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(index);
              }}
              className={`p-0.5 rounded shrink-0 cursor-pointer ${
                isActive
                  ? 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                  : 'text-transparent group-hover:text-gray-400 hover:!text-gray-700 hover:bg-gray-200'
              }`}
              title={`Close tab (${closeLabel})`}
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
      {/* Keyboard hint */}
      {tabs.length > 1 && (
        <div className="px-3 py-2 text-[10px] text-gray-400 shrink-0">
          {modPrefix}+1-{Math.min(tabs.length, 9)} to switch
        </div>
      )}
    </div>
  );
}
