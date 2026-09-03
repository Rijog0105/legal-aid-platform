import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from '@/app/App';
import '@/index.css';

// Register PWA Service Worker for offline capability
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.info('[PWA] New version detected.');
  },
  onOfflineReady() {
    console.info('[PWA] Application is cached and ready to run fully offline.');
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
