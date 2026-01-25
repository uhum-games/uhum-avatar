import type { useAvatar } from '@uhum/avatar-lib';

interface ContentAreaProps {
  state: ReturnType<typeof useAvatar>['state'];
}

/**
 * Main content area that renders based on state.
 * 
 * Note: The primary interaction happens in the chat panel.
 * This area is for displaying rich content, data visualizations,
 * and view-specific UI that the agent sends.
 */
export function ContentArea({ state }: ContentAreaProps) {
  // Show loading overlay
  if (state.loading) {
    return (
      <div className="avatar-loading-overlay">
        <div className="avatar-loading-spinner" />
        <p>{state.loading.message || 'Loading...'}</p>
      </div>
    );
  }

  // Show message if present (typically feedback messages)
  if (state.message) {
    return (
      <div className={`avatar-message avatar-message-${state.message.messageType}`}>
        {state.message.text}
      </div>
    );
  }

  // Show facts/data when available
  if (state.facts.length > 0) {
    return (
      <div className="avatar-content">
        <pre className="avatar-facts">{JSON.stringify(state.facts, null, 2)}</pre>
      </div>
    );
  }

  // Empty state - show agent branding or neutral background
  // The chat panel handles the conversation prompt
  const brand = state.dossier?.presentation?.brand;
  
  return (
    <div className="avatar-empty">
      {brand?.logo && (
        <img 
          src={brand.logo} 
          alt={brand.name || 'Agent'} 
          className="avatar-empty-logo"
        />
      )}
    </div>
  );
}
