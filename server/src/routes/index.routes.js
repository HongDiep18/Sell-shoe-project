const userRoutes = require('./users.routes');
const categoryRoutes = require('./category.routes');
const productRoutes = require('./product.routes');
const cartRoutes = require('./cart.routes');
const couponRoutes = require('./counpon.routes');
const paymentRoutes = require('./payment.routes');
const warrantyRoutes = require('./warranty.routes');
const messageRoutes = require('./message.routes');
const conversationRoutes = require('./conversation.routes');
const flashSaleRoutes = require('./flashSale.routes');
const previewProductRoutes = require('./previewProduct.routes');
const blogRoutes = require('./blog.routes');
const contactRoutes = require('./contact.routes');
const favouriteRoutes = require('./favourite.routes');
const userInteractionRoutes = require('./userInteraction.routes');
const productReviewRoutes = require('./productReview.routes');
const userActivityRoutes = require('./userActivity.routes');
const rlRecommendationRoutes = require('./rlRecommendation.routes');
const recommendationRoutes = require('./recommendation.routes');
const testRoutes = require('./test.route');

function routes(app) {
    app.use('/api/users', userRoutes);
    app.use('/api/category', categoryRoutes);
    app.use('/api/product', productRoutes);
    app.use('/api/cart', cartRoutes);
    app.use('/api/coupon', couponRoutes);
    app.use('/api/payment', paymentRoutes);
    app.use('/api/warranty', warrantyRoutes);
    app.use('/api/message', messageRoutes);
    app.use('/api/conversation', conversationRoutes);
    app.use('/api/flashSale', flashSaleRoutes);
    app.use('/api/previewProduct', previewProductRoutes);
    app.use('/api/blog', blogRoutes);
    app.use('/api/contact', contactRoutes);
    app.use('/api/favourite', favouriteRoutes);
    app.use('/api/user-interaction', userInteractionRoutes);
    app.use('/api/product-review', productReviewRoutes);
    app.use('/api/user-activity', userActivityRoutes);
    app.use('/api/rl-recommendation', rlRecommendationRoutes);
    app.use('/api/recommendation', recommendationRoutes);
    app.use('/api/test', testRoutes);
}

module.exports = routes;
