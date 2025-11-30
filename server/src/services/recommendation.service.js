const mongoose = require('mongoose');
const RLClientService = require('./rlClient.service');
const RLRecommendationService = require('./rlRecommendation.service');
const UserInteraction = require('../models/userInteraction.model');
const Payment = require('../models/payment.model');
const Product = require('../models/product.model');

class RecommendationService {
    /**
     * Get personalized recommendations using RL Service (TensorFlow.js PPO)
     */
    static async getPersonalizedRecommendations({ userId, sessionId, limit = 10 }) {
        try {
            console.log(`\n🎯 === PERSONALIZED RECOMMENDATIONS FOR USER: ${userId} ===`);
            console.log(`🔍 UserID type: ${typeof userId}, value: ${userId}`);

            // Convert userId to ObjectId for query (vì trong DB lưu dạng ObjectId)
            let userIdForQuery;
            try {
                // Nếu userId đã là ObjectId, giữ nguyên
                if (userId instanceof mongoose.Types.ObjectId) {
                    userIdForQuery = userId;
                } else {
                    // Convert string to ObjectId
                    userIdForQuery = new mongoose.Types.ObjectId(userId.toString());
                }
            } catch (err) {
                console.log('⚠️  Invalid userId format:', err.message);
                return [];
            }

            console.log(`🔍 Querying with ObjectId:`, userIdForQuery);

            // 1. Lấy TẤT CẢ interactions của user
            const allInteractions = await UserInteraction.find({
                userId: userIdForQuery, // Dùng ObjectId để query
            })
                .populate('productId')
                .sort({ createdAt: -1 })
                .lean();

            console.log(`📊 Total interactions found: ${allInteractions.length}`);

            if (allInteractions.length > 0) {
                console.log(`📋 Sample interaction:`, {
                    userId: allInteractions[0].userId,
                    interactionType: allInteractions[0].interactionType,
                    productId: allInteractions[0].productId?._id,
                    createdAt: allInteractions[0].createdAt,
                });
            }

            // Filter ra view/click interactions trong 30 ngày
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const viewedInteractions = allInteractions.filter(
                (i) => ['view', 'click'].includes(i.interactionType) && i.createdAt >= thirtyDaysAgo,
            );

            console.log(`📊 View/Click interactions (last 30 days): ${viewedInteractions.length}`);

            // Lọc ra các productIds hợp lệ
            const viewedProductIds = viewedInteractions
                .filter((i) => i.productId && i.productId._id)
                .map((i) => i.productId._id.toString());

            // Nếu user chưa xem sản phẩm nào → trả về rỗng
            if (viewedProductIds.length === 0) {
                console.log(`❌ User ${userId} chưa xem sản phẩm nào → không có recommendations\n`);
                return [];
            }

            // Lấy thông tin categories từ viewed products
            const viewedProducts = await Product.find({
                _id: { $in: viewedProductIds },
            })
                .populate('category')
                .lean();

            // DEBUG: Log first viewed product structure
            if (viewedProducts.length > 0) {
                console.log(`🔍 First viewed product:`, {
                    name: viewedProducts[0].name,
                    categoryField: viewedProducts[0].category,
                    categoryType: typeof viewedProducts[0].category,
                });
            }

            // Đếm category preferences
            const categoryPreferences = {};
            const brandPreferences = {};
            const viewedProductNames = [];

            viewedProducts.forEach((product) => {
                viewedProductNames.push(product.name);
                if (product.category) {
                    const catId = product.category._id.toString();
                    const catName = product.category.categoryName || product.category.name;
                    categoryPreferences[catId] = {
                        count: (categoryPreferences[catId]?.count || 0) + 1,
                        name: catName,
                    };
                }
                if (product.name) {
                    // Extract brand từ tên sản phẩm
                    // Format: "Giày bóng rổ trẻ em PEAK Basketball..." → PEAK
                    // Format: "Nike Air Max..." → Nike
                    const words = product.name.split(' ');

                    // Tìm brand: từ viết HOA hoặc từ thứ 2+ không phải từ phổ biến
                    const commonWords = [
                        'giày',
                        'bóng',
                        'rổ',
                        'trẻ',
                        'em',
                        'basketball',
                        'kid',
                        'hunting',
                        'taichi',
                        'vô',
                        'song',
                    ];
                    let brand = null;

                    for (const word of words) {
                        const lowerWord = word.toLowerCase();
                        // Nếu từ viết HOA hoặc không phải từ phổ biến
                        if (word === word.toUpperCase() && word.length > 2) {
                            brand = word;
                            break;
                        } else if (!commonWords.includes(lowerWord) && word.length > 2) {
                            brand = word;
                            break;
                        }
                    }

                    if (brand) {
                        brandPreferences[brand] = (brandPreferences[brand] || 0) + 1;
                    }
                }
            });

            const topCategoryIds = Object.keys(categoryPreferences);
            const topBrands = Object.keys(brandPreferences);

            console.log(`👀 Viewed products: ${viewedProductNames.slice(0, 5).join(', ')}...`);
            console.log(`📂 Categories: ${topCategoryIds.map((c) => categoryPreferences[c].name).join(', ')}`);
            console.log(`🏷️  Brands: ${topBrands.join(', ')}`);

            // Convert category IDs to ObjectId for query
            const topCategories = topCategoryIds.map((id) => new mongoose.Types.ObjectId(id));
            console.log(`🔍 Category ObjectIds for query:`, topCategories);

            // DEBUG: Check sample product to verify category field
            const sampleProduct = await Product.findOne().lean();
            if (sampleProduct) {
                console.log(`🔍 Sample product category field:`, {
                    type: typeof sampleProduct.category,
                    value: sampleProduct.category,
                });
            }

            // DEBUG: Check total products in these categories
            const totalInCategory = await Product.countDocuments({
                category: { $in: topCategories },
            });
            console.log(`📊 Total products in category: ${totalInCategory}`);

            const activeInCategory = await Product.countDocuments({
                category: { $in: topCategories },
                status: 'active',
            });
            console.log(`✅ Active products in category: ${activeInCategory}`);

            const availableInCategory = await Product.countDocuments({
                category: { $in: topCategories },
                status: 'active',
                quantity: { $gt: 0 },
            });
            console.log(`📦 Available products (active + in stock): ${availableInCategory}`);

            // Test query: Tìm product trong category (bỏ qua mọi filter)
            const testProduct = await Product.findOne({
                category: { $in: topCategories },
            }).lean();
            if (testProduct) {
                console.log(`✅ Test: Found product in category:`, {
                    name: testProduct.name,
                    category: testProduct.category,
                    status: testProduct.status,
                    quantity: testProduct.quantity,
                });
            } else {
                console.log(`❌ Test: NO products found in category with ObjectId query`);

                // Try with string
                const testWithString = await Product.findOne({
                    category: { $in: topCategoryIds },
                }).lean();
                if (testWithString) {
                    console.log(`⚠️  Found with STRING query! Category field is STRING not ObjectId!`);
                }
            }

            // 2. Get candidate products - CHỈ từ categories/brands mà user đã xem
            const purchasedProducts = await this.getUserPurchasedProducts({ userId });
            const purchasedProductIds = purchasedProducts.map((p) => p._id);

            console.log(`🛒 Purchased products: ${purchasedProductIds.length}`);

            // CHỈ loại products đã MUA, KHÔNG loại products đã xem
            // (Vì user có thể muốn xem lại sản phẩm tương tự)
            const excludeProductIds = purchasedProductIds;

            // Lấy sản phẩm từ categories user đã xem (dùng ObjectId array)
            const candidates = await Product.find({
                _id: { $nin: excludeProductIds },
                category: { $in: topCategories }, // Dùng ObjectId array
                status: 'active',
                // Accept products with quantity > 0 OR quantity undefined (không có field)
                $or: [{ quantity: { $gt: 0 } }, { quantity: { $exists: false } }, { quantity: null }],
            })
                .populate('category')
                .limit(200) // Tăng limit để có nhiều candidates hơn
                .lean();

            console.log(`🎲 Found ${candidates.length} candidates after exclusions`);

            // Filter thêm theo brand nếu có
            const filteredCandidates = candidates.filter((product) => {
                if (!product.name) return false;

                // Extract brand giống logic trên
                const words = product.name.split(' ');
                const commonWords = [
                    'giày',
                    'bóng',
                    'rổ',
                    'trẻ',
                    'em',
                    'basketball',
                    'kid',
                    'hunting',
                    'taichi',
                    'vô',
                    'song',
                ];

                for (const word of words) {
                    const lowerWord = word.toLowerCase();
                    // Nếu từ viết HOA hoặc không phải từ phổ biến
                    if (
                        (word === word.toUpperCase() && word.length > 2) ||
                        (!commonWords.includes(lowerWord) && word.length > 2)
                    ) {
                        return topBrands.includes(word);
                    }
                }
                return false;
            });

            console.log(`🎯 Filtered to ${filteredCandidates.length} candidates matching brands`);

            // Ưu tiên brand match để personalize
            // Chỉ fallback về category nếu không có brand match nào
            const finalCandidates = filteredCandidates.length > 0 ? filteredCandidates : candidates;

            console.log(`✅ Final candidates: ${finalCandidates.length}`);
            console.log(`🎨 Using: ${filteredCandidates.length > 0 ? 'Brand-filtered' : 'Category-only'} candidates`);

            if (finalCandidates.length === 0) {
                console.log(`❌ User ${userId} không có sản phẩm tương tự để recommend\n`);
                return [];
            }

            // 3. Use RL Service to rank products (personalized cho user này)
            const recommendations = await RLClientService.getPersonalizedRecommendations(
                userId,
                finalCandidates,
                limit,
            );

            console.log(`🌟 Generated ${recommendations.length} personalized recommendations`);
            console.log(
                `📋 Top recommendations: ${recommendations
                    .slice(0, 3)
                    .map((r) => r.product.name)
                    .join(', ')}`,
            );
            console.log(`✨ === END PERSONALIZATION FOR USER: ${userId} ===\n`);

            // 4. Save recommendation to database for tracking
            await RLRecommendationService.saveRecommendation({
                userId,
                sessionId,
                recommendedProducts: recommendations.map((r, idx) => ({
                    productId: r.product._id,
                    score: r.score,
                    rank: idx + 1,
                    reason: `PPO score: ${r.score.toFixed(4)}`,
                })),
                userState: await RLClientService.getUserStateVector(userId),
                modelVersion: 'tensorflow-ppo-v1.0.0',
            });

            return recommendations.map((r) => r.product);
        } catch (error) {
            console.error('Error getting personalized recommendations:', error);
            throw error;
        }
    }

