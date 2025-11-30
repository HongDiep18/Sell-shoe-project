import { apiClient } from './axiosClient';

// Get personalized recommendations for user
export const getPersonalizedRecommendations = async () => {
    try {
        // Add timestamp to prevent caching
        const timestamp = Date.now();
        console.log('🚀 Requesting personalized recommendations at:', new Date().toISOString());

        const response = await apiClient.get(`/api/recommendation/personalized?t=${timestamp}`);

        console.log('📥 Received response:', {
            userId: response.data.metadata?.userId,
            method: response.data.metadata?.method,
            count: response.data.metadata?.recommendations?.length || 0,
        });

        return response.data;
    } catch (error) {
        console.error('❌ Error fetching personalized recommendations:', error);
        throw error;
    }
};

// Get trending products
export const getTrendingRecommendations = async () => {
    try {
        const response = await apiClient.get('/api/recommendation/trending');
        return response.data;
    } catch (error) {
        console.error('Error fetching trending recommendations:', error);
        throw error;
    }
};

// Get similar products
export const getSimilarProducts = async (productId) => {
    try {
        const response = await apiClient.get(`/api/recommendation/similar/${productId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching similar products:', error);
        throw error;
    }
};

// Get category recommendations
export const getCategoryRecommendations = async (categoryId) => {
    try {
        const response = await apiClient.get(`/api/recommendation/category/${categoryId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching category recommendations:', error);
        throw error;
    }
};

// Get recommendations for new users (cold start)
export const getColdStartRecommendations = async () => {
    try {
        const response = await apiClient.get('/api/recommendation/cold-start');
        return response.data;
    } catch (error) {
        console.error('Error fetching cold start recommendations:', error);
        throw error;
    }
};

// Get product bundles
export const getProductBundles = async (productId) => {
    try {
        const response = await apiClient.get(`/api/recommendation/bundles/${productId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching product bundles:', error);
        throw error;
    }
};

// Update recommendation feedback
export const updateRecommendationFeedback = async (recommendationId, feedback) => {
    try {
        const response = await apiClient.post(`/api/rl-recommendation/${recommendationId}/feedback`, feedback);
        return response.data;
    } catch (error) {
        console.error('Error updating recommendation feedback:', error);
        throw error;
    }
};

// Get user recommendation history
export const getUserRecommendationHistory = async () => {
    try {
        const response = await apiClient.get('/api/rl-recommendation/history');
        return response.data;
    } catch (error) {
        console.error('Error fetching recommendation history:', error);
        throw error;
    }
};

// Admin: Trigger model training
export const triggerModelTraining = async () => {
    try {
        const response = await apiClient.post('/api/recommendation/admin/train');
        return response.data;
    } catch (error) {
        console.error('Error triggering model training:', error);
        throw error;
    }
};

// Admin: Evaluate model
export const evaluateModel = async () => {
    try {
        const response = await apiClient.post('/api/recommendation/admin/evaluate');
        return response.data;
    } catch (error) {
        console.error('Error evaluating model:', error);
        throw error;
    }
};

// Admin: Get recommendation statistics
export const getRecommendationStatistics = async () => {
    try {
        const response = await apiClient.get('/api/recommendation/admin/statistics');
        return response.data;
    } catch (error) {
        console.error('Error fetching recommendation statistics:', error);
        throw error;
    }
};

// Admin: Get model info
export const getModelInfo = async () => {
    try {
        const response = await apiClient.get('/api/recommendation/admin/model-info');
        return response.data;
    } catch (error) {
        console.error('Error fetching model info:', error);
        throw error;
    }
};

// Admin: Prepare dataset
export const prepareDataset = async () => {
    try {
        const response = await apiClient.post('/api/recommendation/admin/prepare-dataset');
        return response.data;
    } catch (error) {
        console.error('Error preparing dataset:', error);
        throw error;
    }
};

// Admin: Download dataset
export const downloadDataset = async () => {
    try {
        const response = await apiClient.get('/api/recommendation/admin/download-dataset', {
            responseType: 'blob',
        });
        // Return blob data directly - don't handle download here
        return response.data;
    } catch (error) {
        console.error('Error downloading dataset:', error);
        throw error;
    }
};

// Admin: Get metrics
export const getRecommendationMetrics = async () => {
    try {
        const response = await apiClient.get('/api/rl-recommendation/metrics');
        return response.data;
    } catch (error) {
        console.error('Error fetching recommendation metrics:', error);
        throw error;
    }
};

// Admin: Get training data
export const getTrainingData = async (limit = 100) => {
    try {
        const response = await apiClient.get(`/api/rl-recommendation/training-data?limit=${limit}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching training data:', error);
        throw error;
    }
};
