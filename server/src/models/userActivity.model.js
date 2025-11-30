const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// Model lưu tần suất truy cập và hoạt động của user
const userActivitySchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'user',
            required: true
        },
        // Ngày hoạt động (để tính tần suất theo ngày)
        activityDate: {
            type: Date,
            required: true,
            default: Date.now
        },
        // Số lần truy cập trong ngày
        visitCount: {
            type: Number,
            default: 1
        },
        // Tổng thời gian online trong ngày (tính bằng giây)
        totalTimeSpent: {
            type: Number,
            default: 0
        },
        // Số trang đã xem
        pageViews: {
            type: Number,
            default: 0
        },
        // Số sản phẩm đã xem
        productsViewed: {
            type: Number,
            default: 0
        },
        // Số sản phẩm đã click
        productsClicked: {
            type: Number,
            default: 0
        },
        // Số sản phẩm thêm vào giỏ
        productsAddedToCart: {
            type: Number,
            default: 0
        },
        // Số lần checkout
        checkoutAttempts: {
            type: Number,
            default: 0
        },
        // Số đơn hàng hoàn thành
        purchasesCompleted: {
            type: Number,
            default: 0
        },
        // Danh mục đã xem (để phân tích sở thích)
        categoriesViewed: [{
            categoryId: { type: Schema.Types.ObjectId, ref: 'category' },
            viewCount: { type: Number, default: 1 }
        }],
        // Thiết bị sử dụng
        deviceType: {
            type: String,
            enum: ['desktop', 'mobile', 'tablet', 'unknown'],
            default: 'unknown'
        },
        // Session IDs trong ngày
        sessions: [{
            sessionId: String,
            startTime: Date,
            endTime: Date,
            duration: Number // seconds
        }]
    },
    {
        timestamps: true,
    }
);

// Index để tối ưu query
userActivitySchema.index({ userId: 1, activityDate: -1 });
userActivitySchema.index({ userId: 1, activityDate: 1 }, { unique: true }); // Mỗi user chỉ có 1 record/ngày

module.exports = mongoose.model('userActivity', userActivitySchema);

