import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart } from 'lucide-react';
import {
    getPersonalizedRecommendations,
    getTrendingRecommendations,
    getSimilarProducts,
    getCategoryRecommendations,
    getColdStartRecommendations,
} from '../config/RecommendationRequest';
import { useInteractionTracker } from '../hooks/useInteractionTracker';
import { useProductActions } from '../hooks/useProductActions';
import { useStore } from '../hooks/useStore';
import './ProductRecommendations.css';

/**
 * Component hiển thị gợi ý sản phẩm được cá nhân hóa bằng PPO
 */
const ProductRecommendations = ({ type = 'personalized', limit = 10, categoryId = null, productId = null }) => {
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { trackProductClick } = useInteractionTracker();
    const navigate = useNavigate();
    const { dataUser } = useStore();
    const {
        likedProducts,
        handleAddToCart: hookAddToCart,
        handleBuyNow: hookBuyNow,
        handleAddToFavorite: hookAddToFavorite,
        initializeLikedProducts,
        setProductLiked,
    } = useProductActions();

    useEffect(() => {
        fetchRecommendations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type, limit, categoryId, productId]);

    // Sync liked state when recommendations or user changes
    useEffect(() => {
        if (recommendations && recommendations.length > 0) {
            const products = recommendations.map((rec) => rec.product || rec);
            initializeLikedProducts(products, dataUser?._id);
            products.forEach((product) => {
                const isLiked = product?.favourite?.includes(dataUser?._id) || false;
                setProductLiked(product._id, isLiked);
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataUser?._id, recommendations]);

    const fetchRecommendations = async () => {
        setLoading(true);
        setError(null);

        try {
            let data;

            switch (type) {
                case 'personalized':
                    data = await getPersonalizedRecommendations();
                    setRecommendations(data.metadata?.recommendations || []);
                    break;

                case 'trending':
                    data = await getTrendingRecommendations();
                    setRecommendations(data.metadata || []);
                    break;

                case 'similar':
                    if (!productId) {
                        throw new Error('Product ID is required for similar recommendations');
                    }
                    data = await getSimilarProducts(productId);
                    setRecommendations(data.metadata || []);
                    break;

                case 'category':
                    if (!categoryId) {
                        throw new Error('Category ID is required for category recommendations');
                    }
                    data = await getCategoryRecommendations(categoryId);
                    setRecommendations(data.metadata || []);
                    break;

                case 'cold-start':
                    data = await getColdStartRecommendations();
                    setRecommendations(data.metadata || []);
                    break;

                default:
                    throw new Error(`Unknown recommendation type: ${type}`);
            }
        } catch (err) {
            console.error('Error fetching recommendations:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleProductClick = async (rec) => {
        const product = rec.product || rec;

        // Track click
        await trackProductClick(product._id, product.category?._id);

        // Navigate to product detail
        navigate(`/product/${product._id}`);
    };

    // Local handlers to manage event propagation
    const handleAddToCart = async (product, e) => {
        if (e) e.stopPropagation();
        await hookAddToCart(product, e);
    };

    const handleBuyNow = async (product, e) => {
        if (e) e.stopPropagation();
        await hookBuyNow(product, e);
    };

    const handleAddToFavorite = async (product, e) => {
        if (e) e.stopPropagation();
        await hookAddToFavorite(product, e);
    };

    const formatPrice = (price, discount = 0) => {
        const finalPrice = price * (1 - discount / 100);
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(finalPrice);
    };

    const getTitle = () => {
        switch (type) {
            case 'personalized':
                return 'Gợi ý dành cho bạn';
            case 'trending':
                return 'Sản phẩm đang hot';
            case 'similar':
                return 'Sản phẩm tương tự';
            case 'category':
                return 'Sản phẩm nổi bật';
            case 'cold-start':
                return 'Sản phẩm mới nhất';
            default:
                return 'Gợi ý sản phẩm';
        }
    };

    if (loading) {
        return (
            <div className="recommendations-container">
                <h2 className="recommendations-title">{getTitle()}</h2>
                <div className="recommendations-loading">
                    <div className="spinner"></div>
                    <p>Đang tải gợi ý...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="recommendations-container">
                <h2 className="recommendations-title">{getTitle()}</h2>
                <div className="recommendations-error">
                    <p>Không thể tải gợi ý: {error}</p>
                    <button onClick={fetchRecommendations} className="retry-button">
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }

    if (recommendations.length === 0) {
        return null;
    }

    return (
        <div className="recommendations-container">
            <div className="recommendations-header">
                <h2 className="recommendations-title">{getTitle()}</h2>
            </div>

            <div className="recommendations-grid">
                {recommendations.map((rec, index) => {
                    const product = rec.product || rec;
                    const mainImage = `${import.meta.env.VITE_URL_IMAGE}/uploads/products/${
                        product.colors?.[0]?.images
                    }`;
                    const hasDiscount = product.discount > 0;

                    return (
                        <div
                            key={product._id || index}
                            className="recommendation-card"
                            onClick={() => handleProductClick(rec)}
                        >
                            {/* Rank badge for personalized recommendations */}
                            {type === 'personalized' && rec.rank && rec.rank <= 3 && (
                                <div className={`rank-badge rank-${rec.rank}`}>
                                    <span>#{rec.rank}</span>
                                </div>
                            )}

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

                                {/* Show reason for personalized recommendations */}
                                {type === 'personalized' && rec.reason && (
                                    <p className="recommendation-reason">
                                        <span className="reason-icon">💡</span>
                                        {rec.reason.includes('score') ? 'Phù hợp với bạn' : rec.reason}
                                    </p>
                                )}

                                {/* Action buttons */}
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
                                            className={`btn-favorite ${likedProducts[product._id] ? 'liked' : ''}`}
                                            title={
                                                likedProducts[product._id] ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'
                                            }
                                        >
                                            <Heart
                                                size={16}
                                                fill={likedProducts[product._id] ? 'currentColor' : 'none'}
                                            />
                                        </button>
                                    </div>
                                    <button onClick={(e) => handleBuyNow(product, e)} className="btn-buy-now">
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

export default ProductRecommendations;
