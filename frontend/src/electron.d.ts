export {};

declare global {
  interface Window {
    electron?: {
      getBackendPort: () => Promise<number>;
      checkForUpdates: () => Promise<{ updateAvailable: boolean; latestVersion?: string; currentVersion?: string; error?: string }>;
      getAppVersion: () => Promise<string>;
    };
    __BACKEND_PORT__?: number;
  }
}
