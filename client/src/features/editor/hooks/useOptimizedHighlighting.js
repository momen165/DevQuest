import { useEffect, useRef, useCallback } from 'react';
import hljs from 'highlight.js';
import {
  debounce,
  createIntersectionObserver,
  requestIdleCallback,
  cancelIdleCallback,
  createCache,
} from 'shared/utils/performanceUtils';

// Create a cache for highlighted code to avoid re-processing
const highlightCache = createCache(200, 10 * 60 * 1000); // 10 minutes TTL

/**
 * Custom hook for optimized syntax highlighting
 * Uses intersection observer, caching, and idle callbacks for better performance
 */
export const useOptimizedHighlighting = (dependencies = []) => {
  const observerRef = useRef(null);
  const idleCallbacksRef = useRef(new Set());
  const processedElementsRef = useRef(new WeakSet());

  // Cleanup function
  const cleanup = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    // Cancel all pending idle callbacks
    idleCallbacksRef.current.forEach((id) => cancelIdleCallback(id));
    idleCallbacksRef.current.clear();
  }, []);

  // Highlight a single code block with caching
  const highlightCodeBlock = useCallback((codeElement) => {
    if (!codeElement || processedElementsRef.current.has(codeElement)) {
      return;
    }

    const content = codeElement.textContent || '';
    const language = codeElement.className.match(/language-(\w+)/)?.[1] || 'plaintext';
    const cacheKey = `${language}:${content.slice(0, 100)}:${content.length}`;

    // Check cache first
    if (highlightCache.has(cacheKey)) {
      const cachedResult = highlightCache.get(cacheKey);
      codeElement.innerHTML = cachedResult;
      codeElement.setAttribute('data-highlighted', 'yes');
      processedElementsRef.current.add(codeElement);
      return;
    }

    try {
      // Remove any existing highlighting
      codeElement.removeAttribute('data-highlighted');
      codeElement.textContent = content;

      // Apply highlighting
      hljs.highlightElement(codeElement);

      // Cache the result
      highlightCache.set(cacheKey, codeElement.innerHTML);
      processedElementsRef.current.add(codeElement);
    } catch (error) {
      console.warn('Syntax highlighting error:', error);
      codeElement.setAttribute('data-highlighted', 'yes');
      processedElementsRef.current.add(codeElement);
    }
  }, []);

  // Process code blocks in batches during idle time
  const processCodeBlocks = useCallback(
    (codeBlocks) => {
      if (!codeBlocks.length) return;

      const batchSize = 3; // Process 3 blocks at a time
      let currentIndex = 0;

      const processBatch = () => {
        const endIndex = Math.min(currentIndex + batchSize, codeBlocks.length);

        for (let i = currentIndex; i < endIndex; i++) {
          highlightCodeBlock(codeBlocks[i]);
        }

        currentIndex = endIndex;

        // Schedule next batch if there are more blocks
        if (currentIndex < codeBlocks.length) {
          const callbackId = requestIdleCallback(processBatch, { timeout: 100 });
          idleCallbacksRef.current.add(callbackId);
        }
      };

      // Start processing the first batch
      const callbackId = requestIdleCallback(processBatch, { timeout: 100 });
      idleCallbacksRef.current.add(callbackId);
    },
    [highlightCodeBlock]
  );

  // Intersection observer callback
  const handleIntersection = useCallback(
    (entries) => {
      const visibleCodeBlocks = entries
        .filter((entry) => entry.isIntersecting)
        .map((entry) => entry.target)
        .filter((element) => !processedElementsRef.current.has(element));

      if (visibleCodeBlocks.length > 0) {
        processCodeBlocks(visibleCodeBlocks);
      }
    },
    [processCodeBlocks]
  );

  // Debounced initialization function
  const initializeHighlighting = useCallback(
    debounce(() => {
      cleanup();

      // Create new intersection observer
      observerRef.current = createIntersectionObserver(handleIntersection, {
        rootMargin: '100px', // Start highlighting 100px before element enters viewport
        threshold: 0.1,
      });

      // Find all code blocks
      const codeBlocks = document.querySelectorAll('pre code:not([data-highlighted])');

      if (codeBlocks.length === 0) return;

      // Separate visible and non-visible blocks
      const visibleBlocks = [];
      const nonVisibleBlocks = [];

      codeBlocks.forEach((block) => {
        const rect = block.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;

        if (isVisible) {
          visibleBlocks.push(block);
        } else {
          nonVisibleBlocks.push(block);
          observerRef.current.observe(block);
        }
      });

      // Process visible blocks immediately (for LCP)
      if (visibleBlocks.length > 0) {
        // Process the first few visible blocks synchronously for LCP
        const criticalBlocks = visibleBlocks.slice(0, 2);
        const remainingBlocks = visibleBlocks.slice(2);

        criticalBlocks.forEach((block) => highlightCodeBlock(block));

        // Process remaining visible blocks asynchronously
        if (remainingBlocks.length > 0) {
          processCodeBlocks(remainingBlocks);
        }
      }
    }, 150), // Debounce to avoid excessive calls
    [cleanup, handleIntersection, processCodeBlocks, highlightCodeBlock]
  );

  // Effect to initialize highlighting when dependencies change
  useEffect(() => {
    // Small delay to ensure DOM is updated
    const timeoutId = setTimeout(() => {
      initializeHighlighting();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      cleanup();
    };
  }, dependencies);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    reinitialize: initializeHighlighting,
    cleanup,
  };
};
