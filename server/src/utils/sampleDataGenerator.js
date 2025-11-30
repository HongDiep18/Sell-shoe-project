/**
 * Sample Data Generator for Testing PPO Recommendation System
 * Tạo dữ liệu mẫu để test hệ thống gợi ý
 */

const User = require('../models/users.model');
const Product = require('../models/product.model');
const Category = require('../models/category.model');
const UserActivity = require('../models/userActivity.model');
const UserInteraction = require('../models/userInteraction.model');
const ProductReview = require('../models/productReview.model');
const Payment = require('../models/payment.model');
const mongoose = require('mongoose');

class SampleDataGenerator {
    /**
     * Generate sample data for testing
     */
    static async generateSampleData({ numUsers = 50, numInteractionsPerUser = 20 }) {
        try {
            console.log('🚀 Starting sample data generation...');

            // 1. Get existing users and products
            const users = await User.find().limit(numUsers);
            const products = await Product.find({ status: 'active' });
            const categories = await Category.find();

            if (users.length === 0) {
                throw new Error('No users found. Please create users first.');
            }

            if (products.length === 0) {
                throw new Error('No products found. Please create products first.');
            }

            console.log(`📊 Found ${users.length} users and ${products.length} products`);

            const stats = {
                interactions: 0,
                activities: 0,
                reviews: 0,
                purchases: 0,
            };

            // 2. Generate data for each user
            for (const user of users) {
                console.log(`\n👤 Generating data for user: ${user.email}`);

                // Generate user behavior profile (different types of users)
                const userProfile = this.generateUserProfile();

                // Generate interactions
                const interactions = await this.generateUserInteractions({
                    userId: user._id,
                    products,
                    categories,
                    numInteractions: numInteractionsPerUser,
                    profile: userProfile,
                });
                stats.interactions += interactions.length;

                // Generate activities
                const activities = await this.generateUserActivities({
                    userId: user._id,
                    interactions,
                    profile: userProfile,
                });
                stats.activities += activities.length;

                // Generate reviews (for purchased products)
                const reviews = await this.generateProductReviews({
                    userId: user._id,
                    interactions,
                    profile: userProfile,
                });
                stats.reviews += reviews.length;

                // Generate purchases
                const purchases = await this.generatePurchases({
                    userId: user._id,
                    interactions,
                    profile: userProfile,
                });
                stats.purchases += purchases.length;

                console.log(
                    `   ✅ Generated: ${interactions.length} interactions, ${activities.length} activities, ${reviews.length} reviews, ${purchases.length} purchases`,
                );
            }

            console.log('\n✅ Sample data generation completed!');
            console.log('📊 Statistics:');
            console.log(`   - Total interactions: ${stats.interactions}`);
            console.log(`   - Total activities: ${stats.activities}`);
            console.log(`   - Total reviews: ${stats.reviews}`);
            console.log(`   - Total purchases: ${stats.purchases}`);

            return stats;
        } catch (error) {
            console.error('❌ Error generating sample data:', error);
            throw error;
        }
    }

    /**
     * Generate user profile (behavior type)
     */
    static generateUserProfile() {
        const profiles = [
            {
                type: 'high_value',
                purchaseProbability: 0.3,
                avgRating: 4.5,
                sessionDuration: 1200,
                categoryFocus: 1, // Focus on 1-2 categories
            },
            {
                type: 'browser',
                purchaseProbability: 0.05,
                avgRating: 3.5,
                sessionDuration: 300,
                categoryFocus: 3, // Browse many categories
            },
            {
                type: 'regular',
                purchaseProbability: 0.15,
                avgRating: 4.0,
                sessionDuration: 600,
                categoryFocus: 2,
            },
            {
                type: 'impulse_buyer',
                purchaseProbability: 0.25,
                avgRating: 3.8,
                sessionDuration: 400,
                categoryFocus: 2,
            },
        ];

        return profiles[Math.floor(Math.random() * profiles.length)];
    }

