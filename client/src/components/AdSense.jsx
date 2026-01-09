import React, { useEffect, useRef, useState } from 'react';

const AdSense = ({ 
  adSlot = '7973755487', 
  adFormat = 'auto',
  fullWidthResponsive = true,
  style = { display: 'block', minWidth: '250px', minHeight: '50px' }
}) => {
  const adRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

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
          console.warn('AdSense: Container has zero width, retrying...');
          // Retry after a short delay to allow layout to complete
          setTimeout(loadAd, 100);
          return;
        }

        // Check if adsbygoogle script is loaded
        if (typeof window.adsbygoogle === 'undefined') {
          console.warn('AdSense: Script not loaded yet, retrying...');
          setTimeout(loadAd, 100);
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
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isLoaded) {
            // Add a small delay to ensure layout is stable
            setTimeout(loadAd, 100);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '100px' } // Load ad 100px before it comes into view
    );

    if (adRef.current) {
      observer.observe(adRef.current);
    }

    return () => {
      if (observer && adRef.current) {
        observer.disconnect();
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
