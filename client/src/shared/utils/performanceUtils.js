/**
 * Performance utilities for optimizing LCP and other Core Web Vitals
 */

/**
 * Debounce function to limit execution rate
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Create an intersection observer with default options
 */
export const createIntersectionObserver = (callback, options = {}) => {
  const defaultOptions = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
  };

  return new IntersectionObserver(callback, { ...defaultOptions, ...options });
};

/**
 * Polyfill for requestIdleCallback
 */
export const requestIdleCallback = (() => {
  if (typeof window !== 'undefined' && window.requestIdleCallback) {
    return window.requestIdleCallback;
  }

  return (callback, options = {}) => {
    const timeout = options.timeout || 0;
    const start = performance.now();

    return setTimeout(() => {
      callback({
        didTimeout: false,
        timeRemaining() {
          return Math.max(0, 50 - (performance.now() - start));
        },
      });
    }, timeout);
  };
})();

/**
 * Polyfill for cancelIdleCallback
 */
export const cancelIdleCallback = (() => {
  if (typeof window !== 'undefined' && window.cancelIdleCallback) {
    return window.cancelIdleCallback;
  }

  return clearTimeout;
})();

/**
 * Create a simple LRU cache
 */
export const createCache = (maxSize = 100, ttl = 5 * 60 * 1000) => {
  const cache = new Map();

  const isExpired = (item) => {
    return Date.now() - item.timestamp > ttl;
  };

  const evictExpired = () => {
    for (const [key, value] of cache.entries()) {
      if (isExpired(value)) {
        cache.delete(key);
      }
    }
  };

  const evictOldest = () => {
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
  };

  return {
    has(key) {
      const item = cache.get(key);
      if (item && isExpired(item)) {
        cache.delete(key);
        return false;
      }
      return !!item;
    },

    get(key) {
      const item = cache.get(key);
      if (!item || isExpired(item)) {
        cache.delete(key);
        return undefined;
      }

      // Move to end (LRU behavior)
      cache.delete(key);
      cache.set(key, item);

      return item.value;
    },

    set(key, value) {
      // Clean up expired items periodically
      if (Math.random() < 0.1) {
        evictExpired();
      }

      evictOldest();

      cache.set(key, {
        value,
        timestamp: Date.now(),
      });
    },

    delete(key) {
      return cache.delete(key);
    },

    clear() {
      cache.clear();
    },

    size() {
      evictExpired();
      return cache.size;
    },
  };
};

/**
 * Preload critical resources
 */
export const preloadResource = (href, as, type = null, crossOrigin = null) => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;

  if (type) link.type = type;
  if (crossOrigin) link.crossOrigin = crossOrigin;

  document.head.appendChild(link);
  return link;
};

/**
 * Defer non-critical CSS loading
 */
export const loadCSSAsync = (href) => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.media = 'print';
  link.onload = () => {
    link.media = 'all';
  };

  document.head.appendChild(link);
  return link;
};

/**
 * Check if an element is in viewport
 */
export const isInViewport = (element) => {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};
