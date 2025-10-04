import React from 'react';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className="flex items-center justify-center gap-2 p-4">
      <Loader2 className={`${sizeClasses[size]} animate-spin`} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
}

interface RetryableErrorProps {
  error: Error;
  onRetry: () => void;
  isRetrying?: boolean;
  maxRetries?: number;
  currentAttempt?: number;
}

export function RetryableError({ 
  error, 
  onRetry, 
  isRetrying = false, 
  maxRetries = 3,
  currentAttempt = 1 
}: RetryableErrorProps) {
  const isConnectionError = error.message?.toLowerCase().includes('connection') ||
                           error.message?.toLowerCase().includes('network') ||
                           error.message?.toLowerCase().includes('fetch') ||
                           error.message?.toLowerCase().includes('unauthorized');

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          <CardTitle>Connection Issue</CardTitle>
        </div>
        <CardDescription>
          {isConnectionError 
            ? "Unable to load data. This might be a temporary connection issue."
            : "Failed to load data from the server."
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentAttempt > 1 && (
          <div className="text-sm text-muted-foreground">
            Attempt {currentAttempt} of {maxRetries}
          </div>
        )}
        
        {process.env.NODE_ENV === 'development' && (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">Technical details</summary>
            <pre className="mt-1 whitespace-pre-wrap break-words">{error.message}</pre>
          </details>
        )}
        
        <Button 
          onClick={onRetry} 
          disabled={isRetrying}
          className="w-full"
          variant={currentAttempt >= maxRetries ? "destructive" : "default"}
        >
          {isRetrying ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Retrying...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              {currentAttempt >= maxRetries ? "Final Attempt" : "Retry"}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export function TableLoadingSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {/* Table header skeleton */}
      <div className="grid grid-cols-4 gap-4 p-4 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
      
      {/* Table rows skeleton */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-4 gap-4 p-4 border-b">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function DashboardCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="rounded-full bg-muted p-3 mb-4">
        <AlertTriangle className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4 max-w-sm">{description}</p>
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  );
}