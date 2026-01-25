/**
 * MessageDisplay - Component for displaying feedback messages.
 *
 * Shows success, error, warning, info, and neutral messages
 * with appropriate styling.
 */
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
export declare function MessageDisplay({ message, className, position, }: MessageDisplayProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=MessageDisplay.d.ts.map