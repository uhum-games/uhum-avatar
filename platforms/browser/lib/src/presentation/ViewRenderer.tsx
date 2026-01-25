/**
 * ViewRenderer - Main component that renders the current view
 * 
 * This component ties together:
 * - Presentation state (which context variables are set)
 * - Presentation engine (which view to show)
 * - Component registry (how to render each component)
 * - Facts (data to display)
 * 
 * It reactively re-renders when:
 * - Presentation state changes (e.g., user selects an item)
 * - Facts change (e.g., new data from Brain)
 * - Dossier changes (e.g., reconnected to a different agent)
 */

import React, { useMemo, useCallback, useEffect, useState } from 'react';
import {
  DossierPresentation,
  DossierComponent,
  DossierView,
} from '../types';
import {
  PresentationState,
  PresentationStateManager,
  createPresentationStateManager,
} from './state';
import {
  PresentationEngine,
  ViewSelectionResult,
  createPresentationEngine,
  filterFactsBySource,
  getContextItem,
} from './engine';
import {
  ComponentRenderProps,
  registerComponent,
  getComponentRenderer,
} from './registry';

// Import actual components
import { ListComponent } from './components/ListComponent';
import { GridComponent } from './components/GridComponent';
import { DetailComponent } from './components/DetailComponent';
import { FormComponent } from './components/FormComponent';
import { DashboardComponent } from './components/DashboardComponent';
import { ChatComponent } from './components/ChatComponent';

// Register the actual components (override defaults)
registerComponent('list', ListComponent);
registerComponent('grid', GridComponent);
registerComponent('detail', DetailComponent);
registerComponent('form', FormComponent);
registerComponent('dashboard', DashboardComponent);
registerComponent('chat', ChatComponent);

/**
 * Props for the ViewRenderer component.
 */
export interface ViewRendererProps {
  /** Presentation hints from dossier */
  presentation?: DossierPresentation;
  /** Facts (data) from the Brain */
  facts: unknown[];
  /** Callback when user triggers an intent */
  onIntent?: (intent: string, params?: Record<string, unknown>) => void;
  /** Enable debug mode */
  debug?: boolean;
  /** Custom className */
  className?: string;
  /** Custom state manager (for external control) */
  stateManager?: PresentationStateManager;
  /** Callback when presentation state changes */
  onStateChange?: (state: PresentationState) => void;
}

/**
 * ViewRenderer - Renders the appropriate view based on presentation state.
 * 
 * This is the main entry point for the presentation layer. It:
 * 1. Manages presentation state (UI state from dossier schema)
 * 2. Uses the presentation engine to select the current view
 * 3. Renders the view's components using the component registry
 * 
 * @example
 * ```tsx
 * function App() {
 *   const { state } = useAvatar();
 *   
 *   return (
 *     <ViewRenderer
 *       presentation={state.dossier?.presentation}
 *       facts={state.facts}
 *       onIntent={(intent, params) => avatar.sendIntention(intent, params)}
 *     />
 *   );
 * }
 * ```
 */
