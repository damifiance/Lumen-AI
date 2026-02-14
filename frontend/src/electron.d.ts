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
      startOAuth: (url: string) => Promise<void>;
      onOAuthCallback: (callback: (data: { code?: string; error?: string }) => void) => void;
      removeOAuthCallback: () => void;
      onAuthDeepLink: (callback: (data: { tokenHash: string; type: string }) => void) => void;
      removeAuthDeepLink: () => void;
      onAuthSession: (callback: (data: { accessToken: string; refreshToken: string }) => void) => void;
      removeAuthSession: () => void;
      deleteUserAccount: (userId: string) => Promise<{ success: boolean; error?: string }>;
    };
    __BACKEND_PORT__?: number;
  }
}
