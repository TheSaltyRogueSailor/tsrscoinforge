/**
 * Mobile wallet detection and deeplink utilities for Phantom
 */

export interface MobileWalletInfo {
  isMobile: boolean;
  isPhantomInstalled: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  browserName: string;
}

/**
 * Detect if running on mobile device
 */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Detect if Phantom is installed on current device
 */
export function isPhantomInstalled(): boolean {
  if (typeof window === "undefined") return false;
  
  // Check for Phantom provider
  const hasPhantom = !!window.phantom?.solana?.isPhantom;
  
  // Additional check for mobile - Phantom might be injected by the app
  if (isMobileDevice()) {
    return hasPhantom || isPhantomInMobileApp();
  }
  
  return hasPhantom;
}

/**
 * Check if Phantom is available in mobile app context
 */
function isPhantomInMobileApp(): boolean {
  if (typeof window === "undefined") return false;
  
  // Check for Phantom's mobile app indicators
  const userAgent = navigator.userAgent;
  const isPhantomBrowser = /Phantom/i.test(userAgent);
  
  // Check for injected provider
  const hasInjectedProvider = !!(window as any).phantom?.solana;
  
  return isPhantomBrowser || hasInjectedProvider;
}

/**
 * Detect device type and browser
 */
export function detectMobileEnvironment(): MobileWalletInfo {
  const userAgent = navigator.userAgent;
  
  const isAndroid = /Android/i.test(userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  const isMobile = isMobileDevice();
  const isPhantom = isPhantomInstalled();
  
  let browserName = "unknown";
  if (/Chrome/i.test(userAgent) && !/Chromium/i.test(userAgent)) {
    browserName = "Chrome";
  } else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) {
    browserName = "Safari";
  } else if (/Firefox/i.test(userAgent)) {
    browserName = "Firefox";
  } else if (/Phantom/i.test(userAgent)) {
    browserName = "Phantom";
  }
  
  return {
    isMobile,
    isPhantomInstalled: isPhantom,
    isAndroid,
    isIOS,
    browserName,
  };
}

/**
 * Generate Phantom mobile deeplink for connection
 * Phantom uses universal links for mobile connection flows
 */
export function getPhantomDeeplink(params?: {
  action?: string;
  redirectUrl?: string;
}): string {
  const action = params?.action || "connect";
  const redirectUrl = params?.redirectUrl || window.location.href;
  
  // Phantom's universal link format
  const baseUrl = "https://phantom.app/ul/v1";
  
  const queryParams = new URLSearchParams({
    action,
    redirect_link: redirectUrl,
  });
  
  return `${baseUrl}?${queryParams.toString()}`;
}

/**
 * Open Phantom mobile connection flow
 * This will either:
 * 1. Open Phantom app if installed (via deeplink)
 * 2. Redirect to Phantom download page if not installed
 */
export function openPhantomMobileConnection(): void {
  const deeplink = getPhantomDeeplink({ action: "connect" });
  
  // Use window.location.href to trigger deeplink
  // If Phantom is installed, it will open the app
  // If not, it will redirect to download page
  window.location.href = deeplink;
}

/**
 * Check if we're in Phantom mobile app's in-app browser
 */
export function isInPhantomMobileApp(): boolean {
  if (typeof window === "undefined") return false;
  
  const userAgent = navigator.userAgent;
  return /Phantom/i.test(userAgent) && isMobileDevice();
}

/**
 * Wait for Phantom provider to be injected (for mobile app context)
 * Returns a promise that resolves when provider is available
 */
export function waitForPhantomProvider(timeout = 3000): Promise<any> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkProvider = () => {
      if (window.phantom?.solana?.isPhantom) {
        resolve(window.phantom.solana);
        return;
      }
      
      if (Date.now() - startTime > timeout) {
        reject(new Error("Phantom provider not found"));
        return;
      }
      
      // Check again in 100ms
      setTimeout(checkProvider, 100);
    };
    
    checkProvider();
  });
}

/**
 * Get connection status for mobile
 */
export function getMobileConnectionStatus(): {
  canConnect: boolean;
  reason: string;
} {
  if (!isMobileDevice()) {
    return {
      canConnect: false,
      reason: "Not a mobile device",
    };
  }
  
  if (isPhantomInstalled()) {
    return {
      canConnect: true,
      reason: "Phantom is installed",
    };
  }
  
  return {
    canConnect: true,
    reason: "Will redirect to Phantom download",
  };
}
