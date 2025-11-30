import { apiClient } from './axiosClient';

/**
 * Track user interaction with a product
 * @param {string} productId - Product ID
 * @param {string} interactionType - 'view', 'click', 'add_to_cart', 'purchase', 'remove_from_cart'
 * @param {number} viewDuration - Duration in seconds (for view type)
 * @param {string} sessionId - Session ID
 * @param {object} metadata - Additional metadata
 * @returns {Promise}
 */
export const trackInteraction = async ({ productId, interactionType, viewDuration = 0, sessionId, metadata = {} }) => {
    try {
        const response = await apiClient.post('/api/user-interaction/track', {
            productId,
            interactionType,
            viewDuration,
            sessionId,
            metadata,
        });
        return response.data;
    } catch (error) {
        console.error('Error tracking interaction:', error);
        // Don't throw error for tracking failures
        return null;
    }
};

/**
 * Get user interactions
 * @param {number} limit - Limit results
 * @param {string} interactionType - Filter by type
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise}
 */
export const getUserInteractions = async ({
    limit = 100,
    interactionType = null,
    startDate = null,
    endDate = null,
}) => {
    try {
        const response = await apiClient.get('/api/user-interaction', {
            params: { limit, interactionType, startDate, endDate },
        });
        return response.data;
    } catch (error) {
        console.error('Error getting user interactions:', error);
        throw error;
    }
};

/**
 * Get product interaction statistics
 * @param {string} productId - Product ID
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise}
 */
export const getProductStats = async ({ productId, startDate = null, endDate = null }) => {
    try {
        const response = await apiClient.get(`/api/user-interaction/product/${productId}`, {
            params: { startDate, endDate },
        });
        return response.data;
    } catch (error) {
        console.error('Error getting product stats:', error);
        throw error;
    }
};

/**
 * Get user's frequently viewed products
 * @param {number} limit - Limit results
 * @param {number} days - Days to look back
 * @returns {Promise}
 */
export const getUserFrequentProducts = async ({ limit = 20, days = 30 }) => {
    try {
        const response = await apiClient.get('/api/user-interaction/frequent', {
            params: { limit, days },
        });
        return response.data;
    } catch (error) {
        console.error('Error getting frequent products:', error);
        throw error;
    }
};

/**
 * Get user's category preferences
 * @param {number} days - Days to look back
 * @returns {Promise}
 */
export const getUserCategoryPreferences = async ({ days = 90 }) => {
    try {
        const response = await apiClient.get('/api/user-interaction/category-preferences', {
            params: { days },
        });
        return response.data;
    } catch (error) {
        console.error('Error getting category preferences:', error);
        throw error;
    }
};

/**
 * Get user's purchase history
 * @param {number} limit - Limit results
 * @returns {Promise}
 */
export const getUserPurchaseHistory = async ({ limit = 50 }) => {
    try {
        const response = await apiClient.get('/api/user-interaction/purchase-history', {
            params: { limit },
        });
        return response.data;
    } catch (error) {
        console.error('Error getting purchase history:', error);
        throw error;
    }
};
