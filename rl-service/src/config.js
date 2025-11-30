require('dotenv').config();

/**
 * Configuration for RL Service
 */
const config = {
    // Server
    port: process.env.PORT || 5001,
    nodeEnv: process.env.NODE_ENV || 'development',

    // MongoDB
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/shoe2',

    // Model Architecture
    stateDim: parseInt(process.env.STATE_DIM) || 20,
    actionDim: parseInt(process.env.ACTION_DIM) || 100,
    hiddenDim: parseInt(process.env.HIDDEN_DIM) || 128,

    // PPO Hyperparameters
    learningRate: parseFloat(process.env.LEARNING_RATE) || 0.0003,
    gamma: parseFloat(process.env.GAMMA) || 0.99,
    lambda: parseFloat(process.env.LAMBDA) || 0.95,
    epsilon: parseFloat(process.env.EPSILON) || 0.2,
    epochs: parseInt(process.env.EPOCHS) || 10,
    batchSize: parseInt(process.env.BATCH_SIZE) || 64,

    // Training
    maxTrajectories: parseInt(process.env.MAX_TRAJECTORIES) || 1000,
    minTrajectoryLength: parseInt(process.env.MIN_TRAJECTORY_LENGTH) || 5,

    // Inference
    topK: parseInt(process.env.TOP_K) || 10,
    temperature: parseFloat(process.env.TEMPERATURE) || 1.0,

    // Model Paths
    policyModelPath: './models/policy',
    valueModelPath: './models/value',

    // Logging
    logDir: './logs',
};

module.exports = config;
