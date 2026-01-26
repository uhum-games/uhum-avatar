import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from 'react';
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

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  velocityX: number;
  velocityY: number;
  lastMoveTime: number;
  trajectory: { x: number; y: number; time: number }[];
}

const initialDragState: DragState = {
  isDragging: false,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  velocityX: 0,
  velocityY: 0,
  lastMoveTime: 0,
  trajectory: [],
};

// Header height constant (matches CSS --smart-chat-header-height)
const HEADER_HEIGHT = 44;

/**
 * Calculate the target corner based on drag trajectory
 * 
 * Uses a dominance threshold to prevent small movements in one axis
 * from affecting the result when the other axis has much larger movement.
 */
function calculateTargetCorner(
  trajectory: { x: number; y: number; time: number }[],
  currentX: number,
  currentY: number,
  windowWidth: number,
  windowHeight: number
): Corner {
  const centerX = windowWidth / 2;
  const centerY = windowHeight / 2;
  
  // Position-based corner (fallback)
  const positionIsLeft = currentX < centerX;
  const positionIsTop = currentY < centerY;

  // Need at least 2 points to calculate direction
  if (trajectory.length < 2) {
    return `${positionIsTop ? 'top' : 'bottom'}-${positionIsLeft ? 'left' : 'right'}` as Corner;
  }

  // Calculate weighted velocity from recent trajectory points
  // More recent points have higher weight
  let totalWeightedVx = 0;
  let totalWeightedVy = 0;
  let totalWeight = 0;

  const recentPoints = trajectory.slice(-10); // Use last 10 points
  for (let i = 1; i < recentPoints.length; i++) {
    const prev = recentPoints[i - 1];
    const curr = recentPoints[i];
    const dt = curr.time - prev.time;

    if (dt > 0) {
      const vx = (curr.x - prev.x) / dt;
      const vy = (curr.y - prev.y) / dt;
      const weight = i; // More recent = higher weight

      totalWeightedVx += vx * weight;
      totalWeightedVy += vy * weight;
      totalWeight += weight;
    }
  }

  const avgVx = totalWeight > 0 ? totalWeightedVx / totalWeight : 0;
  const avgVy = totalWeight > 0 ? totalWeightedVy / totalWeight : 0;

  // If velocity is too low, fall back to position-based corner
  const velocityMagnitude = Math.sqrt(avgVx * avgVx + avgVy * avgVy);
  if (velocityMagnitude < 0.1) {
    return `${positionIsTop ? 'top' : 'bottom'}-${positionIsLeft ? 'left' : 'right'}` as Corner;
  }

  const absVx = Math.abs(avgVx);
  const absVy = Math.abs(avgVy);

  // Dominance threshold: if one axis has 3x more movement than the other,
  // only use that axis for direction, and use position for the other axis
  const DOMINANCE_THRESHOLD = 2.5;

  let isLeft: boolean;
  let isTop: boolean;

  if (absVx > absVy * DOMINANCE_THRESHOLD) {
    // Horizontal movement dominates - use velocity for X, position for Y
    isLeft = avgVx < 0;
    isTop = positionIsTop;
  } else if (absVy > absVx * DOMINANCE_THRESHOLD) {
    // Vertical movement dominates - use velocity for Y, position for X
    isLeft = positionIsLeft;
    isTop = avgVy < 0;
  } else {
    // Both axes have significant movement - use velocity for both
    isLeft = avgVx < 0;
    isTop = avgVy < 0;
  }

  return `${isTop ? 'top' : 'bottom'}-${isLeft ? 'left' : 'right'}` as Corner;
}

/**
 * Get the position for a corner
 */
function getCornerPosition(
  corner: Corner,
  margin: number,
  width: number,
  height: number,
  windowWidth: number,
  windowHeight: number
): { x: number; y: number } {
  const positions: Record<Corner, { x: number; y: number }> = {
    'top-left': { x: margin, y: margin },
    'top-right': { x: windowWidth - width - margin, y: margin },
    'bottom-left': { x: margin, y: windowHeight - height - margin },
    'bottom-right': { x: windowWidth - width - margin, y: windowHeight - height - margin },
  };
  return positions[corner];
}

