import { useState, useEffect, useCallback, CSSProperties } from 'react';

interface UseResizablePanesReturn {
  dividerPosition: number;
  isDragging: boolean;
  isVerticalLayout: boolean;
  windowWidth: number;
  handleDragStart: (e: React.MouseEvent | React.TouchEvent) => void;
  firstPaneStyle: CSSProperties;
  gutterStyle: CSSProperties;
  containerStyle: CSSProperties;
  gutterProps: {
    style: CSSProperties;
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
  };
}

export const useResizablePanes = (
  initialDividerPercent = 50,
  minPanePercent = 20,
  maxPanePercent = 80,
  isVerticalLayoutThreshold = 1024
): UseResizablePanesReturn => {
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [isVerticalLayout, setIsVerticalLayout] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= isVerticalLayoutThreshold : false
  );
  const [dividerPosition, setDividerPosition] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth <= isVerticalLayoutThreshold ? 42 : initialDividerPercent;
  });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const currentWidth = window.innerWidth;
      setWindowWidth(currentWidth);
      const newIsVertical = currentWidth <= isVerticalLayoutThreshold;
      if (newIsVertical !== isVerticalLayout) {
        setIsVerticalLayout(newIsVertical);
        setDividerPosition(newIsVertical ? 42 : initialDividerPercent);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isVerticalLayout, initialDividerPercent, isVerticalLayoutThreshold]);

  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // e.preventDefault(); // Removed to allow initial touch events sometimes
    // Only prevent default for mouse events or specific touch cases if needed
    // But generally, for resizing, preventing selection is good
    if (e.type === 'mousedown') {
        e.preventDefault();
    }
    
    setIsDragging(true);
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    // @ts-ignore
    document.body.style.msUserSelect = 'none';
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';
    // @ts-ignore
    document.body.style.msUserSelect = '';
  }, []);

  const handleDrag = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;

      if (e.type === 'touchmove') {
        // e.preventDefault(); // Careful with passive listeners
      }

      let clientX, clientY;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      // Ideally we get the container rect. Assuming we can access it via DOM for now if needed
      // or using window relative calculations if the container fills the window.
      // For robustness in a hook without refs, we might rely on window or assume full width/height
      // Or we could require a ref passed in. 
      // The JS version accessed e.currentTarget which might not be available in window listeners.
      // So we use window dimensions as a fallback proxy for "container is roughly window sized" 
      // or just use percentage of window.
      
      // WARNING: This logic assumes the resizable container fills the viewport or similar.
      // If it's a nested container, this might be inaccurate without a ref.
      // However, sticking to the JS logic which tried to use e.currentTarget but might fail in window listener.
      
      const containerWidth = window.innerWidth;
      const containerHeight = window.innerHeight;
      
      if (!isVerticalLayout) {
        // Horizontal split (side by side)
        // Assuming gutter is at 'dividerPosition' percent
        // We want the new position based on X
        // If container has padding/offsets, this is off, but standard for full-page editors
        const percent = (clientX / containerWidth) * 100;
        const constrained = Math.max(minPanePercent, Math.min(maxPanePercent, percent));
        setDividerPosition(constrained);
      } else {
        // Vertical split (top and bottom)
        const percent = (clientY / containerHeight) * 100;
        const constrained = Math.max(minPanePercent, Math.min(maxPanePercent, percent));
        setDividerPosition(constrained);
      }
    },
    [isDragging, isVerticalLayout, minPanePercent, maxPanePercent]
  );

  useEffect(() => {
    if (!isDragging) return;

    window.addEventListener('mousemove', handleDrag);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleDrag, { passive: false });
    window.addEventListener('touchend', handleDragEnd, { passive: false });

    return () => {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDrag);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, handleDrag, handleDragEnd]);

  const getPaneStyles = () => {
    const firstPaneSize = `${dividerPosition}%`;

    if (!isVerticalLayout) {
      return {
        firstPaneStyle: { width: firstPaneSize, flex: 'none', minWidth: 0, minHeight: 0 },
        gutterStyle: {
          cursor: 'col-resize',
          width: 8,
          minWidth: 8,
          background: isDragging ? '#377ef0' : '#23263a',
          zIndex: 10,
          flex: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          msUserSelect: 'none',
          MozUserSelect: 'none',
        } as CSSProperties,
        containerStyle: { flexDirection: 'row' as const, display: 'flex' },
      };
    } else {
      return {
        firstPaneStyle: { height: firstPaneSize, flex: 'none', minWidth: 0, minHeight: 0 },
        gutterStyle: {
          cursor: 'row-resize',
          height: 8,
          minHeight: 8,
          background: isDragging ? '#377ef0' : '#23263a',
          zIndex: 10,
          flex: 'none',
        } as CSSProperties,
        containerStyle: { flexDirection: 'column' as const, display: 'flex' },
      };
    }
  };

  const styles = getPaneStyles();

  return {
    dividerPosition,
    isDragging,
    isVerticalLayout,
    windowWidth,
    handleDragStart,
    firstPaneStyle: styles.firstPaneStyle,
    gutterStyle: styles.gutterStyle,
    containerStyle: styles.containerStyle,
    gutterProps: {
      style: styles.gutterStyle,
      onMouseDown: handleDragStart as (e: React.MouseEvent) => void,
      onTouchStart: handleDragStart as (e: React.TouchEvent) => void,
    },
  };
};
