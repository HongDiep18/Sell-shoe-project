const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const PPOModel = require('./model');
const InferenceEngine = require('./inference');
const DataLoader = require('./dataLoader');
const config = require('./config');

/**
 * RL Service API Server
 * Provides endpoints for product ranking using trained PPO model
 */
class RLServiceAPI {
    constructor() {
        this.app = express();
        this.globalModel = null; // Global fallback model
        this.userModels = new Map(); // Cache of personalized models
        this.inferenceEngines = new Map(); // Cache of inference engines
        this.dataLoader = null;
        this.isReady = false;
    }

    /**
     * Initialize the service
     */
    async initialize() {
        console.log('🚀 Initializing RL Service...');

        // Initialize global model as fallback
        this.globalModel = new PPOModel();
        const loaded = await this.globalModel.loadModel();

        if (!loaded) {
            console.log('⚠️  No global model found. Building default model...');
            this.globalModel.build();
        } else {
            console.log('✅ Global model loaded as fallback');
        }

        // Initialize data loader
        this.dataLoader = new DataLoader();
        await this.dataLoader.connect();

        this.isReady = true;
        console.log('✅ RL Service initialized (personalized mode)');
    }

    /**
     * Setup middleware
     */
    setupMiddleware() {
        this.app.use(cors());
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(morgan('dev'));
    }

