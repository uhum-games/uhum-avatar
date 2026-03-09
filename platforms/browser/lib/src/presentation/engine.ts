/**
 * Presentation Engine - View selection reasoning for the Avatar
 * 
 * This is a simple local reasoning machine that:
 * - Evaluates the current presentation state against view definitions
 * - Selects which view should be active
 * - Determines which components to render
 * 
 * The engine operates on the principle that:
 * - Views are "suggestions" - compositions of components
 * - Views have context requirements (state variables that must be set)
 * - The engine selects the best matching view based on current state
 * 
 * ## Current Implementation (v1)
 * 
 * - Single view selection: exactly one view is active at a time
 * - Simple context matching: view activates when its context variable is set
 * - Default view fallback: when no context matches, show default view
 * 
 * ## Future Enhancements (v2+)
 * 
 * - Multi-view merging: multiple views can be active simultaneously
 * - Component deduplication: same component in multiple views shown once
 * - Priority-based selection: weighted view activation
 * - Transition animations: smooth switching between views
 */

import { AgentCardView, AgentCardComponent, AgentCardPresentation } from '../types';
import { PresentationState, PresentationStateManager } from './state';

/**
 * Result of view selection - what should be rendered.
 */
export interface ViewSelectionResult {
  /** The selected view (null if no views defined) */
  view: AgentCardView | null;
  /** Components to render for this view */
  components: AgentCardComponent[];
  /** Layout hint for component arrangement */
  layout: 'single' | 'split' | 'tabs' | 'stack';
  /** Reason for selection (for debugging) */
  reason: string;
}

/**
 * Configuration for the presentation engine.
 */
export interface PresentationEngineConfig {
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * PresentationEngine - Selects views and components based on state.
 * 
 * This is the "reasoning machine" for the presentation layer. It:
 * - Takes the current presentation state
 * - Evaluates against available views
 * - Returns which view and components should be rendered
 * 
 * @example
 * ```typescript
 * const engine = new PresentationEngine();
 * engine.loadPresentation(dossier.presentation);
 * 
 * // Get current view based on state
 * const result = engine.selectView(stateManager.getState());
 * console.log('Active view:', result.view?.name);
 * console.log('Components:', result.components.map(c => c.name));
 * ```
 */
export class PresentationEngine {
  private views: AgentCardView[] = [];
  private components: Map<string, AgentCardComponent> = new Map();
  private defaultView: AgentCardView | null = null;
  private config: PresentationEngineConfig;

  constructor(config: PresentationEngineConfig = {}) {
    this.config = config;
  }

  /**
   * Load presentation definitions from dossier.
   */
  loadPresentation(presentation?: AgentCardPresentation): void {
    // Clear existing data
    this.views = [];
    this.components.clear();
    this.defaultView = null;

    if (!presentation) {
      this.log('No presentation data to load');
      return;
    }

    // Load components into lookup map
    if (presentation.components) {
      for (const component of presentation.components) {
        this.components.set(component.name, component);
        this.log('Loaded component:', component.name);
      }
    }

    // Load views
    if (presentation.views) {
      this.views = [...presentation.views];
      
      // Find the default view
      this.defaultView = this.views.find(v => v.isDefault === true) ?? null;
      
      // If no explicit default, use first view without context requirement
      if (!this.defaultView) {
        this.defaultView = this.views.find(v => !v.context) ?? this.views[0] ?? null;
      }

      this.log('Loaded views:', this.views.map(v => v.name));
      this.log('Default view:', this.defaultView?.name ?? 'none');
    }
  }

  /**
   * Get all loaded views.
   */
  getViews(): AgentCardView[] {
    return this.views;
  }

  /**
   * Get all loaded components.
   */
  getComponents(): AgentCardComponent[] {
    return Array.from(this.components.values());
  }

  /**
   * Get a component by name.
   */
  getComponent(name: string): AgentCardComponent | undefined {
    return this.components.get(name);
  }

  /**
   * Select the appropriate view based on current state.
   * 
   * Selection logic:
   * 1. Find views whose context variable is set in state
   * 2. If multiple match, prefer more specific (non-default) views
   * 3. If none match, fall back to default view
   * 4. If no default, return null view with empty components
   */
  selectView(state: PresentationState): ViewSelectionResult {
    // Find all views that match current state
    const matchingViews = this.views.filter(view => {
      if (!view.context) {
        // Views without context only match if nothing else does (fallback)
        return false;
      }
      // View matches if its context variable is set (not null)
      return state[view.context] !== null && state[view.context] !== undefined;
    });

    this.log('Matching views:', matchingViews.map(v => v.name));

    // Select the best match
    let selectedView: AgentCardView | null = null;
    let reason = '';

    if (matchingViews.length > 0) {
      // For now, use first matching view
      // Future: implement priority/specificity scoring
      selectedView = matchingViews[0];
      reason = `Context '${selectedView.context}' is set`;
    } else if (this.defaultView) {
      selectedView = this.defaultView;
      reason = 'Default view (no context matches)';
    } else {
      reason = 'No views available';
    }

    this.log('Selected view:', selectedView?.name ?? 'none', '-', reason);

    // Resolve components for the selected view
    const resolvedComponents = this.resolveComponents(selectedView, state);

    return {
      view: selectedView,
      components: resolvedComponents,
      layout: selectedView?.layout ?? 'single',
      reason,
    };
  }

