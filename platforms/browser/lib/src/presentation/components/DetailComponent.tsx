/**
 * DetailComponent - Single item detail view
 * 
 * Renders detailed information about a single item.
 * Typically activated when a user selects an item from a list/grid.
 */

import React from 'react';
import { ComponentRenderProps } from '../registry';

export const DetailComponent: React.FC<ComponentRenderProps> = ({
  component,
  item,
  onIntent,
  className,
}) => {
  const fields = component.fields ?? [];
  const actions = component.actions ?? [];
  const itemObj = (item ?? {}) as Record<string, unknown>;

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
