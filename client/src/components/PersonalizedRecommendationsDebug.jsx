import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPersonalizedRecommendations } from '../config/RecommendationRequest';
import { useInteractionTracker } from '../hooks/useInteractionTracker';
import { useProductActions } from '../hooks/useProductActions';
import { ShoppingCart, Heart } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import './ProductRecommendations.css';

/**
 * Component hiển thị gợi ý sản phẩm PERSONALIZED với debug info
 */
const PersonalizedRecommendationsDebug = ({ limit = 10, showDebug = true }) => {
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [debugInfo, setDebugInfo] = useState(null);
    const { trackProductClick } = useInteractionTracker();
    const navigate = useNavigate();
    const { dataUser } = useStore();
    const {
        likedProducts,
        handleAddToCart: hookAddToCart,
        handleBuyNow: hookBuyNow,
        handleAddToFavorite: hookAddToFavorite,
        initializeLikedProducts,
    } = useProductActions();

    useEffect(() => {
        fetchRecommendations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [limit]);

    const fetchRecommendations = async () => {
        setLoading(true);
        setError(null);

        try {
            // Check cookies
            const cookies = document.cookie;
            console.log('🍪 Current cookies:', cookies);
            console.log('🔐 Is logged in?', cookies.includes('logged=1'));
            console.log('🎫 Has token?', cookies.includes('token='));

            console.log('🔍 Fetching personalized recommendations...');
            const data = await getPersonalizedRecommendations();

            console.log('📦 Received data:', data);

            if (data.statusCode === 200 && data.metadata) {
                const products = data.metadata.recommendations || data.metadata.products || [];
                setRecommendations(products);
                initializeLikedProducts(products, dataUser?._id);

                // Set debug info (bao gồm cả trường hợp empty)
                setDebugInfo({
                    userId: data.metadata.userId || 'N/A',
                    userEmail: data.metadata.userEmail || 'N/A',
                    method: data.metadata.method || 'none',
                    isPersonalized: data.metadata.isPersonalized || false,
                    isFallback: data.metadata.isFallback || false,
                    isEmpty: data.metadata.isEmpty || false,
                    isNewUser: data.metadata.isNewUser || false,
                    timestamp: data.metadata.timestamp,
                    count: products.length,
                });

                if (products.length === 0) {
                    console.log('⚠️  No recommendations - User chưa có interactions');
                } else {
                    console.log('✅ Recommendations loaded:', products.length);
                }
            }
        } catch (err) {
            console.error('❌ Error fetching recommendations:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Note: hook handlers expect (product, event)
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

    const handleProductClick = async (rec) => {
        const product = rec.product || rec;

        // Track click
        await trackProductClick(product._id, product.category?._id);

        // Navigate to product detail
        navigate(`/product/${product._id}`);
    };

    const formatPrice = (price, discount = 0) => {
        if (!price || isNaN(price)) {
            return 'N/A';
        }
        const finalPrice = price * (1 - discount / 100);
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(finalPrice);
    };

    if (loading) {
        return (
            <div className="recommendations-container">
                <h2 className="recommendations-title">🎯 Gợi ý dành cho bạn</h2>
                <div className="recommendations-loading">
                    <div className="spinner"></div>
                    <p>Đang tải gợi ý cá nhân hóa...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="recommendations-container">
                <h2 className="recommendations-title">🎯 Gợi ý dành cho bạn</h2>
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
        return (
            <div className="recommendations-container">
                <div className="recommendations-header">
                    <h2 className="recommendations-title">🎯 Gợi ý dành riêng cho bạn</h2>
                </div>

                {/* Debug Info for empty state */}
                {showDebug && debugInfo && (
                    <div className="debug-info">
                        <div className="debug-row">
                            <span className="debug-label">👤 User ID:</span>
                            <span className="debug-value">{debugInfo.userId || 'N/A'}</span>
                        </div>
                        <div className="debug-row">
                            <span className="debug-label">📧 Email:</span>
                            <span className="debug-value">{debugInfo.userEmail || 'N/A'}</span>
                        </div>
                        <div className="debug-row">
                            <span className="debug-label">⚙️ Method:</span>
                            <span className="debug-value">{debugInfo.method || 'none'}</span>
                        </div>
                        <div className="debug-row">
                            <span className="debug-label">📊 Status:</span>
                            <span className="debug-value">New User - No Interactions</span>
                        </div>
                    </div>
                )}

                <div className="recommendations-empty">
                    <div className="empty-icon">🔍</div>
                    <h3>Chưa có gợi ý cá nhân hóa</h3>
                    <p>Hãy khám phá và xem một vài sản phẩm để chúng tôi hiểu sở thích của bạn!</p>
                    <p className="empty-hint">💡 Sau khi xem sản phẩm, bạn sẽ nhận được gợi ý phù hợp với sở thích</p>
                </div>
            </div>
        );
    }

    return (
        <div className="recommendations-container">
            <div className="recommendations-header">
                <h2 className="recommendations-title">
                    🎯 Gợi ý dành riêng cho bạn
                    {debugInfo?.isPersonalized && <span className="badge-personalized">PERSONALIZED</span>}
                    {debugInfo?.isFallback && <span className="badge-fallback">FALLBACK</span>}
                </h2>
                <button onClick={fetchRecommendations} className="refresh-button" disabled={loading}>
                    {loading ? '⏳' : '🔄'} Refresh
                </button>
            </div>

            <div className="recommendations-grid">
                {recommendations.map((rec, index) => {
                    const product = rec.product || rec;

                    // Debug log để check product structure
                    if (index === 0) {
                        console.log('📦 First product structure:', product);
                        console.log('📦 Product colors:', product.colors);
                        console.log('📦 Product images:', product.images);
                    }

                    // Get main image - support multiple formats
                    let mainImage = '';
                    if (product.colors?.[0]?.images) {
                        // Format: colors array with images
                        mainImage = `${import.meta.env.VITE_URL_IMAGE}/uploads/products/${product.colors[0].images}`;
                    } else if (product.images?.[0]) {
                        // Format: images array
                        mainImage = `${import.meta.env.VITE_URL_IMAGE}/uploads/products/${product.images[0]}`;
                    } else {
                        // Fallback placeholder
                        mainImage = '/placeholder-product.jpg';
                    }

                    const hasDiscount = product.discount && product.discount > 0;
                    const categoryName = product.category?.categoryName || product.category?.name || 'Sản phẩm';
                    const isLiked = likedProducts[product._id] || false;

                    return (
                        <div
                            key={product._id || index}
                            className="recommendation-card"
                            onClick={() => handleProductClick(rec)}
                        >
                            {/* Rank badge */}
                            {rec.rank && rec.rank <= 3 && (
                                <div className={`rank-badge rank-${rec.rank}`}>
                                    <span>#{rec.rank}</span>
                                </div>
                            )}

                            {/* Discount badge */}
                            {hasDiscount && <div className="discount-badge">-{product.discount}%</div>}

                            {/* Product image */}
                            <div className="product-image-wrapper">
                                <img
                                    src={mainImage}
                                    alt={product.name || 'Product'}
                                    className="product-image"
                                    loading="lazy"
                                    onError={(e) => {
                                        e.target.src = '/placeholder-product.jpg';
                                    }}
                                />
                            </div>

                            {/* Product info */}
                            <div className="product-info">
                                <h3 className="product-name">{product.name || 'Sản phẩm'}</h3>

                                <p className="product-category">{categoryName}</p>

                                <div className="product-pricing">
                                    {hasDiscount && (
                                        <span className="original-price">{formatPrice(product.price)}</span>
                                    )}
                                    <span className="final-price">{formatPrice(product.price, product.discount)}</span>
                                </div>

                                {/* Show reason */}
                                {rec.reason && (
                                    <p className="recommendation-reason">
                                        <span className="reason-icon">💡</span>
                                        {rec.reason}
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
                                            className={`btn-favorite ${isLiked ? 'liked' : ''}`}
                                            title={isLiked ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
                                        >
                                            <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
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

            <style jsx>{`
                .recommendations-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                    gap: 12px;
                }

                .refresh-button {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .refresh-button:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                }

                .refresh-button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .debug-info {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 16px 20px;
                    border-radius: 12px;
                    margin-bottom: 24px;
                    font-size: 14px;
                    font-family: 'Courier New', monospace;
                }

                .debug-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 6px 0;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                }

                .debug-row:last-child {
                    border-bottom: none;
                }

                .debug-label {
                    font-weight: 600;
                    opacity: 0.9;
                }

                .debug-value {
                    font-weight: bold;
                    text-align: right;
                }

                .badge-personalized {
                    background: #10b981;
                    color: white;
                    padding: 4px 12px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 700;
                    margin-left: 12px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .badge-fallback {
                    background: #f59e0b;
                    color: white;
                    padding: 4px 12px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 700;
                    margin-left: 12px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .recommendations-empty {
                    text-align: center;
                    padding: 60px 20px;
                    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                    border-radius: 16px;
                    margin: 20px 0;
                }

                .empty-icon {
                    font-size: 64px;
                    margin-bottom: 20px;
                    animation: bounce 2s infinite;
                }

                @keyframes bounce {
                    0%,
                    100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-10px);
                    }
                }

                .recommendations-empty h3 {
                    font-size: 24px;
                    font-weight: 700;
                    color: #1a1a1a;
                    margin: 0 0 12px 0;
                }

                .recommendations-empty p {
                    font-size: 16px;
                    color: #666;
                    margin: 8px 0;
                    line-height: 1.6;
                }

                .empty-hint {
                    font-size: 14px;
                    color: #667eea;
                    font-weight: 600;
                    margin-top: 16px !important;
                }

                .product-actions {
                    margin-top: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .action-row {
                    display: flex;
                    gap: 8px;
                }

                .btn-cart {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    background-color: #f3f4f6;
                    color: #374151;
                    border: none;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .btn-cart:hover {
                    background-color: #e5e7eb;
                }

                .btn-favorite {
                    padding: 8px 12px;
                    background-color: #f3f4f6;
                    color: #6b7280;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .btn-favorite:hover {
                    background-color: #e5e7eb;
                }

                .btn-favorite.liked {
                    background-color: #fee2e2;
                    color: #dc2626;
                }

                .btn-buy-now {
                    width: 100%;
                    background-color: #dc2626;
                    color: white;
                    border: none;
                    padding: 10px 16px;
                    border-radius: 6px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .btn-buy-now:hover {
                    background-color: #b91c1c;
                    transform: translateY(-1px);
                }
            `}</style>
        </div>
    );
};

export default PersonalizedRecommendationsDebug;
