import { useEffect } from 'react';

/**
 * Component to preload critical resources for better LCP performance
 */
const PreloadCriticalResources = () => {
  useEffect(() => {
    // Preload critical fonts
    const criticalFonts = [
      'https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&display=swap',
      'https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,400;0,700;1,400;1,700&display=swap'
    ];

    criticalFonts.forEach(fontUrl => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = fontUrl;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });

    // Preload highlight.js worker if available
    if ('serviceWorker' in navigator) {
      // We can implement a service worker later for caching highlight.js results
    }

    // Warm up highlight.js with common languages
    const warmUpHighlighting = () => {
      import('highlight.js/lib/core').then((hljs) => {
        try {
          hljs.default.getLanguage('javascript');
        } catch {
          // Optional warm-up only
        }
      });
    };

    // Warm up during idle time
    if (window.requestIdleCallback) {
      window.requestIdleCallback(warmUpHighlighting, { timeout: 1000 });
    } else {
      setTimeout(warmUpHighlighting, 100);
    }

    return () => {
      // Cleanup if needed
    };
  }, []);

  return null; // This component doesn't render anything
};

export default PreloadCriticalResources;
