const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// Model đánh giá sản phẩm từ khách hàng
const productReviewSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'user',
            required: true
        },
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        paymentId: {
            type: Schema.Types.ObjectId,
            ref: 'payment',
            required: true
        },
        // Đánh giá theo thang 1-5
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        // Chi tiết đánh giá theo tiêu chí
        detailedRating: {
            quality: { type: Number, min: 1, max: 5 }, // Chất lượng
            design: { type: Number, min: 1, max: 5 }, // Thiết kế
            comfort: { type: Number, min: 1, max: 5 }, // Độ thoải mái
            valueForMoney: { type: Number, min: 1, max: 5 } // Giá trị tiền bạc
        },
        comment: {
            type: String,
            default: ''
        },
        // Ảnh đánh giá từ khách hàng
        images: [{
            type: String
        }],
        // Trạng thái đánh giá
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        },
        // Số người thấy đánh giá này hữu ích
        helpfulCount: {
            type: Number,
            default: 0
        },
        // Verified purchase
        isVerifiedPurchase: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true,
    }
);

// Index để tối ưu query
productReviewSchema.index({ productId: 1, status: 1, createdAt: -1 });
productReviewSchema.index({ userId: 1, productId: 1 });
productReviewSchema.index({ rating: 1 });

module.exports = mongoose.model('productReview', productReviewSchema);

