const UserActivity = require('../models/userActivity.model');
const mongoose = require('mongoose');

class UserActivityService {
    // Ghi nhận hoạt động của user trong ngày
    static async trackActivity({
        userId,
        visitCount = 0,
        timeSpent = 0,
        pageViews = 0,
        productsViewed = 0,
        productsClicked = 0,
        productsAddedToCart = 0,
        checkoutAttempts = 0,
        purchasesCompleted = 0,
        categoryViewed = null,
        deviceType = 'unknown',
        sessionInfo = null
    }) {
        try {
            // Lấy ngày hiện tại (không tính giờ)
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Tìm hoặc tạo activity record cho ngày hôm nay
            let activity = await UserActivity.findOne({
                userId: new mongoose.Types.ObjectId(userId),
                activityDate: today
            });

            if (!activity) {
                // Tạo mới
                activity = await UserActivity.create({
                    userId,
                    activityDate: today,
                    visitCount,
                    totalTimeSpent: timeSpent,
                    pageViews,
                    productsViewed,
                    productsClicked,
                    productsAddedToCart,
                    checkoutAttempts,
                    purchasesCompleted,
                    deviceType,
                    categoriesViewed: categoryViewed ? [categoryViewed] : [],
                    sessions: sessionInfo ? [sessionInfo] : []
                });
            } else {
                // Cập nhật
                if (visitCount > 0) activity.visitCount += visitCount;
                if (timeSpent > 0) activity.totalTimeSpent += timeSpent;
                if (pageViews > 0) activity.pageViews += pageViews;
                if (productsViewed > 0) activity.productsViewed += productsViewed;
                if (productsClicked > 0) activity.productsClicked += productsClicked;
                if (productsAddedToCart > 0) activity.productsAddedToCart += productsAddedToCart;
                if (checkoutAttempts > 0) activity.checkoutAttempts += checkoutAttempts;
                if (purchasesCompleted > 0) activity.purchasesCompleted += purchasesCompleted;

                // Cập nhật category viewed
                if (categoryViewed) {
                    const existingCategory = activity.categoriesViewed.find(
                        c => c.categoryId.toString() === categoryViewed.categoryId.toString()
                    );

                    if (existingCategory) {
                        existingCategory.viewCount += categoryViewed.viewCount || 1;
                    } else {
                        activity.categoriesViewed.push(categoryViewed);
                    }
                }

                // Thêm session info
                if (sessionInfo) {
                    activity.sessions.push(sessionInfo);
                }

                await activity.save();
            }

            return activity;
        } catch (error) {
            throw error;
        }
    }

    // Lấy hoạt động của user theo khoảng thời gian
    static async getUserActivities({ userId, startDate, endDate, limit = 30 }) {
        try {
            const query = { userId };

            if (startDate || endDate) {
                query.activityDate = {};
                if (startDate) query.activityDate.$gte = new Date(startDate);
                if (endDate) query.activityDate.$lte = new Date(endDate);
            }

            const activities = await UserActivity.find(query)
                .populate('categoriesViewed.categoryId')
                .sort({ activityDate: -1 })
                .limit(limit);

            return activities;
        } catch (error) {
            throw error;
        }
    }

    // Tính tổng hoạt động của user (cho RL model)
    static async getUserActivitySummary({ userId, days = 30 }) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            startDate.setHours(0, 0, 0, 0);

            const summary = await UserActivity.aggregate([
                {
                    $match: {
                        userId: new mongoose.Types.ObjectId(userId),
                        activityDate: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalVisits: { $sum: '$visitCount' },
                        totalTimeSpent: { $sum: '$totalTimeSpent' },
                        totalPageViews: { $sum: '$pageViews' },
                        totalProductsViewed: { $sum: '$productsViewed' },
                        totalProductsClicked: { $sum: '$productsClicked' },
                        totalProductsAddedToCart: { $sum: '$productsAddedToCart' },
                        totalCheckoutAttempts: { $sum: '$checkoutAttempts' },
                        totalPurchases: { $sum: '$purchasesCompleted' },
                        activeDays: { $sum: 1 },
                        lastActivityDate: { $max: '$activityDate' }
                    }
                }
            ]);

            if (summary.length === 0) {
                return {
                    totalVisits: 0,
                    totalTimeSpent: 0,
                    totalPageViews: 0,
                    totalProductsViewed: 0,
                    totalProductsClicked: 0,
                    totalProductsAddedToCart: 0,
                    totalCheckoutAttempts: 0,
                    totalPurchases: 0,
                    activeDays: 0,
                    lastActivityDate: null,
                    averageVisitsPerDay: 0,
                    averageTimePerDay: 0
                };
            }

            const result = summary[0];
            result.averageVisitsPerDay = result.activeDays > 0 ? result.totalVisits / result.activeDays : 0;
            result.averageTimePerDay = result.activeDays > 0 ? result.totalTimeSpent / result.activeDays : 0;

            // Tính số ngày kể từ lần truy cập cuối
            const now = new Date();
            result.daysSinceLastVisit = Math.floor((now - result.lastActivityDate) / (1000 * 60 * 60 * 24));

            return result;
        } catch (error) {
            throw error;
        }
    }

    // Lấy engagement rate của user (cho RL model)
    static async getUserEngagementRate({ userId, days = 30 }) {
        try {
            const summary = await this.getUserActivitySummary({ userId, days });

            // Tính các chỉ số engagement
            const engagementRate = {
                visitFrequency: summary.activeDays / days, // Tần suất truy cập
                clickThroughRate: summary.totalProductsViewed > 0 
                    ? summary.totalProductsClicked / summary.totalProductsViewed 
                    : 0, // Tỷ lệ click
                addToCartRate: summary.totalProductsClicked > 0 
                    ? summary.totalProductsAddedToCart / summary.totalProductsClicked 
                    : 0, // Tỷ lệ thêm giỏ hàng
                conversionRate: summary.totalProductsAddedToCart > 0 
                    ? summary.totalPurchases / summary.totalProductsAddedToCart 
                    : 0, // Tỷ lệ chuyển đổi
                averageSessionTime: summary.totalVisits > 0 
                    ? summary.totalTimeSpent / summary.totalVisits 
                    : 0, // Thời gian trung bình mỗi session
                engagementScore: 0 // Điểm tổng hợp
            };

            // Tính engagement score (0-100)
            engagementRate.engagementScore = (
                engagementRate.visitFrequency * 20 +
                engagementRate.clickThroughRate * 20 +
                engagementRate.addToCartRate * 30 +
                engagementRate.conversionRate * 30
            );

            return {
                ...summary,
                ...engagementRate
            };
        } catch (error) {
            throw error;
        }
    }

    // Lấy category preferences từ activities (cho RL model)
    static async getUserCategoryPreferencesFromActivity({ userId, days = 90 }) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            startDate.setHours(0, 0, 0, 0);

            const activities = await UserActivity.aggregate([
                {
                    $match: {
                        userId: new mongoose.Types.ObjectId(userId),
                        activityDate: { $gte: startDate }
                    }
                },
                { $unwind: '$categoriesViewed' },
                {
                    $group: {
                        _id: '$categoriesViewed.categoryId',
                        totalViews: { $sum: '$categoriesViewed.viewCount' }
                    }
                },
                { $sort: { totalViews: -1 } },
                {
                    $lookup: {
                        from: 'categories',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'category'
                    }
                },
                { $unwind: '$category' }
            ]);

            return activities;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = UserActivityService;