    /**
     * Generate user interactions
     */
    static async generateUserInteractions({ userId, products, categories, numInteractions, profile }) {
        const interactions = [];
        const sessionId = `session_${userId}_${Date.now()}`;

        // Select favorite categories based on profile
        const favoriteCategories = categories
            .sort(() => Math.random() - 0.5)
            .slice(0, profile.categoryFocus)
            .map((c) => c._id.toString());

        for (let i = 0; i < numInteractions; i++) {
            // Prefer products from favorite categories
            let product;
            if (Math.random() < 0.7 && favoriteCategories.length > 0) {
                // 70% chance to interact with favorite category
                const favCat = favoriteCategories[Math.floor(Math.random() * favoriteCategories.length)];
                const categoryProducts = products.filter((p) => p.category?.toString() === favCat);
                product = categoryProducts[Math.floor(Math.random() * categoryProducts.length)] || products[0];
            } else {
                product = products[Math.floor(Math.random() * products.length)];
            }

            // Determine interaction type
            let interactionType = 'view';
            const rand = Math.random();

            if (rand < 0.3) {
                interactionType = 'click';
            } else if (rand < 0.4) {
                interactionType = 'add_to_cart';
            } else if (rand < 0.4 + profile.purchaseProbability) {
                interactionType = 'purchase';
            }

            const interaction = {
                userId,
                productId: product._id,
                interactionType,
                viewDuration: Math.floor(Math.random() * 120) + 10, // 10-130 seconds
                sessionId,
                metadata: {
                    categoryId: product.category,
                    price: product.price,
                    discount: product.discount || 0,
                },
                createdAt: this.randomDate(30), // Within last 30 days
            };

            interactions.push(interaction);
        }

        // Save to database
        await UserInteraction.insertMany(interactions);
        return interactions;
    }

    /**
     * Generate user activities
     */
    static async generateUserActivities({ userId, interactions, profile }) {
        const activities = [];
        const daysToGenerate = 30;

        for (let i = 0; i < daysToGenerate; i++) {
            const activityDate = new Date();
            activityDate.setDate(activityDate.getDate() - i);
            activityDate.setHours(0, 0, 0, 0);

            // Get interactions for this day
            const dayInteractions = interactions.filter((int) => {
                const intDate = new Date(int.createdAt);
                return intDate.toDateString() === activityDate.toDateString();
            });

            if (dayInteractions.length === 0) continue;

            const productsViewed = dayInteractions.filter((i) => i.interactionType === 'view').length;
            const productsClicked = dayInteractions.filter((i) => i.interactionType === 'click').length;
            const productsAddedToCart = dayInteractions.filter((i) => i.interactionType === 'add_to_cart').length;
            const purchasesCompleted = dayInteractions.filter((i) => i.interactionType === 'purchase').length;

            // Count categories viewed
            const categoriesMap = new Map();
            dayInteractions.forEach((int) => {
                const catId = int.metadata.categoryId?.toString();
                if (catId) {
                    categoriesMap.set(catId, (categoriesMap.get(catId) || 0) + 1);
                }
            });

            const categoriesViewed = Array.from(categoriesMap.entries()).map(([categoryId, viewCount]) => ({
                categoryId: new mongoose.Types.ObjectId(categoryId),
                viewCount,
            }));

            const activity = {
                userId,
                activityDate,
                visitCount: Math.floor(Math.random() * 5) + 1,
                totalTimeSpent: Math.floor(Math.random() * profile.sessionDuration) + 300,
                pageViews: dayInteractions.length + Math.floor(Math.random() * 10),
                productsViewed,
                productsClicked,
                productsAddedToCart,
                checkoutAttempts: purchasesCompleted > 0 ? purchasesCompleted : 0,
                purchasesCompleted,
                categoriesViewed,
                deviceType: Math.random() < 0.6 ? 'mobile' : 'desktop',
            };

            activities.push(activity);
        }

        // Save to database
        if (activities.length > 0) {
            await UserActivity.insertMany(activities);
        }
        return activities;
    }

