/**
 * Component Registry - Maps component types to React components
 * 
 * The Avatar has a fixed UI component library. This registry:
 * - Maps dossier component types (list, grid, detail, etc.) to React components
 * - Provides a consistent API for rendering any component type
 * - Follows Avatar theme and brand guidelines
 * 
 * ## Component Types
 * 
 * | Type | React Component | Description |
 * |------|-----------------|-------------|
 * | list | ListComponent | Vertical list of items |
 * | grid | GridComponent | Grid of cards |
 * | detail | DetailComponent | Single item detail view |
 * | form | FormComponent | Input form for creating/editing |
 * | dashboard | DashboardComponent | Multi-widget dashboard |
 * | chat | ChatComponent | Chat-focused component |
 * 
 * ## Future Components
 * 
 * | Type | Description |
 * |------|-------------|
 * | carousel | Horizontal scrollable list |
 * | table | Tabular data view |
 * | chart | Data visualization |
 * | map | Geographic location |
 * | media | Image/video/audio |
 * | status | Status indicator |
 */

import React from 'react';
import { DossierComponent, DossierComponentType, DossierModel } from '../types';
import { PresentationState } from './state';

/**
 * Props passed to every UI component.
 */
export interface ComponentRenderProps {
  /** The component definition from dossier */
  component: DossierComponent;
  /** The data to display (filtered facts for this component) */
  data: unknown[];
  /** Single item data (for detail/form components) */
  item?: unknown;
  /** Current presentation state */
  state: PresentationState;
  /** Model definition (from dossier) - used for schema-based rendering */
  model?: DossierModel;
  /** Whether data is currently loading */
  loading?: boolean;
  /** Callback when user selects an item */
  onSelect?: (item: unknown) => void;
  /** Callback to trigger an intent */
  onIntent?: (intent: string, params?: Record<string, unknown>) => void;
  /** Optional className */
  className?: string;
}

/**
 * A React component that can render a specific component type.
 */
export type ComponentRenderer = React.FC<ComponentRenderProps>;

/**
 * Registry of component type to React component mappings.
 */
const componentRegistry: Map<DossierComponentType, ComponentRenderer> = new Map();

/**
 * Register a React component for a component type.
 * 
 * @example
 * ```typescript
 * registerComponent('list', ListComponent);
 * registerComponent('grid', GridComponent);
 * ```
 */
export function registerComponent(
  type: DossierComponentType,
  renderer: ComponentRenderer
): void {
  componentRegistry.set(type, renderer);
}

/**
 * Get the React component for a component type.
 */
export function getComponentRenderer(
  type: DossierComponentType
): ComponentRenderer | undefined {
  return componentRegistry.get(type);
}

/**
 * Check if a component type is registered.
 */
export function hasComponentRenderer(type: DossierComponentType): boolean {
  return componentRegistry.has(type);
}

/**
 * Get all registered component types.
 */
export function getRegisteredTypes(): DossierComponentType[] {
  return Array.from(componentRegistry.keys());
}

/**
 * Render a component using the registry.
 * 
 * This looks up the appropriate React component for the component type
 * and renders it with the provided props.
 * 
 * @example
 * ```typescript
 * const element = renderComponent({
 *   component: bookListComponent,
 *   data: books,
 *   state: presentationState,
 *   onSelect: (book) => stateManager.setValue('selected_book', book),
 * });
 * ```
 */
export function renderComponent(props: ComponentRenderProps): React.ReactElement | null {
  const type = props.component.type ?? 'list'; // Default to list
  const Renderer = componentRegistry.get(type);

  if (!Renderer) {
    console.warn(`[ComponentRegistry] No renderer for component type: ${type}`);
    return null;
  }

  return React.createElement(Renderer, props);
}

// =============================================================================
// Default Component Implementations
// =============================================================================

/**
 * Default List Component
 * 
 * Renders items in a vertical list with fields as columns.
 */
