import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { setupBrowserPolyfill } from './utils/browserPolyfill';

// Ensure browser compatibility when opened at http://localhost:54321
setupBrowserPolyfill();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
