const express = require('express');
const router = express.Router();
const userActivityController = require('../controller/userActivity.controller');
const { authUser, optionalAuth } = require('../auth/checkAuth');

// Track activity - optional auth (works for both logged in and guest users)
router.post('/track', optionalAuth, userActivityController.trackActivity);

// Get user activities - require auth
router.get('/', authUser, userActivityController.getUserActivities);

// Get user activity summary - require auth
router.get('/summary', authUser, userActivityController.getUserActivitySummary);

// Get user engagement rate - require auth
router.get('/engagement', authUser, userActivityController.getUserEngagementRate);

// Get user category preferences - require auth
router.get('/category-preferences', authUser, userActivityController.getUserCategoryPreferences);

module.exports = router;

