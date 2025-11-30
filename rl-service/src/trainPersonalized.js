const PPOTrainer = require('./train');
const DataLoader = require('./dataLoader');

/**
 * Train personalized models for all active users
 * Tự động tìm các user có đủ dữ liệu và train model riêng cho từng user
 */
async function trainPersonalizedModels() {
    console.log('='.repeat(70));
    console.log('🎯 PERSONALIZED PPO TRAINING');
    console.log('Train separate models for each active user');
    console.log('='.repeat(70));

    const dataLoader = new DataLoader();

    try {
        // Connect to MongoDB
        await dataLoader.connect();

        // Get list of active users with enough data
        const minTrajectories = 50; // Minimum trajectories required
        const activeUsers = await dataLoader.getActiveUsers(minTrajectories);

        if (activeUsers.length === 0) {
            console.log('⚠️  No active users found with sufficient data.');
            console.log(`Minimum required: ${minTrajectories} trajectories per user`);
            return;
        }

        console.log(`\n📊 Found ${activeUsers.length} active users to train`);
        console.log('─'.repeat(70));

        // Train model for each user
        for (let i = 0; i < activeUsers.length; i++) {
            const userId = activeUsers[i];

            console.log(`\n${'='.repeat(70)}`);
            console.log(`👤 Training model for user ${i + 1}/${activeUsers.length}`);
            console.log(`User ID: ${userId}`);
            console.log(`${'='.repeat(70)}`);

            const trainer = new PPOTrainer(userId);

            try {
                await trainer.initialize();
                await trainer.train(10); // 10 iterations per user
                console.log(`✅ Training completed for user ${userId}`);
            } catch (error) {
                console.error(`❌ Error training user ${userId}:`, error.message);
            } finally {
                await trainer.cleanup();
            }
        }

        console.log('\n' + '='.repeat(70));
        console.log('🎉 PERSONALIZED TRAINING COMPLETED!');
        console.log(`Total users trained: ${activeUsers.length}`);
        console.log('='.repeat(70));
    } catch (error) {
        console.error('❌ Fatal error:', error);
    } finally {
        await dataLoader.close();
    }
}

/**
 * Train model for a specific user
 */
async function trainSingleUser(userId) {
    console.log('='.repeat(70));
    console.log(`🎯 TRAINING MODEL FOR USER: ${userId}`);
    console.log('='.repeat(70));

    const trainer = new PPOTrainer(userId);

    try {
        await trainer.initialize();
        await trainer.train(10);
        console.log(`\n✅ Training completed for user ${userId}`);
    } catch (error) {
        console.error('❌ Training error:', error);
    } finally {
        await trainer.cleanup();
    }
}

// Command line usage
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        // No arguments: train all active users
        console.log('\n💡 Usage:');
        console.log('  node trainPersonalized.js          # Train all active users');
        console.log('  node trainPersonalized.js <userId> # Train specific user\n');

        trainPersonalizedModels().catch(console.error);
    } else {
        // With userId argument: train specific user
        const userId = args[0];
        trainSingleUser(userId).catch(console.error);
    }
}

module.exports = {
    trainPersonalizedModels,
    trainSingleUser,
};
