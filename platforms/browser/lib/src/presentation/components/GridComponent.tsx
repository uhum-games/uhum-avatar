/**
 * GridComponent - Grid of cards
 * 
 * Renders data as a responsive card grid.
 * Good for visual browsing and discovery.
 */

import React from 'react';
import { ComponentRenderProps } from '../registry';

export const GridComponent: React.FC<ComponentRenderProps> = ({
  component,
  data,
  onSelect,
  onIntent,
  className,
}) => {
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
        {data.length === 0 ? (
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