    /**
     * Generate product reviews
     */
    static async generateProductReviews({ userId, interactions, profile }) {
        const reviews = [];
        const purchasedInteractions = interactions.filter((i) => i.interactionType === 'purchase');

        // Review 30% of purchased products
        const toReview = purchasedInteractions.slice(0, Math.ceil(purchasedInteractions.length * 0.3));

        for (const interaction of toReview) {
            const rating = Math.max(1, Math.min(5, Math.round(profile.avgRating + (Math.random() - 0.5) * 2)));

            const review = {
                userId,
                productId: interaction.productId,
                paymentId: new mongoose.Types.ObjectId(), // Mock payment ID
                rating,
                detailedRating: {
                    quality: Math.max(1, Math.min(5, rating + Math.floor(Math.random() * 2 - 1))),
                    design: Math.max(1, Math.min(5, rating + Math.floor(Math.random() * 2 - 1))),
                    comfort: Math.max(1, Math.min(5, rating + Math.floor(Math.random() * 2 - 1))),
                    valueForMoney: Math.max(1, Math.min(5, rating + Math.floor(Math.random() * 2 - 1))),
                },
                comment: this.generateReviewComment(rating),
                status: 'approved',
                isVerifiedPurchase: true,
                createdAt: interaction.createdAt,
            };

            reviews.push(review);
        }

        // Save to database
        if (reviews.length > 0) {
            await ProductReview.insertMany(reviews);
        }
        return reviews;
    }

    /**
     * Generate purchases
     */
    static async generatePurchases({ userId, interactions, profile }) {
        const purchases = [];
        const purchaseInteractions = interactions.filter((i) => i.interactionType === 'purchase');

        // Group by session/date
        const purchasesByDate = new Map();
        purchaseInteractions.forEach((int) => {
            const dateKey = new Date(int.createdAt).toDateString();
            if (!purchasesByDate.has(dateKey)) {
                purchasesByDate.set(dateKey, []);
            }
            purchasesByDate.get(dateKey).push(int);
        });

        // Create payment for each date
        for (const [dateKey, items] of purchasesByDate.entries()) {
            const products = items.map((int) => ({
                productId: int.productId,
                quantity: Math.floor(Math.random() * 2) + 1,
                price: int.metadata.price,
                discount: int.metadata.discount || 0,
            }));

            const totalAmount = products.reduce((sum, p) => {
                const finalPrice = p.price * (1 - p.discount / 100);
                return sum + finalPrice * p.quantity;
            }, 0);

            const payment = {
                userId,
                products,
                totalAmount,
                status: 'delivered',
                paymentMethod: 'cod',
                createdAt: items[0].createdAt,
            };

            purchases.push(payment);
        }

        // Save to database
        if (purchases.length > 0) {
            await Payment.insertMany(purchases);
        }
        return purchases;
    }

    /**
     * Generate review comment based on rating
     */
    static generateReviewComment(rating) {
        const comments = {
            5: [
                'Sản phẩm rất tốt, đúng như mô tả!',
                'Chất lượng tuyệt vời, sẽ mua lại!',
                'Rất hài lòng với sản phẩm này',
                'Giày đẹp, đi êm, giá hợp lý',
            ],
            4: [
                'Sản phẩm tốt, đáng giá tiền',
                'Khá ổn, chất lượng tốt',
                'Sản phẩm như mong đợi',
                'Đẹp, chất lượng tốt',
            ],
            3: [
                'Sản phẩm bình thường',
                'Tạm được, giá hơi cao',
                'Chất lượng tạm ổn',
                'Bình thường, không có gì đặc biệt',
            ],
            2: ['Không như mong đợi', 'Chất lượng chưa tốt', 'Hơi thất vọng', 'Giá không xứng đáng'],
            1: ['Rất tệ', 'Không đáng tiền', 'Chất lượng kém', 'Không hài lòng'],
        };

        const ratingComments = comments[rating] || comments[3];
        return ratingComments[Math.floor(Math.random() * ratingComments.length)];
    }

    /**
     * Generate random date within last N days
     */
    static randomDate(daysAgo) {
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
        date.setHours(Math.floor(Math.random() * 24));
        date.setMinutes(Math.floor(Math.random() * 60));
        return date;
    }

    /**
     * Clean all sample data
     */
    static async cleanSampleData() {
        try {
            console.log('🧹 Cleaning sample data...');

            await UserActivity.deleteMany({});
            await UserInteraction.deleteMany({});
            await ProductReview.deleteMany({});
            // Note: Be careful with Payment deletion in production

            console.log('✅ Sample data cleaned');
        } catch (error) {
            console.error('❌ Error cleaning sample data:', error);
            throw error;
        }
    }
}

module.exports = SampleDataGenerator;
