import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import App from './App';
import { ErrorBoundary } from './components/common/ErrorBoundary';

async function init() {
  if ((window as any).electron) {
    const port = await (window as any).electron.getBackendPort();
    (window as any).__BACKEND_PORT__ = port;
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
}

init();
