import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

/**
 * Uhum Avatar - Browser Application Entry Point
 *
 * This is the main entry point for the Avatar browser app.
 * The app resolves agent information at runtime from the Uhum Directory Service
 * based on the current hostname.
 */

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
