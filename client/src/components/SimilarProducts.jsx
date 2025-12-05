import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSimilarProducts } from '../config/RecommendationRequest';
import { useInteractionTracker } from '../hooks/useInteractionTracker';
import { Sparkles, Heart, ShoppingCart, Zap } from 'lucide-react'; // Import thêm icons
import { useProductActions } from '../hooks/useProductActions'; // Import custom hook
import { useStore } from '../hooks/useStore'; // Import store để lấy dataUser
import './ProductRecommendations.css';

/**
 * Component hiển thị sản phẩm tương tự
 */
const SimilarProducts = ({ productId, limit = 6 }) => {
    const [similar, setSimilar] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Hooks từ hệ thống
    const { trackProductClick } = useInteractionTracker();
    const navigate = useNavigate();
    const { dataUser } = useStore(); // Lấy thông tin user để check trạng thái like

    // Hook xử lý hành động (Thêm giỏ, Mua ngay, Yêu thích)
    const { handleAddToCart, handleBuyNow, handleAddToFavorite, isProductLiked, initializeLikedProducts } =
        useProductActions();

    useEffect(() => {
        if (productId) {
            fetchSimilar();
        }
    }, [productId, limit]);

    const fetchSimilar = async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await getSimilarProducts(productId);
            const similarList = data.metadata?.similar || [];

            setSimilar(similarList);

            // Khởi tạo trạng thái yêu thích cho danh sách sản phẩm vừa tải về
            if (dataUser?._id) {
                initializeLikedProducts(similarList, dataUser._id);
            }
        } catch (err) {
            console.error('Error fetching similar products:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleProductClick = async (product) => {
        // Track click
        await trackProductClick(product._id, product.category?._id);

        // Navigate to product detail
        navigate(`/detail-product/${product._id}`); // Đã sửa lại path theo chuẩn thường dùng
        window.scrollTo(0, 0); // Scroll lên đầu trang khi chuyển sản phẩm
    };

    const formatPrice = (price, discount = 0) => {
        const finalPrice = price * (1 - discount / 100);
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(finalPrice);
    };

    if (loading) {
        return (
            <div className="recommendations-container">
                <h2 className="recommendations-title">
                    <Sparkles className="title-icon" />
                    Sản Phẩm Tương Tự1
                </h2>
                <div className="recommendations-loading">
                    <div className="spinner"></div>
                    <p>Đang tải sản phẩm tương tự...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return null; // Ẩn luôn nếu lỗi để tránh làm xấu UI trang chi tiết
    }

    if (similar.length === 0) {
        return null;
    }

    return (
        <div className="recommendations-container">
            <div className="recommendations-header">
                <h2 className="recommendations-title">
                    <Sparkles className="title-icon" />
                    Sản Phẩm Tương Tự2
                </h2>
                <p className="recommendations-subtitle">Các sản phẩm cùng danh mục và khoảng giá tương tự</p>
            </div>

            <div className="recommendations-grid">
                {similar.map((product, index) => {
                    const mainImage = `${import.meta.env.VITE_API_URL}/uploads/products/${product.colors?.[0]?.images}`;
                    const hasDiscount = product.discount > 0;
                    const isLiked = isProductLiked(product._id);

                    return (
                        <div
                            key={product._id || index}
                            className="recommendation-card"
                            onClick={() => handleProductClick(product)}
                        >
                            {/* Discount badge */}
                            {hasDiscount && <div className="discount-badge">-{product.discount}%</div>}

                            {/* Product image */}
                            <div className="product-image-wrapper">
                                <img
                                    src={mainImage}
                                    alt={product.name}
                                    className="product-image"
                                    loading="lazy"
                                    onError={(e) => {
                                        e.target.src = 'https://via.placeholder.com/300x300?text=No+Image';
                                    }}
                                />
                            </div>

                            {/* Product info */}
                            <div className="product-info">
                                <h3 className="product-name" title={product.name}>
                                    {product.name}
                                </h3>

                                <div className="product-pricing">
                                    {hasDiscount && (
                                        <span className="original-price">{formatPrice(product.price)}</span>
                                    )}
                                    <span className="final-price">{formatPrice(product.price, product.discount)}</span>
                                </div>

                                {/* Category */}
                                {product.category && (
                                    <div className="product-category">
                                        <span className="category-badge">{product.category.name}</span>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="product-actions" onClick={(e) => e.stopPropagation()}>
                                    <div className="action-row">
                                        <button
                                            onClick={(e) => handleAddToCart(product, e)}
                                            className="btn-cart"
                                            title="Thêm vào giỏ hàng"
                                        >
                                            <ShoppingCart size={14} />
                                            Giỏ hàng
                                        </button>
                                        <button
                                            onClick={(e) => handleAddToFavorite(product, e)}
                                            className={`btn-favorite ${isLiked ? 'liked' : ''}`}
                                            title={isLiked ? 'Bỏ yêu thích' : 'Yêu thích'}
                                        >
                                            <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
                                        </button>
                                    </div>
                                    <button
                                        onClick={(e) => handleBuyNow(product, e)}
                                        className="btn-buy-now"
                                        title="Mua ngay"
                                    >
                                        Mua ngay
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SimilarProducts;
