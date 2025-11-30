import { useState, useEffect } from 'react';
// import RecommendationRequest from '../config/RecommendationRequest';
import CardBody from './CardBody';
import { toast } from 'react-toastify';

const PersonalizedRecommendations = ({ userId, method = 'ppo', limit = 10 }) => {
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [modelVersion, setModelVersion] = useState(null);

    useEffect(() => {
        if (userId) {
            fetchRecommendations();
        }
    }, [userId, method, limit]);

    const fetchRecommendations = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await RecommendationRequest.getRecommendations(limit, method);

            if (response.metadata) {
                setRecommendations(response.metadata.recommendations || []);
                setSessionId(response.metadata.sessionId);
                setModelVersion(response.metadata.modelVersion);
            }

            setLoading(false);
        } catch (err) {
            console.error('Error fetching recommendations:', err);
            setError('Không thể tải đề xuất sản phẩm');
            setLoading(false);
        }
    };

    const handleProductClick = async (product, rank) => {
        // Track feedback when user clicks on recommended product
        if (sessionId) {
            try {
                await RecommendationRequest.trackFeedback({
                    recommendationId: sessionId,
                    feedbackType: 'click',
                    productId: product.productId,
                    rank: rank,
                });
            } catch (err) {
                console.error('Error tracking feedback:', err);
            }
        }
    };

    if (loading) {
        return (
            <div className="personalized-recommendations">
                <h2 className="section-title">
                    <span className="icon">🎯</span> Đề xuất dành cho bạn
                </h2>
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Đang tải đề xuất...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="personalized-recommendations">
                <h2 className="section-title">
                    <span className="icon">🎯</span> Đề xuất dành cho bạn
                </h2>
                <div className="error-message">
                    <p>{error}</p>
                    <button onClick={fetchRecommendations} className="retry-button">
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }

    if (recommendations.length === 0) {
        return (
            <div className="personalized-recommendations">
                <h2 className="section-title">
                    <span className="icon">🎯</span> Đề xuất dành cho bạn
                </h2>
                <div className="empty-message">
                    <p>Chưa có đề xuất nào. Hãy khám phá thêm sản phẩm!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="personalized-recommendations">
            <div className="section-header">
                <h2 className="section-title">
                    <span className="icon">🎯</span> Đề xuất dành riêng cho bạn
                </h2>
                {modelVersion && (
                    <span className="model-badge" title={`Model version: ${modelVersion}`}>
                        AI-Powered
                    </span>
                )}
            </div>

            <div className="recommendations-grid">
                {recommendations.map((rec, index) => (
                    <div
                        key={rec.productId}
                        className="recommendation-item"
                        onClick={() => handleProductClick(rec, rec.rank)}
                    >
                        <CardBody data={rec.product} />
                        <div className="recommendation-meta">
                            <span className="rank-badge">#{rec.rank}</span>
                            {rec.score > 0.7 && (
                                <span
                                    className="high-confidence"
                                    title={`Confidence: ${(rec.score * 100).toFixed(0)}%`}
                                >
                                    ⭐ Phù hợp nhất
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <style jsx>{`
                .personalized-recommendations {
                    margin: 40px 0;
                    padding: 20px;
                }

                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                }

                .section-title {
                    font-size: 28px;
                    font-weight: bold;
                    color: #333;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .icon {
                    font-size: 32px;
                }

                .model-badge {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    cursor: help;
                }

                .recommendations-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                    gap: 24px;
                }

                .recommendation-item {
                    position: relative;
                    cursor: pointer;
                    transition: transform 0.3s ease;
                }

                .recommendation-item:hover {
                    transform: translateY(-5px);
                }

                .recommendation-meta {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: 8px;
                    padding: 0 8px;
                }

                .rank-badge {
                    background: #f0f0f0;
                    color: #666;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 600;
                }

                .high-confidence {
                    color: #ff6b6b;
                    font-size: 12px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .loading-spinner {
                    text-align: center;
                    padding: 60px 0;
                }

                .spinner {
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #667eea;
                    border-radius: 50%;
                    width: 50px;
                    height: 50px;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                }

                @keyframes spin {
                    0% {
                        transform: rotate(0deg);
                    }
                    100% {
                        transform: rotate(360deg);
                    }
                }

                .error-message,
                .empty-message {
                    text-align: center;
                    padding: 60px 20px;
                    color: #666;
                }

                .retry-button {
                    margin-top: 20px;
                    padding: 10px 24px;
                    background: #667eea;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 600;
                    transition: background 0.3s ease;
                }

                .retry-button:hover {
                    background: #5568d3;
                }

                @media (max-width: 768px) {
                    .recommendations-grid {
                        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                        gap: 16px;
                    }

                    .section-title {
                        font-size: 22px;
                    }

                    .model-badge {
                        font-size: 10px;
                        padding: 4px 8px;
                    }
                }
            `}</style>
        </div>
    );
};

export default PersonalizedRecommendations;
