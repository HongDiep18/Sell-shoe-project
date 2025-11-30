/**
 * Script để insert fake interactions cho testing personalization
 * Usage: node test-insert-interactions.js <userId1> <userId2>
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose
    .connect(process.env.CONNECT_DB)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

// Define UserInteraction schema
const userInteractionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Products', required: true },
    interactionType: { type: String, enum: ['view', 'click', 'add_to_cart', 'purchase'], required: true },
    sessionId: String,
    createdAt: { type: Date, default: Date.now },
});

const UserInteraction = mongoose.model('UserInteraction', userInteractionSchema);
const Product = mongoose.model('Products', new mongoose.Schema({}));

async function insertTestInteractions() {
    try {
        const userId1 = process.argv[2];
        const userId2 = process.argv[3];

        if (!userId1 || !userId2) {
            console.error('❌ Usage: node test-insert-interactions.js <userId1> <userId2>');
            console.log('Example: node test-insert-interactions.js 674xxx 675yyy');
            process.exit(1);
        }

        console.log(`\n🎯 Creating test interactions for:`);
        console.log(`   User 1: ${userId1}`);
        console.log(`   User 2: ${userId2}\n`);

        // Get some products
        const allProducts = await Product.find({ status: 'active' }).limit(50).lean();

        if (allProducts.length === 0) {
            console.error('❌ No products found in database!');
            process.exit(1);
        }

        console.log(`📦 Found ${allProducts.length} products in database`);

        // Filter products by brand (assuming brand is first word in name)
        const nikeProducts = allProducts.filter((p) => p.name && p.name.toLowerCase().includes('nike'));
        const adidasProducts = allProducts.filter((p) => p.name && p.name.toLowerCase().includes('adidas'));

        console.log(`\n🏷️  Nike products: ${nikeProducts.length}`);
        console.log(`🏷️  Adidas products: ${adidasProducts.length}\n`);

        if (nikeProducts.length === 0 || adidasProducts.length === 0) {
            console.warn('⚠️  Warning: Not enough Nike or Adidas products. Using random products instead.');
        }

        // Delete existing interactions for these users
        const deleted1 = await UserInteraction.deleteMany({ userId: userId1 });
        const deleted2 = await UserInteraction.deleteMany({ userId: userId2 });
        console.log(`🗑️  Deleted ${deleted1.deletedCount} old interactions for User 1`);
        console.log(`🗑️  Deleted ${deleted2.deletedCount} old interactions for User 2\n`);

        // Create interactions for User 1 (Nike lover)
        const user1Products = nikeProducts.length > 0 ? nikeProducts.slice(0, 5) : allProducts.slice(0, 5);
        const user1Interactions = user1Products.map((product) => ({
            userId: userId1,
            productId: product._id,
            interactionType: 'view',
            sessionId: `test_session_${Date.now()}`,
            createdAt: new Date(),
        }));

        await UserInteraction.insertMany(user1Interactions);
        console.log(`✅ Created ${user1Interactions.length} interactions for User 1 (${userId1})`);
        console.log(`   Products: ${user1Products.map((p) => p.name).join(', ')}\n`);

        // Create interactions for User 2 (Adidas lover)
        const user2Products = adidasProducts.length > 0 ? adidasProducts.slice(0, 5) : allProducts.slice(5, 10);
        const user2Interactions = user2Products.map((product) => ({
            userId: userId2,
            productId: product._id,
            interactionType: 'view',
            sessionId: `test_session_${Date.now()}`,
            createdAt: new Date(),
        }));

        await UserInteraction.insertMany(user2Interactions);
        console.log(`✅ Created ${user2Interactions.length} interactions for User 2 (${userId2})`);
        console.log(`   Products: ${user2Products.map((p) => p.name).join(', ')}\n`);

        console.log('🎉 Test interactions created successfully!');
        console.log('\n📝 Next steps:');
        console.log('   1. Login as User 1 and refresh the homepage');
        console.log('   2. Click "🔄 Refresh" button');
        console.log('   3. Should see Nike products in recommendations');
        console.log('   4. Logout and login as User 2');
        console.log('   5. Should see Adidas products in recommendations\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

insertTestInteractions();
