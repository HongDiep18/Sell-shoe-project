const mongoose = require('mongoose');
const config = require('./config');

/**
 * MongoDB Data Loader
 * Loads user events and builds trajectories for RL training
 */
class DataLoader {
    constructor() {
        this.connection = null;
        this.models = {};
    }

    /**
     * Connect to MongoDB
     */
    async connect() {
        try {
            this.connection = await mongoose.connect(config.mongodbUri, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
            console.log('✅ Connected to MongoDB');

            // Define schemas
            this.defineSchemas();
        } catch (error) {
            console.error('❌ MongoDB connection error:', error);
            throw error;
        }
    }

    /**
     * Define MongoDB schemas
     */
    defineSchemas() {
        // User Interaction Schema
        const userInteractionSchema = new mongoose.Schema({
            userId: mongoose.Schema.Types.ObjectId,
            productId: mongoose.Schema.Types.ObjectId,
            interactionType: String, // view, click, add_to_cart, purchase
            viewDuration: Number,
            sessionId: String,
            metadata: Object,
            createdAt: Date,
        });

        // User Activity Schema
        const userActivitySchema = new mongoose.Schema({
            userId: mongoose.Schema.Types.ObjectId,
            activityDate: Date,
            visitCount: Number,
            totalTimeSpent: Number,
            pageViews: Number,
            productsViewed: [mongoose.Schema.Types.ObjectId],
            productsClicked: [mongoose.Schema.Types.ObjectId],
            productsAddedToCart: [mongoose.Schema.Types.ObjectId],
            checkoutAttempts: Number,
            purchasesCompleted: Number,
            categoriesViewed: [mongoose.Schema.Types.ObjectId],
            deviceType: String,
        });

        // Product Review Schema
        const productReviewSchema = new mongoose.Schema({
            userId: mongoose.Schema.Types.ObjectId,
            productId: mongoose.Schema.Types.ObjectId,
            rating: Number,
            comment: String,
            createdAt: Date,
        });

        // Payment Schema
        const paymentSchema = new mongoose.Schema({
            userId: mongoose.Schema.Types.ObjectId,
            products: [
                {
                    productId: mongoose.Schema.Types.ObjectId,
                    quantity: Number,
                    price: Number,
                },
            ],
            totalPrice: Number,
            status: String,
            createdAt: Date,
        });

        // RL Recommendation Schema
        const rlRecommendationSchema = new mongoose.Schema({
            userId: mongoose.Schema.Types.ObjectId,
            recommendedProducts: [
                {
                    productId: mongoose.Schema.Types.ObjectId,
                    score: Number,
                    rank: Number,
                },
            ],
            userState: Object,
            feedback: {
                clickedProducts: [mongoose.Schema.Types.ObjectId],
                addedToCartProducts: [mongoose.Schema.Types.ObjectId],
                purchasedProducts: [mongoose.Schema.Types.ObjectId],
            },
            reward: Number,
            sessionId: String,
            createdAt: Date,
        });

        this.models = {
            UserInteraction: mongoose.model('UserInteraction', userInteractionSchema, 'userinteractions'),
            UserActivity: mongoose.model('UserActivity', userActivitySchema, 'useractivities'),
            ProductReview: mongoose.model('ProductReview', productReviewSchema, 'productreviews'),
            Payment: mongoose.model('Payment', paymentSchema, 'payments'),
            RLRecommendation: mongoose.model('RLRecommendation', rlRecommendationSchema, 'rlrecommendations'),
        };
    }

    /**
     * Calculate reward from user feedback
     * +1 for click, +3 for add_to_cart, +5 for purchase
     */
    calculateReward(feedback) {
        let reward = 0;

        if (feedback.clickedProducts) {
            reward += feedback.clickedProducts.length * 1;
        }
        if (feedback.addedToCartProducts) {
            reward += feedback.addedToCartProducts.length * 3;
        }
        if (feedback.purchasedProducts) {
            reward += feedback.purchasedProducts.length * 5;
        }

        return reward;
    }

    /**
     * Build user state vector from historical data
     */
    async buildUserState(userId, beforeDate = new Date()) {
        try {
            const thirtyDaysAgo = new Date(beforeDate);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            // Get user activities
            const activities = await this.models.UserActivity.find({
                userId,
                activityDate: { $gte: thirtyDaysAgo, $lte: beforeDate },
            }).lean();

            // Get user interactions
            const interactions = await this.models.UserInteraction.find({
                userId,
                createdAt: { $gte: thirtyDaysAgo, $lte: beforeDate },
            }).lean();

            // Get user reviews
            const reviews = await this.models.ProductReview.find({
                userId,
                createdAt: { $gte: thirtyDaysAgo, $lte: beforeDate },
            }).lean();

            // Get user purchases
            const purchases = await this.models.Payment.find({
                userId,
                status: 'completed',
                createdAt: { $gte: thirtyDaysAgo, $lte: beforeDate },
            }).lean();

            // Build state vector (20 dimensions)
            const state = this.extractStateFeatures({
                activities,
                interactions,
                reviews,
                purchases,
            });

            return state;
        } catch (error) {
            console.error('Error building user state:', error);
            return this.getDefaultState();
        }
    }

    /**
     * Extract 20-dimensional state features
     */
    extractStateFeatures(data) {
        const { activities, interactions, reviews, purchases } = data;

        // Purchase behavior (4 features)
        const totalPurchases = purchases.length;
        const totalSpent = purchases.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
        const avgOrderValue = totalPurchases > 0 ? totalSpent / totalPurchases : 0;
        const daysSinceLastPurchase =
            purchases.length > 0
                ? Math.floor((Date.now() - new Date(purchases[0].createdAt)) / (1000 * 60 * 60 * 24))
                : 999;

        // Engagement (5 features)
        const totalVisits = activities.reduce((sum, a) => sum + (a.visitCount || 0), 0);
        const totalTimeSpent = activities.reduce((sum, a) => sum + (a.totalTimeSpent || 0), 0);
        const avgSessionTime = totalVisits > 0 ? totalTimeSpent / totalVisits : 0;
        const totalClicks = interactions.filter((i) => i.interactionType === 'click').length;
        const totalViews = interactions.filter((i) => i.interactionType === 'view').length;
        const clickThroughRate = totalViews > 0 ? totalClicks / totalViews : 0;

        // Conversion (2 features)
        const totalAddToCarts = interactions.filter((i) => i.interactionType === 'add_to_cart').length;
        const addToCartRate = totalClicks > 0 ? totalAddToCarts / totalClicks : 0;
        const conversionRate = totalAddToCarts > 0 ? totalPurchases / totalAddToCarts : 0;

        // Satisfaction (2 features)
        const avgRating =
            reviews.length > 0 ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length : 0;
        const reviewCount = reviews.length;

        // Recency (1 feature)
        const lastActivity =
            activities.length > 0 ? Math.max(...activities.map((a) => new Date(a.activityDate).getTime())) : 0;
        const daysSinceLastVisit =
            lastActivity > 0 ? Math.floor((Date.now() - lastActivity) / (1000 * 60 * 60 * 24)) : 999;

        // Normalize features (20 dimensions)
        const state = [
            // Purchase behavior (4)
            Math.min(totalPurchases / 10, 1),
            Math.min(avgOrderValue / 5000000, 1),
            Math.min(daysSinceLastPurchase / 365, 1),
            Math.min(totalPurchases / totalVisits || 0, 1),

            // Engagement (5)
            Math.min(totalVisits / 100, 1),
            Math.min(avgSessionTime / 3600, 1),
            Math.min(totalViews / 100, 1),
            Math.min(clickThroughRate, 1),
            Math.min(addToCartRate, 1),

            // Conversion (2)
            Math.min(conversionRate, 1),
            Math.min(totalAddToCarts / 50, 1),

            // Satisfaction (2)
            avgRating / 5,
            Math.min(reviewCount / 20, 1),

            // Recency (1)
            Math.min(daysSinceLastVisit / 365, 1),

            // Category preferences (6) - placeholder, can be enhanced
            0,
            0,
            0,
            0,
            0,
            0,
        ];

        return state;
    }

    /**
     * Get default state for new users
     */
    getDefaultState() {
        return new Array(20).fill(0);
    }

    /**
     * Load trajectories for training
     * Each trajectory: [(state, action, reward, next_state), ...]
     * @param {string|null} userId - If provided, load trajectories only for this user (personalized)
     * @param {number} limit - Maximum number of trajectories to load
     */
    async loadTrajectories(userId = null, limit = 1000) {
        try {
            if (userId) {
                console.log(`📊 Loading trajectories for user ${userId}...`);
            } else {
                console.log('📊 Loading trajectories from MongoDB (all users)...');
            }

            // Build query - filter by userId if provided
            const query = {
                'feedback.clickedProducts.0': { $exists: true }, // Has at least one interaction
            };

            if (userId) {
                query.userId = userId;
            }

            // Get recommendations with feedback
            const recommendations = await this.models.RLRecommendation.find(query)
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean();

            if (userId) {
                console.log(`Found ${recommendations.length} recommendations for user ${userId}`);
            } else {
                console.log(`Found ${recommendations.length} recommendations with feedback`);
            }

            const trajectories = [];

            for (const rec of recommendations) {
                // State
                const state = rec.userState ? Object.values(rec.userState).slice(0, 20) : this.getDefaultState();

                // Action (index of clicked/purchased product)
                const clickedProducts = rec.feedback.clickedProducts || [];
                const purchasedProducts = rec.feedback.purchasedProducts || [];
                const allInteractedProducts = [...clickedProducts, ...purchasedProducts];

                if (allInteractedProducts.length === 0) continue;

                // Find action index
                const recommendedIds = rec.recommendedProducts.map((p) => p.productId.toString());
                const actionIndex = recommendedIds.findIndex((id) =>
                    allInteractedProducts.some((pid) => pid.toString() === id),
                );

                if (actionIndex === -1) continue;

                // Reward
                const reward = this.calculateReward(rec.feedback);

                // Next state (approximate - same user after this interaction)
                const nextState = await this.buildUserState(rec.userId, new Date(rec.createdAt));

                trajectories.push({
                    state,
                    action: actionIndex,
                    reward,
                    nextState,
                    done: false, // Continuing episode
                });
            }

            console.log(`✅ Loaded ${trajectories.length} trajectories`);
            return trajectories;
        } catch (error) {
            console.error('❌ Error loading trajectories:', error);
            return [];
        }
    }

    /**
     * Get list of active users with enough trajectories for training
     * @param {number} minTrajectories - Minimum number of trajectories required
     * @returns {Array} List of user IDs
     */
    async getActiveUsers(minTrajectories = 50) {
        try {
            console.log(`🔍 Finding active users with at least ${minTrajectories} trajectories...`);

            // Aggregate to count recommendations per user
            const userCounts = await this.models.RLRecommendation.aggregate([
                {
                    $match: {
                        'feedback.clickedProducts.0': { $exists: true },
                    },
                },
                {
                    $group: {
                        _id: '$userId',
                        count: { $sum: 1 },
                    },
                },
                {
                    $match: {
                        count: { $gte: minTrajectories },
                    },
                },
                {
                    $sort: { count: -1 },
                },
            ]);

            const userIds = userCounts.map((u) => u._id.toString());
            console.log(`✅ Found ${userIds.length} active users`);

            return userIds;
        } catch (error) {
            console.error('❌ Error getting active users:', error);
            return [];
        }
    }

    /**
     * Close MongoDB connection
     */
    async close() {
        if (this.connection) {
            await mongoose.connection.close();
            console.log('✅ MongoDB connection closed');
        }
    }
}

module.exports = DataLoader;
