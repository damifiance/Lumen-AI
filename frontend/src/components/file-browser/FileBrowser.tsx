import { useEffect, useState } from 'react';
import { ChevronRight, ChevronDown, FileText, Folder, Home, BookOpen } from 'lucide-react';
import { getRoots, browseDirectory } from '../../api/files';
import type { FileEntry, RootEntry } from '../../types/file';

interface FileBrowserProps {
  onFileSelect: (path: string) => void;
  activePath: string | null;
}

export function FileBrowser({ onFileSelect, activePath }: FileBrowserProps) {
  const [roots, setRoots] = useState<RootEntry[]>([]);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [childEntries, setChildEntries] = useState<Map<string, FileEntry[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    getRoots().then(setRoots).catch(console.error);
  }, []);

  const navigateTo = async (path: string) => {
    setIsLoading(true);
    try {
      const items = await browseDirectory(path);
      setCurrentPath(path);
      setEntries(items);
      setExpandedDirs(new Set());
      setChildEntries(new Map());
    } catch (err) {
      console.error('Failed to browse:', err);
    }
    setIsLoading(false);
  };

  const toggleDir = async (dirPath: string) => {
    const next = new Set(expandedDirs);
    if (next.has(dirPath)) {
      next.delete(dirPath);
    } else {
      next.add(dirPath);
      if (!childEntries.has(dirPath)) {
        try {
          const items = await browseDirectory(dirPath);
          setChildEntries((prev) => new Map(prev).set(dirPath, items));
        } catch (err) {
          console.error('Failed to expand:', err);
        }
      }
    }
    setExpandedDirs(next);
  };

  const goUp = () => {
    if (!currentPath) return;
    const parent = currentPath.split('/').slice(0, -1).join('/') || '/';
    navigateTo(parent);
  };

  const renderEntry = (entry: FileEntry, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedDirs.has(entry.path);
    const isActive = entry.path === activePath;

    if (entry.is_dir) {
      return (
        <div key={entry.path}>
          <button
            onClick={() => toggleDir(entry.path)}
            className="flex items-center gap-2.5 w-full py-1.5 text-[13px] text-sidebar-text hover:text-sidebar-text-bright hover:bg-sidebar-hover rounded-lg cursor-pointer group"
            style={{ paddingLeft: `${12 + depth * 14}px`, paddingRight: '12px' }}
          >
            {isExpanded ? (
              <ChevronDown size={13} className="text-sidebar-text/50 shrink-0" />
            ) : (
              <ChevronRight size={13} className="text-sidebar-text/50 shrink-0" />
            )}
            <Folder size={15} className="text-indigo-400/70 shrink-0" />
            <span className="truncate">{entry.name}</span>
          </button>
          {isExpanded &&
            childEntries.get(entry.path)?.map((child) => renderEntry(child, depth + 1))}
        </div>
      );
    }

    return (
      <button
        key={entry.path}
        onClick={() => onFileSelect(entry.path)}
        className={`flex items-center gap-2.5 w-full py-1.5 text-[13px] rounded-lg cursor-pointer group ${
          isActive
            ? 'bg-accent/20 text-accent'
            : 'text-sidebar-text hover:text-sidebar-text-bright hover:bg-sidebar-hover'
        }`}
        style={{ paddingLeft: `${26 + depth * 14}px`, paddingRight: '12px' }}
      >
        <FileText size={15} className={`shrink-0 ${isActive ? 'text-accent' : 'text-red-400/60'}`} />
        <span className="truncate">{entry.name}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full bg-sidebar-bg">
      {/* Logo / Title */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
            <BookOpen size={16} className="text-accent" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-sidebar-text-bright leading-tight">Paper Reader</h1>
            <p className="text-[10px] text-sidebar-text/50">AI-powered</p>
          </div>
        </div>
      </div>

      <div className="mx-4 border-t border-white/5" />

      {/* Navigation */}
      {!currentPath ? (
        <div className="flex-1 overflow-y-auto dark-scrollbar px-3 pt-3">
          <span className="text-[10px] font-medium text-sidebar-text/40 uppercase tracking-wider px-2 mb-2 block">
            Quick Access
          </span>
          {roots.map((root) => (
            <button
              key={root.path}
              onClick={() => navigateTo(root.path)}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-sidebar-text hover:text-sidebar-text-bright hover:bg-sidebar-hover rounded-lg cursor-pointer"
            >
              <Home size={15} className="text-sidebar-text/40" />
              <span>{root.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto dark-scrollbar px-3 pt-3">
          <button
            onClick={goUp}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-[13px] text-accent hover:bg-sidebar-hover rounded-lg cursor-pointer mb-1"
          >
            <ChevronRight size={13} className="rotate-180" />
            <span>Back</span>
          </button>
          <div className="px-3 py-1 text-[10px] text-sidebar-text/30 truncate mb-1">
            {currentPath}
          </div>
          {isLoading ? (
            <div className="p-4 text-[13px] text-sidebar-text/40 text-center">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="p-4 text-[13px] text-sidebar-text/40 text-center">No PDFs found</div>
          ) : (
            <div className="space-y-0.5">
              {entries.map((entry) => renderEntry(entry))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
