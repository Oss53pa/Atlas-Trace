import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthzProvider } from './lib/authz';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthzProvider>
      <App />
    </AuthzProvider>
  </StrictMode>
);

// Service worker : installabilité PWA + repli hors-ligne. Actif seulement en build
// (en dev, le SW parasiterait le HMR de Vite).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
