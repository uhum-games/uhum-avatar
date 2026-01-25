/**
 * ListComponent - Vertical list of items
 * 
 * Renders data as a vertical scrollable list with field columns.
 * Supports selection, actions, and field-based display.
 */

import React from 'react';
import { ComponentRenderProps } from '../registry';

export const ListComponent: React.FC<ComponentRenderProps> = ({
  component,
  data,
  onSelect,
  onIntent,
  className,
}) => {
  const fields = component.fields ?? [];
  const actions = component.actions ?? [];
  const globalActions = actions.filter(a => !a.requiresSelection);

  return (
    <div 
      className={`uhum-list ${className ?? ''}`}
      data-component={component.name}
    >
      {/* Header */}
      {(component.title || globalActions.length > 0) && (
        <div className="uhum-list__header">
          {component.title && (
            <h2 className="uhum-list__title">{component.title}</h2>
          )}
          {component.description && (
            <p className="uhum-list__description">{component.description}</p>
          )}
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

      {/* List items */}
      <div className="uhum-list__items">
        {data.length === 0 ? (
          <div className="uhum-list__empty">
            <span className="uhum-list__empty-icon">📋</span>
            <span className="uhum-list__empty-text">No items to display</span>
          </div>
        ) : (
          data.map((item, index) => {
            const itemObj = item as Record<string, unknown>;
            const itemId = itemObj.id ?? itemObj._id ?? index;

            return (
              <div
                key={String(itemId)}
                className="uhum-list__item"
                onClick={() => onSelect?.(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelect?.(item);
                  }
                }}
              >
                <div className="uhum-list__item-content">
                  {fields.map((field, fi) => (
                    <div
                      key={fi}
                      className={`uhum-list__field uhum-list__field--${field.type}`}
                      data-field={field.name}
                      style={field.width ? { width: field.width } : undefined}
                    >
                      <span className="uhum-list__field-label">{field.label}</span>
                      <span className="uhum-list__field-value">
                        {formatValue(itemObj[field.name], field.type)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="uhum-list__item-arrow">›</div>
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
  // Convert snake_case to Title Case
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export default ListComponent;
