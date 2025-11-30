const tf = require('@tensorflow/tfjs-node');

/**
 * RL Environment for Product Recommendation
 *
 * State: 20-dimensional vector representing user behavior
 * Action: Index of product to recommend (from candidate list)
 * Reward: +1 (click), +3 (add_to_cart), +5 (purchase)
 */
class RecommendationEnv {
    constructor() {
        this.stateDim = 20;
        this.currentState = null;
        this.candidateProducts = [];
        this.done = false;
    }

    /**
     * Reset environment with new user state and candidates
     */
    reset(userState, candidates) {
        this.currentState = userState;
        this.candidateProducts = candidates;
        this.done = false;
        return this.currentState;
    }

    /**
     * Take action (recommend product at index)
     * Returns: [nextState, reward, done, info]
     */
    step(actionIndex, feedback = null) {
        if (this.done) {
            throw new Error('Episode is done. Call reset() first.');
        }

        // Get recommended product
        const recommendedProduct = this.candidateProducts[actionIndex];

        // Calculate reward based on feedback
        let reward = 0;
        if (feedback) {
            reward = this.calculateReward(feedback);
        }

        // Next state (simplified - same state for now)
        const nextState = this.currentState;

        // Episode continues
        this.done = false;

        const info = {
            productId: recommendedProduct?.productId,
            reward,
        };

        return [nextState, reward, this.done, info];
    }

    /**
     * Calculate reward from user feedback
     */
    calculateReward(feedback) {
        let reward = 0;

        // Click: +1
        if (feedback.clicked) {
            reward += 1;
        }

        // Add to cart: +3
        if (feedback.addedToCart) {
            reward += 3;
        }

        // Purchase: +5
        if (feedback.purchased) {
            reward += 5;
        }

        // Bonus for high-ranked recommendations
        if (feedback.rank && feedback.rank <= 3) {
            reward += 1;
        }

        return reward;
    }

    /**
     * Get current state
     */
    getState() {
        return this.currentState;
    }

    /**
     * Get action space size (number of candidates)
     */
    getActionSpace() {
        return this.candidateProducts.length;
    }

    /**
     * Render environment (for debugging)
     */
    render() {
        console.log('=== Environment State ===');
        console.log('State:', this.currentState);
        console.log('Candidates:', this.candidateProducts.length);
        console.log('Done:', this.done);
    }
}

/**
 * Trajectory Builder
 * Builds trajectories from historical data
 */
class TrajectoryBuilder {
    constructor() {
        this.trajectories = [];
    }

    /**
     * Add a transition to trajectory
     */
    addTransition(state, action, reward, nextState, done = false) {
        this.trajectories.push({
            state,
            action,
            reward,
            nextState,
            done,
        });
    }

    /**
     * Get all trajectories
     */
    getTrajectories() {
        return this.trajectories;
    }

    /**
     * Clear trajectories
     */
    clear() {
        this.trajectories = [];
    }

    /**
     * Compute returns (discounted cumulative rewards)
     */
    computeReturns(gamma = 0.99) {
        const returns = [];
        let G = 0;

        // Compute returns backwards
        for (let i = this.trajectories.length - 1; i >= 0; i--) {
            const { reward, done } = this.trajectories[i];
            G = reward + gamma * G * (1 - done);
            returns.unshift(G);
        }

        return returns;
    }

    /**
     * Compute advantages using GAE (Generalized Advantage Estimation)
     */
    computeAdvantages(values, gamma = 0.99, lambda = 0.95) {
        const advantages = [];
        let lastGaeLam = 0;

        for (let i = this.trajectories.length - 1; i >= 0; i--) {
            const { reward, done } = this.trajectories[i];
            const value = values[i];
            const nextValue = i < this.trajectories.length - 1 ? values[i + 1] : 0;

            const delta = reward + gamma * nextValue * (1 - done) - value;
            lastGaeLam = delta + gamma * lambda * (1 - done) * lastGaeLam;
            advantages.unshift(lastGaeLam);
        }

        return advantages;
    }

    /**
     * Normalize advantages
     */
    normalizeAdvantages(advantages) {
        const mean = advantages.reduce((a, b) => a + b, 0) / advantages.length;
        const std = Math.sqrt(advantages.reduce((sum, adv) => sum + Math.pow(adv - mean, 2), 0) / advantages.length);

        return advantages.map((adv) => (adv - mean) / (std + 1e-8));
    }

    /**
     * Get batch for training
     */
    getBatch(batchSize = 64) {
        const indices = [];
        for (let i = 0; i < Math.min(batchSize, this.trajectories.length); i++) {
            const idx = Math.floor(Math.random() * this.trajectories.length);
            indices.push(idx);
        }

        const batch = indices.map((idx) => this.trajectories[idx]);
        return batch;
    }
}

module.exports = {
    RecommendationEnv,
    TrajectoryBuilder,
};
