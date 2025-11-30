const Payment = require('../models/payment.model');
const ProductReview = require('../models/productReview.model');
const UserActivity = require('../models/userActivity.model');
const UserInteraction = require('../models/userInteraction.model');
const Product = require('../models/product.model');
const User = require('../models/users.model');
const fs = require('fs').promises;
const path = require('path');

class DatasetPreparationService {
    /**
     * Chuẩn bị dataset đầy đủ cho thuật toán PPO
     * Dataset bao gồm:
     * 1. Lịch sử mua hàng (Purchase History)
     * 2. Đánh giá sản phẩm (Product Reviews - thang 1-5)
     * 3. Tần suất truy cập (User Activity & Interactions)
     */
    static async prepareFullDataset({ 
        outputPath = null, 
        startDate = null, 
        endDate = null,
        minUserInteractions = 5 
    }) {
        try {
            console.log('📊 Starting dataset preparation...');

            // 1. Lấy dữ liệu người dùng có hoạt động
            const users = await this.getActiveUsers({ minUserInteractions });
            console.log(`✅ Found ${users.length} active users`);

            const dataset = [];

            // 2. Xử lý từng user
            for (const user of users) {
                const userId = user._id;

                // Lấy lịch sử mua hàng
                const purchaseHistory = await this.getUserPurchaseHistory({ 
                    userId, 
                    startDate, 
                    endDate 
                });

                // Lấy đánh giá sản phẩm
                const reviews = await this.getUserReviews({ 
                    userId, 
                    startDate, 
                    endDate 
                });

                // Lấy tần suất truy cập và hoạt động
                const activityData = await this.getUserActivityData({ 
                    userId, 
                    startDate, 
                    endDate 
                });

                // Lấy tương tác với sản phẩm
                const interactions = await this.getUserInteractions({ 
                    userId, 
                    startDate, 
                    endDate 
                });

                // Tính toán features cho RL
                const features = this.calculateUserFeatures({
                    user,
                    purchaseHistory,
                    reviews,
                    activityData,
                    interactions
                });

                dataset.push({
                    userId: userId.toString(),
                    userInfo: {
                        email: user.email,
                        fullName: user.fullName,
                        createdAt: user.createdAt
                    },
                    purchaseHistory,
                    reviews,
                    activityData,
                    interactions,
                    features
                });
            }

            console.log(`✅ Dataset prepared with ${dataset.length} users`);

            // 3. Lưu dataset nếu có outputPath
            if (outputPath) {
                await this.saveDataset(dataset, outputPath);
            }

            // 4. Tạo summary statistics
            const statistics = this.calculateDatasetStatistics(dataset);

            return {
                dataset,
                statistics,
                metadata: {
                    generatedAt: new Date(),
                    totalUsers: dataset.length,
                    dateRange: { startDate, endDate },
                    minUserInteractions
                }
            };
        } catch (error) {
            console.error('❌ Error preparing dataset:', error);
            throw error;
        }
    }

    /**
     * Lấy danh sách user có hoạt động
     */
    static async getActiveUsers({ minUserInteractions = 5 }) {
        try {
            // Tìm users có ít nhất N interactions
            const activeUserIds = await UserInteraction.aggregate([
                {
                    $group: {
                        _id: '$userId',
                        totalInteractions: { $sum: 1 }
                    }
                },
                {
                    $match: {
                        totalInteractions: { $gte: minUserInteractions }
                    }
                }
            ]);

            const userIds = activeUserIds.map(u => u._id);

            const users = await User.find({
                _id: { $in: userIds }
            }).select('_id email fullName createdAt');

            return users;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Lấy lịch sử mua hàng của user
     */
    static async getUserPurchaseHistory({ userId, startDate, endDate }) {
        try {
            const query = {
                userId: userId.toString(),
                status: { $in: ['delivered', 'confirmed', 'shipped'] }
            };

            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate) query.createdAt.$gte = new Date(startDate);
                if (endDate) query.createdAt.$lte = new Date(endDate);
            }

            const payments = await Payment.find(query)
                .populate('products.productId', 'name category price discount')
                .populate('products.productId.category', 'name')
                .sort({ createdAt: -1 });

            return payments.map(payment => ({
                paymentId: payment._id,
                products: payment.products.map(p => ({
                    productId: p.productId?._id,
                    productName: p.productId?.name,
                    category: p.productId?.category?.name || p.productId?.category,
                    categoryId: p.productId?.category?._id || p.productId?.category,
                    quantity: p.quantity,
                    price: p.productId?.price,
                    discount: p.productId?.discount
                })),
                totalPrice: payment.totalPrice,
                finalPrice: payment.finalPrice,
                orderDate: payment.createdAt,
                status: payment.status
            }));
        } catch (error) {
            throw error;
        }
    }

