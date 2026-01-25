interface LoadingScreenProps {
  message: string;
}

/**
 * Loading screen shown during agent resolution.
 */
export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <div className="avatar-screen avatar-loading-screen">
      <div className="avatar-loading-spinner" />
      <p>{message}</p>
    </div>
  );
}
