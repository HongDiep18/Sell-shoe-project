const axios = require('axios');

const RL_SERVICE_URL = process.env.RL_SERVICE_URL || 'http://localhost:5001';

class RLClientService {
    /**
     * Check if RL Service is available
     */
    static async isAvailable() {
        try {
            const response = await axios.get(`${RL_SERVICE_URL}/health`, {
                timeout: 1000,
            });
            return response.data.ready === true;
        } catch (error) {
            console.error('RL Service not available:', error.message);
            return false;
        }
    }

    /**
     * Get user state from RL Service (TensorFlow.js PPO)
     */
    static async getUserStateVector(userId) {
        try {
            const response = await axios.post(
                `${RL_SERVICE_URL}/get-user-state`,
                { userId: userId.toString() },
                { timeout: 5000 },
            );
            return response.data.state;
        } catch (error) {
            console.error('Error getting user state:', error.message);
            // Return default state (20 dimensions)
            return new Array(20).fill(0);
        }
    }

    /**
     * Rank products using PPO model
     */
    static async rankProducts(userState, candidates) {
        try {
            const response = await axios.post(
                `${RL_SERVICE_URL}/rank-products`,
                {
                    state: userState,
                    candidates: candidates.map((p) => ({
                        productId: p._id.toString(),
                        price: p.price,
                        category: p.category?.name || 'unknown',
                    })),
                },
                { timeout: 5000 },
            );
            return response.data.recommended;
        } catch (error) {
            console.error('Error ranking products:', error.message);
            // Fallback: return candidates with default scores
            return candidates.map((p, idx) => ({
                productId: p._id.toString(),
                score: 1 - idx * 0.1,
                rank: idx + 1,
            }));
        }
    }

    /**
     * Get personalized recommendations (complete flow)
     * This is the main method to use from controllers
     */
    static async getPersonalizedRecommendations(userId, candidateProducts, limit = 10) {
        try {
            // 1. Check if service is available
            const available = await this.isAvailable();
            if (!available) {
                console.log('RL Service unavailable, using fallback');
                return this.fallbackRecommendations(candidateProducts, limit);
            }

            // 2. Get user state
            const userState = await this.getUserStateVector(userId);

            // 3. Rank products
            const ranked = await this.rankProducts(userState, candidateProducts);

            // 4. Map back to full product objects
            const recommendations = ranked
                .map((r) => {
                    const product = candidateProducts.find((p) => p._id.toString() === r.productId);
                    return {
                        product,
                        score: r.score,
                        rank: r.rank,
                        method: 'ppo',
                    };
                })
                .filter((r) => r.product); // Remove null products

            return recommendations.slice(0, limit);
        } catch (error) {
            console.error('Error in getPersonalizedRecommendations:', error);
            return this.fallbackRecommendations(candidateProducts, limit);
        }
    }

    /**
     * Fallback recommendations (simple ranking)
     */
    static fallbackRecommendations(products, limit = 10) {
        return products.slice(0, limit).map((product, idx) => ({
            product,
            score: 1 - idx * 0.05,
            rank: idx + 1,
            method: 'fallback',
        }));
    }

    /**
     * Get user state from RL service
     * @param {string} userId - User ID
     * @returns {Promise<Object>} User state
     */
    static async getUserState({ userId }) {
        try {
            const response = await axios.post(
                `${RL_SERVICE_URL}/api/user-state`,
                {
                    userId: userId.toString(),
                },
                {
                    timeout: 5000,
                },
            );

            return response.data;
        } catch (error) {
            console.error('Error getting user state from RL service:', error.message);
            throw error;
        }
    }

    /**
     * Reload products in RL service
     * @returns {Promise<Object>}
     */
    static async reloadProducts() {
        try {
            const response = await axios.post(
                `${RL_SERVICE_URL}/api/reload-products`,
                {},
                {
                    timeout: 30000, // 30 seconds for reload
                },
            );

            return response.data;
        } catch (error) {
            console.error('Error reloading products in RL service:', error.message);
            throw error;
        }
    }

    /**
     * Get RL service statistics
     * @returns {Promise<Object>}
     */
    static async getStatistics() {
        try {
            const response = await axios.get(`${RL_SERVICE_URL}/api/statistics`, {
                timeout: 5000,
            });

            return response.data;
        } catch (error) {
            console.error('Error getting statistics from RL service:', error.message);
            throw error;
        }
    }

    /**
     * Reload model (after retraining)
     */
    static async reloadModel() {
        try {
            const response = await axios.post(`${RL_SERVICE_URL}/reload-model`, {}, { timeout: 10000 });
            console.log('✅ RL Model reloaded:', response.data);
            return true;
        } catch (error) {
            console.error('Error reloading model:', error.message);
            return false;
        }
    }

    /**
     * Get model info
     */
    static async getModelInfo() {
        try {
            const response = await axios.get(`${RL_SERVICE_URL}/model-info`, { timeout: 5000 });
            return response.data;
        } catch (error) {
            console.error('Error getting model info:', error.message);
            throw error;
        }
    }
}

module.exports = RLClientService;
