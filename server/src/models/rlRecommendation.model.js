const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// Model lưu kết quả recommendation từ RL model và feedback
const rlRecommendationSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'user',
            required: true
        },
        // Danh sách sản phẩm được recommend
        recommendedProducts: [{
            productId: { type: Schema.Types.ObjectId, ref: 'Product' },
            score: { type: Number }, // Score từ PPO model
            rank: { type: Number }, // Vị trí trong danh sách recommend
            reason: { type: String } // Lý do recommend (optional)
        }],
        // Model version để tracking
        modelVersion: {
            type: String,
            required: true
        },
        // Trạng thái user khi được recommend
        userState: {
            totalPurchases: Number,
            averageRating: Number,
            categoryPreferences: [String],
            recentInteractions: Number,
            lastVisitDaysAgo: Number
        },
        // Feedback từ user về recommendation
        feedback: {
            // Số sản phẩm được click từ recommendation
            clickedProducts: [{
                productId: { type: Schema.Types.ObjectId, ref: 'Product' },
                clickedAt: Date,
                rank: Number
            }],
            // Số sản phẩm được mua từ recommendation
            purchasedProducts: [{
                productId: { type: Schema.Types.ObjectId, ref: 'Product' },
                purchasedAt: Date,
                rank: Number
            }],
            // Số sản phẩm được thêm vào giỏ từ recommendation
            addedToCartProducts: [{
                productId: { type: Schema.Types.ObjectId, ref: 'Product' },
                addedAt: Date,
                rank: Number
            }],
            // User có tương tác với recommendation không
            hasInteraction: { type: Boolean, default: false }
        },
        // Reward tính cho RL model
        reward: {
            type: Number,
            default: 0
        },
        // Session ID
        sessionId: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true,
    }
);

// Index để tối ưu query
rlRecommendationSchema.index({ userId: 1, createdAt: -1 });
rlRecommendationSchema.index({ sessionId: 1 });
rlRecommendationSchema.index({ 'feedback.hasInteraction': 1 });

module.exports = mongoose.model('rlRecommendation', rlRecommendationSchema);

