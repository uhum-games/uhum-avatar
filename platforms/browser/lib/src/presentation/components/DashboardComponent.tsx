/**
 * DashboardComponent - Multi-widget dashboard
 * 
 * Renders a dashboard view with summary widgets.
 * Shows aggregate data and quick insights.
 */

import React from 'react';
import { ComponentRenderProps } from '../registry';

export const DashboardComponent: React.FC<ComponentRenderProps> = ({
  component,
  data,
  onIntent,
  className,
}) => {
  const fields = component.fields ?? [];
  const actions = component.actions ?? [];

  // Calculate summary stats from data
  const stats = calculateStats(data, fields);

  return (
    <div 
      className={`uhum-dashboard ${className ?? ''}`}
      data-component={component.name}
    >
      {/* Header */}
      <div className="uhum-dashboard__header">
        <div className="uhum-dashboard__header-text">
          <h2 className="uhum-dashboard__title">{component.title ?? 'Dashboard'}</h2>
          {component.description && (
            <p className="uhum-dashboard__description">{component.description}</p>
          )}
        </div>
        {actions.length > 0 && (
          <div className="uhum-dashboard__actions">
            {actions.map((action, i) => (
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

      {/* Summary cards */}
      <div className="uhum-dashboard__summary">
        <div className="uhum-dashboard__card">
          <div className="uhum-dashboard__card-value">{data.length}</div>
          <div className="uhum-dashboard__card-label">Total Items</div>
        </div>

        {stats.map((stat, i) => (
          <div key={i} className="uhum-dashboard__card">
            <div className="uhum-dashboard__card-value">{stat.value}</div>
            <div className="uhum-dashboard__card-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Recent items preview */}
      {data.length > 0 && (
        <div className="uhum-dashboard__recent">
          <h3 className="uhum-dashboard__section-title">Recent Items</h3>
          <div className="uhum-dashboard__recent-items">
            {data.slice(0, 5).map((item, index) => {
              const itemObj = item as Record<string, unknown>;
              const primaryField = fields[0];
              const secondaryField = fields[1];

              return (
                <div key={index} className="uhum-dashboard__recent-item">
                  <div className="uhum-dashboard__recent-item-primary">
                    {primaryField ? String(itemObj[primaryField.name] ?? '—') : `Item ${index + 1}`}
                  </div>
                  {secondaryField && (
                    <div className="uhum-dashboard__recent-item-secondary">
                      {String(itemObj[secondaryField.name] ?? '')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {data.length === 0 && (
        <div className="uhum-dashboard__empty">
          <span className="uhum-dashboard__empty-icon">📊</span>
          <span className="uhum-dashboard__empty-text">No data available</span>
        </div>
      )}
    </div>
  );
};

interface Stat {
  label: string;
  value: string | number;
}

/**
 * Calculate summary statistics from data.
 */
function calculateStats(
  data: unknown[],
  fields: { name: string; type: string; label: string }[]
): Stat[] {
  const stats: Stat[] = [];

  if (data.length === 0) return stats;

  // Find atom fields (status-like) and count unique values
  const atomFields = fields.filter(f => f.type === 'atom');
  for (const field of atomFields.slice(0, 2)) {
    const counts: Record<string, number> = {};
    for (const item of data) {
      const value = String((item as Record<string, unknown>)[field.name] ?? 'unknown');
      counts[value] = (counts[value] ?? 0) + 1;
    }

    // Add top status counts
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    for (const [value, count] of entries.slice(0, 2)) {
      stats.push({
        label: formatAtom(value),
        value: count,
      });
    }
  }

  // Find number fields and calculate sum/average
  const numberFields = fields.filter(f => f.type === 'number');
  for (const field of numberFields.slice(0, 1)) {
    let sum = 0;
    let count = 0;
    for (const item of data) {
      const value = (item as Record<string, unknown>)[field.name];
      if (typeof value === 'number') {
        sum += value;
        count++;
      }
    }
    if (count > 0) {
      stats.push({
        label: `Total ${field.label}`,
        value: sum.toLocaleString(),
      });
    }
  }

  return stats.slice(0, 4); // Limit to 4 stats
}

function formatAtom(value: string): string {
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export default DashboardComponent;
