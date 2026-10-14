import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import { Providers } from './app/providers';
import { ErrorBoundary } from './components/feedback/ErrorBoundary';
import { indexedDBAdapter, localStorageAdapter } from './infrastructure/storage';
import { initializeApp } from './infrastructure/storage/migrations';
import './styles/main.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const storageAdapter =
  typeof window !== 'undefined' && 'indexedDB' in window ? indexedDBAdapter : localStorageAdapter;

// Ensure migrations have run and a brand new install gets sample data before
// the first render, so the app never flashes an empty state on first launch.
initializeApp(storageAdapter).finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Providers>
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </Providers>
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>
  );
});
