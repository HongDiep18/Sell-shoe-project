const UserInteractionService = require('../services/userInteraction.service');
const { OK } = require('../core/success.response');
const { BadRequestError } = require('../core/error.response');
const RLRecommendationService = require('../services/rlRecommendation.service');

class UserInteractionController {
    // Track interaction
    async trackInteraction(req, res, next) {
        try {
            const { productId, interactionType, viewDuration, sessionId, metadata } = req.body;
            const userId = req.user?._id || req.user?.id;

            // Skip tracking for guest users
            if (!userId) {
                new OK({
                    message: 'Interaction tracking skipped (guest user)',
                    metadata: null
                }).send(res);
                return;
            }

            if (!productId || !interactionType) {
                throw new BadRequestError('Missing required fields: productId, interactionType');
            }

            // Generate sessionId if not provided
            const finalSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const interaction = await UserInteractionService.trackInteraction({
                userId,
                productId,
                interactionType,
                viewDuration: viewDuration || 0,
                sessionId: finalSessionId,
                metadata: metadata || {}
            });

            // Đồng bộ feedback cho hệ thống recommendation nếu là hành động quan trọng
            try {
                await RLRecommendationService.recordFeedbackFromInteraction({
                    userId,
                    productId,
                    interactionType
                });
            } catch (feedbackError) {
                console.error('Error syncing recommendation feedback:', feedbackError);
            }

            new OK({
                message: 'Interaction tracked successfully',
                metadata: interaction
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    // Get user interactions
    async getUserInteractions(req, res, next) {
        try {
            const userId = req.user._id;
            const { limit, interactionType, startDate, endDate } = req.query;

            const interactions = await UserInteractionService.getUserInteractions({
                userId,
                limit: parseInt(limit) || 100,
                interactionType,
                startDate,
                endDate
            });

            new OK({
                message: 'Get user interactions successfully',
                metadata: interactions
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    // Get product interaction stats
    async getProductStats(req, res, next) {
        try {
            const { productId } = req.params;
            const { startDate, endDate } = req.query;

            const stats = await UserInteractionService.getProductInteractionStats({
                productId,
                startDate,
                endDate
            });

            new OK({
                message: 'Get product stats successfully',
                metadata: stats
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    // Get user frequent products
    async getUserFrequentProducts(req, res, next) {
        try {
            const userId = req.user._id;
            const { limit, days } = req.query;

            const products = await UserInteractionService.getUserFrequentProducts({
                userId,
                limit: parseInt(limit) || 20,
                days: parseInt(days) || 30
            });

            new OK({
                message: 'Get frequent products successfully',
                metadata: products
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    // Get user category preferences
    async getUserCategoryPreferences(req, res, next) {
        try {
            const userId = req.user._id;
            const { days } = req.query;

            const preferences = await UserInteractionService.getUserCategoryPreferences({
                userId,
                days: parseInt(days) || 90
            });

            new OK({
                message: 'Get category preferences successfully',
                metadata: preferences
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    // Get user purchase history
    async getUserPurchaseHistory(req, res, next) {
        try {
            const userId = req.user._id;
            const { limit } = req.query;

            const purchases = await UserInteractionService.getUserPurchaseHistory({
                userId,
                limit: parseInt(limit) || 50
            });

            new OK({
                message: 'Get purchase history successfully',
                metadata: purchases
            }).send(res);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new UserInteractionController();

