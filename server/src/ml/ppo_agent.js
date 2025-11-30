/**
 * PPO (Proximal Policy Optimization) Agent
 * Được sử dụng để đề xuất sản phẩm cá nhân hóa
 *
 * Thuật toán PPO là một phương pháp Policy Gradient trong Reinforcement Learning
 * được thiết kế để cải thiện stability và sample efficiency.
 *
 * State: User features (purchase history, ratings, activity)
 * Action: Recommend products
 * Reward: User engagement (clicks, add to cart, purchase)
 */

const Product = require('../models/product.model');
const RLRecommendation = require('../models/rlRecommendation.model');

class PPOAgent {
    constructor(config = {}) {
        this.config = {
            // PPO hyperparameters
            learningRate: config.learningRate || 0.0003,
            gamma: config.gamma || 0.99, // Discount factor
            epsilon: config.epsilon || 0.2, // Clipping parameter
            lambdaGAE: config.lambdaGAE || 0.95, // GAE parameter

            // Model parameters
            stateSize: config.stateSize || 20, // Number of features
            actionSize: config.actionSize || 10, // Number of products to recommend

            // Training parameters
            batchSize: config.batchSize || 64,
            epochs: config.epochs || 10,

            // Recommendation parameters
            topK: config.topK || 10, // Number of recommendations
            explorationRate: config.explorationRate || 0.1, // Epsilon-greedy

            // Model version
            modelVersion: config.modelVersion || 'v1.0.0',
        };

        // Weights cho scoring (simplified policy network)
        this.weights = this.initializeWeights();

        // Value function weights
        this.valueWeights = this.initializeWeights();
    }

    /**
     * Initialize random weights
     */
    initializeWeights() {
        const weights = {
            // User behavior weights
            recency: Math.random() * 0.3 + 0.1,
            frequency: Math.random() * 0.3 + 0.1,
            monetary: Math.random() * 0.3 + 0.1,
            engagement: Math.random() * 0.3 + 0.1,

            // Rating weights
            avgRating: Math.random() * 0.2 + 0.05,
            reviewRate: Math.random() * 0.2 + 0.05,

            // Category preference weights
            categoryMatch: Math.random() * 0.4 + 0.2,

            // Product popularity weights
            productPopularity: Math.random() * 0.2 + 0.05,

            // Price sensitivity
            priceMatch: Math.random() * 0.2 + 0.05,

            // Diversity bonus
            diversityBonus: Math.random() * 0.1 + 0.05,
        };

        return weights;
    }

    /**
     * Get recommendations for a user
     */
    async getRecommendations({ userState, userId, sessionId, excludeProductIds = [] }) {
        try {
            // 1. Get candidate products
            const candidates = await this.getCandidateProducts({
                userState,
                excludeProductIds,
            });

            if (candidates.length === 0) {
                return {
                    recommendedProducts: [],
                    userState,
                    modelVersion: this.config.modelVersion,
                };
            }

            // 2. Epsilon-greedy exploration
            const useExploration = Math.random() < this.config.explorationRate;

            let recommendedProducts;
            if (useExploration) {
                // Exploration: random selection
                recommendedProducts = this.explorationPolicy(candidates);
            } else {
                // Exploitation: use learned policy
                recommendedProducts = await this.exploitationPolicy({
                    candidates,
                    userState,
                });
            }

            // 3. Apply diversity
            recommendedProducts = this.applyDiversity(recommendedProducts);

            // 4. Format results
            const formatted = recommendedProducts.slice(0, this.config.topK).map((item, index) => ({
                productId: item.product._id,
                score: item.score,
                rank: index + 1,
                reason: item.reason,
            }));

            return {
                recommendedProducts: formatted,
                userState,
                modelVersion: this.config.modelVersion,
                sessionId,
            };
        } catch (error) {
            console.error('Error getting recommendations:', error);
            throw error;
        }
    }

