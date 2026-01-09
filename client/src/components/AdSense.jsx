import React, { useEffect, useRef, useState } from 'react';

const MAX_RETRIES = 50; // Maximum 5 seconds of retries (50 * 100ms)

const AdSense = ({ 
  adSlot = '7973755487', 
  adFormat = 'auto',
  fullWidthResponsive = true,
  style = { display: 'block', minWidth: '250px', minHeight: '50px' }
}) => {
  const adRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const timeoutIdsRef = useRef([]);
  const retryCountRef = useRef(0);
  const observerRef = useRef(null);

  useEffect(() => {
    // Ensure ad is only loaded once
    if (isLoaded || hasError) return;

    const loadAd = () => {
      try {
        // Check if the element exists and has width
        if (!adRef.current) {
          console.warn('AdSense: Ad container ref not available');
          return;
        }

        const rect = adRef.current.getBoundingClientRect();
        
        // Only load the ad if container has a proper width
        if (rect.width === 0) {
          if (retryCountRef.current >= MAX_RETRIES) {
            console.warn('AdSense: Max retries reached, container still has zero width');
            setHasError(true);
            return;
          }
          retryCountRef.current += 1;
          console.warn(`AdSense: Container has zero width, retrying... (${retryCountRef.current}/${MAX_RETRIES})`);
          // Retry after a short delay to allow layout to complete
          const timeoutId = setTimeout(loadAd, 100);
          timeoutIdsRef.current.push(timeoutId);
          return;
        }

        // Check if adsbygoogle script is loaded
        if (typeof window.adsbygoogle === 'undefined') {
          if (retryCountRef.current >= MAX_RETRIES) {
            console.warn('AdSense: Max retries reached, script not loaded');
            setHasError(true);
            return;
          }
          retryCountRef.current += 1;
          console.warn(`AdSense: Script not loaded yet, retrying... (${retryCountRef.current}/${MAX_RETRIES})`);
          const timeoutId = setTimeout(loadAd, 100);
          timeoutIdsRef.current.push(timeoutId);
          return;
        }

        // Push ad to AdSense
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        setIsLoaded(true);
      } catch (error) {
        console.error('AdSense error:', error);
        setHasError(true);
      }
    };

    // Use IntersectionObserver to lazy-load ads only when visible
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Add a small delay to ensure layout is stable
            const timeoutId = setTimeout(loadAd, 100);
            timeoutIdsRef.current.push(timeoutId);
            if (observerRef.current) {
              observerRef.current.disconnect();
            }
          }
        });
      },
      { rootMargin: '100px' } // Load ad 100px before it comes into view
    );

    if (adRef.current) {
      observerRef.current.observe(adRef.current);
    }

    return () => {
      // Clean up all pending timeouts
      timeoutIdsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
      timeoutIdsRef.current = [];
      
      // Clean up observer
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isLoaded, hasError]);

  // Don't render if there was an error
  if (hasError) {
    return null;
  }

  return (
    <ins
      ref={adRef}
      className="adsbygoogle"
      style={style}
      data-ad-client="ca-pub-7874968537431675"
      data-ad-slot={adSlot}
      data-ad-format={adFormat}
      data-full-width-responsive={fullWidthResponsive.toString()}
    />
  );
};

export default AdSense;