export const DefaultListComponent: ComponentRenderer = ({
  component,
  data,
  onSelect,
  onIntent,
  className,
}) => {
  const fields = component.fields ?? [];
  const actions = component.actions ?? [];

  return React.createElement('div', {
    className: `uhum-list ${className ?? ''}`,
    'data-component': component.name,
  }, [
    // Header
    component.title && React.createElement('div', {
      key: 'header',
      className: 'uhum-list__header',
    }, [
      React.createElement('h2', { key: 'title', className: 'uhum-list__title' }, component.title),
      actions.length > 0 && React.createElement('div', {
        key: 'actions',
        className: 'uhum-list__actions',
      }, actions.filter(a => !a.requiresSelection).map((action, i) =>
        React.createElement('button', {
          key: i,
          className: `uhum-btn uhum-btn--${action.variant ?? 'secondary'}`,
          onClick: () => onIntent?.(action.intent),
        }, action.label)
      )),
    ]),

    // List items
    React.createElement('div', { key: 'items', className: 'uhum-list__items' },
      data.length === 0
        ? React.createElement('div', { className: 'uhum-list__empty' }, 'No items')
        : data.map((item, index) => {
            const itemObj = item as Record<string, unknown>;
            const itemKey = String(itemObj.id ?? itemObj._id ?? index);
            return React.createElement('div', {
              key: itemKey,
              className: 'uhum-list__item',
              onClick: () => onSelect?.(item),
            }, fields.map((field, fi) =>
              React.createElement('div', {
                key: fi,
                className: 'uhum-list__field',
                'data-field': field.name,
              }, [
                React.createElement('span', {
                  key: 'label',
                  className: 'uhum-list__field-label',
                }, field.label),
                React.createElement('span', {
                  key: 'value',
                  className: 'uhum-list__field-value',
                }, formatFieldValue(itemObj[field.name], field.type)),
              ])
            ));
          })
    ),
  ]);
};

/**
 * Default Grid Component
 * 
 * Renders items in a card grid layout.
 */
export const DefaultGridComponent: ComponentRenderer = ({
  component,
  data,
  onSelect,
  onIntent,
  className,
}) => {
  const fields = component.fields ?? [];
  const actions = component.actions ?? [];

  return React.createElement('div', {
    className: `uhum-grid ${className ?? ''}`,
    'data-component': component.name,
  }, [
    // Header
    component.title && React.createElement('div', {
      key: 'header',
      className: 'uhum-grid__header',
    }, [
      React.createElement('h2', { key: 'title', className: 'uhum-grid__title' }, component.title),
      actions.length > 0 && React.createElement('div', {
        key: 'actions',
        className: 'uhum-grid__actions',
      }, actions.filter(a => !a.requiresSelection).map((action, i) =>
        React.createElement('button', {
          key: i,
          className: `uhum-btn uhum-btn--${action.variant ?? 'secondary'}`,
          onClick: () => onIntent?.(action.intent),
        }, action.label)
      )),
    ]),

    // Grid items
    React.createElement('div', { key: 'items', className: 'uhum-grid__items' },
      data.length === 0
        ? React.createElement('div', { className: 'uhum-grid__empty' }, 'No items')
        : data.map((item, index) => {
            const itemObj = item as Record<string, unknown>;
            const itemKey = String(itemObj.id ?? itemObj._id ?? index);
            return React.createElement('div', {
              key: itemKey,
              className: 'uhum-grid__card',
              onClick: () => onSelect?.(item),
            }, [
              // Card content
              ...fields.slice(0, 4).map((field, fi) =>
                React.createElement('div', {
                  key: fi,
                  className: `uhum-grid__field uhum-grid__field--${field.type}`,
                  'data-field': field.name,
                }, [
                  fi > 0 && React.createElement('span', {
                    key: 'label',
                    className: 'uhum-grid__field-label',
                  }, field.label),
                  React.createElement('span', {
                    key: 'value',
                    className: `uhum-grid__field-value ${fi === 0 ? 'uhum-grid__field-value--primary' : ''}`,
                  }, formatFieldValue(itemObj[field.name], field.type)),
                ])
              ),
            ]);
          })
    ),
  ]);
};

