const UserInteraction = require('../models/userInteraction.model');
const Product = require('../models/product.model');
const { BadRequestError } = require('../core/error.response');

class UserInteractionService {
    // Ghi nhận tương tác của user với sản phẩm
    static async trackInteraction({ userId, productId, interactionType, viewDuration = 0, sessionId, metadata = {} }) {
        try {
            // Kiểm tra product tồn tại
            const product = await Product.findById(productId).populate('category');
            if (!product) {
                throw new BadRequestError('Product not found');
            }

            // Thêm category vào metadata nếu chưa có
            if (!metadata.categoryId && product.category) {
                metadata.categoryId = product.category._id;
                metadata.price = product.price;
                metadata.discount = product.discount;
            }

            // Tạo interaction record
            const interaction = await UserInteraction.create({
                userId,
                productId,
                interactionType,
                viewDuration,
                sessionId,
                metadata
            });

            return interaction;
        } catch (error) {
            throw error;
        }
    }

    // Lấy lịch sử tương tác của user
    static async getUserInteractions({ userId, limit = 100, interactionType = null, startDate = null, endDate = null }) {
        try {
            const query = { userId };

            if (interactionType) {
                query.interactionType = interactionType;
            }

            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate) query.createdAt.$gte = new Date(startDate);
                if (endDate) query.createdAt.$lte = new Date(endDate);
            }

            const interactions = await UserInteraction.find(query)
                .populate('productId')
                .populate('metadata.categoryId')
                .sort({ createdAt: -1 })
                .limit(limit);

            return interactions;
        } catch (error) {
            throw error;
        }
    }

    // Thống kê tương tác theo sản phẩm
    static async getProductInteractionStats({ productId, startDate = null, endDate = null }) {
        try {
            const matchQuery = { productId };

            if (startDate || endDate) {
                matchQuery.createdAt = {};
                if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
                if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
            }

            const stats = await UserInteraction.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: '$interactionType',
                        count: { $sum: 1 },
                        totalViewDuration: { $sum: '$viewDuration' },
                        uniqueUsers: { $addToSet: '$userId' }
                    }
                },
                {
                    $project: {
                        interactionType: '$_id',
                        count: 1,
                        totalViewDuration: 1,
                        uniqueUserCount: { $size: '$uniqueUsers' }
                    }
                }
            ]);

            return stats;
        } catch (error) {
            throw error;
        }
    }

    // Lấy sản phẩm thường xem của user (cho RL model)
    static async getUserFrequentProducts({ userId, limit = 20, days = 30 }) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const frequentProducts = await UserInteraction.aggregate([
                {
                    $match: {
                        userId: userId,
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: '$productId',
                        interactionCount: { $sum: 1 },
                        totalViewDuration: { $sum: '$viewDuration' },
                        lastInteraction: { $max: '$createdAt' },
                        interactionTypes: { $addToSet: '$interactionType' }
                    }
                },
                {
                    $sort: { interactionCount: -1, totalViewDuration: -1 }
                },
                { $limit: limit },
                {
                    $lookup: {
                        from: 'products',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                { $unwind: '$product' }
            ]);

            return frequentProducts;
        } catch (error) {
            throw error;
        }
    }

    // Lấy category preferences của user (cho RL model)
    static async getUserCategoryPreferences({ userId, days = 90 }) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const categoryPrefs = await UserInteraction.aggregate([
                {
                    $match: {
                        userId: userId,
                        createdAt: { $gte: startDate },
                        'metadata.categoryId': { $exists: true }
                    }
                },
                {
                    $group: {
                        _id: '$metadata.categoryId',
                        interactionCount: { $sum: 1 },
                        totalViewDuration: { $sum: '$viewDuration' }
                    }
                },
                {
                    $sort: { interactionCount: -1 }
                },
                {
                    $lookup: {
                        from: 'categories',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'category'
                    }
                },
                { $unwind: '$category' }
            ]);

            return categoryPrefs;
        } catch (error) {
            throw error;
        }
    }

    // Lấy purchase history của user
    static async getUserPurchaseHistory({ userId, limit = 50 }) {
        try {
            const purchases = await UserInteraction.find({
                userId,
                interactionType: 'purchase'
            })
                .populate('productId')
                .populate('metadata.categoryId')
                .sort({ createdAt: -1 })
                .limit(limit);

            return purchases;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = UserInteractionService;

