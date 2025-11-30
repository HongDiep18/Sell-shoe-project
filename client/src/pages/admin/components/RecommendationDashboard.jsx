import { useEffect, useState } from 'react';
import {
    getRecommendationMetrics,
    getModelInfo,
    getRecommendationStatistics,
    triggerModelTraining,
    prepareDataset,
    downloadDataset,
} from '../../../config/RecommendationRequest';
import './RecommendationDashboard.css';

/**
 * Bảng Điều Khiển Admin cho Hệ Thống Gợi Ý RL/PPO
 * Theo dõi metrics, training và quản lý hệ thống
 */
const RecommendationDashboard = () => {
    const [metrics, setMetrics] = useState(null);
    const [modelInfo, setModelInfo] = useState(null);
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [training, setTraining] = useState(false);
    const [trainingResult, setTrainingResult] = useState(null);
    const [dateRange, setDateRange] = useState({
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        fetchAllData();
    }, [dateRange]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            await Promise.all([fetchMetrics(), fetchModelInfo(), fetchStatistics()]);
        } catch (error) {
            console.error('Lỗi tải dữ liệu dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMetrics = async () => {
        try {
            const data = await getRecommendationMetrics();
            setMetrics(data.metadata);
        } catch (error) {
            console.error('Lỗi tải metrics:', error);
        }
    };

    const fetchModelInfo = async () => {
        try {
            const data = await getModelInfo();
            setModelInfo(data.metadata?.info || data.info);
        } catch (error) {
            console.error('Lỗi tải thông tin model:', error);
        }
    };

    const fetchStatistics = async () => {
        try {
            const data = await getRecommendationStatistics();
            setStatistics(data.metadata?.statistics || data.statistics);
        } catch (error) {
            console.error('Lỗi tải thống kê:', error);
        }
    };

    const handleTrainModel = async () => {
        if (
            !confirm(
                'Bạn có chắc muốn train model? Quá trình này chạy ở background (không chặn UI). Hãy kiểm tra backend logs để theo dõi tiến trình.',
            )
        ) {
            return;
        }

        setTraining(true);
        setTrainingResult(null);

        try {
            // Timeout increased to 30 seconds (training returns immediately but API request needs time)
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timeout - vui lòng thử lại')), 30000),
            );

            const data = await Promise.race([
                triggerModelTraining({
                    limit: 1000,
                    minInteractions: 5,
                }),
                timeoutPromise,
            ]);

            setTrainingResult(data);

            // Check if training actually initiated vs already running
            if (data.success) {
                alert(
                    `✅ ${data.message}\n\n📝 Hướng dẫn:\n- Backend sẽ chạy training ở background\n- Kiểm tra server logs (dòng [TRAIN]) để theo dõi tiến trình\n- Training thường mất 1-5 phút tùy lượng dữ liệu\n\n💡 Sau khi hoàn thành, model sẽ tự động được cập nhật.`,
                );
                // Refresh data after some delay for background training
                setTimeout(() => {
                    fetchAllData();
                }, 5000);
            } else {
                alert(`⚠️  ${data.message || 'Training chưa thể bắt đầu'}`);
            }
        } catch (error) {
            console.error('Lỗi training model:', error);

            // Extract detailed error message
            let errorMsg = 'Training thất bại';
            let suggestions = '';

            // Check for specific error types
            if (error.message?.includes('timeout')) {
                errorMsg = 'Request timeout - Backend không phản hồi';
                suggestions =
                    '\n\n💡 Kiểm tra:\n1. Backend server có đang chạy không? (npm start)\n2. Thử lại sau 1 phút\n3. Kiểm tra backend logs';
            } else if (error.response?.status === 500) {
                errorMsg = 'Lỗi server (HTTP 500)';
                suggestions =
                    '\n\n💡 Khả năng nguyên nhân:\n1. RL Service không chạy - Khởi động: cd rl-service && npm start\n2. Không đủ dữ liệu training - Cần tối thiểu 50 interactions/user\n3. Kiểm tra backend logs để xem chi tiết lỗi';
            } else if (error.message?.includes('Cannot read properties')) {
                errorMsg = 'Backend lỗi: Module bị mất';
                suggestions = '\n\n💡 Khởi động lại backend:\n1. npm start\n2. Kiểm tra backend logs';
            } else if (error.response?.data?.message) {
                errorMsg = error.response.data.message;
            } else if (error.message) {
                errorMsg = error.message;
            }

            alert(`❌ ${errorMsg}${suggestions}`);
        } finally {
            setTraining(false);
        }
    };
    const handlePrepareDataset = async () => {
        if (!confirm('Bạn có chắc muốn chuẩn bị dataset?')) {
            return;
        }

        try {
            const data = await prepareDataset({
                outputPath: './dataset/users_data.json',
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
                minUserInteractions: 5,
            });
            alert(`Dataset đã được chuẩn bị với ${data.metadata?.totalUsers || 0} người dùng!`);
        } catch (error) {
            console.error('Lỗi chuẩn bị dataset:', error);
            alert('Chuẩn bị dataset thất bại: ' + error.message);
        }
    };

    const handleDownloadDataset = async () => {
        try {
            const blob = await downloadDataset();

            // Ensure blob has correct encoding
            const correctedBlob = new Blob([blob], { type: 'application/json;charset=utf-8' });

            // Create download link
            const url = window.URL.createObjectURL(correctedBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dataset_${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            alert('Dataset tải xuống thành công!');
        } catch (error) {
            console.error('Lỗi tải xuống dataset:', error);
            alert('Tải xuống thất bại: ' + error.message);
        }
    };

    const formatPercent = (value) => {
        return `${(value * 100).toFixed(2)}%`;
    };

    const formatNumber = (value) => {
        return new Intl.NumberFormat('vi-VN').format(value);
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="spinner"></div>
                <p>Đang tải dashboard...</p>
            </div>
        );
    }

    return (
        <div className="recommendation-dashboard">
            <div className="dashboard-header">
                <h1>Bảng Điều Khiển Hệ Thống Gợi Ý RL/PPO</h1>
                <div className="date-range-selector">
                    <label>
                        Từ ngày:
                        <input
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                        />
                    </label>
                    <label>
                        Đến ngày:
                        <input
                            type="date"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                        />
                    </label>
                    <button onClick={fetchAllData} className="refresh-button">
                        🔄 Làm mới
                    </button>
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="metrics-grid">
                <div className="metric-card">
                    <div className="metric-icon">📊</div>
                    <div className="metric-content">
                        <h3>Tổng Gợi Ý</h3>
                        <p className="metric-value">{formatNumber(metrics?.totalRecommendations || 0)}</p>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon">👆</div>
                    <div className="metric-content">
                        <h3>Tỷ Lệ Tương Tác</h3>
                        <p className="metric-value">{formatPercent(metrics?.interactionRate || 0)}</p>
                        <p className="metric-subtitle">{formatNumber(metrics?.totalClicks || 0)} lượt click</p>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon">🛒</div>
                    <div className="metric-content">
                        <h3>Tỷ Lệ Thêm Giỏ Hàng</h3>
                        <p className="metric-value">{formatPercent(metrics?.addToCartRate || 0)}</p>
                        <p className="metric-subtitle">{formatNumber(metrics?.totalAddToCarts || 0)} lần thêm</p>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon">⭐</div>
                    <div className="metric-content">
                        <h3>Điểm Thưởng Trung Bình</h3>
                        <p className="metric-value">{(metrics?.averageReward || 0).toFixed(4)}</p>
                        <p className="metric-subtitle">Tổng: {(metrics?.totalReward || 0).toFixed(2)}</p>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon">📈</div>
                    <div className="metric-content">
                        <h3>Tỷ Lệ Click</h3>
                        <p className="metric-value">{formatPercent(metrics?.clickThroughRate || 0)}</p>
                    </div>
                </div>
            </div>

            {/* Model Info */}
            {modelInfo && (
                <div className="info-section">
                    <h2>Thông Tin Model</h2>
                    <div className="info-grid">
                        <div className="info-item">
                            <span className="info-label">Phiên bản Model:</span>
                            <span className="info-value">{modelInfo.modelVersion}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Số chiều State:</span>
                            <span className="info-value">{modelInfo.stateDim}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Số chiều Action:</span>
                            <span className="info-value">{modelInfo.actionDim}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Tổng sản phẩm:</span>
                            <span className="info-value">{formatNumber(modelInfo.totalProducts)}</span>
                        </div>
                    </div>

                    {modelInfo.hyperparameters && (
                        <div className="hyperparameters">
                            <h3>Siêu Tham Số</h3>
                            <div className="param-grid">
                                <div className="param-item">
                                    <span>Tốc độ học:</span>
                                    <code>{modelInfo.hyperparameters.learningRate}</code>
                                </div>
                                <div className="param-item">
                                    <span>Gamma:</span>
                                    <code>{modelInfo.hyperparameters.gamma}</code>
                                </div>
                                <div className="param-item">
                                    <span>Clip Range:</span>
                                    <code>{modelInfo.hyperparameters.clipRange}</code>
                                </div>
                                <div className="param-item">
                                    <span>Số Epochs:</span>
                                    <code>{modelInfo.hyperparameters.nEpochs}</code>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Control Panel */}
            <div className="control-panel">
                <h2>Bảng Điều Khiển</h2>
                <div className="control-buttons">
                    <button onClick={handleTrainModel} disabled={training} className="control-button train-button">
                        {training ? '🔄 Đang Training...' : '🎯 Huấn Luyện Model'}
                    </button>
                    <button onClick={handlePrepareDataset} className="control-button prepare-button">
                        📊 Chuẩn Bị Dataset
                    </button>
                    <button onClick={handleDownloadDataset} className="control-button download-button">
                        💾 Tải Xuống Dataset (CSV)
                    </button>
                    <button onClick={fetchAllData} className="control-button refresh-button">
                        🔄 Làm Mới Dữ Liệu
                    </button>
                </div>

                {trainingResult && (
                    <div className="training-result">
                        <h3>Kết Quả Training</h3>
                        <pre>{JSON.stringify(trainingResult, null, 2)}</pre>
                    </div>
                )}
            </div>

            {/* Statistics */}
            {statistics && (
                <div className="statistics-section">
                    <h2>Thống Kê Hệ Thống</h2>
                    <div className="stats-grid">
                        <div className="stat-item">
                            <span className="stat-label">Tổng số Gợi Ý:</span>
                            <span className="stat-value">{formatNumber(statistics.totalRecommendations)}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Tổng số Tương Tác:</span>
                            <span className="stat-value">{formatNumber(statistics.totalInteractions)}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Tỷ lệ Tương Tác:</span>
                            <span className="stat-value">{formatPercent(statistics.interactionRate)}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Điểm Thưởng Trung Bình:</span>
                            <span className="stat-value">{statistics.averageReward.toFixed(4)}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Điểm Thưởng Cao Nhất:</span>
                            <span className="stat-value">{statistics.maxReward.toFixed(4)}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Điểm Thưởng Thấp Nhất:</span>
                            <span className="stat-value">{statistics.minReward.toFixed(4)}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Performance Indicators */}
            <div className="performance-section">
                <h2>Chỉ Số Hiệu Suất</h2>
                <div className="performance-bars">
                    <div className="performance-bar-item">
                        <div className="bar-label">
                            <span>Tỷ Lệ Tương Tác</span>
                            <span>{formatPercent(metrics?.interactionRate || 0)}</span>
                        </div>
                        <div className="bar-container">
                            <div
                                className="bar-fill interaction"
                                style={{ width: `${(metrics?.interactionRate || 0) * 100}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="performance-bar-item">
                        <div className="bar-label">
                            <span>Tỷ Lệ Click</span>
                            <span>{formatPercent(metrics?.clickThroughRate || 0)}</span>
                        </div>
                        <div className="bar-container">
                            <div
                                className="bar-fill ctr"
                                style={{ width: `${(metrics?.clickThroughRate || 0) * 100}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="performance-bar-item">
                        <div className="bar-label">
                            <span>Tỷ Lệ Thêm Giỏ Hàng</span>
                            <span>{formatPercent(metrics?.addToCartRate || 0)}</span>
                        </div>
                        <div className="bar-container">
                            <div
                                className="bar-fill cart"
                                style={{ width: `${(metrics?.addToCartRate || 0) * 100}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="performance-bar-item">
                        <div className="bar-container">
                            <div
                                className="bar-fill conversion"
                                style={{ width: `${(metrics?.conversionRate || 0) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecommendationDashboard;
