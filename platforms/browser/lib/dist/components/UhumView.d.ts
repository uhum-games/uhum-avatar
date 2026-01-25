/**
 * UhumView - Main container component for Uhum View rendering.
 *
 * This is the top-level component that renders the Uhum View interface.
 * It displays messages, modals, loading states, and the main content area.
 */
import React from 'react';
import { AvatarState } from '../types';
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
export declare function UhumView({ state: propState, children, className }: UhumViewProps): import("react/jsx-runtime").JSX.Element;
/**
 * Default styles for Uhum View components.
 *
 * Import this CSS or use your own styles.
 */
export declare const defaultStyles = "\n.uhum-view {\n  position: relative;\n  min-height: 100vh;\n  font-family: system-ui, -apple-system, sans-serif;\n}\n\n.uhum-message {\n  position: fixed;\n  top: 16px;\n  right: 16px;\n  max-width: 400px;\n  padding: 12px 16px;\n  border-radius: 8px;\n  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);\n  animation: uhum-slide-in 0.2s ease-out;\n  z-index: 1000;\n}\n\n.uhum-message--success {\n  background: #10b981;\n  color: white;\n}\n\n.uhum-message--error {\n  background: #ef4444;\n  color: white;\n}\n\n.uhum-message--warning {\n  background: #f59e0b;\n  color: white;\n}\n\n.uhum-message--info {\n  background: #3b82f6;\n  color: white;\n}\n\n.uhum-message--neutral {\n  background: #6b7280;\n  color: white;\n}\n\n.uhum-loading {\n  position: fixed;\n  inset: 0;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  background: rgba(255, 255, 255, 0.8);\n  z-index: 900;\n}\n\n.uhum-loading-spinner {\n  width: 40px;\n  height: 40px;\n  border: 3px solid #e5e7eb;\n  border-top-color: #3b82f6;\n  border-radius: 50%;\n  animation: uhum-spin 1s linear infinite;\n}\n\n.uhum-loading-message {\n  margin-top: 16px;\n  color: #374151;\n}\n\n.uhum-modal-overlay {\n  position: fixed;\n  inset: 0;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  background: rgba(0, 0, 0, 0.5);\n  z-index: 1100;\n}\n\n.uhum-modal {\n  background: white;\n  border-radius: 12px;\n  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);\n  min-width: 300px;\n  max-width: 90vw;\n  max-height: 90vh;\n  overflow: hidden;\n}\n\n.uhum-modal-header {\n  padding: 16px 20px;\n  font-weight: 600;\n  border-bottom: 1px solid #e5e7eb;\n}\n\n.uhum-modal-content {\n  padding: 20px;\n}\n\n@keyframes uhum-slide-in {\n  from {\n    transform: translateX(100%);\n    opacity: 0;\n  }\n  to {\n    transform: translateX(0);\n    opacity: 1;\n  }\n}\n\n@keyframes uhum-spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n";
//# sourceMappingURL=UhumView.d.ts.map