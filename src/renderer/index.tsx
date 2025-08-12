import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

// Get the root element
const container = document.getElementById('root');
if (!container) {
  throw new Error('Failed to find root element');
}

// Create React root and render
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);