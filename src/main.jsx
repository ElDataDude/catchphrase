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
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      void navigator.serviceWorker.register('/sw.js');
    });
  }
});
