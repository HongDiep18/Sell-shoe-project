const express = require('express');
const router = express.Router();
const productReviewController = require('../controller/productReview.controller');
const { verifyToken, authAdmin , authUser } = require('../auth/checkAuth');

// Create review (user)
router.post('/', authUser, productReviewController.createReview);

// Update review (user)
router.put('/:reviewId', authUser, productReviewController.updateReview);

// Get product reviews (public)
router.get('/product/:productId', productReviewController.getProductReviews);

// Get user reviews (user)
router.get('/user', authUser, productReviewController.getUserReviews);

// Get user average rating (user)
router.get('/user/average-rating', authUser, productReviewController.getUserAverageRating);

// Update review status (admin)
router.patch('/:reviewId/status', authUser, authAdmin, productReviewController.updateReviewStatus);

// Mark review as helpful (public)
router.post('/:reviewId/helpful', productReviewController.markHelpful);

module.exports = router;

