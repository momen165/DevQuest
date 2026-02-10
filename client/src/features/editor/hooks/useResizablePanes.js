import { useState, useEffect, useCallback } from "react";

export const useResizablePanes = (
  initialDividerPercent = 50,
  minPanePercent = 20,
  maxPanePercent = 80,
  isVerticalLayoutThreshold = 1024
) => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isVerticalLayout, setIsVerticalLayout] = useState(
    window.innerWidth <= isVerticalLayoutThreshold
  );
  const [dividerPosition, setDividerPosition] = useState(() => {
    return window.innerWidth <= isVerticalLayoutThreshold ? 42 : initialDividerPercent; // Initial vertical split different
  });
  const [isDragging, setIsDragging] = useState(false);

  // Update layout type and reset divider on window resize
  useEffect(() => {
    const handleResize = () => {
      const currentWidth = window.innerWidth;
      setWindowWidth(currentWidth);
      const newIsVertical = currentWidth <= isVerticalLayoutThreshold;
      if (newIsVertical !== isVerticalLayout) {
        setIsVerticalLayout(newIsVertical);
        // Reset divider position when layout changes
        setDividerPosition(newIsVertical ? 42 : initialDividerPercent);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isVerticalLayout, initialDividerPercent, isVerticalLayoutThreshold]);
  const handleDragStart = useCallback((e) => {
    e.preventDefault(); // Always prevent default to avoid text selection
    setIsDragging(true);

    // Disable text selection on the document during drag
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
    document.body.style.msUserSelect = "none";
  }, []);
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);

    // Re-enable text selection on the document after drag
    document.body.style.userSelect = "";
    document.body.style.webkitUserSelect = "";
    document.body.style.msUserSelect = "";
  }, []);

  const handleDrag = useCallback(
    (e) => {
      if (!isDragging) return;

      // Prevent default for touchmove to avoid scrolling while dragging
      if (e.touches) {
        e.preventDefault();
      }

      let clientX, clientY;
      if (e.touches) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      // Use a more robust way to get the container, assuming it's the parent of the gutter
      // This part might need adjustment based on how it's used in the component.
      // For now, we'll assume the component using the hook provides the container ref or dimensions.
      // Let's use window dimensions as a fallback for now, can be refined.
      const containerRect = e.currentTarget.parentElement?.getBoundingClientRect() || {
        left: 0,
        top: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      };

      if (!isVerticalLayout) {
        // Horizontal split (side by side)
        const relativeX = clientX - containerRect.left;
        let percent = (relativeX / containerRect.width) * 100;
        percent = Math.max(minPanePercent, Math.min(maxPanePercent, percent));
        setDividerPosition(percent);
      } else {
        // Vertical split (top and bottom)
        const relativeY = clientY - containerRect.top;
        let percent = (relativeY / containerRect.height) * 100;
        // Adjust min/max for vertical layout if needed, e.g. different bounds
        percent = Math.max(minPanePercent, Math.min(maxPanePercent, percent));
        setDividerPosition(percent);
      }
    },
    [isDragging, isVerticalLayout, minPanePercent, maxPanePercent]
  );

  useEffect(() => {
    if (!isDragging) return;

    // Add mouse events
    window.addEventListener("mousemove", handleDrag);
    window.addEventListener("mouseup", handleDragEnd);

    // Add touch events with passive: false
    window.addEventListener("touchmove", handleDrag, { passive: false });
    window.addEventListener("touchend", handleDragEnd, { passive: false });

    return () => {
      window.removeEventListener("mousemove", handleDrag);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", handleDrag, { passive: false });
      window.removeEventListener("touchend", handleDragEnd, { passive: false });
    };
  }, [isDragging, handleDrag, handleDragEnd]);

  const getPaneStyles = () => {
    const firstPaneSize = `${dividerPosition}%`;
    // The '1' accounts for a potential 1% gutter or similar fixed spacing.
    // This might need to be more dynamic if gutter size changes.
    // Or, more simply, the second pane takes up the remaining space.
    // Let's assume a fixed gutter width/height is handled by CSS flex properties or explicit sizing.
    // The second pane will be (100 - dividerPosition - gutterSizeInPercentage)
    // For simplicity here, we'll let flexbox handle the second pane's size based on the first.
    // The component using this will need to set flex: 1 on the second pane.

    if (!isVerticalLayout) {
      // Side by side
      return {
        firstPaneStyle: { width: firstPaneSize, flex: "none", minWidth: 0, minHeight: 0 },
        // secondPaneStyle: { width: `calc(100% - ${firstPaneSize} - 8px)`, flex: 'none', minWidth: 0, minHeight: 0 }, // Example with fixed gutter
        gutterStyle: {
          cursor: "col-resize",
          width: 8,
          minWidth: 8,
          background: isDragging ? "#377ef0" : "#23263a",
          zIndex: 10,
          flex: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          msUserSelect: "none",
          MozUserSelect: "none",
        },
        containerStyle: { flexDirection: "row", display: "flex" },
      };
    } else {
      // Top and bottom
      return {
        firstPaneStyle: { height: firstPaneSize, flex: "none", minWidth: 0, minHeight: 0 },
        // secondPaneStyle: { height: `calc(100% - ${firstPaneSize} - 8px)`, flex: 'none', minWidth: 0, minHeight: 0 }, // Example with fixed gutter
        gutterStyle: {
          cursor: "row-resize",
          height: 8,
          minHeight: 8,
          background: isDragging ? "#377ef0" : "#23263a",
          zIndex: 10,
          flex: "none",
        },
        containerStyle: { flexDirection: "column", display: "flex" },
      };
    }
  };

  const styles = getPaneStyles();

  return {
    dividerPosition, // The percentage value
    isDragging,
    isVerticalLayout, // True if layout is top/bottom, false if side-by-side
    windowWidth, // Current window width
    handleDragStart, // Attach to onMouseDown and onTouchStart of the gutter

    // Styles to be applied
    firstPaneStyle: styles.firstPaneStyle,
    // secondPaneStyle: styles.secondPaneStyle, // Consumer will use flex: 1 for the second pane
    gutterStyle: styles.gutterStyle,
    containerStyle: styles.containerStyle, // Style for the main container div

    // For direct application to gutter element if preferred over styles object
    gutterProps: {
      style: styles.gutterStyle,
      onMouseDown: handleDragStart,
      onTouchStart: handleDragStart,
    },
  };
};
