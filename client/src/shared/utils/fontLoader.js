/**
 * Lazy font loader utility to improve LCP performance
 * Loads non-critical fonts after page load
 */

const ADDITIONAL_FONTS = [
  "https://fonts.googleapis.com/css2?family=Nunito+Sans:ital,wght@0,400;0,600;0,700;1,400&display=swap",
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  "https://fonts.googleapis.com/css2?family=Source+Sans+Pro:ital,wght@0,400;0,600;0,700;1,400&display=swap",
  "https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,400;0,600;0,700;1,400&display=swap",
  "https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,400;0,500;0,700;1,400&display=swap",
  "https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&display=swap",
];

let fontsLoaded = false;

/**
 * Load additional fonts asynchronously
 */
export const loadAdditionalFonts = () => {
  if (fontsLoaded) return;

  // Use requestIdleCallback to load fonts during idle time
  const loadFonts = () => {
    ADDITIONAL_FONTS.forEach((fontUrl) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = fontUrl;
      link.media = "print"; // Load as print media first

      link.onload = () => {
        link.media = "all"; // Then apply to all media
      };

      document.head.appendChild(link);
    });

    fontsLoaded = true;
  };

  if (window.requestIdleCallback) {
    window.requestIdleCallback(loadFonts, { timeout: 2000 });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(loadFonts, 1000);
  }
};

/**
 * Preload critical resources
 */
export const preloadCriticalResources = () => {
  // Preload critical font (Lato) as it's used for main content
  const criticalFont = document.createElement("link");
  criticalFont.rel = "preload";
  criticalFont.as = "style";
  criticalFont.href =
    "https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,400;0,700;1,400;1,700&display=swap";
  criticalFont.crossOrigin = "anonymous";
  document.head.appendChild(criticalFont);
};

/**
 * Initialize font loading strategy
 */
export const initializeFontLoading = () => {
  // Preload critical fonts immediately
  preloadCriticalResources();

  // Load additional fonts after page load
  if (document.readyState === "complete") {
    loadAdditionalFonts();
  } else {
    window.addEventListener("load", loadAdditionalFonts);
  }
};
