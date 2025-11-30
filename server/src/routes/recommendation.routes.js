const express = require('express');
const router = express.Router();
const recommendationController = require('../controller/recommendation.controller');
const { authAdmin, authUser, optionalAuth} = require('../auth/checkAuth');

// ============= USER ENDPOINTS =============

// Get personalized recommendations using PPO (optional auth - fallback to trending for guests)
router.get('/personalized', optionalAuth, recommendationController.getPersonalizedRecommendations);

// Get trending products
router.get('/trending', recommendationController.getTrendingProducts);

// Get similar products
router.get('/similar/:productId', recommendationController.getSimilarProducts);

// Get cold start recommendations (for new users)
router.get('/cold-start', recommendationController.getColdStartRecommendations);

// Get category-based recommendations
router.get('/category/:categoryId', recommendationController.getCategoryRecommendations);

// Get bundle recommendations
router.get('/bundles', authUser, recommendationController.getBundleRecommendations);

// Get user state (for debugging)
router.get('/user-state', authUser, recommendationController.getUserState);

// Track feedback
router.post('/feedback', authUser, recommendationController.trackFeedback);

// ============= ADMIN ENDPOINTS =============

// Train PPO model
router.post('/admin/train', authAdmin, recommendationController.trainModel);

// Evaluate model performance
router.post('/admin/evaluate', authAdmin, recommendationController.evaluateModel);

// Prepare dataset
router.post('/admin/prepare-dataset', authAdmin, recommendationController.prepareDataset);

// Download dataset
router.get('/admin/download-dataset', authAdmin, recommendationController.downloadDataset);

// Get statistics
router.get('/admin/statistics', authAdmin, recommendationController.getStatistics);

// Get model info
router.get('/admin/model-info', authAdmin, recommendationController.getModelInfo);

module.exports = router;