  /**
   * Resolve the actual component definitions for a view.
   * 
   * This also filters out components that shouldn't be shown
   * (e.g., detail components whose context isn't set).
   */
  private resolveComponents(
    view: AgentCardView | null,
    state: PresentationState
  ): AgentCardComponent[] {
    if (!view || !view.components) {
      return [];
    }

    const resolved: AgentCardComponent[] = [];

    for (const componentName of view.components) {
      const component = this.components.get(componentName);
      
      if (!component) {
        this.log('Warning: Component not found:', componentName);
        continue;
      }

      // Check if component's context requirement is satisfied
      if (component.context) {
        const contextValue = state[component.context];
        if (contextValue === null || contextValue === undefined) {
          this.log('Skipping component (context not set):', componentName);
          continue;
        }
      }

      resolved.push(component);
    }

    this.log('Resolved components:', resolved.map(c => c.name));
    return resolved;
  }

  /**
   * Create a reactive view selector that updates on state changes.
   * 
   * @example
   * ```typescript
   * const unsubscribe = engine.createReactiveSelector(
   *   stateManager,
   *   (result) => {
   *     console.log('View changed:', result.view?.name);
   *     // Re-render UI
   *   }
   * );
   * ```
   */
  createReactiveSelector(
    stateManager: PresentationStateManager,
    onViewChange: (result: ViewSelectionResult) => void
  ): () => void {
    let lastView: AgentCardView | null = null;

    const unsubscribe = stateManager.subscribe((state) => {
      const result = this.selectView(state);
      
      // Only notify if view actually changed
      if (result.view !== lastView) {
        lastView = result.view;
        onViewChange(result);
      }
    });

    return unsubscribe;
  }

  /**
   * Debug logging.
   */
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[PresentationEngine]', ...args);
    }
  }
}

/**
 * Create a new PresentationEngine.
 */
export function createPresentationEngine(
  config?: PresentationEngineConfig
): PresentationEngine {
  return new PresentationEngine(config);
}

/**
 * Helper to filter facts by component source.
 * 
 * Given a list of facts and a component, returns only the facts
 * that match the component's source (data model).
 * 
 * @example
 * ```typescript
 * const books = filterFactsBySource(facts, bookListComponent);
 * // Returns only facts that are "book" type
 * ```
 */
export function filterFactsBySource(
  facts: unknown[],
  component: AgentCardComponent
): unknown[] {
  if (!component.source) {
    return facts;
  }

  return facts.filter((fact) => {
    // Facts can be objects with a _type field
    if (typeof fact === 'object' && fact !== null) {
      const factObj = fact as Record<string, unknown>;
      
      // Check for explicit type field
      if (factObj._type === component.source) return true;
      if (factObj.type === component.source) return true;
      
      // Check functor for Prolog-style facts
      if (factObj.functor === component.source) return true;
    }
    
    return false;
  });
}

/**
 * Get the context value for a component from facts.
 * 
 * For detail/form components that depend on a context variable,
 * this finds the matching item in facts.
 * 
 * @example
 * ```typescript
 * // state = { selected_book: { id: '123' } }
 * // facts = [{ _type: 'book', id: '123', title: 'My Book' }, ...]
 * const selectedBook = getContextItem(facts, component, state);
 * // Returns { _type: 'book', id: '123', title: 'My Book' }
 * ```
 */
export function getContextItem(
  facts: unknown[],
  component: AgentCardComponent,
  state: PresentationState
): unknown | null {
  if (!component.context) {
    return null;
  }

  const contextValue = state[component.context];
  if (contextValue === null || contextValue === undefined) {
    return null;
  }

  // If context value is an object with an id, find matching fact
  if (typeof contextValue === 'object' && contextValue !== null) {
    const contextObj = contextValue as Record<string, unknown>;
    const contextId = contextObj.id ?? contextObj._id;

    if (contextId !== undefined) {
      return facts.find((fact) => {
        if (typeof fact === 'object' && fact !== null) {
          const factObj = fact as Record<string, unknown>;
          return factObj.id === contextId || factObj._id === contextId;
        }
        return false;
      }) ?? null;
    }
  }

  // Context value itself might be the item
  return contextValue;
}
