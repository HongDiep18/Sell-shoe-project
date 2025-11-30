const RLRecommendationService = require('../services/rlRecommendation.service');
const { OK } = require('../core/success.response');
const { BadRequestError } = require('../core/error.response');

class RLRecommendationController {
    // Save recommendation
    async saveRecommendation(req, res, next) {
        try {
            const { recommendedProducts, modelVersion, sessionId } = req.body;
            const userId = req.user._id;

            if (!recommendedProducts || !modelVersion || !sessionId) {
                throw new BadRequestError('Missing required fields');
            }

            // Get user state
            const userState = await RLRecommendationService.getUserState({ userId });

            const recommendation = await RLRecommendationService.saveRecommendation({
                userId,
                recommendedProducts,
                modelVersion,
                userState,
                sessionId
            });

            new OK({
                message: 'Recommendation saved successfully',
                metadata: recommendation,
                statusCode: 201
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    // Update recommendation feedback
    async updateFeedback(req, res, next) {
        try {
            const { recommendationId } = req.params;
            const { feedbackType, productId, rank } = req.body;

            if (!feedbackType || !productId) {
                throw new BadRequestError('Missing required fields');
            }

            if (!['click', 'purchase', 'add_to_cart'].includes(feedbackType)) {
                throw new BadRequestError('Invalid feedback type');
            }

            const recommendation = await RLRecommendationService.updateFeedback({
                recommendationId,
                feedbackType,
                productId,
                rank
            });

            new OK({
                message: 'Feedback updated successfully',
                metadata: recommendation
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    // Get user state
    async getUserState(req, res, next) {
        try {
            const userId = req.user._id;

            const userState = await RLRecommendationService.getUserState({ userId });

            new OK({
                message: 'Get user state successfully',
                metadata: userState
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    // Get user recommendations history
    async getUserRecommendations(req, res, next) {
        try {
            const userId = req.user._id;
            const { limit } = req.query;

            const recommendations = await RLRecommendationService.getUserRecommendations({
                userId,
                limit: parseInt(limit) || 10
            });

            new OK({
                message: 'Get user recommendations successfully',
                metadata: recommendations
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    // Get recommendation metrics (Admin)
    async getRecommendationMetrics(req, res, next) {
        try {
            const { startDate, endDate, modelVersion } = req.query;

            const metrics = await RLRecommendationService.getRecommendationMetrics({
                startDate,
                endDate,
                modelVersion
            });

            new OK({
                message: 'Get recommendation metrics successfully',
                metadata: metrics
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    // Prepare training data (Admin)
    async prepareTrainingData(req, res, next) {
        try {
            const { limit, minInteractions } = req.query;

            const trainingData = await RLRecommendationService.prepareTrainingData({
                limit: parseInt(limit) || 1000,
                minInteractions: parseInt(minInteractions) || 5
            });

            new OK({
                message: 'Training data prepared successfully',
                metadata: {
                    count: trainingData.length,
                    data: trainingData
                }
            }).send(res);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new RLRecommendationController();