    /**
     * Get products user has already purchased
     */
    static async getUserPurchasedProducts({ userId }) {
        try {
            // Convert userId to ObjectId
            let userIdForQuery;
            if (userId instanceof mongoose.Types.ObjectId) {
                userIdForQuery = userId;
            } else {
                userIdForQuery = new mongoose.Types.ObjectId(userId.toString());
            }

            const payments = await Payment.find({
                userId: userIdForQuery, // Dùng ObjectId
                status: { $in: ['delivered', 'confirmed', 'shipped'] },
            }).select('products');

            const productIds = new Set();
            payments.forEach((payment) => {
                payment.products.forEach((p) => {
                    productIds.add(p.productId.toString());
                });
            });

            const products = await Product.find({
                _id: { $in: Array.from(productIds) },
            });

            return products;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get trending products (based on recent interactions)
     * @param {string} userId - Optional userId for personalized trending
     * @param {number} limit - Number of products to return
     * @param {number} days - Number of days to look back
     */
    static async getTrendingProducts({ userId = null, limit = 10, days = 7 }) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            // Nếu có userId, lấy personalized trending
            if (userId) {
                return await this.getPersonalizedTrendingProducts({ userId, limit, days });
            }

            // Không có userId, lấy global trending
            const trending = await UserInteraction.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate },
                        interactionType: { $in: ['view', 'click', 'purchase'] },
                    },
                },
                {
                    $group: {
                        _id: '$productId',
                        totalInteractions: { $sum: 1 },
                        purchases: {
                            $sum: { $cond: [{ $eq: ['$interactionType', 'purchase'] }, 1, 0] },
                        },
                        clicks: {
                            $sum: { $cond: [{ $eq: ['$interactionType', 'click'] }, 1, 0] },
                        },
                        views: {
                            $sum: { $cond: [{ $eq: ['$interactionType', 'view'] }, 1, 0] },
                        },
                    },
                },
                {
                    $addFields: {
                        score: {
                            $add: [{ $multiply: ['$purchases', 3] }, { $multiply: ['$clicks', 2] }, '$views'],
                        },
                    },
                },
                { $sort: { score: -1 } },
                { $limit: limit },
            ]);

            const productIds = trending.map((t) => t._id);
            const products = await Product.find({
                _id: { $in: productIds },
                status: 'active',
            }).populate('category', 'name');

            // Merge with scores
            const result = trending
                .map((t) => {
                    const product = products.find((p) => p._id.toString() === t._id.toString());
                    return {
                        product,
                        score: t.score,
                        interactions: {
                            total: t.totalInteractions,
                            purchases: t.purchases,
                            clicks: t.clicks,
                            views: t.views,
                        },
                    };
                })
                .filter((r) => r.product !== null);

            return result;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get personalized trending products for a specific user
     * Based on user's category preferences and interaction history
     */
    static async getPersonalizedTrendingProducts({ userId, limit = 10, days = 7 }) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            // Convert userId to ObjectId
            let userIdForQuery;
            if (userId instanceof mongoose.Types.ObjectId) {
                userIdForQuery = userId;
            } else {
                userIdForQuery = new mongoose.Types.ObjectId(userId.toString());
            }

            // 1. Lấy category preferences của user
            const userInteractions = await UserInteraction.find({
                userId: userIdForQuery, // Dùng ObjectId
                createdAt: { $gte: startDate },
            }).populate('productId');

            // Đếm interactions theo category
            const categoryScores = {};
            userInteractions.forEach((interaction) => {
                if (interaction.productId && interaction.productId.category) {
                    const catId = interaction.productId.category.toString();
                    if (!categoryScores[catId]) {
                        categoryScores[catId] = 0;
                    }
                    categoryScores[catId] += 1;
                }
            });

            // Lấy top categories của user
            const topCategories = Object.entries(categoryScores)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map((entry) => entry[0]);

            // 2. Nếu user chưa có interaction, fallback to global trending
            if (topCategories.length === 0) {
                return await this.getTrendingProducts({ userId: null, limit, days });
            }

            // 3. Lấy trending products từ categories mà user quan tâm
            const trending = await UserInteraction.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate },
                        interactionType: { $in: ['view', 'click', 'purchase'] },
                    },
                },
                {
                    $lookup: {
                        from: 'products',
                        localField: 'productId',
                        foreignField: '_id',
                        as: 'productData',
                    },
                },
                {
                    $unwind: '$productData',
                },
                {
                    $match: {
                        'productData.category': {
                            $in: topCategories.map((id) => new mongoose.Types.ObjectId(id)),
                        },
                    },
                },
                {
                    $group: {
                        _id: '$productId',
                        totalInteractions: { $sum: 1 },
                        purchases: {
                            $sum: { $cond: [{ $eq: ['$interactionType', 'purchase'] }, 1, 0] },
                        },
                        clicks: {
                            $sum: { $cond: [{ $eq: ['$interactionType', 'click'] }, 1, 0] },
                        },
                        views: {
                            $sum: { $cond: [{ $eq: ['$interactionType', 'view'] }, 1, 0] },
                        },
                    },
                },
                {
                    $addFields: {
                        score: {
                            $add: [{ $multiply: ['$purchases', 3] }, { $multiply: ['$clicks', 2] }, '$views'],
                        },
                    },
                },
                { $sort: { score: -1 } },
                { $limit: limit * 2 }, // Lấy nhiều hơn để filter
            ]);

            const productIds = trending.map((t) => t._id);
            const products = await Product.find({
                _id: { $in: productIds },
                status: 'active',
            }).populate('category', 'name');

            // 4. Loại bỏ sản phẩm user đã mua
            const purchasedProducts = await this.getUserPurchasedProducts({ userId });
            const purchasedIds = new Set(purchasedProducts.map((p) => p._id.toString()));

            // Merge with scores
            const result = trending
                .map((t) => {
                    const product = products.find((p) => p._id.toString() === t._id.toString());
                    return {
                        product,
                        score: t.score,
                        interactions: {
                            total: t.totalInteractions,
                            purchases: t.purchases,
                            clicks: t.clicks,
                            views: t.views,
                        },
                        isPersonalized: true,
                    };
                })
                .filter((r) => r.product !== null && !purchasedIds.has(r.product._id.toString()))
                .slice(0, limit);

            return result;
        } catch (error) {
            console.error('Error getting personalized trending:', error);
            // Fallback to global trending on error
            return await this.getTrendingProducts({ userId: null, limit, days });
        }
    }

    /**
     * Get similar products based on category and price
     */
    static async getSimilarProducts({ productId, limit = 10 }) {
        try {
            const product = await Product.findById(productId).populate('category');

            if (!product) {
                throw new Error('Product not found');
            }

            const priceRange = product.price * 0.3; // 30% price range

            const similarProducts = await Product.find({
                _id: { $ne: productId },
                category: product.category._id,
                status: 'active',
                price: {
                    $gte: product.price - priceRange,
                    $lte: product.price + priceRange,
                },
            })
                .populate('category', 'name')
                .limit(limit);

            return similarProducts;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get products for new users (cold start problem)
     */
    static async getColdStartRecommendations({ limit = 10 }) {
        try {
            // Get popular products (featured products + random active products)
            const featured = await Product.find({
                status: 'active',
                isFeatured: true,
            })
                .populate('category', 'name')
                .limit(limit);

            if (featured.length >= limit) {
                return featured;
            }

            // Fill with random active products
            const remaining = limit - featured.length;
            const random = await Product.aggregate([
                {
                    $match: {
                        status: 'active',
                        isFeatured: false,
                    },
                },
                { $sample: { size: remaining } },
            ]);

            const randomProducts = await Product.populate(random, {
                path: 'category',
                select: 'name',
            });

            return [...featured, ...randomProducts];
        } catch (error) {
            throw error;
        }
    }

    /**
     * Train PPO model with collected data
     */
    static async trainModel({ limit = 1000, minInteractions = 5 }) {
        try {
            const result = await this.ppoAgent.train({ limit, minInteractions });

            // Save model after training
            if (result.success) {
                const path = require('path');
                const fs = require('fs').promises;
                const modelDir = path.join(__dirname, '../ml/models');

                // Create directory if not exists
                await fs.mkdir(modelDir, { recursive: true });

                const modelPath = path.join(modelDir, 'ppo_model.json');
                await this.ppoAgent.saveModel(modelPath);
            }

            return result;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Evaluate model
     */
    static async evaluateModel() {
        try {
            // Get model info from RL Service
            const modelInfo = await RLClientService.getModelInfo();

            return {
                success: true,
                modelInfo,
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get recommendations for category page
     */
    static async getCategoryRecommendations({ userId, categoryId, limit = 10 }) {
        try {
            // Get products from category
            const products = await Product.find({
                category: categoryId,
                status: 'active',
            })
                .populate('category', 'name')
                .limit(50);

            if (!userId) {
                // No user, return random products from category
                return products.slice(0, limit);
            }

            // Get user state
            const userState = await RLRecommendationService.getUserState({ userId });

            // Score products using PPO
            const scored = await Promise.all(
                products.map(async (product) => {
                    const score = await this.ppoAgent.scoreProduct({ product, userState });
                    return { product, score };
                }),
            );

            // Sort by score
            scored.sort((a, b) => b.score - a.score);

            return scored.slice(0, limit).map((s) => s.product);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get personalized bundle recommendations
     */
    static async getBundleRecommendations({ userId, limit = 3 }) {
        try {
            // Get user's favorite categories
            const userState = await RLRecommendationService.getUserState({ userId });

            const bundles = [];

            // Create bundles from top categories
            for (const categoryPref of userState.categoryPreferences?.slice(0, limit) || []) {
                const products = await Product.find({
                    category: categoryPref._id,
                    status: 'active',
                })
                    .populate('category', 'name')
                    .limit(3);

                if (products.length >= 2) {
                    bundles.push({
                        name: `Combo ${categoryPref.category?.name || 'Sản phẩm'}`,
                        products,
                        totalPrice: products.reduce((sum, p) => sum + p.price, 0),
                        discount: 10, // 10% bundle discount
                    });
                }
            }

            return bundles.slice(0, limit);
        } catch (error) {
            throw error;
        }
    }
}

// Export singleton instance
module.exports = RecommendationService;
