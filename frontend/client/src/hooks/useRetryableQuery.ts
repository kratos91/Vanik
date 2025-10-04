import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';

interface UseRetryableQueryOptions {
  queryKey: (string | number)[];
  queryFn?: () => Promise<any>;
  enabled?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  staleTime?: number;
}

export function useRetryableQuery({
  queryKey,
  queryFn,
  enabled = true,
  maxRetries = 3,
  retryDelay = 1000,
  staleTime = 5 * 60 * 1000, // 5 minutes
}: UseRetryableQueryOptions) {
  const [retryAttempt, setRetryAttempt] = useState(0);
  const queryClient = useQueryClient();

  // Use the default queryFn from queryClient if none provided (this handles authentication)
  const resolvedQueryFn = queryFn || queryClient.getDefaultOptions().queries?.queryFn;

  const query = useQuery({
    queryKey,
    queryFn: resolvedQueryFn,
    enabled,
    retry: (failureCount, error: any) => {
      // Don't retry on authentication errors
      if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
        return false;
      }
      
      // Don't retry on client errors (4xx except 401)
      if (error?.message?.includes('400') || error?.message?.includes('403') || error?.message?.includes('404')) {
        return false;
      }
      
      // Retry on network/connection errors and 5xx errors
      const shouldRetry = failureCount < maxRetries && (
        error?.message?.toLowerCase().includes('network') ||
        error?.message?.toLowerCase().includes('connection') ||
        error?.message?.toLowerCase().includes('fetch') ||
        error?.message?.includes('500') ||
        error?.message?.includes('502') ||
        error?.message?.includes('503')
      );
      
      if (shouldRetry) {
        setRetryAttempt(failureCount + 1);
      }
      
      return shouldRetry;
    },
    retryDelay: (attemptIndex) => Math.min(retryDelay * Math.pow(2, attemptIndex), 30000),
    staleTime,
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const manualRetry = useCallback(() => {
    setRetryAttempt(0);
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const isConnectionError = query.error && (
    query.error.message?.toLowerCase().includes('connection') ||
    query.error.message?.toLowerCase().includes('network') ||
    query.error.message?.toLowerCase().includes('fetch')
  );

  return {
    ...query,
    retryAttempt,
    maxRetries,
    manualRetry,
    isConnectionError,
    isRetrying: query.isFetching && !query.isLoading,
  };
}

// Hook for handling authentication errors specifically
export function useAuthenticatedQuery(options: UseRetryableQueryOptions) {
  const query = useRetryableQuery(options);
  
  const isAuthError = query.error && (
    query.error.message?.includes('401') || 
    query.error.message?.includes('Unauthorized')
  );

  const handleAuthError = useCallback(() => {
    if (isAuthError) {
      // Redirect to login after a short delay for user feedback
      setTimeout(() => {
        window.location.href = '/api/login';
      }, 1500);
    }
  }, [isAuthError]);

  return {
    ...query,
    isAuthError,
    handleAuthError,
  };
}