import { jsx as _jsx } from "react/jsx-runtime";
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
export function MessageDisplay({ message, className, position = 'top-right', }) {
    if (!message) {
        return null;
    }
    const positionStyles = {
        'top-left': { top: 16, left: 16 },
        'top-right': { top: 16, right: 16 },
        'bottom-left': { bottom: 16, left: 16 },
        'bottom-right': { bottom: 16, right: 16 },
        'top-center': { top: 16, left: '50%', transform: 'translateX(-50%)' },
        'bottom-center': { bottom: 16, left: '50%', transform: 'translateX(-50%)' },
    };
    return (_jsx("div", { className: `uhum-message uhum-message--${message.messageType} ${className ?? ''}`, style: positionStyles[position], role: "alert", "aria-live": "polite", "data-testid": "uhum-message", children: message.text }));
}
//# sourceMappingURL=MessageDisplay.js.map