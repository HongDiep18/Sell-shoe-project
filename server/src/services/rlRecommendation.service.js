const RLRecommendation = require('../models/rlRecommendation.model');
const UserInteractionService = require('./userInteraction.service');
const UserActivityService = require('./userActivity.service');
const ProductReviewService = require('./productReview.service');
const Product = require('../models/product.model');
const mongoose = require('mongoose');

class RLRecommendationService {
    // Lưu kết quả recommendation
    static async saveRecommendation({
        userId,
        recommendedProducts,
        modelVersion,
        userState,
        sessionId
    }) {
        try {
            const recommendation = await RLRecommendation.create({
                userId,
                recommendedProducts,
                modelVersion,
                userState,
                sessionId,
                feedback: {
                    clickedProducts: [],
                    purchasedProducts: [],
                    addedToCartProducts: [],
                    hasInteraction: false
                },
                reward: 0
            });

            return recommendation;
        } catch (error) {
            throw error;
        }
    }

    // Cập nhật feedback cho recommendation
    static async updateFeedback({
        recommendationId,
        feedbackType, // 'click', 'purchase', 'add_to_cart'
        productId,
        rank
    }) {
        try {
            const recommendation = await RLRecommendation.findById(recommendationId);
            
            if (!recommendation) {
                throw new Error('Recommendation not found');
            }

            const feedbackData = {
                productId,
                rank
            };

            const productIdString = productId.toString();

            switch (feedbackType) {
                case 'click': {
                    const exists = recommendation.feedback.clickedProducts.some(
                        item => item.productId.toString() === productIdString
                    );
                    if (!exists) {
                        feedbackData.clickedAt = new Date();
                        recommendation.feedback.clickedProducts.push(feedbackData);
                    }
                    break;
                }
                case 'purchase': {
                    const exists = recommendation.feedback.purchasedProducts.some(
                        item => item.productId.toString() === productIdString
                    );
                    if (!exists) {
                        feedbackData.purchasedAt = new Date();
                        recommendation.feedback.purchasedProducts.push(feedbackData);
                    }
                    break;
                }
                case 'add_to_cart': {
                    const exists = recommendation.feedback.addedToCartProducts.some(
                        item => item.productId.toString() === productIdString
                    );
                    if (!exists) {
                        feedbackData.addedAt = new Date();
                        recommendation.feedback.addedToCartProducts.push(feedbackData);
                    }
                    break;
                }
            }

            recommendation.feedback.hasInteraction = true;

            // Tính reward
            recommendation.reward = this.calculateReward(recommendation.feedback);

            await recommendation.save();

            return recommendation;
        } catch (error) {
            throw error;
        }
    }

    // Tính reward cho RL model
    static calculateReward(feedback) {
        let reward = 0;

        // Click: +0.1 điểm mỗi product
        reward += feedback.clickedProducts.length * 0.1;

        // Add to cart: +0.5 điểm mỗi product
        reward += feedback.addedToCartProducts.length * 0.5;

        // Purchase: +1.0 điểm mỗi product
        reward += feedback.purchasedProducts.length * 1.0;

        // Thưởng thêm nếu rank cao (top 3)
        feedback.purchasedProducts.forEach(p => {
            if (p.rank <= 3) {
                reward += 0.5; // Thưởng thêm nếu mua sản phẩm ở top 3
            }
        });

        return reward;
    }

    // Lấy user state cho RL model
    static async getUserState({ userId }) {
        try {
            // Lấy activity summary
            const activitySummary = await UserActivityService.getUserActivitySummary({ 
                userId, 
                days: 30 
            });

            // Lấy average rating
            const ratingData = await ProductReviewService.getUserAverageRating({ userId });

            // Lấy category preferences
            const categoryPrefs = await UserInteractionService.getUserCategoryPreferences({ 
                userId, 
                days: 90 
            });

            // Lấy purchase history
            const purchases = await UserInteractionService.getUserPurchaseHistory({ 
                userId, 
                limit: 10 
            });

            // Tính số ngày kể từ lần mua cuối
            let daysSinceLastPurchase = 999;
            if (purchases.length > 0) {
                const lastPurchaseDate = purchases[0].createdAt;
                const now = new Date();
                daysSinceLastPurchase = Math.floor((now - lastPurchaseDate) / (1000 * 60 * 60 * 24));
            }

            const totalPurchases = purchases.length;
            const totalSpent = purchases.reduce((sum, interaction) => {
                const price = interaction.metadata?.price || interaction.metadata?.totalPrice || 0;
                return sum + price;
            }, 0);
            const averageOrderValue = totalPurchases > 0 ? totalSpent / totalPurchases : 0;

            const recentInteractions = activitySummary.totalProductsClicked || 0;
            const lastVisitDaysAgo = activitySummary.daysSinceLastVisit ?? 999;
            const totalVisits = activitySummary.totalVisits || 0;
            const totalAddedToCart = activitySummary.totalProductsAddedToCart || 0;

            const categoryPreferences = categoryPrefs.map(c => ({
                _id: c._id,
                category: c.category?.name || c.category,
                interactionCount: c.interactionCount,
                totalViewDuration: c.totalViewDuration
            }));

            const userState = {
                totalPurchases,
                averageOrderValue,
                averageRating: ratingData.averageRating || 0,
                totalReviews: ratingData.totalReviews || 0,
                categoryPreferences,
                topCategoryId: categoryPreferences.length > 0 ? categoryPreferences[0]._id : null,
                recentInteractions,
                lastVisitDaysAgo,
                daysSinceLastPurchase,
                totalVisits,
                conversionRate: totalAddedToCart > 0 
                    ? totalPurchases / totalAddedToCart 
                    : 0,
                normalized: {
                    recency_norm: Math.min(lastVisitDaysAgo / 365, 1),
                    frequency_norm: Math.min(totalVisits / 100, 1),
                    monetary_norm: Math.min(averageOrderValue / 5000000, 1),
                    engagement_norm: Math.min(recentInteractions / 100, 1)
                }
            };

            return userState;
        } catch (error) {
            throw error;
        }
    }

