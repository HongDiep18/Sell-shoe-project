/**
 * Script để debug recommendation system
 * Kiểm tra database structure và tìm root cause
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Models
const Product = mongoose.model(
    'Products',
    new mongoose.Schema({
        name: String,
        category: mongoose.Schema.Types.Mixed,
        status: String,
        quantity: Number,
    }),
);

const UserInteraction = mongoose.model(
    'userInteraction',
    new mongoose.Schema({
        userId: mongoose.Schema.Types.ObjectId,
        productId: mongoose.Schema.Types.ObjectId,
        interactionType: String,
        createdAt: Date,
    }),
);

const Category = mongoose.model(
    'category',
    new mongoose.Schema({
        name: String,
        categoryName: String,
    }),
);

async function debugRecommendations() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.CONNECT_DB);
        console.log('✅ Connected!\n');

        // ========== 1. CHECK PRODUCT SCHEMA ==========
        console.log('📦 === CHECKING PRODUCT COLLECTION ===\n');

        const totalProducts = await Product.countDocuments();
        console.log(`Total products: ${totalProducts}`);

        const activeProducts = await Product.countDocuments({ status: 'active' });
        console.log(`Active products: ${activeProducts}`);

        // Get sample product
        const sampleProduct = await Product.findOne().lean();
        if (sampleProduct) {
            console.log('\n🔍 Sample Product:');
            console.log('  Name:', sampleProduct.name);
            console.log('  Category field type:', typeof sampleProduct.category);
            console.log('  Category value:', sampleProduct.category);
            console.log('  Status:', sampleProduct.status);
            console.log('  Quantity:', sampleProduct.quantity);
        }

        // ========== 2. CHECK CATEGORY COLLECTION ==========
        console.log('\n\n📂 === CHECKING CATEGORY COLLECTION ===\n');

        const totalCategories = await Category.countDocuments();
        console.log(`Total categories: ${totalCategories}`);

        const sampleCategory = await Category.findOne().lean();
        if (sampleCategory) {
            console.log('\n🔍 Sample Category:');
            console.log('  ID:', sampleCategory._id);
            console.log('  ID type:', typeof sampleCategory._id);
            console.log('  Name:', sampleCategory.name || sampleCategory.categoryName);
        }

        // ========== 3. CHECK USER INTERACTIONS ==========
        console.log('\n\n👤 === CHECKING USER INTERACTIONS ===\n');

        // Get a user with interactions
        const recentInteraction = await UserInteraction.findOne().sort({ createdAt: -1 }).lean();

        if (!recentInteraction) {
            console.log('❌ No interactions found!');
            process.exit(1);
        }

        const testUserId = recentInteraction.userId;
        console.log('Test User ID:', testUserId);

        const userInteractions = await UserInteraction.find({
            userId: testUserId,
            interactionType: { $in: ['view', 'click'] },
        })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        console.log(`User has ${userInteractions.length} recent interactions`);

        // Get product IDs user viewed
        const viewedProductIds = userInteractions.map((i) => i.productId);
        console.log('Viewed product IDs:', viewedProductIds);

        // ========== 4. CHECK VIEWED PRODUCTS ==========
        console.log('\n\n👀 === CHECKING VIEWED PRODUCTS ===\n');

        const viewedProducts = await Product.find({
            _id: { $in: viewedProductIds },
        }).lean();

        console.log(`Found ${viewedProducts.length} viewed products`);

        if (viewedProducts.length > 0) {
            const firstProduct = viewedProducts[0];
            console.log('\n🔍 First Viewed Product:');
            console.log('  Name:', firstProduct.name);
            console.log('  Category field type:', typeof firstProduct.category);
            console.log('  Category value:', firstProduct.category);

            // Collect category IDs
            const categoryIds = viewedProducts.map((p) => p.category).filter((c) => c);

            console.log('\nCategory IDs from viewed products:');
            categoryIds.forEach((catId, i) => {
                console.log(`  ${i + 1}. Type: ${typeof catId}, Value: ${catId}`);
            });

            // ========== 5. TEST QUERIES ==========
            console.log('\n\n🧪 === TESTING QUERIES ===\n');

            const uniqueCategoryIds = [...new Set(categoryIds.map((c) => c.toString()))];
            console.log('Unique category IDs (as strings):', uniqueCategoryIds);

            // Test 1: Query with ObjectId
            console.log('\n--- Test 1: Query with ObjectId array ---');
            const objectIdArray = uniqueCategoryIds.map((id) => new mongoose.Types.ObjectId(id));
            console.log('Query:', { category: { $in: objectIdArray } });

            const resultsWithObjectId = await Product.countDocuments({
                category: { $in: objectIdArray },
                status: 'active',
            });
            console.log(`✅ Results: ${resultsWithObjectId} products`);

            if (resultsWithObjectId > 0) {
                const sample = await Product.findOne({
                    category: { $in: objectIdArray },
                    status: 'active',
                }).lean();
                console.log('Sample result:', {
                    name: sample.name,
                    category: sample.category,
                    status: sample.status,
                });
            }

            // Test 2: Query with String array
            console.log('\n--- Test 2: Query with String array ---');
            console.log('Query:', { category: { $in: uniqueCategoryIds } });

            const resultsWithString = await Product.countDocuments({
                category: { $in: uniqueCategoryIds },
                status: 'active',
            });
            console.log(`✅ Results: ${resultsWithString} products`);

            // Test 3: Query without $in
            console.log('\n--- Test 3: Direct category match (first category) ---');
            const firstCatId = categoryIds[0];

            console.log('Query with raw value:', { category: firstCatId });
            const resultsDirect = await Product.countDocuments({
                category: firstCatId,
                status: 'active',
            });
            console.log(`✅ Results: ${resultsDirect} products`);

            console.log('\nQuery with ObjectId:', { category: new mongoose.Types.ObjectId(firstCatId.toString()) });
            const resultsDirectObjectId = await Product.countDocuments({
                category: new mongoose.Types.ObjectId(firstCatId.toString()),
                status: 'active',
            });
            console.log(`✅ Results: ${resultsDirectObjectId} products`);

            // ========== 6. RECOMMENDATION ==========
            console.log('\n\n💡 === RECOMMENDATION ===\n');

            if (resultsWithObjectId > 0) {
                console.log('✅ Query với ObjectId ĐÚNG! Dùng ObjectId array.');
            } else if (resultsWithString > 0) {
                console.log('⚠️  Query với String ĐÚNG! Category field là String, không phải ObjectId.');
                console.log('🔧 FIX: Không cần convert sang ObjectId, dùng string array trực tiếp.');
            } else if (resultsDirect > 0) {
                console.log('⚠️  Direct query ĐÚNG nhưng $in query SAI!');
                console.log('🔧 FIX: Có thể vấn đề với array construction.');
            } else {
                console.log('❌ TẤT CẢ queries đều FAIL!');
                console.log('🔧 Cần kiểm tra lại schema hoặc data consistency.');
            }
        }

        console.log('\n✅ Debug complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Run
debugRecommendations();
