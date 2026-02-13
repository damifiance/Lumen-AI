import { useState, useEffect, useCallback } from 'react';
import { X, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import lumenLogo from '../../assets/lumen-logo.png';

type Listener = (open: boolean) => void;
let _listener: Listener | null = null;

export function openAbout() {
  _listener?.(true);
}

export function AboutModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [version, setVersion] = useState('');
  const [updateStatus, setUpdateStatus] = useState<
    'idle' | 'checking' | 'available' | 'up-to-date' | 'error'
  >('idle');
  const [latestVersion, setLatestVersion] = useState('');

  useEffect(() => {
    _listener = setIsOpen;
    return () => { _listener = null; };
  }, []);

  useEffect(() => {
    if (isOpen && window.electron?.getAppVersion) {
      window.electron.getAppVersion().then(setVersion);
    }
    if (isOpen) {
      setUpdateStatus('idle');
    }
  }, [isOpen]);

  const handleCheckUpdates = useCallback(async () => {
    if (!window.electron?.checkForUpdates) return;
    setUpdateStatus('checking');
    try {
      const result = await window.electron.checkForUpdates();
      if (result.error) {
        setUpdateStatus('error');
      } else if (result.updateAvailable) {
        setUpdateStatus('available');
        setLatestVersion(result.latestVersion || '');
      } else {
        setUpdateStatus('up-to-date');
      }
    } catch {
      setUpdateStatus('error');
    }
  }, []);

  if (!isOpen) return null;

  const isElectron = !!window.electron?.checkForUpdates;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-[340px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 flex flex-col items-center">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-3 right-3 p-1 text-gray-300 hover:text-gray-500 cursor-pointer rounded-lg hover:bg-gray-100"
          >
            <X size={16} />
          </button>

          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/10 to-teal-400/10 flex items-center justify-center mb-3">
            <img src={lumenLogo} alt="Lumen AI" className="w-9 h-9" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800">Lumen AI</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {version ? `Version ${version}` : 'Paper reader'}
          </p>
        </div>

        {/* Update section */}
        {isElectron && (
          <div className="px-6 pb-5">
            {updateStatus === 'idle' && (
              <button
                onClick={handleCheckUpdates}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 cursor-pointer transition-colors"
              >
                <Download size={15} />
                Check for Updates
              </button>
            )}

            {updateStatus === 'checking' && (
              <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500">
                <Loader2 size={15} className="animate-spin" />
                Checking for updates...
              </div>
            )}

            {updateStatus === 'up-to-date' && (
              <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                <CheckCircle size={15} />
                You're up to date!
              </div>
            )}

            {updateStatus === 'available' && (
              <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                <Download size={15} />
                v{latestVersion} available — downloading...
              </div>
            )}

            {updateStatus === 'error' && (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 w-full">
                  <AlertCircle size={15} />
                  Could not check for updates
                </div>
                <button
                  onClick={handleCheckUpdates}
                  className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-[10px] text-gray-400">
            AI-powered paper reading assistant
          </p>
        </div>
      </div>
    </div>
  );
}
