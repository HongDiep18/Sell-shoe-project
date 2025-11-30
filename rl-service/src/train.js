const tf = require('@tensorflow/tfjs-node');
const PPOModel = require('./model');
const DataLoader = require('./dataLoader');
const { TrajectoryBuilder } = require('./env');
const config = require('./config');
const fs = require('fs');
const path = require('path');

/**
 * PPO Trainer
 * Implements Proximal Policy Optimization algorithm
 */
class PPOTrainer {
    constructor(userId = null) {
        this.userId = userId; // For personalized training
        this.model = new PPOModel(userId);
        this.dataLoader = new DataLoader();
        this.trajectoryBuilder = new TrajectoryBuilder();

        // Hyperparameters
        this.gamma = config.gamma;
        this.lambda = config.lambda;
        this.epsilon = config.epsilon;
        this.epochs = config.epochs;
        this.batchSize = config.batchSize;

        // Training stats
        this.trainingStats = {
            episodes: 0,
            totalReward: 0,
            avgReward: 0,
            policyLoss: 0,
            valueLoss: 0,
            entropy: 0,
        };
    }

    /**
     * Initialize trainer
     */
    async initialize() {
        if (this.userId) {
            console.log(`🚀 Initializing PPO Trainer for user ${this.userId}...`);
        } else {
            console.log('🚀 Initializing PPO Trainer (global model)...');
        }

        // Connect to MongoDB
        await this.dataLoader.connect();

        // Build or load model
        const loaded = await this.model.loadModel();
        if (!loaded) {
            console.log('📦 Building new model...');
            this.model.build();
        }

        console.log('✅ Trainer initialized');
    }

    /**
     * Main training loop
     */
    async train(numIterations = 10) {
        if (this.userId) {
            console.log(`\n🎯 Starting PPO Training for user ${this.userId}...`);
        } else {
            console.log('\n🎯 Starting PPO Training (global model)...');
        }
        console.log(`Iterations: ${numIterations}`);
        console.log(`Epochs per iteration: ${this.epochs}`);
        console.log(`Batch size: ${this.batchSize}`);
        console.log('─'.repeat(60));

        for (let iteration = 0; iteration < numIterations; iteration++) {
            console.log(`\n📊 Iteration ${iteration + 1}/${numIterations}`);

            // Load trajectories from MongoDB (filtered by userId if set)
            const trajectories = await this.dataLoader.loadTrajectories(this.userId, config.maxTrajectories);

            if (trajectories.length < config.minTrajectoryLength) {
                console.log(`⚠️  Not enough trajectories (${trajectories.length}). Skipping...`);
                continue;
            }

            // Store trajectories
            this.trajectoryBuilder.clear();
            trajectories.forEach((t) => {
                this.trajectoryBuilder.addTransition(t.state, t.action, t.reward, t.nextState, t.done);
            });

            // Compute values for all states
            const states = trajectories.map((t) => t.state);
            const statesTensor = tf.tensor2d(states);
            const values = this.model.getStateValues(statesTensor);
            const valuesArray = values.arraySync().map((v) => v[0]);

            // Compute advantages using GAE
            const advantages = this.trajectoryBuilder.computeAdvantages(valuesArray, this.gamma, this.lambda);

            // Normalize advantages
            const normalizedAdvantages = this.trajectoryBuilder.normalizeAdvantages(advantages);

            // Compute returns
            const returns = this.trajectoryBuilder.computeReturns(this.gamma);

            // Get old action probabilities
            const actions = trajectories.map((t) => t.action);
            const oldProbs = await this.getActionProbabilities(states, actions);

            // PPO update for multiple epochs
            let totalPolicyLoss = 0;
            let totalValueLoss = 0;
            let totalEntropy = 0;

            for (let epoch = 0; epoch < this.epochs; epoch++) {
                const losses = await this.ppoUpdate(states, actions, oldProbs, normalizedAdvantages, returns);

                totalPolicyLoss += losses.policyLoss;
                totalValueLoss += losses.valueLoss;
                totalEntropy += losses.entropy;
            }

            // Update stats
            const avgReward = trajectories.reduce((sum, t) => sum + t.reward, 0) / trajectories.length;
            this.trainingStats = {
                episodes: iteration + 1,
                totalReward: trajectories.reduce((sum, t) => sum + t.reward, 0),
                avgReward,
                policyLoss: totalPolicyLoss / this.epochs,
                valueLoss: totalValueLoss / this.epochs,
                entropy: totalEntropy / this.epochs,
            };

            // Log progress
            console.log(`  Trajectories: ${trajectories.length}`);
            console.log(`  Avg Reward: ${avgReward.toFixed(4)}`);
            console.log(`  Policy Loss: ${this.trainingStats.policyLoss.toFixed(4)}`);
            console.log(`  Value Loss: ${this.trainingStats.valueLoss.toFixed(4)}`);
            console.log(`  Entropy: ${this.trainingStats.entropy.toFixed(4)}`);

            // Cleanup
            statesTensor.dispose();
            values.dispose();

            // Save model periodically
            if ((iteration + 1) % 5 === 0) {
                await this.saveCheckpoint(iteration + 1);
            }
        }

        // Final save
        await this.model.saveModel();
        await this.saveTrainingStats();

        console.log('\n✅ Training completed!');
        console.log('─'.repeat(60));
        this.printFinalStats();
    }