    /**
     * Lấy đánh giá sản phẩm của user
     */
    static async getUserReviews({ userId, startDate, endDate }) {
        try {
            const query = { userId };

            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate) query.createdAt.$gte = new Date(startDate);
                if (endDate) query.createdAt.$lte = new Date(endDate);
            }

            const reviews = await ProductReview.find(query)
                .populate('productId', 'name category price')
                .populate('productId.category', 'name')
                .sort({ createdAt: -1 });

            return reviews.map(review => ({
                reviewId: review._id,
                productId: review.productId?._id,
                productName: review.productId?.name,
                rating: review.rating, // 1-5
                detailedRating: review.detailedRating,
                comment: review.comment,
                reviewDate: review.createdAt,
                isVerifiedPurchase: review.isVerifiedPurchase
            }));
        } catch (error) {
            throw error;
        }
    }

    /**
     * Lấy dữ liệu hoạt động của user
     */
    static async getUserActivityData({ userId, startDate, endDate }) {
        try {
            const query = { userId };

            if (startDate || endDate) {
                query.activityDate = {};
                if (startDate) query.activityDate.$gte = new Date(startDate);
                if (endDate) query.activityDate.$lte = new Date(endDate);
            }

            const activities = await UserActivity.find(query)
                .sort({ activityDate: -1 });

            // Tính tổng
            const summary = {
                totalVisits: 0,
                totalTimeSpent: 0,
                totalPageViews: 0,
                totalProductsViewed: 0,
                totalProductsClicked: 0,
                totalProductsAddedToCart: 0,
                totalCheckoutAttempts: 0,
                totalPurchasesCompleted: 0,
                averageTimePerVisit: 0,
                activityDays: activities.length,
                activities: []
            };

            activities.forEach(activity => {
                summary.totalVisits += activity.visitCount || 0;
                summary.totalTimeSpent += activity.totalTimeSpent || 0;
                summary.totalPageViews += activity.pageViews || 0;
                summary.totalProductsViewed += activity.productsViewed || 0;
                summary.totalProductsClicked += activity.productsClicked || 0;
                summary.totalProductsAddedToCart += activity.productsAddedToCart || 0;
                summary.totalCheckoutAttempts += activity.checkoutAttempts || 0;
                summary.totalPurchasesCompleted += activity.purchasesCompleted || 0;

                summary.activities.push({
                    date: activity.activityDate,
                    visitCount: activity.visitCount,
                    timeSpent: activity.totalTimeSpent,
                    productsViewed: activity.productsViewed,
                    productsClicked: activity.productsClicked
                });
            });

            summary.averageTimePerVisit = summary.totalVisits > 0 
                ? summary.totalTimeSpent / summary.totalVisits 
                : 0;

            return summary;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Lấy tương tác với sản phẩm
     */
    static async getUserInteractions({ userId, startDate, endDate }) {
        try {
            const query = { userId };

            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate) query.createdAt.$gte = new Date(startDate);
                if (endDate) query.createdAt.$lte = new Date(endDate);
            }

            const interactions = await UserInteraction.find(query)
                .populate('productId', 'name category price')
                .populate('productId.category', 'name')
                .sort({ createdAt: -1 });

            // Nhóm theo type
            const grouped = {
                views: [],
                clicks: [],
                addToCart: [],
                purchases: [],
                total: interactions.length
            };

            interactions.forEach(interaction => {
                const data = {
                    productId: interaction.productId?._id,
                    productName: interaction.productId?.name,
                    interactionType: interaction.interactionType,
                    viewDuration: interaction.viewDuration,
                    timestamp: interaction.createdAt
                };

                switch (interaction.interactionType) {
                    case 'view':
                        grouped.views.push(data);
                        break;
                    case 'click':
                        grouped.clicks.push(data);
                        break;
                    case 'add_to_cart':
                        grouped.addToCart.push(data);
                        break;
                    case 'purchase':
                        grouped.purchases.push(data);
                        break;
                }
            });

            return grouped;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Tính toán features cho RL model
     */
    static calculateUserFeatures({ user, purchaseHistory, reviews, activityData, interactions }) {
        // Tính average rating
        const avgRating = reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;

        // Tính total spending
        const totalSpending = purchaseHistory.reduce((sum, p) => sum + (p.finalPrice || 0), 0);

        // Tính purchase frequency (số đơn hàng / số ngày hoạt động)
        const purchaseFrequency = activityData.activityDays > 0
            ? purchaseHistory.length / activityData.activityDays
            : 0;

        // Tính conversion rate
        const conversionRate = activityData.totalProductsClicked > 0
            ? purchaseHistory.length / activityData.totalProductsClicked
            : 0;

        // Tính engagement score
        const engagementScore = this.calculateEngagementScore(activityData);

        // Category preferences
        const categoryPrefs = this.extractCategoryPreferences(purchaseHistory);

        // Recency (ngày kể từ lần mua cuối)
        const recency = purchaseHistory.length > 0
            ? Math.floor((new Date() - new Date(purchaseHistory[0].orderDate)) / (1000 * 60 * 60 * 24))
            : 999;

        return {
            // Demographics
            accountAge: Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)),

            // Purchase behavior
            totalPurchases: purchaseHistory.length,
            totalSpending,
            averageOrderValue: purchaseHistory.length > 0 ? totalSpending / purchaseHistory.length : 0,
            purchaseFrequency,
            recency, // Days since last purchase

            // Rating behavior
            totalReviews: reviews.length,
            averageRating: avgRating,
            reviewRate: purchaseHistory.length > 0 ? reviews.length / purchaseHistory.length : 0,

            // Activity metrics
            totalVisits: activityData.totalVisits,
            totalTimeSpent: activityData.totalTimeSpent,
            averageTimePerVisit: activityData.averageTimePerVisit,
            totalProductsViewed: activityData.totalProductsViewed,
            totalProductsClicked: activityData.totalProductsClicked,

            // Interaction metrics
            totalInteractions: interactions.total,
            viewCount: interactions.views.length,
            clickCount: interactions.clicks.length,
            addToCartCount: interactions.addToCart.length,

            // Conversion metrics
            conversionRate,
            addToCartRate: interactions.clicks.length > 0 
                ? interactions.addToCart.length / interactions.clicks.length 
                : 0,
            checkoutConversionRate: activityData.totalCheckoutAttempts > 0
                ? activityData.totalPurchasesCompleted / activityData.totalCheckoutAttempts
                : 0,

            // Engagement
            engagementScore,

            // Preferences
            categoryPreferences: categoryPrefs,
            topCategory: categoryPrefs.length > 0 ? categoryPrefs[0].category : null,

            // Normalized features (for ML model)
            normalized: {
                recency_norm: Math.min(recency / 365, 1), // 0-1
                frequency_norm: Math.min(purchaseHistory.length / 50, 1), // 0-1
                monetary_norm: Math.min(totalSpending / 50000000, 1), // 0-1 (assuming max 50M VND)
                engagement_norm: engagementScore // already 0-1
            }
        };
    }

    /**
     * Tính engagement score (0-1)
     */
    static calculateEngagementScore(activityData) {
        const weights = {
            visits: 0.1,
            timeSpent: 0.2,
            productsViewed: 0.2,
            productsClicked: 0.2,
            addToCart: 0.15,
            checkout: 0.1,
            purchase: 0.05
        };

        // Normalize các metrics
        const maxVisits = 100;
        const maxTimeSpent = 36000; // 10 hours
        const maxProductsViewed = 200;
        const maxProductsClicked = 100;
        const maxAddToCart = 50;
        const maxCheckout = 20;
        const maxPurchase = 10;

        const score = 
            (Math.min(activityData.totalVisits / maxVisits, 1) * weights.visits) +
            (Math.min(activityData.totalTimeSpent / maxTimeSpent, 1) * weights.timeSpent) +
            (Math.min(activityData.totalProductsViewed / maxProductsViewed, 1) * weights.productsViewed) +
            (Math.min(activityData.totalProductsClicked / maxProductsClicked, 1) * weights.productsClicked) +
            (Math.min(activityData.totalProductsAddedToCart / maxAddToCart, 1) * weights.addToCart) +
            (Math.min(activityData.totalCheckoutAttempts / maxCheckout, 1) * weights.checkout) +
            (Math.min(activityData.totalPurchasesCompleted / maxPurchase, 1) * weights.purchase);

        return score;
    }

    /**
     * Trích xuất category preferences
     */
    static extractCategoryPreferences(purchaseHistory) {
        const categoryCount = {};

        purchaseHistory.forEach(payment => {
            payment.products.forEach(product => {
                const category = product.category || 'Unknown';
                categoryCount[category] = (categoryCount[category] || 0) + product.quantity;
            });
        });

        return Object.entries(categoryCount)
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count);
    }

    /**
     * Lưu dataset ra file
     */
    static async saveDataset(dataset, outputPath) {
        try {
            const dir = path.dirname(outputPath);
            await fs.mkdir(dir, { recursive: true });

            await fs.writeFile(
                outputPath, 
                JSON.stringify(dataset, null, 2),
                'utf-8'
            );

            console.log(`✅ Dataset saved to ${outputPath}`);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Tính toán statistics của dataset
     */
    static calculateDatasetStatistics(dataset) {
        const stats = {
            totalUsers: dataset.length,
            totalPurchases: 0,
            totalReviews: 0,
            totalInteractions: 0,
            averageRating: 0,
            averageSpending: 0,
            averageEngagement: 0,
            categoryDistribution: {},
            userSegments: {
                highValue: 0,
                mediumValue: 0,
                lowValue: 0
            }
        };

        let totalRating = 0;
        let totalRatingCount = 0;

        dataset.forEach(user => {
            stats.totalPurchases += user.purchaseHistory.length;
            stats.totalReviews += user.reviews.length;
            stats.totalInteractions += user.interactions.total;

            totalRating += user.features.averageRating * user.reviews.length;
            totalRatingCount += user.reviews.length;

            stats.averageSpending += user.features.totalSpending;
            stats.averageEngagement += user.features.engagementScore;

            // Category distribution
            user.features.categoryPreferences.forEach(cat => {
                stats.categoryDistribution[cat.category] = 
                    (stats.categoryDistribution[cat.category] || 0) + cat.count;
            });

            // User segmentation
            if (user.features.totalSpending > 10000000) {
                stats.userSegments.highValue++;
            } else if (user.features.totalSpending > 3000000) {
                stats.userSegments.mediumValue++;
            } else {
                stats.userSegments.lowValue++;
            }
        });

        stats.averageRating = totalRatingCount > 0 ? totalRating / totalRatingCount : 0;
        stats.averageSpending = dataset.length > 0 ? stats.averageSpending / dataset.length : 0;
        stats.averageEngagement = dataset.length > 0 ? stats.averageEngagement / dataset.length : 0;

        return stats;
    }

    /**
     * Export dataset for external ML training (CSV format)
     */
    static async exportToCSV({ outputPath }) {
        try {
            const { dataset } = await this.prepareFullDataset({});

            const headers = [
                'userId',
                'accountAge',
                'totalPurchases',
                'totalSpending',
                'averageOrderValue',
                'recency',
                'totalReviews',
                'averageRating',
                'totalVisits',
                'totalTimeSpent',
                'totalProductsViewed',
                'totalProductsClicked',
                'conversionRate',
                'engagementScore',
                'topCategory'
            ];

            const rows = dataset.map(user => [
                user.userId,
                user.features.accountAge,
                user.features.totalPurchases,
                user.features.totalSpending,
                user.features.averageOrderValue,
                user.features.recency,
                user.features.totalReviews,
                user.features.averageRating,
                user.features.totalVisits,
                user.features.totalTimeSpent,
                user.features.totalProductsViewed,
                user.features.totalProductsClicked,
                user.features.conversionRate,
                user.features.engagementScore,
                user.features.topCategory || 'None'
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.join(','))
            ].join('\n');

            await fs.writeFile(outputPath, csvContent, 'utf-8');

            console.log(`✅ CSV dataset saved to ${outputPath}`);
        } catch (error) {
            throw error;
        }
    }
}

module.exports = DatasetPreparationService;

