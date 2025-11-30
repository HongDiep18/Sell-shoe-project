const ProductReviewService = require('../services/productReview.service');
const { SuccessResponse } = require('../core/success.response');
const { BadRequestError } = require('../core/error.response');

class ProductReviewController {
    // Create review
    async createReview(req, res, next) {
        try {
            const { productId, paymentId, rating, detailedRating, comment, images } = req.body;
            const userId = req.user._id;

            if (!productId || !paymentId || !rating) {
                throw new BadRequestError('Missing required fields');
            }

            const review = await ProductReviewService.createReview({
                userId,
                productId,
                paymentId,
                rating,
                detailedRating,
                comment,
                images
            });

            new SuccessResponse({
                message: 'Review created successfully',
                metadata: review,
                statusCode: 201
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    // Update review
    async updateReview(req, res, next) {
        try {
            const { reviewId } = req.params;
            const { rating, detailedRating, comment, images } = req.body;
            const userId = req.user._id;

            const review = await ProductReviewService.updateReview({
                reviewId,
                userId,
                rating,
                detailedRating,
                comment,
                images
            });

            new SuccessResponse({
                message: 'Review updated successfully',
                metadata: review
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    // Get product reviews
    async getProductReviews(req, res, next) {
        try {
            const { productId } = req.params;
            const { status, limit, skip, sortBy } = req.query;

            const result = await ProductReviewService.getProductReviews({
                productId,
                status: status || 'approved',
                limit: parseInt(limit) || 20,
                skip: parseInt(skip) || 0,
                sortBy: sortBy || 'createdAt'
            });

            new SuccessResponse({
                message: 'Get product reviews successfully',
                metadata: result
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    // Get user reviews
    async getUserReviews(req, res, next) {
        try {
            const userId = req.user._id;
            const { limit, skip } = req.query;

            const result = await ProductReviewService.getUserReviews({
                userId,
                limit: parseInt(limit) || 20,
                skip: parseInt(skip) || 0
            });

            new SuccessResponse({
                message: 'Get user reviews successfully',
                metadata: result
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    // Get user average rating
    async getUserAverageRating(req, res, next) {
        try {
            const userId = req.user._id;

            const result = await ProductReviewService.getUserAverageRating({ userId });

            new SuccessResponse({
                message: 'Get user average rating successfully',
                metadata: result
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    // Admin: Update review status
    async updateReviewStatus(req, res, next) {
        try {
            const { reviewId } = req.params;
            const { status } = req.body;

            if (!['pending', 'approved', 'rejected'].includes(status)) {
                throw new BadRequestError('Invalid status');
            }

            const review = await ProductReviewService.updateReviewStatus({
                reviewId,
                status
            });

            new SuccessResponse({
                message: 'Review status updated successfully',
                metadata: review
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    // Mark review as helpful
    async markHelpful(req, res, next) {
        try {
            const { reviewId } = req.params;

            const review = await ProductReviewService.markHelpful({ reviewId });

            new SuccessResponse({
                message: 'Review marked as helpful',
                metadata: review
            }).send(res);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ProductReviewController();

