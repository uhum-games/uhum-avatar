/**
 * GridComponent - Grid of cards
 * 
 * Renders data as a responsive card grid.
 * Good for visual browsing and discovery.
 * 
 * Features:
 * - Auto-fetching: triggers listIntent on mount when client is provided
 * - Card-based layout
 * - Primary field as title, secondary fields as details
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ComponentRenderProps } from '../registry';
import { AvatarState } from '../../types';

export const GridComponent: React.FC<ComponentRenderProps> = ({
  component,
  data: propsData,
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
      return clientState.listCache[modelName]?.loading ?? false;
    }
    return false;
  }, [clientState, modelName]);
  
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
    
    console.log(`[GridComponent] Auto-triggering intent: ${listIntent}`);
    
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

  const fields = component.fields ?? [];
  const actions = component.actions ?? [];
  const globalActions = actions.filter(a => !a.requiresSelection);

  // Use first field as primary (title), rest as secondary
  const primaryField = fields[0];
  const secondaryFields = fields.slice(1, 4); // Show up to 3 more fields

  return (
    <div 
      className={`uhum-grid ${className ?? ''}`}
      data-component={component.name}
    >
      {/* Header */}
      {(component.title || globalActions.length > 0) && (
        <div className="uhum-grid__header">
          <div className="uhum-grid__header-text">
            {component.title && (
              <h2 className="uhum-grid__title">{component.title}</h2>
            )}
            {component.description && (
              <p className="uhum-grid__description">{component.description}</p>
            )}
          </div>
          {globalActions.length > 0 && (
            <div className="uhum-grid__actions">
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

      {/* Grid items */}
      <div className="uhum-grid__items">
        {loading ? (
          <div className="uhum-grid__loading">
            <span className="uhum-grid__loading-spinner" />
            <span className="uhum-grid__loading-text">Loading...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="uhum-grid__empty">
            <span className="uhum-grid__empty-icon">🗂️</span>
            <span className="uhum-grid__empty-text">No items to display</span>
          </div>
        ) : (
          data.map((item, index) => {
            const itemObj = item as Record<string, unknown>;
            const itemId = itemObj.id ?? itemObj._id ?? index;

            return (
              <div
                key={String(itemId)}
                className="uhum-grid__card"
                onClick={() => onSelect?.(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelect?.(item);
                  }
                }}
              >
                {/* Primary field (title) */}
                {primaryField && (
                  <div className="uhum-grid__card-title">
                    {formatValue(itemObj[primaryField.name], primaryField.type)}
                  </div>
                )}

                {/* Secondary fields */}
                <div className="uhum-grid__card-fields">
                  {secondaryFields.map((field, fi) => (
                    <div
                      key={fi}
                      className={`uhum-grid__card-field uhum-grid__card-field--${field.type}`}
                      data-field={field.name}
                    >
                      <span className="uhum-grid__card-field-label">{field.label}</span>
                      <span className="uhum-grid__card-field-value">
                        {formatValue(itemObj[field.name], field.type)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Status badge for atom fields */}
                {secondaryFields.find(f => f.type === 'atom') && (
                  <div className="uhum-grid__card-badge">
                    {formatAtom(String(itemObj[secondaryFields.find(f => f.type === 'atom')!.name] ?? ''))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

/**
 * Format a value for display based on its type.
 */
function formatValue(value: unknown, type: string): string {
  if (value === null || value === undefined) return '—';

  switch (type) {
    case 'datetime':
      return formatDateTime(value);
    case 'date':
      return formatDate(value);
    case 'boolean':
      return value ? '✓' : '✗';
    case 'number':
      return typeof value === 'number' ? value.toLocaleString() : String(value);
    case 'atom':
      return formatAtom(String(value));
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
  if (!value) return '';
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export default GridComponent;