export function ViewRenderer({
  presentation,
  facts,
  onIntent,
  debug = false,
  className,
  stateManager: externalStateManager,
  onStateChange,
}: ViewRendererProps) {
  // Create or use state manager
  const stateManager = useMemo(
    () => externalStateManager ?? createPresentationStateManager(),
    [externalStateManager]
  );

  // Create presentation engine
  const engine = useMemo(
    () => createPresentationEngine({ debug }),
    [debug]
  );

  // Local state for reactive updates
  const [presentationState, setPresentationState] = useState<PresentationState>(
    stateManager.getState()
  );

  // Initialize when presentation changes
  useEffect(() => {
    // Load presentation into engine
    engine.loadPresentation(presentation);

    // Initialize state from schema
    const schema = presentation?.state?.variables ?? [];
    stateManager.initialize(schema);

    if (debug) {
      console.log('[ViewRenderer] Initialized with presentation:', presentation);
    }
  }, [presentation, engine, stateManager, debug]);

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = stateManager.subscribe((state) => {
      setPresentationState(state);
      onStateChange?.(state);
    });

    return unsubscribe;
  }, [stateManager, onStateChange]);

  // Select current view
  const viewSelection = useMemo(
    () => engine.selectView(presentationState),
    [engine, presentationState]
  );

  // Handle item selection (sets context variable)
  const handleSelect = useCallback(
    (component: DossierComponent, item: unknown) => {
      if (component.context) {
        // Set the context variable for this component's source
        stateManager.setValue(component.context, item as Record<string, unknown>);

        if (debug) {
          console.log('[ViewRenderer] Selected item for context:', component.context, item);
        }
      }

      // For list/grid components without explicit context, try to find a detail view
      // that uses the component's source as context
      const views = engine.getViews();
      for (const view of views) {
        if (view.context && !stateManager.isSet(view.context)) {
          const schema = presentation?.state?.variables ?? [];
          const stateVar = schema.find(v => v.name === view.context);
          if (stateVar?.source === component.source) {
            stateManager.setValue(view.context, item as Record<string, unknown>);
            break;
          }
        }
      }
    },
    [stateManager, engine, presentation, debug]
  );

  // Handle intent trigger
  const handleIntent = useCallback(
    (intent: string, params?: Record<string, unknown>) => {
      if (debug) {
        console.log('[ViewRenderer] Intent triggered:', intent, params);
      }
      onIntent?.(intent, params);
    },
    [onIntent, debug]
  );

  // Render components for the current view
  const renderComponents = useCallback(() => {
    const { components, layout } = viewSelection;

    if (components.length === 0) {
      return (
        <div className="uhum-view-empty">
          <span className="uhum-view-empty__icon">🎯</span>
          <span className="uhum-view-empty__text">No components to display</span>
        </div>
      );
    }

    return (
      <div className={`uhum-view-layout uhum-view-layout--${layout}`}>
        {components.map((component) => {
          const Renderer = getComponentRenderer(component.type ?? 'list');
          
          if (!Renderer) {
            if (debug) {
              console.warn('[ViewRenderer] No renderer for component type:', component.type);
            }
            return null;
          }

          // Get data for this component
          const componentData = filterFactsBySource(facts, component);
          const contextItem = getContextItem(facts, component, presentationState);

          const props: ComponentRenderProps = {
            component,
            data: componentData,
            item: contextItem ?? undefined,
            state: presentationState,
            onSelect: (item) => handleSelect(component, item),
            onIntent: handleIntent,
            className: '',
          };

          return (
            <div key={component.name} className="uhum-view-component">
              <Renderer {...props} />
            </div>
          );
        })}
      </div>
    );
  }, [viewSelection, facts, presentationState, handleSelect, handleIntent, debug]);

  return (
    <div className={`uhum-view-renderer ${className ?? ''}`}>
      {/* Debug info */}
      {debug && (
        <div className="uhum-view-debug">
          <div className="uhum-view-debug__view">
            View: {viewSelection.view?.name ?? 'none'} ({viewSelection.reason})
          </div>
          <div className="uhum-view-debug__components">
            Components: {viewSelection.components.map(c => c.name).join(', ') || 'none'}
          </div>
          <div className="uhum-view-debug__state">
            State: {JSON.stringify(presentationState)}
          </div>
        </div>
      )}

      {/* Render view components */}
      {renderComponents()}
    </div>
  );
}

/**
 * Hook to access the presentation state manager within a ViewRenderer.
 * Must be used inside a component that is a child of ViewRenderer.
 */
export function usePresentationState(): {
  state: PresentationState;
  setValue: (variable: string, value: unknown) => void;
  clearValue: (variable: string) => void;
  clearAll: () => void;
  isSet: (variable: string) => boolean;
} {
  // This would need a context provider in ViewRenderer
  // For now, return a placeholder that throws
  throw new Error('usePresentationState must be used inside ViewRenderer');
}

export default ViewRenderer;
