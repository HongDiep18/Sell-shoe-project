const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// Model lưu lịch sử tương tác của user với sản phẩm
const userInteractionSchema = new Schema(
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
        interactionType: {
            type: String,
            enum: ['view', 'click', 'add_to_cart', 'purchase', 'remove_from_cart'],
            required: true
        },
        // Thời gian xem sản phẩm (tính bằng giây)
        viewDuration: {
            type: Number,
            default: 0
        },
        // Số lần tương tác với sản phẩm này
        interactionCount: {
            type: Number,
            default: 1
        },
        // Session ID để track một phiên truy cập
        sessionId: {
            type: String,
            required: true
        },
        // Metadata bổ sung
        metadata: {
            categoryId: { type: Schema.Types.ObjectId, ref: 'category' },
            price: Number,
            discount: Number,
            colorId: Schema.Types.ObjectId,
            sizeId: Schema.Types.ObjectId,
            quantity: Number
        }
    },
    {
        timestamps: true,
    }
);

// Index để tối ưu query
userInteractionSchema.index({ userId: 1, productId: 1, createdAt: -1 });
userInteractionSchema.index({ userId: 1, interactionType: 1 });
userInteractionSchema.index({ sessionId: 1 });

module.exports = mongoose.model('userInteraction', userInteractionSchema);

