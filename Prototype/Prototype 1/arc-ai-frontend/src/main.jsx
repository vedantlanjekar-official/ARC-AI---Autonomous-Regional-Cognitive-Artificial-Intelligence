import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// Start the app immediately
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

// Set up MSW for API mocking in development (non-blocking)
if (import.meta.env.DEV) {
  import('./mocks/browser')
    .then(({ worker }) => {
      return worker.start({
        onUnhandledRequest: 'bypass', // Bypass unhandled requests instead of logging
        serviceWorker: {
          url: '/mockServiceWorker.js',
        },
        waitUntilReady: false, // Don't block app startup
      });
    })
    .then(() => {
      console.log('✅ MSW worker started - API mocking active');
    })
    .catch((error) => {
      console.warn('⚠️ MSW setup failed, continuing without mocks:', error);
      console.warn('⚠️ Using fallback authentication');
    });
}
