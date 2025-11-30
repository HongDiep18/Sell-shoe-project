const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');
const path = require('path');
const config = require('./config');

/**
 * PPO Model: Policy Network and Value Network
 *
 * Policy Network: state -> action probabilities
 * Value Network: state -> state value
 */
class PPOModel {
    constructor(userId = null) {
        this.userId = userId; // For personalized models
        this.stateDim = config.stateDim;
        this.actionDim = config.actionDim;
        this.hiddenDim = config.hiddenDim;
        this.learningRate = config.learningRate;

        this.policyNetwork = null;
        this.valueNetwork = null;
        this.policyOptimizer = null;
        this.valueOptimizer = null;
    }

    /**
     * Build Policy Network
     * Input: state vector (stateDim)
     * Output: action logits (actionDim)
     */
    buildPolicyNetwork() {
        const input = tf.input({ shape: [this.stateDim] });

        // Hidden layers
        let x = tf.layers
            .dense({
                units: this.hiddenDim,
                activation: 'relu',
                kernelInitializer: 'heNormal',
                name: 'policy_hidden1',
            })
            .apply(input);

        x = tf.layers.dropout({ rate: 0.2 }).apply(x);

        x = tf.layers
            .dense({
                units: this.hiddenDim,
                activation: 'relu',
                kernelInitializer: 'heNormal',
                name: 'policy_hidden2',
            })
            .apply(x);

        // Output layer (logits)
        const output = tf.layers
            .dense({
                units: this.actionDim,
                activation: 'linear',
                kernelInitializer: 'glorotUniform',
                name: 'policy_output',
            })
            .apply(x);

        this.policyNetwork = tf.model({
            inputs: input,
            outputs: output,
            name: 'policy_network',
        });

        this.policyOptimizer = tf.train.adam(this.learningRate);

        console.log('✅ Policy Network built');
        this.policyNetwork.summary();
    }

    /**
     * Build Value Network
     * Input: state vector (stateDim)
     * Output: state value (scalar)
     */
    buildValueNetwork() {
        const input = tf.input({ shape: [this.stateDim] });

        // Hidden layers
        let x = tf.layers
            .dense({
                units: this.hiddenDim,
                activation: 'relu',
                kernelInitializer: 'heNormal',
                name: 'value_hidden1',
            })
            .apply(input);

        x = tf.layers.dropout({ rate: 0.2 }).apply(x);

        x = tf.layers
            .dense({
                units: this.hiddenDim,
                activation: 'relu',
                kernelInitializer: 'heNormal',
                name: 'value_hidden2',
            })
            .apply(x);

        // Output layer (single value)
        const output = tf.layers
            .dense({
                units: 1,
                activation: 'linear',
                kernelInitializer: 'glorotUniform',
                name: 'value_output',
            })
            .apply(x);

        this.valueNetwork = tf.model({
            inputs: input,
            outputs: output,
            name: 'value_network',
        });

        this.valueOptimizer = tf.train.adam(this.learningRate);

        console.log('✅ Value Network built');
        this.valueNetwork.summary();
    }

    /**
     * Initialize both networks
     */
    build() {
        this.buildPolicyNetwork();
        this.buildValueNetwork();
    }

    /**
     * Get action probabilities from policy network
     */
    getActionProbs(states) {
        return tf.tidy(() => {
            const logits = this.policyNetwork.predict(states);
            const probs = tf.softmax(logits);
            return probs;
        });
    }

    /**
     * Get state values from value network
     */
    getStateValues(states) {
        return tf.tidy(() => {
            return this.valueNetwork.predict(states);
        });
    }

    /**
     * Get model paths (personalized by userId if set)
     */
    getModelPaths() {
        if (this.userId) {
            // Personalized model paths
            return {
                policyDir: path.resolve(config.policyModelPath, this.userId),
                valueDir: path.resolve(config.valueModelPath, this.userId),
            };
        } else {
            // Global model paths
            return {
                policyDir: path.resolve(config.policyModelPath),
                valueDir: path.resolve(config.valueModelPath),
            };
        }
    }

    /**
     * Save models to disk
     */
    async saveModel() {
        try {
            // Create directories if not exist
            const { policyDir, valueDir } = this.getModelPaths();

            if (!fs.existsSync(policyDir)) {
                fs.mkdirSync(policyDir, { recursive: true });
            }
            if (!fs.existsSync(valueDir)) {
                fs.mkdirSync(valueDir, { recursive: true });
            }

            // Save policy network
            await this.policyNetwork.save(`file://${policyDir}`);
            console.log(`✅ Policy network saved to ${policyDir}`);

            // Save value network
            await this.valueNetwork.save(`file://${valueDir}`);
            console.log(`✅ Value network saved to ${valueDir}`);

            // Save metadata
            const metadata = {
                userId: this.userId,
                stateDim: this.stateDim,
                actionDim: this.actionDim,
                hiddenDim: this.hiddenDim,
                learningRate: this.learningRate,
                savedAt: new Date().toISOString(),
            };

            fs.writeFileSync(path.join(policyDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

            return true;
        } catch (error) {
            console.error('❌ Error saving model:', error);
            throw error;
        }
    }

    /**
     * Load models from disk
     */
    async loadModel() {
        try {
            const { policyDir, valueDir } = this.getModelPaths();

            // Check if models exist
            if (!fs.existsSync(path.join(policyDir, 'model.json'))) {
                console.log('⚠️  No saved policy model found. Building new model...');
                this.build();
                return false;
            }

            // Load policy network
            this.policyNetwork = await tf.loadLayersModel(`file://${policyDir}/model.json`);
            console.log('✅ Policy network loaded');

            // Load value network
            this.valueNetwork = await tf.loadLayersModel(`file://${valueDir}/model.json`);
            console.log('✅ Value network loaded');

            // Load metadata
            const metadataPath = path.join(policyDir, 'metadata.json');
            if (fs.existsSync(metadataPath)) {
                const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                console.log('📊 Model metadata:', metadata);
            }

            // Initialize optimizers
            this.policyOptimizer = tf.train.adam(this.learningRate);
            this.valueOptimizer = tf.train.adam(this.learningRate);

            return true;
        } catch (error) {
            console.error('❌ Error loading model:', error);
            console.log('⚠️  Building new model...');
            this.build();
            return false;
        }
    }

    /**
     * Dispose models to free memory
     */
    dispose() {
        if (this.policyNetwork) {
            this.policyNetwork.dispose();
        }
        if (this.valueNetwork) {
            this.valueNetwork.dispose();
        }
        if (this.policyOptimizer) {
            this.policyOptimizer.dispose();
        }
        if (this.valueOptimizer) {
            this.valueOptimizer.dispose();
        }
    }
}

module.exports = PPOModel;
