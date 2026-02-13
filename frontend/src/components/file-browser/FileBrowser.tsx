import { useEffect, useState, useCallback } from 'react';
import {
  FileText,
  Folder,
  Pin,
  PinOff,
  ChevronLeft,
  Keyboard,
  HelpCircle,
  Info,
} from 'lucide-react';
import lumenLogo from '../../assets/lumen-logo.png';
import { useShortcutStore } from '../../stores/shortcutStore';
import { openOnboarding } from '../common/OnboardingModal';
import { openAbout } from '../common/AboutModal';
import { AuthButton } from '../auth/AuthButton';
import { getRoots, browseDirectory } from '../../api/files';
import type { FileEntry, RootEntry } from '../../types/file';

interface FileBrowserProps {
  onFileSelect: (path: string) => void;
  activePath: string | null;
}

const PINNED_DIR_KEY = 'pinned-directory';

export function FileBrowser({ onFileSelect, activePath }: FileBrowserProps) {
  const [roots, setRoots] = useState<RootEntry[]>([]);
  const [currentPath, setCurrentPath] = useState<string | null>(
    localStorage.getItem(PINNED_DIR_KEY)
  );
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    getRoots().then(setRoots).catch(console.error);
  }, []);

  const loadDirectory = useCallback(async (path: string) => {
    setIsLoading(true);
    try {
      const items = await browseDirectory(path);
      setCurrentPath(path);
      setEntries(items);
      // Check if this path is the pinned one
      setIsPinned(localStorage.getItem(PINNED_DIR_KEY) === path);
    } catch (err) {
      console.error('Failed to load directory:', err);
    }
    setIsLoading(false);
  }, []);

  // Auto-load pinned or initial directory
  useEffect(() => {
    const pinned = localStorage.getItem(PINNED_DIR_KEY);
    if (pinned) {
      loadDirectory(pinned);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const goUp = () => {
    if (!currentPath) return;
    const isWindows = /^[A-Za-z]:\\/.test(currentPath);
    if (isWindows) {
      const lastSep = currentPath.lastIndexOf('\\');
      if (lastSep <= 2) return; // already at drive root e.g. C:\
      loadDirectory(currentPath.slice(0, lastSep));
    } else {
      const lastSep = currentPath.lastIndexOf('/');
      const parent = lastSep <= 0 ? '/' : currentPath.slice(0, lastSep);
      loadDirectory(parent);
    }
  };

  const goToRoots = () => {
    setCurrentPath(null);
    setEntries([]);
    setIsPinned(false);
  };

  const togglePin = () => {
    if (!currentPath) return;
    if (isPinned) {
      localStorage.removeItem(PINNED_DIR_KEY);
      setIsPinned(false);
    } else {
      localStorage.setItem(PINNED_DIR_KEY, currentPath);
      setIsPinned(true);
    }
  };

  const pathSep = currentPath?.includes('\\') ? '\\' : '/';
  const pathParts = currentPath?.split(pathSep) || [];
  const folderName = pathParts[pathParts.length - 1] || '';
  const parentParts = pathParts.slice(0, -1);
  const parentName = parentParts[parentParts.length - 1] || '';

  return (
    <div className="flex flex-col h-full bg-sidebar-bg select-none">
      {/* Logo */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center">
              <img src={lumenLogo} alt="Lumen AI" className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-[13px] font-semibold text-sidebar-text-bright leading-tight tracking-wide">Lumen AI</h1>
              <p className="text-[10px] text-sidebar-text/40">Paper reader</p>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={openOnboarding}
              className="p-1.5 text-sidebar-text/25 hover:text-sidebar-text/50 hover:bg-sidebar-hover rounded-lg cursor-pointer"
              title="Getting started guide"
            >
              <HelpCircle size={13} />
            </button>
            <button
              onClick={() => useShortcutStore.getState().openShortcuts()}
              className="p-1.5 text-sidebar-text/25 hover:text-sidebar-text/50 hover:bg-sidebar-hover rounded-lg cursor-pointer"
              title="Keyboard shortcuts"
            >
              <Keyboard size={13} />
            </button>
            <button
              onClick={openAbout}
              className="p-1.5 text-sidebar-text/25 hover:text-sidebar-text/50 hover:bg-sidebar-hover rounded-lg cursor-pointer"
              title="About & Updates"
            >
              <Info size={13} />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-4 border-t border-white/5" />

      {!currentPath ? (
        /* No folder selected — show starting points */
        <div className="flex-1 overflow-y-auto dark-scrollbar px-3 pt-3">
          <span className="text-[10px] font-medium text-sidebar-text/40 uppercase tracking-wider px-2 mb-2 block">
            Open a folder
          </span>
          {roots.map((root) => (
            <button
              key={root.path}
              onClick={() => loadDirectory(root.path)}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-sidebar-text hover:text-sidebar-text-bright hover:bg-sidebar-hover rounded-lg cursor-pointer mb-0.5"
            >
              <Folder size={14} className="text-sidebar-text/30" />
              <span>{root.name}</span>
            </button>
          ))}
          <div className="mx-1 border-t border-white/5 my-3" />
          <p className="text-[10px] text-sidebar-text/25 px-2 leading-relaxed">
            Navigate into any folder, then pin it to skip this screen next time.
          </p>
          <div className="flex-1" />
          <div className="px-1 pb-2">
            <AuthButton />
          </div>
        </div>
      ) : (
        /* Inside a folder */
        <>
          {/* Navigation bar */}
          <div className="flex items-center justify-between px-3 py-2">
            <button
              onClick={goUp}
              className="flex items-center gap-1 text-[11px] text-sidebar-text/40 hover:text-sidebar-text/70 cursor-pointer rounded px-1.5 py-0.5 hover:bg-sidebar-hover"
              title={`Go to ${parentName || 'parent'}`}
            >
              <ChevronLeft size={12} />
              <span>{parentName || 'Back'}</span>
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={togglePin}
                className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                  isPinned
                    ? 'text-accent bg-accent/10 hover:bg-accent/15'
                    : 'text-sidebar-text/25 hover:text-sidebar-text/50 hover:bg-sidebar-hover'
                }`}
                title={isPinned ? 'Unpin folder' : 'Pin folder (auto-open on launch)'}
              >
                {isPinned ? <Pin size={13} /> : <PinOff size={13} />}
              </button>
            </div>
          </div>

          {/* Current folder name */}
          <div className="px-4 pb-1.5">
            <div className="flex items-center gap-2">
              <Folder size={13} className="text-teal/60 shrink-0" />
              <span className="text-[12px] font-semibold text-sidebar-text-bright truncate">
                {folderName}
              </span>
              {isPinned && (
                <span className="text-[9px] bg-accent/15 text-accent px-1.5 py-0.5 rounded-full font-medium shrink-0">
                  pinned
                </span>
              )}
            </div>
          </div>

          <div className="mx-4 border-t border-white/5" />

          {/* File list */}
          <div className="flex-1 overflow-y-auto dark-scrollbar">
            {isLoading ? (
              <div className="px-4 py-8 text-[13px] text-sidebar-text/30 text-center">
                Loading...
              </div>
            ) : entries.length === 0 ? (
              <div className="px-4 py-8 text-[13px] text-sidebar-text/30 text-center leading-relaxed">
                No PDFs or folders here
              </div>
            ) : (
              <div className="py-1">
                {entries.map((entry) =>
                  entry.is_dir ? (
                    <button
                      key={entry.path}
                      onClick={() => loadDirectory(entry.path)}
                      className="flex items-center gap-2.5 w-full px-4 py-[6px] text-[13px] text-sidebar-text hover:text-sidebar-text-bright hover:bg-sidebar-hover cursor-pointer"
                    >
                      <Folder size={14} className="text-teal/50 shrink-0" />
                      <span className="truncate">{entry.name}</span>
                    </button>
                  ) : (
                    <button
                      key={entry.path}
                      onClick={() => onFileSelect(entry.path)}
                      className={`flex items-center gap-2.5 w-full px-4 py-[6px] text-[13px] cursor-pointer ${
                        entry.path === activePath
                          ? 'bg-accent/15 text-accent'
                          : 'text-sidebar-text hover:text-sidebar-text-bright hover:bg-sidebar-hover'
                      }`}
                    >
                      <FileText
                        size={14}
                        className={`shrink-0 ${
                          entry.path === activePath ? 'text-accent' : 'text-accent/40'
                        }`}
                      />
                      <span className="truncate">{entry.name}</span>
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* Bottom: auth + change folder */}
          <div className="px-3 py-2 border-t border-white/5 space-y-1">
            <AuthButton />
            <button
              onClick={goToRoots}
              className="w-full px-3 py-1.5 text-[11px] text-sidebar-text/30 hover:text-sidebar-text/50 hover:bg-sidebar-hover rounded-lg cursor-pointer text-center"
            >
              Change folder
            </button>
          </div>
        </>
      )}
    </div>
  );
}
