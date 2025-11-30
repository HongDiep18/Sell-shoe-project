import { useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { trackInteraction } from '../config/UserInteractionRequest';
import { trackUserActivity } from '../config/UserActivityRequest';

/**
 * Custom hook for tracking user interactions and activity
 * Automatically tracks page views, time spent, and user actions
 */

// Generate or get session ID
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = uuidv4();
    sessionStorage.setItem('sessionId', sessionId);
    sessionStorage.setItem('sessionStartTime', Date.now().toString());
  }
  return sessionId;
};

// Get device type
const getDeviceType = () => {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

export const useInteractionTracker = () => {
  const sessionId = useRef(getSessionId());
  const pageStartTime = useRef(Date.now());

  /**
   * Track product view
   */
  const trackProductView = useCallback(async (productId, categoryId = null) => {
    const metadata = {};
    if (categoryId) {
      metadata.categoryId = categoryId;
    }

    await trackInteraction({
      productId,
      interactionType: 'view',
      viewDuration: 0,
      sessionId: sessionId.current,
      metadata,
    });

    // Also update activity
    await trackUserActivity({
      productsViewed: [productId],
      categoriesViewed: categoryId ? [categoryId] : [],
    });
  }, []);

  /**
   * Track product click
   */
  const trackProductClick = useCallback(async (productId, categoryId = null) => {
    const metadata = {};
    if (categoryId) {
      metadata.categoryId = categoryId;
    }

    await trackInteraction({
      productId,
      interactionType: 'click',
      sessionId: sessionId.current,
      metadata,
    });

    // Also update activity
    await trackUserActivity({
      productsClicked: [productId],
    });
  }, []);

  /**
   * Track add to cart
   */
  const trackAddToCart = useCallback(
    async (productId, categoryId = null, quantity = 1, colorId = null, sizeId = null) => {
      const metadata = {
        quantity,
      };
      if (categoryId) metadata.categoryId = categoryId;
      if (colorId) metadata.colorId = colorId;
      if (sizeId) metadata.sizeId = sizeId;

      await trackInteraction({
        productId,
        interactionType: 'add_to_cart',
        sessionId: sessionId.current,
        metadata,
      });

      // Also update activity
      await trackUserActivity({
        productsAddedToCart: [productId],
      });
    },
    []
  );

  /**
   * Track remove from cart
   */
  const trackRemoveFromCart = useCallback(async (productId) => {
    await trackInteraction({
      productId,
      interactionType: 'remove_from_cart',
      sessionId: sessionId.current,
      metadata: {},
    });
  }, []);

  /**
   * Track purchase
   */
  const trackPurchase = useCallback(
    async (productId, categoryId = null, quantity = 1, price = 0) => {
      const metadata = {
        quantity,
        price,
      };
      if (categoryId) metadata.categoryId = categoryId;

      await trackInteraction({
        productId,
        interactionType: 'purchase',
        sessionId: sessionId.current,
        metadata,
      });

      // Also update activity
      await trackUserActivity({
        purchasesCompleted: 1,
      });
    },
    []
  );

  /**
   * Track checkout attempt
   */
  const trackCheckoutAttempt = useCallback(async () => {
    await trackUserActivity({
      checkoutAttempts: 1,
    });
  }, []);

  /**
   * Track page view
   */
  const trackPageView = useCallback(async () => {
    await trackUserActivity({
      pageViews: 1,
    });
  }, []);

  /**
   * Track visit (session start)
   */
  const trackVisit = useCallback(async () => {
    await trackUserActivity({
      visitCount: 1,
      deviceType: getDeviceType(),
      sessionInfo: {
        sessionId: sessionId.current,
        startTime: new Date(),
      },
    });
  }, []);

  /**
   * Track time spent on page (call on unmount)
   */
  const trackTimeSpent = useCallback(async () => {
    const totalTimeSpent = Math.floor((Date.now() - pageStartTime.current) / 1000);
    
    if (totalTimeSpent > 0) {
      await trackUserActivity({
        totalTimeSpent,
      });
    }
  }, []);

  // Track page view on mount
  useEffect(() => {
    trackPageView();
    
    // Track time spent on unmount
    return () => {
      trackTimeSpent();
    };
  }, [trackPageView, trackTimeSpent]);

  return {
    sessionId: sessionId.current,
    trackProductView,
    trackProductClick,
    trackAddToCart,
    trackRemoveFromCart,
    trackPurchase,
    trackCheckoutAttempt,
    trackPageView,
    trackVisit,
    trackTimeSpent,
  };
};

/**
 * Hook specifically for tracking product detail page
 */
export const useProductViewTracker = (productId, categoryId = null) => {
  const { trackProductView } = useInteractionTracker();
  const viewTracked = useRef(false);
  const startTime = useRef(Date.now());

  useEffect(() => {
    if (productId && !viewTracked.current) {
      // Track initial view
      trackProductView(productId, categoryId);
      viewTracked.current = true;
    }

    // Track view duration on unmount
    return () => {
      if (productId) {
        const viewDuration = Math.floor((Date.now() - startTime.current) / 1000);
        
        trackInteraction({
          productId,
          interactionType: 'view',
          viewDuration,
          sessionId: getSessionId(),
          metadata: categoryId ? { categoryId } : {},
        });
      }
    };
  }, [productId, categoryId, trackProductView]);
};

/**
 * Hook for tracking session
 */
export const useSessionTracker = () => {
  const sessionTracked = useRef(false);
  const { trackVisit } = useInteractionTracker();

  useEffect(() => {
    if (!sessionTracked.current) {
      trackVisit();
      sessionTracked.current = true;
    }

    // Track session end
    return () => {
      const sessionStartTime = parseInt(sessionStorage.getItem('sessionStartTime') || '0');
      const duration = Math.floor((Date.now() - sessionStartTime) / 1000);
      
      trackUserActivity({
        totalTimeSpent: duration,
        sessionInfo: {
          sessionId: getSessionId(),
          endTime: new Date(),
          duration,
        },
      });
    };
  }, [trackVisit]);
};

export default useInteractionTracker;

