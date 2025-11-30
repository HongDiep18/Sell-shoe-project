const tf = require('@tensorflow/tfjs-node');
const config = require('./config');

/**
 * Inference Engine for PPO Model
 * Handles action selection and product ranking
 */
class InferenceEngine {
    constructor(ppoModel) {
        this.ppoModel = ppoModel;
        this.temperature = config.temperature;
        this.topK = config.topK;
    }

    /**
     * Sample action from policy (for training with exploration)
     */
    sampleAction(logits) {
        return tf.tidy(() => {
            // Apply temperature
            const scaledLogits = tf.div(logits, this.temperature);

            // Softmax to get probabilities
            const probs = tf.softmax(scaledLogits);

            // Sample from categorical distribution
            const probsArray = probs.arraySync();
            const action = this.categoricalSample(probsArray[0]);

            return action;
        });
    }

    /**
     * Categorical sampling
     */
    categoricalSample(probs) {
        const rand = Math.random();
        let cumSum = 0;

        for (let i = 0; i < probs.length; i++) {
            cumSum += probs[i];
            if (rand < cumSum) {
                return i;
            }
        }

        return probs.length - 1;
    }

    /**
     * Greedy action selection (for inference)
     */
    greedyAction(logits) {
        return tf.tidy(() => {
            const action = tf.argMax(logits, -1);
            return action.arraySync()[0];
        });
    }

    /**
     * Rank products using policy network (deterministic for inference)
     * Returns top-K product indices sorted by score
     */
    async rankProducts(state, candidates) {
        try {
            // Prepare state tensor
            const stateTensor = tf.tensor2d([state], [1, config.stateDim]);

            // Get logits from policy network
            const logits = this.ppoModel.policyNetwork.predict(stateTensor);

            // Get scores for each candidate
            const scores = tf.softmax(logits).arraySync()[0];

            // Limit to number of candidates
            const candidateScores = scores.slice(0, candidates.length);

            // Create ranking
            const ranking = candidates.map((candidate, idx) => ({
                ...candidate,
                score: candidateScores[idx],
                index: idx,
            }));

            // Sort by score descending
            ranking.sort((a, b) => b.score - a.score);

            // Return top K
            const topK = ranking.slice(0, Math.min(this.topK, ranking.length));

            // Cleanup
            stateTensor.dispose();
            logits.dispose();

            return topK;
        } catch (error) {
            console.error('Error ranking products:', error);
            throw error;
        }
    }

    /**
     * Get action probabilities for a batch of states
     */
    async getActionProbs(states) {
        return tf.tidy(() => {
            const stateTensor = tf.tensor2d(states, [states.length, config.stateDim]);
            const logits = this.ppoModel.policyNetwork.predict(stateTensor);
            const probs = tf.softmax(logits);
            return probs;
        });
    }

    /**
     * Get log probabilities for actions
     */
    getLogProbs(probs, actions) {
        return tf.tidy(() => {
            // Get probabilities for selected actions
            const actionProbs = tf.gather(probs, actions, 1);

            // Compute log probabilities
            const logProbs = tf.log(tf.add(actionProbs, 1e-8));

            return logProbs;
        });
    }

    /**
     * Compute entropy of policy (for exploration bonus)
     */
    computeEntropy(probs) {
        return tf.tidy(() => {
            const logProbs = tf.log(tf.add(probs, 1e-8));
            const entropy = tf.neg(tf.sum(tf.mul(probs, logProbs), -1));
            return entropy;
        });
    }

    /**
     * Softmax with temperature
     */
    softmaxWithTemperature(logits, temperature = 1.0) {
        return tf.tidy(() => {
            const scaledLogits = tf.div(logits, temperature);
            return tf.softmax(scaledLogits);
        });
    }

    /**
     * Apply diversity penalty to encourage varied recommendations
     */
    applyDiversityPenalty(scores, candidates) {
        // Group by category
        const categoryGroups = {};
        candidates.forEach((candidate, idx) => {
            const category = candidate.category || 'unknown';
            if (!categoryGroups[category]) {
                categoryGroups[category] = [];
            }
            categoryGroups[category].push(idx);
        });

        // Apply penalty to repeated categories
        const adjustedScores = [...scores];
        Object.values(categoryGroups).forEach((indices) => {
            if (indices.length > 1) {
                // Reduce scores for repeated categories
                indices.slice(1).forEach((idx) => {
                    adjustedScores[idx] *= 0.8;
                });
            }
        });

        return adjustedScores;
    }

    /**
     * Batch inference for multiple users
     */
    async batchRankProducts(states, candidatesList) {
        const results = [];

        for (let i = 0; i < states.length; i++) {
            const ranking = await this.rankProducts(states[i], candidatesList[i]);
            results.push(ranking);
        }

        return results;
    }
}

module.exports = InferenceEngine;
