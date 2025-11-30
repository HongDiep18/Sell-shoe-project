/**
 * Test Routes for PPO Recommendation System
 * Only available in development mode
 */

const express = require('express');
const router = express.Router();
const testController = require('../controller/test.controller');
const { asyncHandler } = require('../auth/checkAuth');

// Health check (public)
router.get('/health', asyncHandler(testController.healthCheck));

// Sample data generation (development only)
router.post('/generate-sample-data', asyncHandler(testController.generateSampleData));
router.delete('/clean-sample-data', asyncHandler(testController.cleanSampleData));

// Testing flows
router.get('/recommendation-flow/:userId', asyncHandler(testController.testRecommendationFlow));
router.post('/training-flow', asyncHandler(testController.testTrainingFlow));
router.get('/compare-methods/:userId', asyncHandler(testController.compareRecommendationMethods));

module.exports = router;
