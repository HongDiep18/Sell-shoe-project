const UserActivityService = require('../services/userActivity.service');
const { OK } = require('../core/success.response');
const { BadRequestError } = require('../core/error.response');

class UserActivityController {
    // Track activity
    async trackActivity(req, res, next) {
        try {
            const {
                visitCount,
                totalTimeSpent,
                pageViews,
                productsViewed,
                productsClicked,
                productsAddedToCart,
                checkoutAttempts,
                purchasesCompleted,
                categoriesViewed,
                deviceType,
                sessionInfo,
            } = req.body;

            // Get userId from authenticated user (optional)
            const userId = req.user?._id || req.user?.id;

            // If no user, skip tracking (for guest users)
            if (!userId) {
                new OK({
                    message: 'Activity tracking skipped (guest user)',
                    metadata: null,
                }).send(res);
                return;
            }

            // Convert arrays to counts
            const productsViewedCount = Array.isArray(productsViewed) ? productsViewed.length : productsViewed || 0;
            const productsClickedCount = Array.isArray(productsClicked) ? productsClicked.length : productsClicked || 0;
            const productsAddedToCartCount = Array.isArray(productsAddedToCart)
                ? productsAddedToCart.length
                : productsAddedToCart || 0;

            // Convert categoriesViewed array to categoryViewed object for service
            let categoryViewed = null;
            if (Array.isArray(categoriesViewed) && categoriesViewed.length > 0) {
                // Aggregate categories - count each unique category
                const categoryMap = {};
                categoriesViewed.forEach((catId) => {
                    if (catId) {
                        categoryMap[catId] = (categoryMap[catId] || 0) + 1;
                    }
                });

                // Use the first category for backward compatibility
                const firstCategoryId = Object.keys(categoryMap)[0];
                if (firstCategoryId) {
                    categoryViewed = {
                        categoryId: firstCategoryId,
                        viewCount: categoryMap[firstCategoryId],
                    };
                }
            }

            const activity = await UserActivityService.trackActivity({
                userId,
                visitCount: visitCount || 0,
                timeSpent: totalTimeSpent || 0,
                pageViews: pageViews || 0,
                productsViewed: productsViewedCount,
                productsClicked: productsClickedCount,
                productsAddedToCart: productsAddedToCartCount,
                checkoutAttempts: checkoutAttempts || 0,
                purchasesCompleted: purchasesCompleted || 0,
                categoryViewed,
                deviceType: deviceType || 'unknown',
                sessionInfo,
            });

            new OK({
                message: 'Activity tracked successfully',
                metadata: activity,
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    // Get user activities
    async getUserActivities(req, res, next) {
        try {
            const userId = req.user._id;
            const { startDate, endDate, limit } = req.query;

            const activities = await UserActivityService.getUserActivities({
                userId,
                startDate,
                endDate,
                limit: parseInt(limit) || 30,
            });

            new OK({
                message: 'Get user activities successfully',
                metadata: activities,
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    // Get user activity summary
    async getUserActivitySummary(req, res, next) {
        try {
            const userId = req.user._id;
            const { days } = req.query;

            const summary = await UserActivityService.getUserActivitySummary({
                userId,
                days: parseInt(days) || 30,
            });

            new OK({
                message: 'Get activity summary successfully',
                metadata: summary,
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    // Get user engagement rate
    async getUserEngagementRate(req, res, next) {
        try {
            const userId = req.user._id;
            const { days } = req.query;

            const engagement = await UserActivityService.getUserEngagementRate({
                userId,
                days: parseInt(days) || 30,
            });

            new OK({
                message: 'Get engagement rate successfully',
                metadata: engagement,
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    // Get user category preferences from activity
    async getUserCategoryPreferences(req, res, next) {
        try {
            const userId = req.user._id;
            const { days } = req.query;

            const preferences = await UserActivityService.getUserCategoryPreferencesFromActivity({
                userId,
                days: parseInt(days) || 90,
            });

            new OK({
                message: 'Get category preferences successfully',
                metadata: preferences,
            }).send(res);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new UserActivityController();