/**
 * Default Detail Component
 * 
 * Renders a single item's details.
 */
export const DefaultDetailComponent: ComponentRenderer = ({
  component,
  item,
  onIntent,
  className,
}) => {
  const fields = component.fields ?? [];
  const actions = component.actions ?? [];
  const itemObj = (item ?? {}) as Record<string, unknown>;

  if (!item) {
    return React.createElement('div', {
      className: `uhum-detail uhum-detail--empty ${className ?? ''}`,
      'data-component': component.name,
    }, 'Select an item to view details');
  }

  return React.createElement('div', {
    className: `uhum-detail ${className ?? ''}`,
    'data-component': component.name,
  }, [
    // Header
    React.createElement('div', {
      key: 'header',
      className: 'uhum-detail__header',
    }, [
      React.createElement('h2', { key: 'title', className: 'uhum-detail__title' }, 
        component.title ?? 'Details'
      ),
      actions.length > 0 && React.createElement('div', {
        key: 'actions',
        className: 'uhum-detail__actions',
      }, actions.map((action, i) =>
        React.createElement('button', {
          key: i,
          className: `uhum-btn uhum-btn--${action.variant ?? 'secondary'}`,
          onClick: () => onIntent?.(action.intent, { id: itemObj.id }),
        }, action.label)
      )),
    ]),

    // Fields
    React.createElement('div', { key: 'fields', className: 'uhum-detail__fields' },
      fields.map((field, i) =>
        React.createElement('div', {
          key: i,
          className: `uhum-detail__field uhum-detail__field--${field.type}`,
          'data-field': field.name,
        }, [
          React.createElement('div', {
            key: 'label',
            className: 'uhum-detail__field-label',
          }, field.label),
          React.createElement('div', {
            key: 'value',
            className: 'uhum-detail__field-value',
          }, formatFieldValue(itemObj[field.name], field.type)),
        ])
      )
    ),
  ]);
};

/**
 * Default Form Component
 * 
 * Renders an input form for creating/editing items.
 */
export const DefaultFormComponent: ComponentRenderer = ({
  component,
  item,
  onIntent,
  className,
}) => {
  const fields = component.fields ?? [];
  const actions = component.actions ?? [];
  const itemObj = (item ?? {}) as Record<string, unknown>;

  return React.createElement('form', {
    className: `uhum-form ${className ?? ''}`,
    'data-component': component.name,
    onSubmit: (e: React.FormEvent) => {
      e.preventDefault();
      // Collect form data and submit
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      const data: Record<string, unknown> = {};
      formData.forEach((value, key) => {
        data[key] = value;
      });
      // Find submit action
      const submitAction = actions.find(a => a.variant === 'primary') ?? actions[0];
      if (submitAction) {
        onIntent?.(submitAction.intent, data);
      }
    },
  }, [
    // Header
    React.createElement('div', {
      key: 'header',
      className: 'uhum-form__header',
    }, [
      React.createElement('h2', { key: 'title', className: 'uhum-form__title' }, 
        component.title ?? 'Form'
      ),
    ]),

    // Fields
    React.createElement('div', { key: 'fields', className: 'uhum-form__fields' },
      fields.map((field, i) =>
        React.createElement('div', {
          key: i,
          className: `uhum-form__field uhum-form__field--${field.type}`,
          'data-field': field.name,
        }, [
          React.createElement('label', {
            key: 'label',
            className: 'uhum-form__label',
            htmlFor: `field-${field.name}`,
          }, field.label),
          createFormInput(field.name, field.type, itemObj[field.name]),
        ])
      )
    ),

    // Actions
    actions.length > 0 && React.createElement('div', {
      key: 'actions',
      className: 'uhum-form__actions',
    }, actions.map((action, i) =>
      React.createElement('button', {
        key: i,
        type: action.variant === 'primary' ? 'submit' : 'button',
        className: `uhum-btn uhum-btn--${action.variant ?? 'secondary'}`,
        onClick: action.variant !== 'primary' 
          ? () => onIntent?.(action.intent)
          : undefined,
      }, action.label)
    )),
  ]);
};

