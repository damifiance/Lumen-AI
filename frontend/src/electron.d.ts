export {};

declare global {
  interface Window {
    electron?: {
      getBackendPort: () => Promise<number>;
    };
    __BACKEND_PORT__?: number;
  }
}
