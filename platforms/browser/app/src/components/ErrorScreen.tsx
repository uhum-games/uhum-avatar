import { DirectoryError } from '@uhum/avatar-lib';

interface ErrorScreenProps {
  error: DirectoryError | Error;
  onRetry: () => void;
}

/**
 * Error screen shown when resolution or connection fails.
 */
export function ErrorScreen({ error, onRetry }: ErrorScreenProps) {
  const isNotFound = error instanceof DirectoryError && error.code === 'NOT_FOUND';

  return (
    <div className="avatar-screen avatar-error-screen">
      <div className="avatar-error-icon">⚠️</div>
      <h2>{isNotFound ? 'Agent Not Found' : 'Connection Error'}</h2>
      <p className="avatar-error-message">
        {isNotFound
          ? `No agent is registered for this domain.`
          : error.message || 'An unexpected error occurred'}
      </p>
      {!isNotFound && (
        <button onClick={onRetry} className="avatar-retry-button">
          Try Again
        </button>
      )}
    </div>
  );
}
