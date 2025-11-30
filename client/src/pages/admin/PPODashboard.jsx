import { useState, useEffect } from 'react';
import { Card, Button, Statistic, Row, Col, Table, message, Modal, Progress, Tag, Tabs } from 'antd';
import {
    RobotOutlined,
    ThunderboltOutlined,
    LineChartOutlined,
    DatabaseOutlined,
    ReloadOutlined,
    DownloadOutlined,
    EyeOutlined,
} from '@ant-design/icons';
import {
    getRecommendationStatistics,
    getModelInfo,
    triggerModelTraining,
    evaluateModel,
    downloadDataset,
    prepareDataset,
} from '../../config/RecommendationRequest';

const { TabPane } = Tabs;

function PPODashboard() {
    const [loading, setLoading] = useState(false);
    const [statistics, setStatistics] = useState(null);
    const [modelInfo, setModelInfo] = useState(null);
    const [trainingHistory, setTrainingHistory] = useState([]);
    const [isTraining, setIsTraining] = useState(false);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const [statsRes, modelRes] = await Promise.all([getRecommendationStatistics(), getModelInfo()]);

            setStatistics(statsRes.metadata);
            setModelInfo(modelRes.metadata);
        } catch (error) {
            message.error('Không thể tải dữ liệu dashboard');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleTrainModel = async () => {
        Modal.confirm({
            title: 'Xác nhận train model',
            content: 'Bạn có chắc muốn train lại PPO model? Quá trình này có thể mất vài phút.',
            okText: 'Train',
            cancelText: 'Hủy',
            onOk: async () => {
                setIsTraining(true);
                try {
                    const result = await triggerModelTraining();
                    message.success('Train model thành công!');

                    // Add to training history
                    setTrainingHistory([
                        {
                            key: Date.now(),
                            time: new Date().toLocaleString('vi-VN'),
                            status: 'success',
                            metrics: result.metadata?.metrics,
                        },
                        ...trainingHistory,
                    ]);

                    // Refresh data
                    await fetchDashboardData();
                } catch (error) {
                    message.error('Train model thất bại: ' + error.message);
                } finally {
                    setIsTraining(false);
                }
            },
        });
    };

    const handleEvaluateModel = async () => {
        setLoading(true);
        try {
            const result = await evaluateModel();
            Modal.info({
                title: 'Kết quả đánh giá model',
                width: 600,
                content: (
                    <div>
                        <p>
                            <strong>Model Version:</strong> {result.metadata?.modelVersion}
                        </p>
                        <p>
                            <strong>CTR:</strong> {(result.metadata?.metrics?.clickThroughRate * 100).toFixed(2)}%
                        </p>
                        <p>
                            <strong>Conversion Rate:</strong>{' '}
                            {(result.metadata?.metrics?.conversionRate * 100).toFixed(2)}%
                        </p>
                        <p>
                            <strong>Average Reward:</strong> {result.metadata?.metrics?.averageReward?.toFixed(4)}
                        </p>
                    </div>
                ),
            });
        } catch (error) {
            message.error('Đánh giá model thất bại');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadDataset = async () => {
        try {
            message.loading('Đang chuẩn bị dataset...', 0);
            await downloadDataset();
            message.destroy();
            message.success('Download dataset thành công!');
        } catch (error) {
            message.destroy();
            message.error('Download dataset thất bại');
        }
    };

    const handlePrepareDataset = async () => {
        setLoading(true);
        try {
            const result = await prepareDataset();
            message.success(`Dataset đã được chuẩn bị: ${result.metadata?.totalUsers} users`);
        } catch (error) {
            message.error('Chuẩn bị dataset thất bại');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (value, thresholds) => {
        if (value >= thresholds.excellent) return 'success';
        if (value >= thresholds.good) return 'warning';
        return 'error';
    };

    const trainingColumns = [
        {
            title: 'Thời gian',
            dataIndex: 'time',
            key: 'time',
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Tag color={status === 'success' ? 'green' : 'red'}>
                    {status === 'success' ? 'Thành công' : 'Thất bại'}
                </Tag>
            ),
        },
        {
            title: 'Training Data Size',
            dataIndex: ['metrics', 'trainingDataSize'],
            key: 'dataSize',
        },
        {
            title: 'Avg Reward',
            dataIndex: ['metrics', 'avgReward'],
            key: 'avgReward',
            render: (val) => val?.toFixed(4),
        },
    ];

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '24px' }}>
                <h1>
                    <RobotOutlined /> PPO Recommendation Dashboard
                </h1>
                <p>Quản lý và giám sát hệ thống gợi ý sản phẩm sử dụng PPO</p>
            </div>

            {/* Key Metrics */}
            <Row gutter={16} style={{ marginBottom: '24px' }}>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Total Recommendations"
                            value={statistics?.totalRecommendations || 0}
                            prefix={<ThunderboltOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Click-Through Rate"
                            value={(statistics?.clickThroughRate * 100 || 0).toFixed(2)}
                            suffix="%"
                            prefix={<LineChartOutlined />}
                            valueStyle={{
                                color: getStatusColor(statistics?.clickThroughRate * 100 || 0, {
                                    excellent: 8,
                                    good: 5,
                                }),
                            }}
                        />
                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>Target: &gt; 5%</div>
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Conversion Rate"
                            value={(statistics?.conversionRate * 100 || 0).toFixed(2)}
                            suffix="%"
                            valueStyle={{
                                color: getStatusColor(statistics?.conversionRate * 100 || 0, {
                                    excellent: 3,
                                    good: 2,
                                }),
                            }}
                        />
                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>Target: &gt; 2%</div>
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Average Reward"
                            value={(statistics?.averageReward || 0).toFixed(4)}
                            valueStyle={{
                                color: getStatusColor(statistics?.averageReward || 0, {
                                    excellent: 0.6,
                                    good: 0.4,
                                }),
                            }}
                        />
                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>Target: &gt; 0.4</div>
                    </Card>
                </Col>
            </Row>

            {/* Detailed Metrics */}
            <Row gutter={16} style={{ marginBottom: '24px' }}>
                <Col span={8}>
                    <Card title="Interaction Metrics">
                        <div style={{ marginBottom: '16px' }}>
                            <div>Total Clicks: {statistics?.totalClicks || 0}</div>
                            <Progress
                                percent={(
                                    (statistics?.totalClicks / statistics?.totalRecommendations) * 100 || 0
                                ).toFixed(1)}
                                status="active"
                            />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <div>Total Add to Carts: {statistics?.totalAddToCarts || 0}</div>
                            <Progress
                                percent={((statistics?.totalAddToCarts / statistics?.totalClicks) * 100 || 0).toFixed(
                                    1,
                                )}
                                status="active"
                            />
                        </div>
                        <div>
                            <div>Total Purchases: {statistics?.totalPurchases || 0}</div>
                            <Progress
                                percent={(
                                    (statistics?.totalPurchases / statistics?.totalAddToCarts) * 100 || 0
                                ).toFixed(1)}
                                status="active"
                            />
                        </div>
                    </Card>
                </Col>

                <Col span={8}>
                    <Card title="Model Information">
                        <p>
                            <strong>Version:</strong> {modelInfo?.modelVersion || 'N/A'}
                        </p>
                        <p>
                            <strong>Learning Rate:</strong> {modelInfo?.config?.learningRate || 'N/A'}
                        </p>
                        <p>
                            <strong>Gamma:</strong> {modelInfo?.config?.gamma || 'N/A'}
                        </p>
                        <p>
                            <strong>Epsilon:</strong> {modelInfo?.config?.epsilon || 'N/A'}
                        </p>
                        <p>
                            <strong>Top K:</strong> {modelInfo?.config?.topK || 'N/A'}
                        </p>
                    </Card>
                </Col>

                <Col span={8}>
                    <Card title="Actions">
                        <Button
                            type="primary"
                            icon={<ThunderboltOutlined />}
                            onClick={handleTrainModel}
                            loading={isTraining}
                            block
                            style={{ marginBottom: '12px' }}
                        >
                            Train Model
                        </Button>
                        <Button
                            icon={<EyeOutlined />}
                            onClick={handleEvaluateModel}
                            loading={loading}
                            block
                            style={{ marginBottom: '12px' }}
                        >
                            Evaluate Model
                        </Button>
                        <Button
                            icon={<DatabaseOutlined />}
                            onClick={handlePrepareDataset}
                            loading={loading}
                            block
                            style={{ marginBottom: '12px' }}
                        >
                            Prepare Dataset
                        </Button>
                        <Button icon={<DownloadOutlined />} onClick={handleDownloadDataset} block>
                            Download Dataset
                        </Button>
                    </Card>
                </Col>
            </Row>

            {/* Training History */}
            <Card title="Training History">
                <Table
                    columns={trainingColumns}
                    dataSource={trainingHistory}
                    pagination={{ pageSize: 10 }}
                    loading={loading}
                />
            </Card>

            {/* Refresh Button */}
            <div style={{ marginTop: '24px', textAlign: 'right' }}>
                <Button icon={<ReloadOutlined />} onClick={fetchDashboardData} loading={loading}>
                    Refresh Data
                </Button>
            </div>
        </div>
    );
}

export default PPODashboard;
