const express = require('express');
const router = express.Router();
const userInteractionController = require('../controller/userInteraction.controller');
const { authUser, optionalAuth } = require('../auth/checkAuth');

// Track interaction - optional auth
router.post('/track', optionalAuth, userInteractionController.trackInteraction);

// Get user interactions - require auth
router.get('/', authUser, userInteractionController.getUserInteractions);

// Get user frequent products - require auth
router.get('/frequent', authUser, userInteractionController.getUserFrequentProducts);

// Get user category preferences - require auth
router.get('/category-preferences', authUser, userInteractionController.getUserCategoryPreferences);

// Get user purchase history - require auth
router.get('/purchase-history', authUser, userInteractionController.getUserPurchaseHistory);

// Get product stats - public
router.get('/product/:productId', userInteractionController.getProductStats);

module.exports = router;

