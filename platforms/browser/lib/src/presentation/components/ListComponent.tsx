/**
 * ListComponent - Renders a list of items as a table.
 * 
 * The default variant renders data as a responsive table.
 * Uses model definitions (from dossier) for column headers if component 
 * fields are not specified.
 * 
 * Features:
 * - Table layout with sortable headers (future)
 * - Row selection
 * - Action buttons (global and per-row)
 * - Loading and empty states
 * - Responsive design
 * - Auto-fetching: triggers listIntent on mount when client is provided
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ComponentRenderProps } from '../registry';
import { DossierField, DossierModelField, DossierModel, AvatarState } from '../../types';

/**
 * Extended props for ListComponent that include model definition.
 */
export interface ListComponentProps extends ComponentRenderProps {
  /** Model definition (from dossier) - used for column headers if fields not specified */
  model?: DossierModel;
  /** Whether data is currently loading */
  loading?: boolean;
}

export const ListComponent: React.FC<ListComponentProps> = ({
  component,
  data: propsData,
  model,
  loading: propsLoading = false,
  onSelect,
  onIntent,
  className,
  client,
}) => {
  // Track whether we've already triggered the auto-fetch
  const hasFetchedRef = useRef(false);
  
  // Subscribe to client state for real-time updates
  const [clientState, setClientState] = useState<AvatarState | null>(
    client?.getState() ?? null
  );
  
  // Subscribe to client state changes
  useEffect(() => {
    if (!client) return;
    
    const unsubscribe = client.subscribe((newState) => {
      setClientState(newState);
    });
    
    return unsubscribe;
  }, [client]);
  
  // Get the model name from component source
  const modelName = component.source ?? '';
  
  // Get the list intent (e.g., "list_books")
  const listIntent = component.listIntent ?? (modelName ? `list_${modelName}s` : '');
  
  // Check if auto-fetch is enabled (default: true)
  const autoFetch = component.autoFetch !== false;
  
  // Get data from client state (entityStore) if available, otherwise use props
  const data = useMemo(() => {
    if (clientState && modelName) {
      return clientState.entityStore[modelName] ?? propsData;
    }
    return propsData;
  }, [clientState, modelName, propsData]);
  
  // Get loading state from client if available
  const loading = useMemo(() => {
    if (clientState && modelName) {
      return clientState.listCache[modelName]?.loading ?? propsLoading;
    }
    return propsLoading;
  }, [clientState, modelName, propsLoading]);
  
  // Auto-trigger the listIntent on mount
  useEffect(() => {
    // Skip if:
    // - No client provided
    // - No list intent
    // - Auto-fetch disabled
    // - Already fetched
    if (!client || !listIntent || !autoFetch || hasFetchedRef.current) {
      return;
    }
    
    // Check if we already have data or if a fetch is in progress
    const cache = clientState?.listCache[modelName];
    if (cache?.loading || cache?.updatedAt) {
      // Already loading or already fetched
      hasFetchedRef.current = true;
      return;
    }
    
    console.log(`[ListComponent] Auto-triggering intent: ${listIntent}`);
    
    // Mark as fetched to prevent duplicate fetches
    hasFetchedRef.current = true;
    
    // Set loading state
    client.dispatch({
      type: 'SET_LIST_LOADING',
      model: modelName,
      intent: listIntent,
      loading: true,
    });
    
    // Send the intention to the Brain
    client.sendIntention(listIntent, {});
  }, [client, clientState, listIntent, modelName, autoFetch]);
  // Use component fields if specified, otherwise fall back to model fields
  const fields = getFields(component.fields, model);
  const actions = component.actions ?? [];
  const globalActions = actions.filter(a => !a.requiresSelection);
  const rowActions = actions.filter(a => a.requiresSelection);

  return (
    <div 
      className={`uhum-list ${className ?? ''}`}
      data-component={component.name}
    >
      {/* Header */}
      {(component.title || globalActions.length > 0) && (
        <div className="uhum-list__header">
          <div className="uhum-list__header-text">
            {component.title && (
              <h2 className="uhum-list__title">{component.title}</h2>
            )}
            {component.description && (
              <p className="uhum-list__description">{component.description}</p>
            )}
          </div>
          {globalActions.length > 0 && (
            <div className="uhum-list__actions">
              {globalActions.map((action, i) => (
                <button
                  key={i}
                  className={`uhum-btn uhum-btn--${action.variant ?? 'secondary'}`}
                  onClick={() => onIntent?.(action.intent)}
                >
                  {action.icon && <span className="uhum-btn__icon">{action.icon}</span>}
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="uhum-list__table-container">
        {loading ? (
          <div className="uhum-list__loading">
            <span className="uhum-list__loading-spinner" />
            <span className="uhum-list__loading-text">Loading...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="uhum-list__empty">
            <span className="uhum-list__empty-icon">📋</span>
            <span className="uhum-list__empty-text">No items to display</span>
          </div>
        ) : (
          <table className="uhum-list__table">
            <thead className="uhum-list__thead">
              <tr className="uhum-list__header-row">
                {fields.map((field, i) => (
                  <th 
                    key={i} 
                    className={`uhum-list__th uhum-list__th--${field.type}`}
                    data-field={field.name}
                    style={field.width ? { width: field.width } : undefined}
                  >
                    {field.label}
                  </th>
                ))}
                {rowActions.length > 0 && (
                  <th className="uhum-list__th uhum-list__th--actions">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="uhum-list__tbody">
              {data.map((item, index) => {
                const itemObj = item as Record<string, unknown>;
                const itemId = itemObj.id ?? itemObj._id ?? index;

                return (
                  <tr
                    key={String(itemId)}
                    className="uhum-list__row"
                    onClick={() => onSelect?.(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        onSelect?.(item);
                      }
                    }}
                  >
                    {fields.map((field, fi) => (
                      <td
                        key={fi}
                        className={`uhum-list__td uhum-list__td--${field.type}`}
                        data-field={field.name}
                      >
                        {formatValue(itemObj[field.name], field.type)}
                      </td>
                    ))}
                    {rowActions.length > 0 && (
                      <td className="uhum-list__td uhum-list__td--actions">
                        {rowActions.map((action, ai) => (
                          <button
                            key={ai}
                            className={`uhum-btn uhum-btn--sm uhum-btn--${action.variant ?? 'secondary'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onIntent?.(action.intent, itemObj);
                            }}
                          >
                            {action.icon && <span className="uhum-btn__icon">{action.icon}</span>}
                            {action.label}
                          </button>
                        ))}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

/**
 * Get fields from component or model definition.
 * Component fields take priority over model fields.
 */
function getFields(
  componentFields?: DossierField[],
  model?: DossierModel
): DossierField[] {
  // If component has explicit fields, use them
  if (componentFields && componentFields.length > 0) {
    return componentFields;
  }

  // Fall back to model fields
  if (model?.fields) {
    return model.fields.map(modelFieldToComponentField);
  }

  // No fields available
  return [];
}

/**
 * Convert a model field to a component field.
 */
function modelFieldToComponentField(field: DossierModelField): DossierField {
  return {
    name: field.name,
    type: field.type,
    label: field.label,
    reference: field.reference,
  };
}

/**
 * Format a value for display based on its type.
 */
function formatValue(value: unknown, type: string): React.ReactNode {
  if (value === null || value === undefined) return <span className="uhum-list__null">—</span>;

  switch (type) {
    case 'datetime':
      return formatDateTime(value);
    case 'date':
      return formatDate(value);
    case 'boolean':
      return (
        <span className={`uhum-list__bool uhum-list__bool--${value ? 'true' : 'false'}`}>
          {value ? '✓' : '✗'}
        </span>
      );
    case 'number':
      return typeof value === 'number' ? value.toLocaleString() : String(value);
    case 'atom':
      return <span className="uhum-list__atom">{formatAtom(String(value))}</span>;
    default:
      return String(value);
  }
}

function formatDateTime(value: unknown): string {
  try {
    const date = value instanceof Date ? value : new Date(value as string | number);
    return date.toLocaleString();
  } catch {
    return String(value);
  }
}

function formatDate(value: unknown): string {
  try {
    const date = value instanceof Date ? value : new Date(value as string | number);
    return date.toLocaleDateString();
  } catch {
    return String(value);
  }
}

function formatAtom(value: string): string {
  // Convert snake_case to Title Case
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export default ListComponent;
