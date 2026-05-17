import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initQuizStore } from './lib/quizStore';

const renderApp = () => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

void initQuizStore().finally(() => {
  renderApp();

  if (!('serviceWorker' in navigator)) return;

  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      void navigator.serviceWorker.register('/sw.js');
    });
    return;
  }

  // Vite dev serves module URLs that should never be held by an old app shell.
  void navigator.serviceWorker.getRegistrations().then((registrations) =>
    Promise.all(registrations.map((registration) => registration.unregister()))
  );
  if ('caches' in window) {
    void caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith('catchphrase-')).map((key) => caches.delete(key)))
    );
  }
});
