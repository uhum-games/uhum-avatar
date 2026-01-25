/**
 * Presentation Layer - Local reasoning for view rendering
 * 
 * This module provides the Avatar's presentation layer, which:
 * - Manages presentation state (UI state, separate from Brain state)
 * - Selects which view to display based on current state
 * - Renders components using the Avatar's fixed UI component library
 * 
 * ## Architecture
 * 
 * ```
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                    PRESENTATION LAYER                           │
 * │                                                                 │
 * │  ┌─────────────────┐     ┌──────────────────┐                  │
 * │  │ PresentationState │ ─▶ │ PresentationEngine│                │
 * │  │  (UI state)      │     │  (view selection) │                │
 * │  └─────────────────┘     └────────┬─────────┘                  │
 * │                                   │                             │
 * │                                   ▼                             │
 * │                         ┌─────────────────┐                     │
 * │                         │  ViewRenderer   │                     │
 * │                         │  (orchestrates) │                     │
 * │                         └────────┬────────┘                     │
 * │                                  │                              │
 * │          ┌───────────────────────┴───────────────────────┐      │
 * │          ▼                       ▼                       ▼      │
 * │  ┌─────────────┐         ┌─────────────┐         ┌───────────┐ │
 * │  │ ListComponent│        │GridComponent│         │DetailComp │ │
 * │  └─────────────┘         └─────────────┘         └───────────┘ │
 * │          │                       │                       │      │
 * │          └───────────────────────┴───────────────────────┘      │
 * │                                  │                              │
 * │                          ComponentRegistry                      │
 * │                       (type → React component)                  │
 * └─────────────────────────────────────────────────────────────────┘
 * ```
 * 
 * ## Usage
 * 
 * ```tsx
 * import { ViewRenderer } from '@uhum/avatar/presentation';
 * 
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
 * 
 * ## Key Concepts
 * 
 * ### Presentation State
 * 
 * Local UI state that controls which views/components are shown.
 * Separate from Brain state - this is Avatar-only.
 * 
 * ```typescript
 * const stateManager = createPresentationStateManager();
 * stateManager.initialize(dossier.presentation?.state?.variables ?? []);
 * stateManager.setValue('selected_book', { id: '123', title: 'My Book' });
 * ```
 * 
 * ### View Selection
 * 
 * The engine selects which view to display based on current state:
 * - Views have context requirements (state variables that must be set)
 * - Default view is shown when no context matches
 * - Currently: single view at a time
 * - Future: multiple views with merge logic
 * 
 * ### Component Registry
 * 
 * Maps component types to React components:
 * - `list` → ListComponent
 * - `grid` → GridComponent
 * - `detail` → DetailComponent
 * - `form` → FormComponent
 * - `dashboard` → DashboardComponent
 * - `chat` → ChatComponent
 * 
 * The Avatar's UI library is fixed, but follows theme/brand guidelines.
 */

// State management
export {
  PresentationStateManager,
  createPresentationStateManager,
  presentationReducer,
  type PresentationState,
  type PresentationValue,
  type PresentationAction,
  type PresentationStateSubscriber,
} from './state';

// View selection engine
export {
  PresentationEngine,
  createPresentationEngine,
  filterFactsBySource,
  getContextItem,
  type ViewSelectionResult,
  type PresentationEngineConfig,
} from './engine';

// Component registry
export {
  registerComponent,
  getComponentRenderer,
  hasComponentRenderer,
  getRegisteredTypes,
  renderComponent,
  initializeDefaultComponents,
  // Default components (for customization)
  DefaultListComponent,
  DefaultGridComponent,
  DefaultDetailComponent,
  DefaultFormComponent,
  DefaultDashboardComponent,
  DefaultChatComponent,
  type ComponentRenderProps,
  type ComponentRenderer,
} from './registry';

// UI Components
export {
  ListComponent,
  GridComponent,
  DetailComponent,
  FormComponent,
  DashboardComponent,
  ChatComponent,
  type ChatMessage,
} from './components';

// Main renderer
export { ViewRenderer, type ViewRendererProps } from './ViewRenderer';

// Re-export styles path for convenience
// Users should import: import '@uhum/avatar/presentation/styles.css'
