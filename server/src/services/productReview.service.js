const ProductReview = require('../models/productReview.model');
const Product = require('../models/product.model');
const Payment = require('../models/payment.model');
const { BadRequestError, NotFoundError } = require('../core/error.response');

class ProductReviewService {
    // Tạo đánh giá mới
    static async createReview({
        userId,
        productId,
        paymentId,
        rating,
        detailedRating = {},
        comment = '',
        images = []
    }) {
        try {
            // Kiểm tra product tồn tại
            const product = await Product.findById(productId);
            if (!product) {
                throw new NotFoundError('Product not found');
            }

            // Kiểm tra payment tồn tại và thuộc về user
            const payment = await Payment.findOne({
                _id: paymentId,
                userId: userId,
                status: 'delivered' // Chỉ cho phép đánh giá khi đã nhận hàng
            });

            if (!payment) {
                throw new BadRequestError('Invalid payment or order not delivered yet');
            }

            // Kiểm tra user đã mua sản phẩm này chưa
            const hasPurchased = payment.products.some(
                p => p.productId.toString() === productId.toString()
            );

            if (!hasPurchased) {
                throw new BadRequestError('You have not purchased this product');
            }

            // Kiểm tra đã đánh giá chưa
            const existingReview = await ProductReview.findOne({
                userId,
                productId,
                paymentId
            });

            if (existingReview) {
                throw new BadRequestError('You have already reviewed this product for this order');
            }

            // Tạo review
            const review = await ProductReview.create({
                userId,
                productId,
                paymentId,
                rating,
                detailedRating,
                comment,
                images,
                isVerifiedPurchase: true
            });

            return review;
        } catch (error) {
            throw error;
        }
    }

    // Cập nhật review
    static async updateReview({ reviewId, userId, rating, detailedRating, comment, images }) {
        try {
            const review = await ProductReview.findOne({
                _id: reviewId,
                userId: userId
            });

            if (!review) {
                throw new NotFoundError('Review not found');
            }

            // Cập nhật các field
            if (rating) review.rating = rating;
            if (detailedRating) review.detailedRating = { ...review.detailedRating, ...detailedRating };
            if (comment !== undefined) review.comment = comment;
            if (images) review.images = images;

            await review.save();

            return review;
        } catch (error) {
            throw error;
        }
    }

    // Lấy reviews của sản phẩm
    static async getProductReviews({ productId, status = 'approved', limit = 20, skip = 0, sortBy = 'createdAt' }) {
        try {
            const query = { productId, status };

            const reviews = await ProductReview.find(query)
                .populate('userId', 'fullName avatar')
                .sort({ [sortBy]: -1 })
                .skip(skip)
                .limit(limit);

            const total = await ProductReview.countDocuments(query);

            // Tính rating trung bình
            const avgRating = await ProductReview.aggregate([
                { $match: { productId: productId, status: 'approved' } },
                {
                    $group: {
                        _id: null,
                        averageRating: { $avg: '$rating' },
                        totalReviews: { $sum: 1 },
                        ratingDistribution: {
                            $push: '$rating'
                        }
                    }
                }
            ]);

            // Tính phân bố rating (1-5 sao)
            const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            if (avgRating.length > 0) {
                avgRating[0].ratingDistribution.forEach(r => {
                    ratingCounts[r] = (ratingCounts[r] || 0) + 1;
                });
            }

            return {
                reviews,
                total,
                averageRating: avgRating.length > 0 ? avgRating[0].averageRating : 0,
                totalReviews: avgRating.length > 0 ? avgRating[0].totalReviews : 0,
                ratingDistribution: ratingCounts
            };
        } catch (error) {
            throw error;
        }
    }

    // Lấy reviews của user
    static async getUserReviews({ userId, limit = 20, skip = 0 }) {
        try {
            const reviews = await ProductReview.find({ userId })
                .populate('productId', 'name colors price')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            const total = await ProductReview.countDocuments({ userId });

            return {
                reviews,
                total
            };
        } catch (error) {
            throw error;
        }
    }

    // Lấy average rating của user (cho RL model)
    static async getUserAverageRating({ userId }) {
        try {
            const result = await ProductReview.aggregate([
                { $match: { userId: userId, status: 'approved' } },
                {
                    $group: {
                        _id: null,
                        averageRating: { $avg: '$rating' },
                        totalReviews: { $sum: 1 }
                    }
                }
            ]);

            return result.length > 0 ? result[0] : { averageRating: 0, totalReviews: 0 };
        } catch (error) {
            throw error;
        }
    }

    // Admin approve/reject review
    static async updateReviewStatus({ reviewId, status }) {
        try {
            const review = await ProductReview.findByIdAndUpdate(
                reviewId,
                { status },
                { new: true }
            );

            if (!review) {
                throw new NotFoundError('Review not found');
            }

            return review;
        } catch (error) {
            throw error;
        }
    }

    // Mark review as helpful
    static async markHelpful({ reviewId }) {
        try {
            const review = await ProductReview.findByIdAndUpdate(
                reviewId,
                { $inc: { helpfulCount: 1 } },
                { new: true }
            );

            if (!review) {
                throw new NotFoundError('Review not found');
            }

            return review;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = ProductReviewService;

