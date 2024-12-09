// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './AuthContext'; // Import AuthProvider
import './resizeObserverWrapper';

window.addEventListener('error', (event) => {
    if (event.message === 'ResizeObserver loop completed with undelivered notifications.') {
        event.stopImmediatePropagation();
    }
});

window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message === 'ResizeObserver loop completed with undelivered notifications.') {
        event.preventDefault();
    }
});


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider> {/* Wrap App with AuthProvider */}
      
      <App />
    </AuthProvider>
  </React.StrictMode>
);
