/**
 * Test Controller for PPO Recommendation System
 * Chỉ sử dụng trong môi trường development
 */

const SampleDataGenerator = require('../utils/sampleDataGenerator');
const RecommendationService = require('../services/recommendation.service');
const RLRecommendationService = require('../services/rlRecommendation.service');
const { OK } = require('../core/success.response');
const { BadRequestError } = require('../core/error.response');

class TestController {
    /**
     * Generate sample data for testing
     * POST /api/test/generate-sample-data
     */
    async generateSampleData(req, res, next) {
        try {
            // Only allow in development
            if (process.env.NODE_ENV === 'production') {
                throw new BadRequestError('This endpoint is only available in development mode');
            }

            const { numUsers, numInteractionsPerUser } = req.query;

            const stats = await SampleDataGenerator.generateSampleData({
                numUsers: parseInt(numUsers) || 50,
                numInteractionsPerUser: parseInt(numInteractionsPerUser) || 20,
            });

            new OK({
                message: 'Sample data generated successfully',
                metadata: stats,
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Clean sample data
     * DELETE /api/test/clean-sample-data
     */
    async cleanSampleData(req, res, next) {
        try {
            // Only allow in development
            if (process.env.NODE_ENV === 'production') {
                throw new BadRequestError('This endpoint is only available in development mode');
            }

            await SampleDataGenerator.cleanSampleData();

            new OK({
                message: 'Sample data cleaned successfully',
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Test recommendation flow
     * GET /api/test/recommendation-flow/:userId
     */
    async testRecommendationFlow(req, res, next) {
        try {
            const { userId } = req.params;
            const sessionId = `test_session_${Date.now()}`;

            // 1. Get user state
            const userState = await RLRecommendationService.getUserState({ userId });

            // 2. Get recommendations
            const recommendations = await RecommendationService.getPersonalizedRecommendations({
                userId,
                sessionId,
                limit: 10,
            });

            // 3. Get metrics
            const metrics = await RLRecommendationService.getRecommendationMetrics({});

            new OK({
                message: 'Recommendation flow test completed',
                metadata: {
                    userState,
                    recommendations,
                    metrics,
                },
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Test training flow
     * POST /api/test/training-flow
     */
    async testTrainingFlow(req, res, next) {
        try {
            const { limit, minInteractions } = req.query;

            // 1. Get metrics before training
            const metricsBefore = await RLRecommendationService.getRecommendationMetrics({});

            // 2. Train model
            const trainingResult = await RecommendationService.trainModel({
                limit: parseInt(limit) || 100,
                minInteractions: parseInt(minInteractions) || 5,
            });

            // 3. Get metrics after training
            const metricsAfter = await RLRecommendationService.getRecommendationMetrics({});

            new OK({
                message: 'Training flow test completed',
                metadata: {
                    metricsBefore,
                    trainingResult,
                    metricsAfter,
                    improvement: {
                        avgReward:
                            ((metricsAfter.averageReward - metricsBefore.averageReward) /
                                (metricsBefore.averageReward || 1)) *
                            100,
                        ctr:
                            ((metricsAfter.clickThroughRate - metricsBefore.clickThroughRate) /
                                (metricsBefore.clickThroughRate || 1)) *
                            100,
                    },
                },
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get system health check
     * GET /api/test/health
     */
    async healthCheck(req, res, next) {
        try {
            const User = require('../models/users.model');
            const Product = require('../models/product.model');
            const UserInteraction = require('../models/userInteraction.model');
            const UserActivity = require('../models/userActivity.model');
            const ProductReview = require('../models/productReview.model');
            const Payment = require('../models/payment.model');
            const RLRecommendation = require('../models/rlRecommendation.model');

            const [
                userCount,
                productCount,
                interactionCount,
                activityCount,
                reviewCount,
                paymentCount,
                recommendationCount,
            ] = await Promise.all([
                User.countDocuments(),
                Product.countDocuments(),
                UserInteraction.countDocuments(),
                UserActivity.countDocuments(),
                ProductReview.countDocuments(),
                Payment.countDocuments(),
                RLRecommendation.countDocuments(),
            ]);

            const health = {
                status: 'healthy',
                database: {
                    users: userCount,
                    products: productCount,
                    interactions: interactionCount,
                    activities: activityCount,
                    reviews: reviewCount,
                    payments: paymentCount,
                    recommendations: recommendationCount,
                },
                readyForTraining: interactionCount >= 50 && userCount >= 10,
                recommendations: {
                    total: recommendationCount,
                    withFeedback: await RLRecommendation.countDocuments({ 'feedback.hasInteraction': true }),
                },
            };

            new OK({
                message: 'System health check completed',
                metadata: health,
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Compare recommendation methods
     * GET /api/test/compare-methods/:userId
     */
    async compareRecommendationMethods(req, res, next) {
        try {
            const { userId } = req.params;
            const sessionId = `test_session_${Date.now()}`;

            // 1. PPO recommendations
            const ppoRecs = await RecommendationService.getPersonalizedRecommendations({
                userId,
                sessionId,
                limit: 10,
            });

            // 2. Trending recommendations
            const trendingRecs = await RecommendationService.getTrendingProducts({
                limit: 10,
                days: 7,
            });

            // 3. Cold start recommendations
            const coldStartRecs = await RecommendationService.getColdStartRecommendations({
                limit: 10,
            });

            new OK({
                message: 'Recommendation methods comparison completed',
                metadata: {
                    ppo: {
                        method: 'ppo',
                        count: ppoRecs.recommendations.length,
                        avgScore:
                            ppoRecs.recommendations.reduce((sum, r) => sum + r.score, 0) /
                            ppoRecs.recommendations.length,
                        recommendations: ppoRecs.recommendations.slice(0, 5), // Top 5
                    },
                    trending: {
                        method: 'trending',
                        count: trendingRecs.length,
                        recommendations: trendingRecs.slice(0, 5), // Top 5
                    },
                    coldStart: {
                        method: 'cold_start',
                        count: coldStartRecs.length,
                        recommendations: coldStartRecs.slice(0, 5), // Top 5
                    },
                },
            }).send(res);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new TestController();
