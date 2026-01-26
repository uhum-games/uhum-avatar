import { useCallback } from 'react';
import { useAvatar, ViewRenderer } from '@uhum/avatar-lib';

interface ContentAreaProps {
  state: ReturnType<typeof useAvatar>['state'];
}

/**
 * Main content area that renders based on state.
 * 
 * Uses the ViewRenderer to display views and components based on:
 * - The dossier's presentation definition (views, components, state schema)
 * - Current facts from the Brain
 * - User interactions (item selection, etc.)
 */
export function ContentArea({ state }: ContentAreaProps) {
  const { client } = useAvatar();

  // Handle intents from components (e.g., button clicks)
  const handleIntent = useCallback(
    (intent: string, params?: Record<string, unknown>) => {
      console.log('[ContentArea] Intent triggered:', intent, params);
      client.sendIntention(intent, params ?? {});
    },
    [client]
  );

  // Show loading overlay
  if (state.loading) {
    return (
      <div className="avatar-loading-overlay">
        <div className="avatar-loading-spinner" />
        <p>{state.loading.message || 'Loading...'}</p>
      </div>
    );
  }

  // Check if we have presentation data
  const viewsCount = state.dossier?.presentation?.views?.length ?? 0;
  const hasPresentation = viewsCount > 0;
  
  console.log('[ContentArea] Rendering:', {
    hasPresentation,
    viewsCount,
    views: state.dossier?.presentation?.views,
    components: state.dossier?.presentation?.components,
    factsCount: state.facts.length,
    factsStoreKeys: Object.keys(state.factsStore),
  });

  // Render using ViewRenderer if we have presentation data
  if (hasPresentation) {
    return (
      <div className="avatar-content">
        <ViewRenderer
          presentation={state.dossier?.presentation}
          models={state.dossier?.models}
          facts={state.facts}
          factsStore={state.factsStore}
          onIntent={handleIntent}
          debug={true} // Enable debug for development
          className="avatar-view-renderer"
        />
      </div>
    );
  }

  // Fallback: Show facts as JSON if no presentation defined
  if (state.facts.length > 0) {
    return (
      <div className="avatar-content">
        <div className="avatar-facts-header">Data (no views defined)</div>
        <pre className="avatar-facts">{JSON.stringify(state.facts, null, 2)}</pre>
      </div>
    );
  }

  // Empty state - show agent branding or neutral background
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
      {!brand?.logo && (
        <div className="avatar-empty-placeholder">
          <span className="avatar-empty-icon">📚</span>
          <span className="avatar-empty-text">Ready</span>
        </div>
      )}
    </div>
  );
}