/**
 * Default Dashboard Component
 * 
 * Renders a dashboard placeholder.
 */
export const DefaultDashboardComponent: ComponentRenderer = ({
  component,
  data,
  className,
}) => {
  return React.createElement('div', {
    className: `uhum-dashboard ${className ?? ''}`,
    'data-component': component.name,
  }, [
    React.createElement('h2', { key: 'title', className: 'uhum-dashboard__title' }, 
      component.title ?? 'Dashboard'
    ),
    React.createElement('div', { key: 'content', className: 'uhum-dashboard__content' },
      React.createElement('div', { className: 'uhum-dashboard__placeholder' },
        `Dashboard with ${data.length} items`
      )
    ),
  ]);
};

/**
 * Default Chat Component
 * 
 * Renders a chat placeholder.
 */
export const DefaultChatComponent: ComponentRenderer = ({
  component,
  className,
}) => {
  return React.createElement('div', {
    className: `uhum-chat ${className ?? ''}`,
    'data-component': component.name,
  }, [
    React.createElement('div', { key: 'title', className: 'uhum-chat__title' }, 
      component.title ?? 'Chat'
    ),
    React.createElement('div', { key: 'content', className: 'uhum-chat__placeholder' },
      'Chat component'
    ),
  ]);
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Format a field value for display.
 */
function formatFieldValue(value: unknown, type: string): string {
  if (value === null || value === undefined) {
    return '—';
  }

  switch (type) {
    case 'datetime':
      return value instanceof Date 
        ? value.toLocaleString()
        : new Date(value as string | number).toLocaleString();
    case 'date':
      return value instanceof Date
        ? value.toLocaleDateString()
        : new Date(value as string | number).toLocaleDateString();
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'number':
      return typeof value === 'number' ? value.toLocaleString() : String(value);
    default:
      return String(value);
  }
}

/**
 * Create a form input element for a field type.
 */
function createFormInput(
  name: string,
  type: string,
  defaultValue: unknown
): React.ReactElement {
  const id = `field-${name}`;
  const value = defaultValue ?? '';

  switch (type) {
    case 'text':
      return React.createElement('textarea', {
        key: 'input',
        id,
        name,
        className: 'uhum-form__textarea',
        defaultValue: value as string,
        rows: 4,
      });
    case 'boolean':
      return React.createElement('input', {
        key: 'input',
        id,
        name,
        type: 'checkbox',
        className: 'uhum-form__checkbox',
        defaultChecked: Boolean(value),
      });
    case 'number':
      return React.createElement('input', {
        key: 'input',
        id,
        name,
        type: 'number',
        className: 'uhum-form__input',
        defaultValue: value as number,
      });
    case 'date':
      return React.createElement('input', {
        key: 'input',
        id,
        name,
        type: 'date',
        className: 'uhum-form__input',
        defaultValue: value as string,
      });
    case 'datetime':
      return React.createElement('input', {
        key: 'input',
        id,
        name,
        type: 'datetime-local',
        className: 'uhum-form__input',
        defaultValue: value as string,
      });
    default:
      return React.createElement('input', {
        key: 'input',
        id,
        name,
        type: 'text',
        className: 'uhum-form__input',
        defaultValue: value as string,
      });
  }
}

// =============================================================================
// Register Default Components
// =============================================================================

/**
 * Initialize the registry with default components.
 * 
 * Call this at app startup to register all default renderers.
 */
export function initializeDefaultComponents(): void {
  registerComponent('list', DefaultListComponent);
  registerComponent('grid', DefaultGridComponent);
  registerComponent('detail', DefaultDetailComponent);
  registerComponent('form', DefaultFormComponent);
  registerComponent('dashboard', DefaultDashboardComponent);
  registerComponent('chat', DefaultChatComponent);
}

// Auto-initialize on import
initializeDefaultComponents();
