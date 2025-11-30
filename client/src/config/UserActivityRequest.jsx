import { apiClient } from './axiosClient';

/**
 * Track user activity
 * @param {number} visitCount - Visit count increment
 * @param {number} totalTimeSpent - Total time spent in seconds
 * @param {number} pageViews - Page views increment
 * @param {array} productsViewed - Array of product IDs viewed
 * @param {array} productsClicked - Array of product IDs clicked
 * @param {array} productsAddedToCart - Array of product IDs added to cart
 * @param {number} checkoutAttempts - Checkout attempts increment
 * @param {number} purchasesCompleted - Purchases completed increment
 * @param {array} categoriesViewed - Array of category IDs viewed
 * @param {string} deviceType - 'desktop', 'mobile', 'tablet'
 * @param {object} sessionInfo - Session information
 * @returns {Promise}
 */
export const trackUserActivity = async ({
    visitCount = 1,
    totalTimeSpent = 0,
    pageViews = 0,
    productsViewed = [],
    productsClicked = [],
    productsAddedToCart = [],
    checkoutAttempts = 0,
    purchasesCompleted = 0,
    categoriesViewed = [],
    deviceType = 'desktop',
    sessionInfo = null,
}) => {
    try {
        const response = await apiClient.post('/api/user-activity/track', {
            visitCount,
            totalTimeSpent,
            pageViews,
            productsViewed,
            productsClicked,
            productsAddedToCart,
            checkoutAttempts,
            purchasesCompleted,
            categoriesViewed,
            deviceType,
            sessionInfo,
        });
        return response.data;
    } catch (error) {
        console.error('Error tracking activity:', error);
        // Don't throw error for tracking failures
        return null;
    }
};

/**
 * Get user activities
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @param {number} limit - Limit results
 * @returns {Promise}
 */
export const getUserActivities = async ({ startDate = null, endDate = null, limit = 30 }) => {
    try {
        const response = await apiClient.get('/api/user-activity', {
            params: { startDate, endDate, limit },
        });
        return response.data;
    } catch (error) {
        console.error('Error getting user activities:', error);
        throw error;
    }
};

/**
 * Get user activity summary
 * @param {number} days - Days to look back
 * @returns {Promise}
 */
export const getUserActivitySummary = async ({ days = 30 }) => {
    try {
        const response = await apiClient.get('/api/user-activity/summary', {
            params: { days },
        });
        return response.data;
    } catch (error) {
        console.error('Error getting activity summary:', error);
        throw error;
    }
};

/**
 * Get user engagement rate
 * @param {number} days - Days to look back
 * @returns {Promise}
 */
export const getUserEngagementRate = async ({ days = 30 }) => {
    try {
        const response = await apiClient.get('/api/user-activity/engagement', {
            params: { days },
        });
        return response.data;
    } catch (error) {
        console.error('Error getting engagement rate:', error);
        throw error;
    }
};

/**
 * Get category preferences from activity
 * @param {number} days - Days to look back
 * @returns {Promise}
 */
export const getActivityCategoryPreferences = async ({ days = 90 }) => {
    try {
        const response = await apiClient.get('/api/user-activity/category-preferences', {
            params: { days },
        });
        return response.data;
    } catch (error) {
        console.error('Error getting category preferences:', error);
        throw error;
    }
};
