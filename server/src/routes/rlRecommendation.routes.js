const express = require('express');
const router = express.Router();
const rlRecommendationController = require('../controller/rlRecommendation.controller');
const { verifyToken, authAdmin , authUser } = require('../auth/checkAuth');

// Save recommendation
router.post('/', authUser, rlRecommendationController.saveRecommendation);

// Update recommendation feedback
router.post('/:recommendationId/feedback', authUser, rlRecommendationController.updateFeedback);

// Get user state (for RL model)
router.get('/user-state', authUser, rlRecommendationController.getUserState);

// Get user recommendations history
router.get('/user', authUser, rlRecommendationController.getUserRecommendations);

// Get recommendation metrics (admin)
router.get('/metrics', authUser, authAdmin, rlRecommendationController.getRecommendationMetrics);

// Prepare training data (admin)
router.get('/training-data', authUser, authAdmin, rlRecommendationController.prepareTrainingData);

module.exports = router;