    // Lấy recommendations history của user
    static async getUserRecommendations({ userId, limit = 10 }) {
        try {
            const recommendations = await RLRecommendation.find({ userId })
                .populate('recommendedProducts.productId')
                .sort({ createdAt: -1 })
                .limit(limit);

            return recommendations;
        } catch (error) {
            throw error;
        }
    }

    // Lấy performance metrics của recommendation system
    static async getRecommendationMetrics({ startDate, endDate, modelVersion = null }) {
        try {
            const matchQuery = {};

            if (startDate || endDate) {
                matchQuery.createdAt = {};
                if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
                if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
            }

            if (modelVersion) {
                matchQuery.modelVersion = modelVersion;
            }

            const metrics = await RLRecommendation.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: null,
                        totalRecommendations: { $sum: 1 },
                        recommendationsWithInteraction: {
                            $sum: { $cond: ['$feedback.hasInteraction', 1, 0] }
                        },
                        totalClicks: { $sum: { $size: '$feedback.clickedProducts' } },
                        totalAddToCarts: { $sum: { $size: '$feedback.addedToCartProducts' } },
                        totalPurchases: { $sum: { $size: '$feedback.purchasedProducts' } },
                        averageReward: { $avg: '$reward' },
                        totalReward: { $sum: '$reward' }
                    }
                }
            ]);

            if (metrics.length === 0) {
                return {
                    totalRecommendations: 0,
                    interactionRate: 0,
                    clickThroughRate: 0,
                    addToCartRate: 0,
                    conversionRate: 0,
                    averageReward: 0,
                    totalReward: 0
                };
            }

            const result = metrics[0];

            return {
                totalRecommendations: result.totalRecommendations,
                interactionRate: result.totalRecommendations > 0 
                    ? result.recommendationsWithInteraction / result.totalRecommendations 
                    : 0,
                clickThroughRate: result.totalRecommendations > 0 
                    ? result.totalClicks / result.totalRecommendations 
                    : 0,
                addToCartRate: result.totalClicks > 0 
                    ? result.totalAddToCarts / result.totalClicks 
                    : 0,
                conversionRate: result.totalAddToCarts > 0 
                    ? result.totalPurchases / result.totalAddToCarts 
                    : 0,
                averageReward: result.averageReward || 0,
                totalReward: result.totalReward || 0,
                totalClicks: result.totalClicks,
                totalAddToCarts: result.totalAddToCarts,
                totalPurchases: result.totalPurchases
            };
        } catch (error) {
            throw error;
        }
    }

    // Chuẩn bị training data cho PPO model
    static async prepareTrainingData({ limit = 1000, minInteractions = 5 }) {
        try {
            // Lấy recommendations có feedback
            const recommendations = await RLRecommendation.find({
                'feedback.hasInteraction': true
            })
                .populate('recommendedProducts.productId')
                .sort({ createdAt: -1 })
                .limit(limit);

            const trainingData = [];

            for (const rec of recommendations) {
                // State: user state tại thời điểm recommendation
                const state = {
                    totalPurchases: rec.userState.totalPurchases || 0,
                    averageRating: rec.userState.averageRating || 0,
                    recentInteractions: rec.userState.recentInteractions || 0,
                    lastVisitDaysAgo: rec.userState.lastVisitDaysAgo || 0,
                    categoryPreferences: rec.userState.categoryPreferences || []
                };

                // Action: products được recommend
                const action = rec.recommendedProducts.map(p => ({
                    productId: p.productId._id.toString(),
                    score: p.score,
                    rank: p.rank
                }));

                // Reward: đã tính sẵn
                const reward = rec.reward;

                // Next state: có thể lấy từ recommendation tiếp theo
                // (để đơn giản, bỏ qua hoặc tính sau)

                trainingData.push({
                    state,
                    action,
                    reward,
                    timestamp: rec.createdAt,
                    hasInteraction: rec.feedback.hasInteraction
                });
            }

            return trainingData;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Ghi nhận feedback cho recommendation dựa trên hành động thực tế của user
     */
    static async recordFeedbackFromInteraction({ userId, productId, interactionType }) {
        try {
            if (!['click', 'add_to_cart', 'purchase'].includes(interactionType)) {
                return;
            }

            console.log('[RL] recordFeedbackFromInteraction', { userId, productId, interactionType });

            const recommendation = await RLRecommendation.findOne({
                userId: new mongoose.Types.ObjectId(userId),
                'recommendedProducts.productId': new mongoose.Types.ObjectId(productId)
            })
                .sort({ createdAt: -1 })
                .lean();

            if (!recommendation) {
                console.log('[RL] No recommendation found for feedback', { userId, productId, interactionType });
                return;
            }

            const recommendedEntry = recommendation.recommendedProducts.find(
                (item) => item.productId.toString() === productId.toString()
            );

            console.log('[RL] Found recommendation for feedback', {
                recommendationId: recommendation._id,
                rank: recommendedEntry?.rank || null,
                interactionType
            });

            const rank = recommendedEntry?.rank || null;

            await this.updateFeedback({
                recommendationId: recommendation._id,
                feedbackType: interactionType,
                productId,
                rank
            });
        } catch (error) {
            console.error('Error recording recommendation feedback from interaction:', error);
        }
    }
}

module.exports = RLRecommendationService;

