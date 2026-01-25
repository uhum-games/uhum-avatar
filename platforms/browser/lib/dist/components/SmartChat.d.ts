import React from 'react';
import './SmartChat.css';
/**
 * SmartChat - A versatile chat component with docking and smart floating modes
 *
 * Features:
 * - Docked mode: Fixed to top, bottom, left, or right of the screen
 * - Smart mode: Floating chat that snaps to corners based on drag trajectory
 * - Smooth animations and transitions
 * - Responsive margin handling (40px on larger screens)
 */
export type DockPosition = 'top' | 'bottom' | 'left' | 'right';
export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export interface SmartChatProps {
    /** Current mode: docked or smart (floating) */
    mode: 'docked' | 'smart';
    /** Dock position when mode is 'docked' */
    dockPosition?: DockPosition;
    /** Initial corner when mode is 'smart' */
    initialCorner?: Corner;
    /** Size of the chat in docked mode (width for left/right, height for top/bottom) */
    dockedSize?: number;
    /** Width of the chat in smart mode */
    smartWidth?: number;
    /** Height of the chat in smart mode */
    smartHeight?: number;
    /** Margin from screen edges in smart mode */
    margin?: number;
    /** Minimum margin for smaller screens */
    minMargin?: number;
    /** Screen width breakpoint for margin adjustment */
    marginBreakpoint?: number;
    /** Whether the chat is minimized */
    minimized?: boolean;
    /** Callback when minimized state changes */
    onMinimizedChange?: (minimized: boolean) => void;
    /** Callback when mode changes */
    onModeChange?: (mode: 'docked' | 'smart') => void;
    /** Callback when dock position changes */
    onDockPositionChange?: (position: DockPosition) => void;
    /** Children to render inside the chat */
    children: React.ReactNode;
    /** Additional class name */
    className?: string;
    /** Header content */
    header?: React.ReactNode;
    /** Whether to show the mode toggle */
    showModeToggle?: boolean;
    /** Whether to show dock position controls in docked mode */
    showDockControls?: boolean;
}
export declare function SmartChat({ mode, dockPosition, initialCorner, dockedSize, smartWidth, smartHeight, margin, minMargin, marginBreakpoint, minimized, onMinimizedChange, onModeChange, onDockPositionChange, children, className, header, showModeToggle, showDockControls, }: SmartChatProps): import("react/jsx-runtime").JSX.Element;
export default SmartChat;
//# sourceMappingURL=SmartChat.d.ts.map