    /**
     * PPO Update Step
     * Implements clipped surrogate objective
     */
    async ppoUpdate(states, actions, oldProbs, advantages, returns) {
        return tf.tidy(() => {
            const statesTensor = tf.tensor2d(states);
            const actionsTensor = tf.tensor1d(actions, 'int32');
            const oldProbsTensor = tf.tensor1d(oldProbs);
            const advantagesTensor = tf.tensor1d(advantages);
            const returnsTensor = tf.tensor1d(returns);

            // Policy update
            const policyLoss = this.model.policyOptimizer.minimize(() => {
                // Get current action probabilities
                const logits = this.model.policyNetwork.predict(statesTensor);
                const probs = tf.softmax(logits);

                // Get probabilities for selected actions
                const actionProbs = tf.gather(probs, actionsTensor, 1);
                const actionProbsFlat = tf.squeeze(actionProbs);

                // Compute ratio
                const ratio = tf.div(actionProbsFlat, tf.add(oldProbsTensor, 1e-8));

                // Clipped surrogate objective
                const clippedRatio = tf.clipByValue(ratio, 1 - this.epsilon, 1 + this.epsilon);

                const surr1 = tf.mul(ratio, advantagesTensor);
                const surr2 = tf.mul(clippedRatio, advantagesTensor);
                const policyLoss = tf.neg(tf.mean(tf.minimum(surr1, surr2)));

                // Entropy bonus for exploration
                const logProbs = tf.log(tf.add(probs, 1e-8));
                const entropy = tf.neg(tf.sum(tf.mul(probs, logProbs), -1));
                const entropyBonus = tf.mul(tf.mean(entropy), 0.01);

                // Total loss
                const totalLoss = tf.sub(policyLoss, entropyBonus);

                return totalLoss;
            }, true);

            // Value update
            const valueLoss = this.model.valueOptimizer.minimize(() => {
                const predictedValues = this.model.valueNetwork.predict(statesTensor);
                const predictedValuesFlat = tf.squeeze(predictedValues);

                // MSE loss
                const valueLoss = tf.mean(tf.square(tf.sub(predictedValuesFlat, returnsTensor)));

                return valueLoss;
            }, true);

            // Compute entropy for logging
            const logits = this.model.policyNetwork.predict(statesTensor);
            const probs = tf.softmax(logits);
            const logProbs = tf.log(tf.add(probs, 1e-8));
            const entropy = tf.mean(tf.neg(tf.sum(tf.mul(probs, logProbs), -1)));

            const losses = {
                policyLoss: policyLoss.dataSync()[0],
                valueLoss: valueLoss.dataSync()[0],
                entropy: entropy.dataSync()[0],
            };

            return losses;
        });
    }

    /**
     * Get action probabilities for given states and actions
     */
    async getActionProbabilities(states, actions) {
        return tf.tidy(() => {
            const statesTensor = tf.tensor2d(states);
            const actionsTensor = tf.tensor1d(actions, 'int32');

            const logits = this.model.policyNetwork.predict(statesTensor);
            const probs = tf.softmax(logits);

            const actionProbs = tf.gather(probs, actionsTensor, 1);
            const actionProbsArray = actionProbs.arraySync().map((p) => p[0]);

            return actionProbsArray;
        });
    }

    /**
     * Save checkpoint
     */
    async saveCheckpoint(iteration) {
        console.log(`💾 Saving checkpoint at iteration ${iteration}...`);
        await this.model.saveModel();

        // Save training stats
        const statsPath = path.join(config.logDir, `stats_iter_${iteration}.json`);
        if (!fs.existsSync(config.logDir)) {
            fs.mkdirSync(config.logDir, { recursive: true });
        }
        fs.writeFileSync(statsPath, JSON.stringify(this.trainingStats, null, 2));

        console.log('✅ Checkpoint saved');
    }

    /**
     * Save final training stats
     */
    async saveTrainingStats() {
        const statsPath = path.join(config.logDir, 'final_stats.json');
        if (!fs.existsSync(config.logDir)) {
            fs.mkdirSync(config.logDir, { recursive: true });
        }

        const stats = {
            ...this.trainingStats,
            timestamp: new Date().toISOString(),
            config: {
                gamma: this.gamma,
                lambda: this.lambda,
                epsilon: this.epsilon,
                epochs: this.epochs,
                batchSize: this.batchSize,
            },
        };

        fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
        console.log(`📊 Training stats saved to ${statsPath}`);
    }

    /**
     * Print final statistics
     */
    printFinalStats() {
        console.log('\n📈 Final Training Statistics:');
        console.log(`  Total Episodes: ${this.trainingStats.episodes}`);
        console.log(`  Total Reward: ${this.trainingStats.totalReward.toFixed(2)}`);
        console.log(`  Average Reward: ${this.trainingStats.avgReward.toFixed(4)}`);
        console.log(`  Final Policy Loss: ${this.trainingStats.policyLoss.toFixed(4)}`);
        console.log(`  Final Value Loss: ${this.trainingStats.valueLoss.toFixed(4)}`);
        console.log(`  Final Entropy: ${this.trainingStats.entropy.toFixed(4)}`);
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        await this.dataLoader.close();
        this.model.dispose();
        console.log('✅ Cleanup completed');
    }
}

/**
 * Main training script
 */
async function main() {
    // Get userId from command line: node train.js [userId]
    const userId = process.argv[2] || null;

    const trainer = new PPOTrainer(userId);

    try {
        await trainer.initialize();
        await trainer.train(10); // 10 iterations
    } catch (error) {
        console.error('❌ Training error:', error);
    } finally {
        await trainer.cleanup();
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = PPOTrainer;
