import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTrendingRecommendations } from '../config/RecommendationRequest';
import { useInteractionTracker } from '../hooks/useInteractionTracker';
import { TrendingUp, Flame, Eye, ShoppingCart } from 'lucide-react';
import './TrendingProducts.css';

/**
 * Component hiển thị sản phẩm đang trending (hot)
 */
const TrendingProducts = ({ limit = 8, days = 7 }) => {
    const [trending, setTrending] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { trackProductClick } = useInteractionTracker();
    const navigate = useNavigate();

    useEffect(() => {
        fetchTrending();
    }, [limit, days]);

    const fetchTrending = async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await getTrendingRecommendations();
            setTrending(data.metadata?.trending || []);
        } catch (err) {
            console.error('Error fetching trending products:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleProductClick = async (item) => {
        const product = item?.product;

        if (!product) {
            return null;
        }
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

    const getTrendingBadge = (index) => {
        if (index === 0) return { icon: '🔥', text: 'HOT #1', color: '#ff4d4f' };
        if (index === 1) return { icon: '⚡', text: 'HOT #2', color: '#ff7a45' };
        if (index === 2) return { icon: '✨', text: 'HOT #3', color: '#ffa940' };
        return { icon: '📈', text: 'Trending', color: '#1890ff' };
    };

    if (loading) {
        return (
            <div className="trending-container">
                <div className="trending-header">
                    <Flame className="trending-icon" />
                    <h2 className="trending-title">Sản Phẩm Đang Hot</h2>
                </div>
                <div className="trending-loading">
                    <div className="spinner"></div>
                    <p>Đang tải sản phẩm trending...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="trending-container">
                <div className="trending-header">
                    <Flame className="trending-icon" />
                    <h2 className="trending-title">Sản Phẩm Đang Hot</h2>
                </div>
                <div className="trending-error">
                    <p>Không thể tải sản phẩm trending: {error}</p>
                    <button onClick={fetchTrending} className="retry-button">
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }

    if (trending.length === 0) {
        return null;
    }

    return (
        <div className="trending-container">
            <div className="trending-header">
                <div className="trending-title-wrapper">
                    <Flame className="trending-icon" />
                    <h2 className="trending-title">Sản Phẩm Đang Hot</h2>
                    <TrendingUp className="trending-up-icon" />
                </div>
                <p className="trending-subtitle">
                    Top {trending.length} sản phẩm được quan tâm nhiều nhất trong {days} ngày qua
                </p>
            </div>

            <div className="trending-grid">
                {trending.map((item, index) => {
                    const product = item?.product;

                    if (!product) {
                        return null;
                    }

                    const mainImage = `${import.meta.env.VITE_URL_IMAGE}/uploads/products/${
                        product?.colors?.[0]?.images
                    }`;
                    const hasDiscount = product?.discount > 0;
                    const badge = getTrendingBadge(index);

                    return (
                        <div
                            key={product._id}
                            className={`trending-card ${index < 3 ? 'trending-card-top' : ''}`}
                            onClick={() => handleProductClick(item)}
                        >
                            {/* Trending Badge */}
                            <div className="trending-badge" style={{ backgroundColor: badge.color }}>
                                <span className="trending-badge-icon">{badge.icon}</span>
                                <span className="trending-badge-text">{badge.text}</span>
                            </div>

                            {/* Discount Badge */}
                            {hasDiscount && <div className="discount-badge">-{product.discount}%</div>}

                            {/* Product Image */}
                            <div className="product-image-wrapper">
                                <img src={mainImage} alt={product.name} className="product-image" loading="lazy" />
                                <div className="product-overlay">
                                    <ShoppingCart className="overlay-icon" />
                                    <span>Xem chi tiết</span>
                                </div>
                            </div>

                            {/* Product Info */}
                            <div className="product-info">
                                <h3 className="product-name">{product?.name}</h3>

                                <div className="product-pricing">
                                    {hasDiscount && (
                                        <span className="original-price">{formatPrice(product.price)}</span>
                                    )}
                                    <span className="final-price">{formatPrice(product.price, product.discount)}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TrendingProducts;
