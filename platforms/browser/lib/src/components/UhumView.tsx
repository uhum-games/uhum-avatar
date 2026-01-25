/**
 * UhumView - Main container component for Uhum View rendering.
 *
 * This is the top-level component that renders the Uhum View interface.
 * It displays messages, modals, loading states, and the main content area.
 */

import React from 'react';
import { AvatarState } from '../types';
import { useAvatar } from '../hooks/useAvatar';
import { MessageDisplay } from './MessageDisplay';

/**
 * Props for the UhumView component.
 */
export interface UhumViewProps {
  /** Optional state override (for testing) */
  state?: AvatarState;
  /** Child components to render in the content area */
  children?: React.ReactNode;
  /** Custom class name */
  className?: string;
}

/**
 * Main Uhum View container component.
 *
 * Provides the standard Uhum View layout:
 * - Message display (feedback)
 * - Modal overlay
 * - Loading indicator
 * - Content area (children)
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <AvatarProvider>
 *       <UhumView>
 *         <MyContent />
 *       </UhumView>
 *     </AvatarProvider>
 *   );
 * }
 * ```
 */
export function UhumView({ state: propState, children, className }: UhumViewProps) {
  // Use prop state if provided, otherwise use context
  let state: AvatarState;
  try {
    const context = useAvatar();
    state = propState ?? context.state;
  } catch {
    // If not in provider, use prop state
    if (!propState) {
      throw new Error('UhumView must be used within AvatarProvider or receive state prop');
    }
    state = propState;
  }

  return (
    <div className={`uhum-view ${className ?? ''}`} data-testid="uhum-view">
      {/* Message display */}
      <MessageDisplay message={state.message} />

      {/* Loading overlay */}
      {state.loading && (
        <div className="uhum-loading" data-testid="uhum-loading">
          <div className="uhum-loading-spinner" />
          {state.loading.message && (
            <div className="uhum-loading-message">{state.loading.message}</div>
          )}
        </div>
      )}

      {/* Modal overlay */}
      {state.modal && (
        <div className="uhum-modal-overlay" data-testid="uhum-modal">
          <div className="uhum-modal">
            <div className="uhum-modal-header">{state.modal.name}</div>
            <div className="uhum-modal-content">
              {/* Modal content would be rendered here based on modal.name */}
            </div>
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="uhum-content" data-testid="uhum-content">
        {children}
      </div>
    </div>
  );
}

/**
 * Default styles for Uhum View components.
 *
 * Import this CSS or use your own styles.
 */
export const defaultStyles = `
.uhum-view {
  position: relative;
  min-height: 100vh;
  font-family: system-ui, -apple-system, sans-serif;
}

.uhum-message {
  position: fixed;
  top: 16px;
  right: 16px;
  max-width: 400px;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: uhum-slide-in 0.2s ease-out;
  z-index: 1000;
}

.uhum-message--success {
  background: #10b981;
  color: white;
}

.uhum-message--error {
  background: #ef4444;
  color: white;
}

.uhum-message--warning {
  background: #f59e0b;
  color: white;
}

.uhum-message--info {
  background: #3b82f6;
  color: white;
}

.uhum-message--neutral {
  background: #6b7280;
  color: white;
}

.uhum-loading {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
  z-index: 900;
}

.uhum-loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: uhum-spin 1s linear infinite;
}

.uhum-loading-message {
  margin-top: 16px;
  color: #374151;
}

.uhum-modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1100;
}

.uhum-modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  min-width: 300px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
}

.uhum-modal-header {
  padding: 16px 20px;
  font-weight: 600;
  border-bottom: 1px solid #e5e7eb;
}

.uhum-modal-content {
  padding: 20px;
}

@keyframes uhum-slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes uhum-spin {
  to {
    transform: rotate(360deg);
  }
}
`;
