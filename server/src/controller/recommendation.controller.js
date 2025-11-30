const RecommendationService = require('../services/recommendation.service');
const RLRecommendationService = require('../services/rlRecommendation.service');
const DatasetPreparationService = require('../services/datasetPreparation.service');
const Product = require('../models/product.model');
const { OK } = require('../core/success.response');
const { BadRequestError } = require('../core/error.response');

class RecommendationController {
    /**
     * Get personalized recommendations for user using PPO
     * Falls back to trending/cold-start for guest users
     */
    async getPersonalizedRecommendations(req, res, next) {
        try {
            console.log('\n🌐 === NEW RECOMMENDATION REQUEST ===');
            console.log('📋 Request info:', {
                cookies: Object.keys(req.cookies || {}),
                hasToken: !!req.cookies?.token,
                hasUser: !!req.user,
                userFromToken: req.user,
            });

            const userId = req.user?._id || req.user?.id;
            const { limit } = req.query;
            const nRecommendations = parseInt(limit) || 10;

            console.log('👤 Extracted userId:', userId?.toString());

            // If no userId, return trending products (fallback for guest users)
            if (!userId) {
                const trending = await RecommendationService.getTrendingProducts({
                    userId: null, // Global trending cho guest users
                    limit: nRecommendations,
                    days: 7,
                });

                const trendingProducts = trending.map((t) => t.product);

                return new OK({
                    message: 'Get recommendations successfully (guest user)',
                    metadata: {
                        products: trendingProducts,
                        recommendations: trending.map((product, index) => ({
                            product,
                            score: 1.0 / (index + 1),
                            rank: index + 1,
                            reason: 'Trending product',
                        })),
                        method: 'trending',
                        isGuest: true,
                    },
                }).send(res);
            }

            const sessionId = req.headers['x-session-id'] || `session_${Date.now()}`;

            // Get recommendations using PPO for logged-in users
            const result = await RecommendationService.getPersonalizedRecommendations({
                userId,
                sessionId,
                limit: nRecommendations,
            });

            // Nếu user chưa có recommendations (chưa xem sản phẩm nào) → trả về rỗng
            if (!result || result.length === 0) {
                console.log('⚠️  User chưa có interactions → trả về empty recommendations');

                return new OK({
                    message: 'Chưa có gợi ý - Hãy khám phá sản phẩm để nhận gợi ý cá nhân hóa',
                    metadata: {
                        products: [],
                        recommendations: [],
                        method: 'none',
                        userId: userId.toString(),
                        userEmail: req.user?.email || 'N/A',
                        isEmpty: true,
                        isNewUser: true,
                    },
                }).send(res);
            }

            // Set no-cache headers
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');

            console.log('✅ Returning personalized recommendations for user:', userId.toString());
            console.log('🌐 === END RECOMMENDATION REQUEST ===\n');

            new OK({
                message: 'Get personalized recommendations successfully',
                metadata: {
                    products: result,
                    recommendations: result,
                    method: 'ppo',
                    sessionId,
                    userId: userId.toString(),
                    userEmail: req.user?.email || 'N/A',
                    isPersonalized: true,
                    timestamp: new Date().toISOString(),
                },
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get fallback recommendations (when RL service is down)
     */
    async getFallbackRecommendations(userId, limit = 10) {
        try {
            // Strategy 1: Get popular products
            const popularProducts = await Product.find({ status: 'active' })
                .populate('category')
                .sort({ isFeatured: -1, createdAt: -1 })
                .limit(limit);

            return popularProducts.map((product, index) => ({
                productId: product._id,
                product: product,
                score: 1.0 / (index + 1),
                rank: index + 1,
                reason: 'Popular product',
            }));
        } catch (error) {
            console.error('Error getting fallback recommendations:', error);
            return [];
        }
    }

    /**
     * Get trending products (personalized if user is logged in)
     */
    async getTrendingProducts(req, res, next) {
        try {
            const { limit, days } = req.query;
            const userId = req.user?._id || req.user?.id; // Optional userId

            const trending = await RecommendationService.getTrendingProducts({
                userId, // Truyền userId để personalized
                limit: parseInt(limit) || 10,
                days: parseInt(days) || 7,
            });

            new OK({
                message: 'Get trending products successfully',
                metadata: {
                    products: trending.map((t) => t.product),
                    trending,
                    isPersonalized: !!userId && trending.some((t) => t.isPersonalized),
                },
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get similar products
     */
    async getSimilarProducts(req, res, next) {
        try {
            const { productId } = req.params;
            const { limit } = req.query;

            const similar = await RecommendationService.getSimilarProducts({
                productId,
                limit: parseInt(limit) || 10,
            });

            new OK({
                message: 'Get similar products successfully',
                metadata: { similar },
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get cold start recommendations (for new users)
     */
    async getColdStartRecommendations(req, res, next) {
        try {
            const { limit } = req.query;

            const recommendations = await RecommendationService.getColdStartRecommendations({
                limit: parseInt(limit) || 10,
            });

            new OK({
                message: 'Get cold start recommendations successfully',
                metadata: { recommendations },
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get category-based recommendations
     */
    async getCategoryRecommendations(req, res, next) {
        try {
            const { categoryId } = req.params;
            const { limit } = req.query;
            const userId = req.user?._id;

            const recommendations = await RecommendationService.getCategoryRecommendations({
                userId,
                categoryId,
                limit: parseInt(limit) || 10,
            });

            new OK({
                message: 'Get category recommendations successfully',
                metadata: { recommendations },
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get bundle recommendations
     */
    async getBundleRecommendations(req, res, next) {
        try {
            const userId = req.user._id;
            const { limit } = req.query;

            const bundles = await RecommendationService.getBundleRecommendations({
                userId,
                limit: parseInt(limit) || 3,
            });

            new OK({
                message: 'Get bundle recommendations successfully',
                metadata: { bundles },
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get user state for debugging
     */
    async getUserState(req, res, next) {
        try {
            const userId = req.user._id;

            const userState = await RLRecommendationService.getUserState({ userId });

            new OK({
                message: 'Get user state successfully',
                metadata: userState,
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Track recommendation feedback
     */
    async trackFeedback(req, res, next) {
        try {
            const { recommendationId, feedbackType, productId, rank } = req.body;

            if (!recommendationId || !feedbackType || !productId) {
                throw new BadRequestError('Missing required fields');
            }

            const recommendation = await RLRecommendationService.updateFeedback({
                recommendationId,
                feedbackType,
                productId,
                rank,
            });

            new OK({
                message: 'Feedback tracked successfully',
                metadata: recommendation,
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Train PPO model (Admin)
     */
    async trainModel(req, res, next) {
        try {
            const { limit, minInteractions } = req.query;

            const result = await RecommendationService.trainModel({
                limit: parseInt(limit) || 1000,
                minInteractions: parseInt(minInteractions) || 5,
            });

            new OK({
                message: result.success ? 'Model trained successfully' : 'Training failed',
                metadata: result,
                statusCode: 200,
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Evaluate model performance (Admin)
     */
    async evaluateModel(req, res, next) {
        try {
            const { startDate, endDate } = req.query;

            const evaluation = await RecommendationService.evaluateModel({
                startDate,
                endDate,
            });

            new OK({
                message: 'Model evaluation completed',
                metadata: evaluation,
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Prepare full dataset (Admin)
     */
    async prepareDataset(req, res, next) {
        try {
            const { startDate, endDate, minUserInteractions, format } = req.query;

            if (format === 'csv') {
                // Export to CSV
                const path = require('path');
                const outputPath = path.join(__dirname, `../../dataset_${Date.now()}.csv`);

                await DatasetPreparationService.exportToCSV({ outputPath });

                new OK({
                    message: 'Dataset exported to CSV successfully',
                    metadata: {
                        outputPath,
                        format: 'csv',
                    },
                }).send(res);
            } else {
                // Prepare JSON dataset
                const result = await DatasetPreparationService.prepareFullDataset({
                    startDate,
                    endDate,
                    minUserInteractions: parseInt(minUserInteractions) || 5,
                });

                new OK({
                    message: 'Dataset prepared successfully',
                    metadata: {
                        totalUsers: result.metadata.totalUsers,
                        statistics: result.statistics,
                        metadata: result.metadata,
                    },
                }).send(res);
            }
        } catch (error) {
            next(error);
        }
    }

    /**
     * Download dataset (Admin)
     */
    async downloadDataset(req, res, next) {
        try {
            const { startDate, endDate, minUserInteractions } = req.query;

            const result = await DatasetPreparationService.prepareFullDataset({
                startDate,
                endDate,
                minUserInteractions: parseInt(minUserInteractions) || 5,
            });

            // Send as downloadable file
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="dataset_${Date.now()}.json"`);
            res.send(JSON.stringify(result, null, 2));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get recommendation statistics (Admin)
     */
    async getStatistics(req, res, next) {
        try {
            const { startDate, endDate, modelVersion } = req.query;

            const metrics = await RLRecommendationService.getRecommendationMetrics({
                startDate,
                endDate,
                modelVersion,
            });

            new OK({
                message: 'Get statistics successfully',
                metadata: metrics,
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get model info (Admin)
     */
    async getModelInfo(req, res, next) {
        try {
            const evaluation = await RecommendationService.evaluateModel({});

            new OK({
                message: 'Get model info successfully',
                metadata: evaluation,
            }).send(res);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new RecommendationController();
