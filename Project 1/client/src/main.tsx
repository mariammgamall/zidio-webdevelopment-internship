import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import App from './App';
import './index.css';

const queryClient = new QueryClient();

// Initialize Sentry for React
const sentryDsn = import.meta.env.VITE_SENTRY_DSN || '';
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration()
    ],
    tracesSampleRate: 1.0,
    tracePropagationTargets: ['localhost', /^\//],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0
  });
  console.log('Sentry SDK mounted on client');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
