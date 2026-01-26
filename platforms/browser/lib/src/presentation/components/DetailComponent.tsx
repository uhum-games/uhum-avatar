/**
 * DetailComponent - Single item detail view
 * 
 * Renders detailed information about a single item.
 * Typically activated when a user selects an item from a list/grid.
 * 
 * Features:
 * - Auto-fetching: triggers detailIntent on mount when client is provided and item has an ID
 * - Displays field values with appropriate formatting
 * - Action buttons for item-specific operations
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ComponentRenderProps } from '../registry';
import { AvatarState } from '../../types';

export const DetailComponent: React.FC<ComponentRenderProps> = ({
  component,
  item: propsItem,
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
  
  // Get the detail intent (e.g., "get_book")
  const detailIntent = component.detailIntent ?? (modelName ? `get_${modelName}` : '');
  
  // Check if auto-fetch is enabled (default: true)
  const autoFetch = component.autoFetch !== false;
  
  // Extract entity identifier from props item
  const entityId = useMemo(() => {
    const itemObj = propsItem as Record<string, unknown> | undefined;
    return itemObj?.id ?? itemObj?.title ?? itemObj?.name;
  }, [propsItem]);
  
  // Get item from client state if available, otherwise use props
  const item = useMemo(() => {
    if (clientState && modelName && entityId) {
      const entities = clientState.entityStore[modelName] ?? [];
      const found = entities.find((e) => {
        const record = e as Record<string, unknown>;
        return record.id === entityId || record.title === entityId || record.name === entityId;
      });
      return found ?? propsItem;
    }
    return propsItem;
  }, [clientState, modelName, entityId, propsItem]);
  
  // Get loading state from client if available
  const cacheKey = `${modelName}:${entityId ?? 'none'}`;
  const loading = useMemo(() => {
    if (clientState) {
      return clientState.entityCache?.[cacheKey]?.loading ?? false;
    }
    return false;
  }, [clientState, cacheKey]);
  
  // Auto-trigger the detailIntent on mount
  useEffect(() => {
    // Skip if:
    // - No client provided
    // - No detail intent
    // - No entity ID
    // - Auto-fetch disabled
    // - Already fetched
    if (!client || !detailIntent || !entityId || !autoFetch || hasFetchedRef.current) {
      return;
    }
    
    // Check if we already have this entity cached
    const cache = clientState?.entityCache?.[cacheKey];
    if (cache?.loading || cache?.updatedAt) {
      // Already loading or already fetched
      hasFetchedRef.current = true;
      return;
    }
    
    console.log(`[DetailComponent] Auto-triggering intent: ${detailIntent} for entity: ${entityId}`);
    
    // Mark as fetched to prevent duplicate fetches
    hasFetchedRef.current = true;
    
    // Set loading state
    client.dispatch({
      type: 'SET_ENTITY_LOADING',
      model: modelName,
      entityId: String(entityId),
      intent: detailIntent,
      loading: true,
    });
    
    // Send the intention to the Brain with the entity identifier
    // Try common identifier field names
    client.sendIntention(detailIntent, { id: entityId });
  }, [client, clientState, detailIntent, modelName, entityId, autoFetch, cacheKey]);

  const fields = component.fields ?? [];
  const actions = component.actions ?? [];
  const itemObj = (item ?? {}) as Record<string, unknown>;

  // Loading state
  if (loading) {
    return (
      <div 
        className={`uhum-detail uhum-detail--loading ${className ?? ''}`}
        data-component={component.name}
      >
        <div className="uhum-detail__loading">
          <span className="uhum-detail__loading-spinner" />
          <span className="uhum-detail__loading-text">Loading details...</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (!item) {
    return (
      <div 
        className={`uhum-detail uhum-detail--empty ${className ?? ''}`}
        data-component={component.name}
      >
        <div className="uhum-detail__empty">
          <span className="uhum-detail__empty-icon">👆</span>
          <span className="uhum-detail__empty-text">Select an item to view details</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`uhum-detail ${className ?? ''}`}
      data-component={component.name}
    >
      {/* Header */}
      <div className="uhum-detail__header">
        <div className="uhum-detail__header-text">
          <h2 className="uhum-detail__title">
            {component.title ?? 'Details'}
          </h2>
          {component.description && (
            <p className="uhum-detail__description">{component.description}</p>
          )}
        </div>
        {actions.length > 0 && (
          <div className="uhum-detail__actions">
            {actions.map((action, i) => (
              <button
                key={i}
                className={`uhum-btn uhum-btn--${action.variant ?? 'secondary'}`}
                onClick={() => onIntent?.(action.intent, { id: itemObj.id })}
              >
                {action.icon && <span className="uhum-btn__icon">{action.icon}</span>}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fields */}
      <div className="uhum-detail__fields">
        {fields.map((field, i) => {
          const value = itemObj[field.name];
          
          return (
            <div
              key={i}
              className={`uhum-detail__field uhum-detail__field--${field.type}`}
              data-field={field.name}
            >
              <div className="uhum-detail__field-label">{field.label}</div>
              <div className="uhum-detail__field-value">
                {renderFieldValue(value, field.type)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Render a field value with appropriate formatting.
 */
function renderFieldValue(value: unknown, type: string): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="uhum-detail__field-empty">—</span>;
  }

  switch (type) {
    case 'text':
      // Multiline text - preserve whitespace
      return (
        <div className="uhum-detail__field-text">
          {String(value)}
        </div>
      );

    case 'datetime':
      return formatDateTime(value);

    case 'date':
      return formatDate(value);

    case 'boolean':
      return (
        <span className={`uhum-detail__field-boolean uhum-detail__field-boolean--${value ? 'true' : 'false'}`}>
          {value ? '✓ Yes' : '✗ No'}
        </span>
      );

    case 'number':
      return typeof value === 'number' ? value.toLocaleString() : String(value);

    case 'atom':
      return (
        <span className={`uhum-detail__field-badge uhum-detail__field-badge--${String(value).toLowerCase()}`}>
          {formatAtom(String(value))}
        </span>
      );

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
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export default DetailComponent;