    /**
     * Get candidate products for recommendation
     */
    async getCandidateProducts({ userState, excludeProductIds = [] }) {
        try {
            const query = {
                status: 'active',
                _id: { $nin: excludeProductIds },
            };

            // Lấy products, ưu tiên category mà user thích
            const allProducts = await Product.find(query).populate('category', 'name').limit(100); // Limit candidates for performance

            return allProducts;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Exploration policy: Random selection
     */
    explorationPolicy(candidates) {
        const shuffled = [...candidates].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, this.config.topK).map((product, index) => ({
            product,
            score: Math.random(),
            rank: index + 1,
            reason: 'exploration',
        }));
    }

    /**
     * Exploitation policy: Use learned policy to score products
     */
    async exploitationPolicy({ candidates, userState }) {
        // Score each product
        const scored = await Promise.all(
            candidates.map(async (product) => {
                const score = await this.scoreProduct({ product, userState });
                return {
                    product,
                    score,
                    reason: this.generateReason({ product, userState }),
                };
            }),
        );

        // Sort by score (descending)
        scored.sort((a, b) => b.score - a.score);

        return scored;
    }

    /**
     * Score a product for a user (Policy network output)
     */
    async scoreProduct({ product, userState }) {
        try {
            let score = 0;

            const normalized = userState.normalized || {
                recency_norm: 1,
                frequency_norm: 0,
                monetary_norm: 0,
                engagement_norm: 0
            };

            // 1. RFM Score (Recency, Frequency, Monetary)
            const rfmScore =
                (1 - normalized.recency_norm) * this.weights.recency +
                normalized.frequency_norm * this.weights.frequency +
                normalized.monetary_norm * this.weights.monetary;

            score += rfmScore * 0.3;

            // 2. Engagement Score
            score += normalized.engagement_norm * this.weights.engagement * 0.2;

            // 3. Rating behavior
            const ratingScore =
                (userState.averageRating / 5) * this.weights.avgRating +
                Math.min(userState.reviewRate, 1) * this.weights.reviewRate;

            score += ratingScore * 0.15;

            // 4. Category preference matching
            const productCategory = product.category?.name || product.category;
            const categoryMatch = userState.categoryPreferences?.some((cat) => cat.category === productCategory)
                ? 1
                : 0;

            score += categoryMatch * this.weights.categoryMatch * 0.25;

            // 5. Product popularity (based on stats - simplified)
            const popularityScore = product.isFeatured ? 0.8 : 0.5;
            score += popularityScore * this.weights.productPopularity * 0.05;

            // 6. Price matching (prefer products in user's price range)
            const finalPrice = product.price * (1 - (product.discount || 0) / 100);
            const userAvgPrice = userState.averageOrderValue || 1000000;
            const denominator = userAvgPrice > 0 ? userAvgPrice : 1;
            const priceRatio = Math.min(finalPrice / denominator, 2);
            const priceScore = priceRatio <= 1.5 ? 1 - (priceRatio - 1) / 0.5 : 0;

            score += priceScore * this.weights.priceMatch * 0.05;

            // Normalize to 0-1 and ensure finite
            if (!Number.isFinite(score)) {
                score = 0;
            }

            return Math.max(0, Math.min(1, score));
        } catch (error) {
            console.error('Error scoring product:', error);
            return 0;
        }
    }

    /**
     * Apply diversity to recommendations (avoid recommending too similar products)
     */
    applyDiversity(recommendedProducts) {
        const diverse = [];
        const selectedCategories = new Set();

        // First pass: pick top items from different categories
        for (const item of recommendedProducts) {
            const category = item.product.category?.name || item.product.category;

            if (diverse.length < this.config.topK) {
                if (!selectedCategories.has(category) || diverse.length >= this.config.topK / 2) {
                    diverse.push(item);
                    selectedCategories.add(category);
                }
            }
        }

        // Second pass: fill remaining slots
        for (const item of recommendedProducts) {
            if (diverse.length >= this.config.topK) break;
            if (!diverse.includes(item)) {
                diverse.push(item);
            }
        }

        return diverse;
    }

    /**
     * Generate reason for recommendation
     */
    generateReason({ product, userState }) {
        const productCategory = product.category?.name || product.category;

        if (userState.categoryPreferences?.some((cat) => cat.category === productCategory)) {
            return `Phù hợp với sở thích ${productCategory} của bạn`;
        }

        if (product.isFeatured) {
            return 'Sản phẩm nổi bật';
        }

        if (userState.totalPurchases > 5) {
            return 'Đề xuất dành cho khách hàng thân thiết';
        }

        if (userState.averageRating >= 4) {
            return 'Dành cho khách hàng có đánh giá cao';
        }

        return 'Sản phẩm được đề xuất';
    }

    /**
     * Calculate advantage using Generalized Advantage Estimation (GAE)
     */
    calculateAdvantage(rewards, values, nextValues, dones) {
        const advantages = [];
        let lastGAE = 0;

        for (let t = rewards.length - 1; t >= 0; t--) {
            const delta = rewards[t] + this.config.gamma * nextValues[t] * (1 - dones[t]) - values[t];

            lastGAE = delta + this.config.gamma * this.config.lambdaGAE * (1 - dones[t]) * lastGAE;

            advantages[t] = lastGAE;
        }

        return advantages;
    }

    /**
     * Update policy using PPO objective
     * This is a simplified version. In production, you would use a proper neural network library
     */
    async updatePolicy({ states, actions, oldProbs, advantages, returns }) {
        console.log('📊 Updating PPO policy...');

        // In a real implementation, this would:
        // 1. Compute new action probabilities
        // 2. Calculate ratio = new_prob / old_prob
        // 3. Compute clipped objective
        // 4. Update policy network weights
        // 5. Update value network weights

        // For now, we'll do a simplified weight update based on average advantage
        const avgAdvantage = advantages.reduce((a, b) => a + b, 0) / advantages.length;

        // Simple gradient-like update
        const learningRate = this.config.learningRate;

        Object.keys(this.weights).forEach((key) => {
            // Update weights in direction of positive advantage
            this.weights[key] += learningRate * avgAdvantage * (Math.random() - 0.5);
            // Clip to reasonable range
            this.weights[key] = Math.max(0.01, Math.min(1.0, this.weights[key]));
        });

        console.log('✅ Policy updated');
        console.log('Current weights:', this.weights);
    }

    /**
     * Train the PPO agent using collected experience
     */
    async train({ limit = 1000, minInteractions = 5 }) {
        try {
            console.log('🚀 Starting PPO training...');

            // 1. Get training data from recommendations with feedback
            const trainingData = await this.collectTrainingData({
                limit,
                minInteractions,
            });

            console.log('trainingData', trainingData);

            if (trainingData.length === 0) {
                console.log('❌ No training data available');
                return {
                    success: false,
                    message: 'No training data available',
                };
            }

            console.log(`📊 Training data size: ${trainingData.length}`);

            // 2. Extract states, actions, rewards
            const states = trainingData.map((d) => d.state);
            const actions = trainingData.map((d) => d.action);
            const rewards = trainingData.map((d) => d.reward);
            const oldProbs = trainingData.map((d) => d.probability || 0.1);
            const dones = trainingData.map(() => 0); // Simplified

            // 3. Compute values and advantages
            const values = states.map((state) => this.computeValue(state));
            const nextValues = [...values.slice(1), 0];
            const advantages = this.calculateAdvantage(rewards, values, nextValues, dones);

            // Normalize advantages
            const meanAdv = advantages.reduce((a, b) => a + b, 0) / advantages.length;
            const stdAdv = Math.sqrt(
                advantages.reduce((sum, adv) => sum + Math.pow(adv - meanAdv, 2), 0) / advantages.length,
            );
            const normalizedAdvantages = advantages.map((adv) => (adv - meanAdv) / (stdAdv + 1e-8));

            // 4. Compute returns
            const returns = advantages.map((adv, i) => adv + values[i]);

            // 5. PPO update for multiple epochs
            for (let epoch = 0; epoch < this.config.epochs; epoch++) {
                await this.updatePolicy({
                    states,
                    actions,
                    oldProbs,
                    advantages: normalizedAdvantages,
                    returns,
                });
            }

            // 6. Calculate training metrics
            const avgReward = rewards.reduce((a, b) => a + b, 0) / rewards.length;
            const maxReward = Math.max(...rewards);
            const minReward = Math.min(...rewards);

            console.log('✅ Training completed');
            console.log(`   Average reward: ${avgReward.toFixed(4)}`);
            console.log(`   Max reward: ${maxReward.toFixed(4)}`);
            console.log(`   Min reward: ${minReward.toFixed(4)}`);

            return {
                success: true,
                metrics: {
                    trainingDataSize: trainingData.length,
                    epochs: this.config.epochs,
                    avgReward,
                    maxReward,
                    minReward,
                    weights: this.weights,
                },
            };
        } catch (error) {
            console.error('❌ Training error:', error);
            throw error;
        }
    }

    /**
     * Collect training data from past recommendations
     */
    async collectTrainingData({ limit, minInteractions }) {
        try {
            const recommendations = await RLRecommendation.find({
                'feedback.hasInteraction': true,
                reward: { $gt: 0 },
            })
                .sort({ createdAt: -1 })
                .limit(limit);

            return recommendations.map((rec) => ({
                state: {
                    totalPurchases: rec.userState.totalPurchases || 0,
                    averageRating: rec.userState.averageRating || 0,
                    recentInteractions: rec.userState.recentInteractions || 0,
                    lastVisitDaysAgo: rec.userState.lastVisitDaysAgo || 0,
                    categoryPreferences: rec.userState.categoryPreferences || [],
                    normalized: {
                        recency_norm: Math.min((rec.userState.lastVisitDaysAgo || 0) / 365, 1),
                        frequency_norm: Math.min((rec.userState.totalPurchases || 0) / 50, 1),
                        monetary_norm: 0.5, // Simplified
                        engagement_norm: Math.min((rec.userState.recentInteractions || 0) / 100, 1),
                    },
                },
                action: rec.recommendedProducts,
                reward: rec.reward,
                probability: 0.1, // Simplified
            }));
        } catch (error) {
            throw error;
        }
    }

    /**
     * Compute value function (state value)
     * Simplified version - in production use neural network
     */
    computeValue(state) {
        return (
            ((1 - state.normalized.recency_norm) * this.valueWeights.recency +
                state.normalized.frequency_norm * this.valueWeights.frequency +
                state.normalized.monetary_norm * this.valueWeights.monetary +
                state.normalized.engagement_norm * this.valueWeights.engagement) *
            0.25
        );
    }

    /**
     * Save model weights
     */
    async saveModel(filepath) {
        const fs = require('fs').promises;
        const modelData = {
            config: this.config,
            weights: this.weights,
            valueWeights: this.valueWeights,
            savedAt: new Date(),
        };
        await fs.writeFile(filepath, JSON.stringify(modelData, null, 2));
        console.log(`✅ Model saved to ${filepath}`);
    }

    /**
     * Load model weights
     */
    async loadModel(filepath) {
        const fs = require('fs').promises;
        const data = await fs.readFile(filepath, 'utf-8');
        const modelData = JSON.parse(data);
        this.config = modelData.config;
        this.weights = modelData.weights;
        this.valueWeights = modelData.valueWeights;
        console.log(`✅ Model loaded from ${filepath}`);
    }
}

module.exports = PPOAgent;
