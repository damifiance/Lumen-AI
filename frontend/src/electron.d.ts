export {};

declare global {
  interface Window {
    electron?: {
      getBackendPort: () => Promise<number>;
      checkForUpdates: () => Promise<{ updateAvailable: boolean; latestVersion?: string; currentVersion?: string; error?: string }>;
      getAppVersion: () => Promise<string>;
      secureStore: {
        get: (key: string) => Promise<string | null>;
        set: (key: string, value: string) => Promise<void>;
        remove: (key: string) => Promise<void>;
      };
    };
    __BACKEND_PORT__?: number;
  }
}
