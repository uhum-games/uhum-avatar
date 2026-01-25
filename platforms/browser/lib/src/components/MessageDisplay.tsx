/**
 * MessageDisplay - Component for displaying feedback messages.
 *
 * Shows success, error, warning, info, and neutral messages
 * with appropriate styling.
 */

import React from 'react';
import { Message } from '../types';

/**
 * Props for the MessageDisplay component.
 */
export interface MessageDisplayProps {
  /** Message to display (null to hide) */
  message: Message | null;
  /** Custom class name */
  className?: string;
  /** Position on screen */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
}

/**
 * Component for displaying feedback messages.
 *
 * @example
 * ```tsx
 * <MessageDisplay
 *   message={{ text: "Invoice paid!", messageType: "success" }}
 *   position="top-right"
 * />
 * ```
 */
export function MessageDisplay({
  message,
  className,
  position = 'top-right',
}: MessageDisplayProps) {
  if (!message) {
    return null;
  }

  const positionStyles: Record<string, React.CSSProperties> = {
    'top-left': { top: 16, left: 16 },
    'top-right': { top: 16, right: 16 },
    'bottom-left': { bottom: 16, left: 16 },
    'bottom-right': { bottom: 16, right: 16 },
    'top-center': { top: 16, left: '50%', transform: 'translateX(-50%)' },
    'bottom-center': { bottom: 16, left: '50%', transform: 'translateX(-50%)' },
  };

  return (
    <div
      className={`uhum-message uhum-message--${message.messageType} ${className ?? ''}`}
      style={positionStyles[position]}
      role="alert"
      aria-live="polite"
      data-testid="uhum-message"
    >
      {message.text}
    </div>
  );
}
