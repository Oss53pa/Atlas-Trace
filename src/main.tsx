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
  // Quand un nouveau service worker prend le contrôle (nouvelle version déployée),
  // on recharge une fois pour afficher immédiatement la mise à jour — plus besoin
  // de vider le cache à la main sur le téléphone.
  let dejaRecharge = false;
  const controleur = navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (dejaRecharge || !controleur) return; // pas de rechargement à la toute première installation
    dejaRecharge = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        reg.update().catch(() => {});
        // Cherche une mise à jour à chaque retour au premier plan (ouverture de la PWA).
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => {});
        });
      })
      .catch(() => {});
  });
}