export function SmartChat({
  mode = 'docked',
  dockPosition = 'bottom',
  initialCorner = 'bottom-right',
  dockedSize = 240,
  smartWidth = 380,
  smartHeight = 340,
  margin = 40,
  minMargin = 16,
  marginBreakpoint = 768,
  minimized = false,
  onMinimizedChange,
  onModeChange,
  onDockPositionChange,
  children,
  className = '',
  header,
  showModeToggle = true,
  showDockControls = true,
}: SmartChatProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  
  // Track if this was a drag vs a click (for header click-to-toggle)
  const wasDragging = useRef(false);

  // Window dimensions
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  // Smart mode state
  const [currentCorner, setCurrentCorner] = useState<Corner>(initialCorner);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragState, setDragState] = useState<DragState>(initialDragState);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Calculate responsive margin
  const effectiveMargin = useMemo(() => {
    return windowSize.width < marginBreakpoint ? minMargin : margin;
  }, [windowSize.width, marginBreakpoint, margin, minMargin]);

  // Update window size
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize position when switching to smart mode
  useEffect(() => {
    if (mode === 'smart' && !dragState.isDragging) {
      const newPos = getCornerPosition(
        currentCorner,
        effectiveMargin,
        smartWidth,
        smartHeight,
        windowSize.width,
        windowSize.height
      );
      setPosition(newPos);
    }
  }, [mode, currentCorner, effectiveMargin, smartWidth, smartHeight, windowSize, dragState.isDragging]);

  // Handle mouse/touch down on header (start drag)
  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (mode !== 'smart') return;

      // Don't start drag if clicking on a button or interactive element
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('a') || target.closest('input')) {
        return;
      }

      e.preventDefault();
      
      // Get current position from the corner calculation (not the stale position state)
      const currentHeight = minimized ? HEADER_HEIGHT : smartHeight;
      const currentPos = getCornerPosition(
        currentCorner,
        effectiveMargin,
        smartWidth,
        currentHeight,
        windowSize.width,
        windowSize.height
      );
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      setDragState({
        isDragging: true,
        startX: clientX - currentPos.x,
        startY: clientY - currentPos.y,
        currentX: clientX,
        currentY: clientY,
        velocityX: 0,
        velocityY: 0,
        lastMoveTime: performance.now(),
        trajectory: [{ x: clientX, y: clientY, time: performance.now() }],
      });
      
      setPosition(currentPos);
    },
    [mode, minimized, smartHeight, currentCorner, effectiveMargin, smartWidth, windowSize]
  );

  // Handle mouse/touch move
  useEffect(() => {
    if (!dragState.isDragging) return;

    // Use current height based on minimized state for bounds calculation
    const currentHeight = minimized ? HEADER_HEIGHT : smartHeight;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const now = performance.now();

      // Calculate velocity
      const dt = now - dragState.lastMoveTime;
      const vx = dt > 0 ? (clientX - dragState.currentX) / dt : 0;
      const vy = dt > 0 ? (clientY - dragState.currentY) / dt : 0;

      // Update position - use currentHeight for proper bounds when minimized
      const newX = Math.max(0, Math.min(windowSize.width - smartWidth, clientX - dragState.startX));
      const newY = Math.max(0, Math.min(windowSize.height - currentHeight, clientY - dragState.startY));

      setPosition({ x: newX, y: newY });

      // Update drag state with new trajectory point
      setDragState((prev) => ({
        ...prev,
        currentX: clientX,
        currentY: clientY,
        velocityX: vx,
        velocityY: vy,
        lastMoveTime: now,
        trajectory: [...prev.trajectory, { x: clientX, y: clientY, time: now }].slice(-20),
      }));
    };

    const handleEnd = () => {
      // Check if this was an actual drag (moved more than a few pixels)
      const totalMovement = dragState.trajectory.length > 1 
        ? Math.abs(dragState.trajectory[dragState.trajectory.length - 1].x - dragState.trajectory[0].x) +
          Math.abs(dragState.trajectory[dragState.trajectory.length - 1].y - dragState.trajectory[0].y)
        : 0;
      
      const wasActualDrag = totalMovement > 5;
      
      if (wasActualDrag) {
        wasDragging.current = true;
        
        // Only update corner if user actually dragged
        const targetCorner = calculateTargetCorner(
          dragState.trajectory,
          dragState.currentX,
          dragState.currentY,
          windowSize.width,
          windowSize.height
        );

        // Animate to corner
        setIsTransitioning(true);
        setCurrentCorner(targetCorner);

        const targetPos = getCornerPosition(
          targetCorner,
          effectiveMargin,
          smartWidth,
          smartHeight,
          windowSize.width,
          windowSize.height
        );

        setPosition(targetPos);

        // End transition after animation
        setTimeout(() => setIsTransitioning(false), 300);
      }

      // Reset drag state
      setDragState(initialDragState);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [dragState, windowSize, smartWidth, smartHeight, effectiveMargin, minimized]);

  // Toggle minimized
  const toggleMinimized = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    onMinimizedChange?.(!minimized);
  }, [minimized, onMinimizedChange]);

  // Handle header click (toggle minimized if not dragging)
  const handleHeaderClick = useCallback((e: React.MouseEvent) => {
    // Don't toggle if clicking on a button or interactive element
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) {
      return;
    }
    
    // Don't toggle if we just finished dragging
    if (wasDragging.current) {
      wasDragging.current = false;
      return;
    }
    
    toggleMinimized();
  }, [toggleMinimized]);

  // Toggle mode
  const toggleMode = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const newMode = mode === 'docked' ? 'smart' : 'docked';
    onModeChange?.(newMode);
  }, [mode, onModeChange]);

  // Cycle dock position
  const cycleDockPosition = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const positions: DockPosition[] = ['bottom', 'right', 'top', 'left'];
    const currentIndex = positions.indexOf(dockPosition);
    const nextPosition = positions[(currentIndex + 1) % positions.length];
    onDockPositionChange?.(nextPosition);
  }, [dockPosition, onDockPositionChange]);

  // Build class names
  const containerClasses = useMemo(() => {
    const classes = ['smart-chat'];
    classes.push(`smart-chat--${mode}`);

    if (mode === 'docked') {
      classes.push(`smart-chat--dock-${dockPosition}`);
    }

    if (minimized) {
      classes.push('smart-chat--minimized');
    }

    if (dragState.isDragging) {
      classes.push('smart-chat--dragging');
    }

    if (isTransitioning) {
      classes.push('smart-chat--transitioning');
    }

    if (className) {
      classes.push(className);
    }

    return classes.join(' ');
  }, [mode, dockPosition, minimized, dragState.isDragging, isTransitioning, className]);

  // Build inline styles for smart mode
  const containerStyle = useMemo(() => {
    if (mode !== 'smart') return {};

    // Use appropriate height based on minimized state
    const currentHeight = minimized ? HEADER_HEIGHT : smartHeight;

    // When dragging, use the drag position directly
    // Otherwise, calculate the correct corner position for the current height
    let finalX = position.x;
    let finalY = position.y;

    if (!dragState.isDragging) {
      // Recalculate position for the current corner using current height
      // This ensures the chat stays anchored to its corner when minimizing/expanding
      const cornerPos = getCornerPosition(
        currentCorner,
        effectiveMargin,
        smartWidth,
        currentHeight,
        windowSize.width,
        windowSize.height
      );
      finalX = cornerPos.x;
      finalY = cornerPos.y;
    }

    return {
      '--smart-chat-x': `${finalX}px`,
      '--smart-chat-y': `${finalY}px`,
      '--smart-chat-width': `${smartWidth}px`,
      '--smart-chat-height': `${currentHeight}px`,
    } as React.CSSProperties;
  }, [mode, position, smartWidth, smartHeight, minimized, currentCorner, windowSize, effectiveMargin, dragState.isDragging]);

  // Build inline styles for docked mode
  const dockedStyle = useMemo(() => {
    if (mode !== 'docked') return {};

    if (dockPosition === 'left' || dockPosition === 'right') {
      return { '--smart-chat-docked-size': `${dockedSize}px` } as React.CSSProperties;
    }
    return { '--smart-chat-docked-size': `${dockedSize}px` } as React.CSSProperties;
  }, [mode, dockPosition, dockedSize]);

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      style={{ ...containerStyle, ...dockedStyle }}
    >
      <div
        ref={headerRef}
        className="smart-chat__header"
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        onClick={handleHeaderClick}
      >
        <div className="smart-chat__header-content">
          {header || <span className="smart-chat__header-title">Chat</span>}
        </div>

        <div className="smart-chat__header-controls">
          {showDockControls && mode === 'docked' && (
            <button
              className="smart-chat__control-btn"
              onClick={cycleDockPosition}
              title={`Dock position: ${dockPosition}`}
              aria-label="Change dock position"
            >
              <DockIcon position={dockPosition} />
            </button>
          )}

          {showModeToggle && (
            <button
              className="smart-chat__control-btn"
              onClick={toggleMode}
              title={mode === 'docked' ? 'Switch to Smart Mode' : 'Switch to Docked Mode'}
              aria-label={mode === 'docked' ? 'Switch to floating mode' : 'Switch to docked mode'}
            >
              {mode === 'docked' ? <FloatIcon /> : <DockIcon position="bottom" />}
            </button>
          )}

          <button
            className="smart-chat__control-btn"
            onClick={toggleMinimized}
            title={minimized ? 'Expand' : 'Minimize'}
            aria-label={minimized ? 'Expand chat' : 'Minimize chat'}
          >
            {minimized ? <ExpandIcon /> : <MinimizeIcon />}
          </button>
        </div>

        {mode === 'smart' && !minimized && (
          <div className="smart-chat__drag-indicator" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>

      <div className="smart-chat__body">{children}</div>
    </div>
  );
}

// Icon components
function DockIcon({ position }: { position: DockPosition }) {
  const rotations: Record<DockPosition, number> = {
    bottom: 0,
    right: 90,
    top: 180,
    left: 270,
  };
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      style={{ transform: `rotate(${rotations[position]}deg)` }}
    >
      <rect x="2" y="10" width="12" height="4" rx="1" fill="currentColor" />
      <rect x="2" y="2" width="12" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

function FloatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="4" y="4" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 6V3C2 2.44772 2.44772 2 3 2H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14 10V13C14 13.5523 13.5523 14 13 14H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function MinimizeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4 8H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 4V12M4 8H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default SmartChat;
