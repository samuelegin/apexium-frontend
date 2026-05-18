import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Never retry on 401 — session is gone, redirect instead
        if (error?.status === 401) return false;
        // Retry once on everything else
        return failureCount < 1;
      },
    },
    mutations: {
      retry: (failureCount, error) => {
        if (error?.status === 401) return false;
        return false; // Never retry mutations
      },
    },
  },
});
