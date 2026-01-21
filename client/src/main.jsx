// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from 'app/App';
import { AuthProvider } from 'app/AuthContext';
import { HelmetProvider } from 'react-helmet-async';
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  sendDefaultPii: true,
  integrations: [Sentry.browserTracingIntegration(), Sentry.browserProfilingIntegration()],
  tracesSampleRate: 1.0,
  tracePropagationTargets: import.meta.env.VITE_SENTRY_TRACE_PROPAGATION_TARGETS,
  profilesSampleRate: 1.0,
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <HelmetProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HelmetProvider>
  </React.StrictMode>
);
