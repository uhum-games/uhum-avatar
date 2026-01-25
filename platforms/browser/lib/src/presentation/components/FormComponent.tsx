/**
 * FormComponent - Input form for creating/editing
 * 
 * Renders a form with fields based on the component definition.
 * Handles form submission by triggering the appropriate intent.
 */

import React, { useState, useCallback } from 'react';
import { ComponentRenderProps } from '../registry';

export const FormComponent: React.FC<ComponentRenderProps> = ({
  component,
  item,
  onIntent,
  className,
}) => {
  const fields = component.fields ?? [];
  const actions = component.actions ?? [];
  const initialData = (item ?? {}) as Record<string, unknown>;

  // Form state
  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    const data: Record<string, unknown> = {};
    for (const field of fields) {
      data[field.name] = initialData[field.name] ?? '';
    }
    return data;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Handle field change
  const handleChange = useCallback((fieldName: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    // Clear error when field is edited
    setErrors(prev => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  }, []);

  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    // Find submit action (primary variant or first action)
    const submitAction = actions.find(a => a.variant === 'primary') ?? actions[0];
    if (!submitAction) return;

    // Trigger intent with form data
    onIntent?.(submitAction.intent, formData);
  }, [actions, formData, onIntent]);

  // Handle non-submit action
  const handleAction = useCallback((intent: string) => {
    onIntent?.(intent, formData);
  }, [formData, onIntent]);

  return (
    <form 
      className={`uhum-form ${className ?? ''}`}
      data-component={component.name}
      onSubmit={handleSubmit}
    >
      {/* Header */}
      <div className="uhum-form__header">
        <h2 className="uhum-form__title">{component.title ?? 'Form'}</h2>
        {component.description && (
          <p className="uhum-form__description">{component.description}</p>
        )}
      </div>

      {/* Fields */}
      <div className="uhum-form__fields">
        {fields.map((field, i) => {
          const value = formData[field.name];
          const error = errors[field.name];

          return (
            <div
              key={i}
              className={`uhum-form__field uhum-form__field--${field.type} ${error ? 'uhum-form__field--error' : ''}`}
              data-field={field.name}
            >
              <label 
                className="uhum-form__label"
                htmlFor={`field-${field.name}`}
              >
                {field.label}
              </label>
              
              {renderFieldInput(
                field.name,
                field.type,
                value,
                (newValue) => handleChange(field.name, newValue)
              )}

              {error && (
                <div className="uhum-form__error">{error}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      {actions.length > 0 && (
        <div className="uhum-form__actions">
          {actions.map((action, i) => {
            const isPrimary = action.variant === 'primary';
            return (
              <button
                key={i}
                type={isPrimary ? 'submit' : 'button'}
                className={`uhum-btn uhum-btn--${action.variant ?? 'secondary'}`}
                onClick={!isPrimary ? () => handleAction(action.intent) : undefined}
              >
                {action.icon && <span className="uhum-btn__icon">{action.icon}</span>}
                {action.label}
              </button>
            );
          })}
        </div>
      )}
    </form>
  );
};

/**
 * Render the appropriate input element for a field type.
 */
function renderFieldInput(
  name: string,
  type: string,
  value: unknown,
  onChange: (value: unknown) => void
): React.ReactElement {
  const id = `field-${name}`;
  const stringValue = value === null || value === undefined ? '' : String(value);

  switch (type) {
    case 'text':
      return (
        <textarea
          id={id}
          name={name}
          className="uhum-form__textarea"
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
        />
      );

    case 'boolean':
      return (
        <div className="uhum-form__checkbox-wrapper">
          <input
            id={id}
            name={name}
            type="checkbox"
            className="uhum-form__checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          <label htmlFor={id} className="uhum-form__checkbox-label">
            {Boolean(value) ? 'Yes' : 'No'}
          </label>
        </div>
      );

    case 'number':
      return (
        <input
          id={id}
          name={name}
          type="number"
          className="uhum-form__input"
          value={stringValue}
          onChange={(e) => onChange(e.target.valueAsNumber || 0)}
        />
      );

    case 'date':
      return (
        <input
          id={id}
          name={name}
          type="date"
          className="uhum-form__input"
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'datetime':
      return (
        <input
          id={id}
          name={name}
          type="datetime-local"
          className="uhum-form__input"
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'atom':
      // For atom types, we might want a select - for now use text input
      return (
        <input
          id={id}
          name={name}
          type="text"
          className="uhum-form__input"
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    default:
      return (
        <input
          id={id}
          name={name}
          type="text"
          className="uhum-form__input"
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

export default FormComponent;