    /**
     * Setup routes
     */
    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                ready: this.isReady,
                timestamp: new Date().toISOString(),
            });
        });

        // Rank products endpoint (personalized)
        this.app.post('/rank-products', async (req, res) => {
            try {
                if (!this.isReady) {
                    return res.status(503).json({
                        error: 'Service not ready',
                        message: 'Model is still loading or not trained',
                    });
                }

                const { userId, state, candidates } = req.body;

                // Validate input
                if (!state || !Array.isArray(state)) {
                    return res.status(400).json({
                        error: 'Invalid input',
                        message: 'state must be an array',
                    });
                }

                if (!candidates || !Array.isArray(candidates)) {
                    return res.status(400).json({
                        error: 'Invalid input',
                        message: 'candidates must be an array',
                    });
                }

                if (state.length !== config.stateDim) {
                    return res.status(400).json({
                        error: 'Invalid state dimension',
                        message: `state must have ${config.stateDim} dimensions`,
                    });
                }

                // Get inference engine (personalized or global)
                const inferenceEngine = await this.getInferenceEngine(userId);
                const modelType = userId && this.userModels.has(userId) ? 'personalized' : 'global';

                // Rank products
                const ranking = await inferenceEngine.rankProducts(state, candidates);

                // Extract product IDs
                const recommended = ranking.map((item) => ({
                    productId: item.productId,
                    score: item.score,
                    rank: ranking.indexOf(item) + 1,
                }));

                res.json({
                    recommended,
                    total: candidates.length,
                    topK: ranking.length,
                    modelType, // Indicate which model was used
                });
            } catch (error) {
                console.error('Error ranking products:', error);
                res.status(500).json({
                    error: 'Internal server error',
                    message: error.message,
                });
            }
        });

        // Get user state endpoint
        this.app.post('/get-user-state', async (req, res) => {
            try {
                if (!this.isReady) {
                    return res.status(503).json({
                        error: 'Service not ready',
                    });
                }

                const { userId } = req.body;

                if (!userId) {
                    return res.status(400).json({
                        error: 'Invalid input',
                        message: 'userId is required',
                    });
                }

                // Build user state from MongoDB
                const state = await this.dataLoader.buildUserState(userId);

                res.json({
                    userId,
                    state,
                    stateDim: state.length,
                });
            } catch (error) {
                console.error('Error getting user state:', error);
                res.status(500).json({
                    error: 'Internal server error',
                    message: error.message,
                });
            }
        });

        // Model info endpoint
        this.app.get('/model-info', (req, res) => {
            try {
                const info = {
                    stateDim: config.stateDim,
                    actionDim: config.actionDim,
                    hiddenDim: config.hiddenDim,
                    learningRate: config.learningRate,
                    gamma: config.gamma,
                    epsilon: config.epsilon,
                    topK: config.topK,
                    ready: this.isReady,
                };

                res.json(info);
            } catch (error) {
                console.error('Error getting model info:', error);
                res.status(500).json({
                    error: 'Internal server error',
                    message: error.message,
                });
            }
        });

        // Reload model endpoint
        this.app.post('/reload-model', async (req, res) => {
            try {
                const { userId } = req.body;

                if (userId) {
                    // Reload specific user model
                    console.log(`🔄 Reloading model for user ${userId}...`);

                    // Remove from cache
                    if (this.userModels.has(userId)) {
                        this.userModels.get(userId).dispose();
                        this.userModels.delete(userId);
                        this.inferenceEngines.delete(userId);
                    }

                    // Force reload
                    await this.getInferenceEngine(userId);

                    res.json({
                        message: `Model reloaded for user ${userId}`,
                        timestamp: new Date().toISOString(),
                    });
                } else {
                    // Reload global model
                    console.log('🔄 Reloading global model...');

                    if (this.globalModel) {
                        this.globalModel.dispose();
                    }

                    this.globalModel = new PPOModel();
                    const loaded = await this.globalModel.loadModel();

                    if (!loaded) {
                        return res.status(404).json({
                            error: 'Model not found',
                            message: 'No trained global model available',
                        });
                    }

                    console.log('✅ Global model reloaded');

                    res.json({
                        message: 'Global model reloaded successfully',
                        timestamp: new Date().toISOString(),
                    });
                }
            } catch (error) {
                console.error('Error reloading model:', error);
                res.status(500).json({
                    error: 'Internal server error',
                    message: error.message,
                });
            }
        });

        // Batch ranking endpoint
        this.app.post('/batch-rank-products', async (req, res) => {
            try {
                if (!this.isReady) {
                    return res.status(503).json({
                        error: 'Service not ready',
                    });
                }

                const { requests } = req.body;

                if (!requests || !Array.isArray(requests)) {
                    return res.status(400).json({
                        error: 'Invalid input',
                        message: 'requests must be an array',
                    });
                }

                const results = [];

                for (const request of requests) {
                    const { state, candidates } = request;
                    const ranking = await this.inferenceEngine.rankProducts(state, candidates);

                    results.push({
                        recommended: ranking.map((item) => ({
                            productId: item.productId,
                            score: item.score,
                        })),
                    });
                }

                res.json({
                    results,
                    total: requests.length,
                });
            } catch (error) {
                console.error('Error batch ranking:', error);
                res.status(500).json({
                    error: 'Internal server error',
                    message: error.message,
                });
            }
        });

        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                error: 'Not found',
                message: `Route ${req.method} ${req.path} not found`,
            });
        });

        // Error handler
        this.app.use((err, req, res, next) => {
            console.error('Unhandled error:', err);
            res.status(500).json({
                error: 'Internal server error',
                message: err.message,
            });
        });
    }

    /**
     * Start the server
     */
    async start() {
        try {
            await this.initialize();
            this.setupMiddleware();
            this.setupRoutes();

            const port = config.port;
            this.app.listen(port, () => {
                console.log('\n' + '='.repeat(60));
                console.log('🤖 RL Service API Server');
                console.log('='.repeat(60));
                console.log(`🚀 Server running on port ${port}`);
                console.log(`📡 Health check: http://localhost:${port}/health`);
                console.log(`🎯 Rank products: POST http://localhost:${port}/rank-products`);
                console.log(`👤 Get user state: POST http://localhost:${port}/get-user-state`);
                console.log(`ℹ️  Model info: GET http://localhost:${port}/model-info`);
                console.log('='.repeat(60) + '\n');
            });
        } catch (error) {
            console.error('❌ Failed to start server:', error);
            process.exit(1);
        }
    }

    /**
     * Get or load inference engine for a user
     * Falls back to global model if no personalized model exists
     */
    async getInferenceEngine(userId) {
        // If no userId, use global model
        if (!userId) {
            if (!this.inferenceEngines.has('global')) {
                this.inferenceEngines.set('global', new InferenceEngine(this.globalModel));
            }
            return this.inferenceEngines.get('global');
        }

        // Check if user model is cached
        if (this.inferenceEngines.has(userId)) {
            return this.inferenceEngines.get(userId);
        }

        // Try to load personalized model
        const userModel = new PPOModel(userId);
        const loaded = await userModel.loadModel();

        if (loaded) {
            // Cache the model and engine
            this.userModels.set(userId, userModel);
            const engine = new InferenceEngine(userModel);
            this.inferenceEngines.set(userId, engine);
            console.log(`✅ Loaded personalized model for user ${userId}`);
            return engine;
        } else {
            // Fall back to global model
            console.log(`⚠️  No personalized model for user ${userId}, using global model`);
            if (!this.inferenceEngines.has('global')) {
                this.inferenceEngines.set('global', new InferenceEngine(this.globalModel));
            }
            return this.inferenceEngines.get('global');
        }
    }

    /**
     * Clear user model cache (for memory management)
     */
    clearUserModelCache(userId = null) {
        if (userId) {
            if (this.userModels.has(userId)) {
                this.userModels.get(userId).dispose();
                this.userModels.delete(userId);
                this.inferenceEngines.delete(userId);
                console.log(`🗑️  Cleared cache for user ${userId}`);
            }
        } else {
            // Clear all user models
            for (const [uid, model] of this.userModels) {
                model.dispose();
            }
            this.userModels.clear();
            this.inferenceEngines.clear();
            console.log('🗑️  Cleared all user model cache');
        }
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        console.log('\n🛑 Shutting down RL Service...');

        // Dispose all models
        if (this.globalModel) {
            this.globalModel.dispose();
        }

        for (const [userId, model] of this.userModels) {
            model.dispose();
        }

        if (this.dataLoader) {
            await this.dataLoader.close();
        }

        console.log('✅ Shutdown complete');
        process.exit(0);
    }
}

// Create and start server
const server = new RLServiceAPI();

// Handle shutdown signals
process.on('SIGINT', () => server.shutdown());
process.on('SIGTERM', () => server.shutdown());

// Start server
server.start().catch(console.error);

module.exports = RLServiceAPI;
