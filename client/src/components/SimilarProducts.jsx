import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSimilarProducts } from '../config/RecommendationRequest';
import { useInteractionTracker } from '../hooks/useInteractionTracker';
import { Sparkles } from 'lucide-react';
import './ProductRecommendations.css';

/**
 * Component hiển thị sản phẩm tương tự
 */
const SimilarProducts = ({ productId, limit = 6 }) => {
    const [similar, setSimilar] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { trackProductClick } = useInteractionTracker();
    const navigate = useNavigate();

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
            setSimilar(data.metadata?.similar || []);
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
        navigate(`/product/${product._id}`);
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
                    Sản Phẩm Tương Tự
                </h2>
                <div className="recommendations-loading">
                    <div className="spinner"></div>
                    <p>Đang tải sản phẩm tương tự...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="recommendations-container">
                <h2 className="recommendations-title">
                    <Sparkles className="title-icon" />
                    Sản Phẩm Tương Tự
                </h2>
                <div className="recommendations-error">
                    <p>Không thể tải sản phẩm tương tự: {error}</p>
                    <button onClick={fetchSimilar} className="retry-button">
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }

    if (similar.length === 0) {
        return null;
    }

    return (
        <div className="recommendations-container">
            <div className="recommendations-header">
                <h2 className="recommendations-title">
                    <Sparkles className="title-icon" />
                    Sản Phẩm Tương Tự
                </h2>
                <p className="recommendations-subtitle">Các sản phẩm cùng danh mục và khoảng giá tương tự</p>
            </div>

            <div className="recommendations-grid">
                {similar.map((product, index) => {
                    const mainImage = `${import.meta.env.VITE_URL_IMAGE}/uploads/products/${
                        product.colors?.[0]?.images
                    }`;
                    const hasDiscount = product.discount > 0;
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
                                <img src={mainImage} alt={product.name} className="product-image" loading="lazy" />
                            </div>

                            {/* Product info */}
                            <div className="product-info">
                                <h3 className="product-name">{product.name}</h3>

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
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SimilarProducts;
