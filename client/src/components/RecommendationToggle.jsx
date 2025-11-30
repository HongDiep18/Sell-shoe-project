import { useState } from 'react';

const RecommendationToggle = ({ onMethodChange, currentMethod = 'ppo' }) => {
    const [method, setMethod] = useState(currentMethod);

    const methods = [
        { value: 'ppo', label: 'AI Cá nhân hóa', icon: '🤖', description: 'Thuật toán PPO' },
        { value: 'collaborative', label: 'Người dùng tương tự', icon: '👥', description: 'Collaborative Filtering' },
        { value: 'hybrid', label: 'Kết hợp', icon: '🔀', description: 'Hybrid Approach' }
    ];

    const handleMethodChange = (newMethod) => {
        setMethod(newMethod);
        if (onMethodChange) {
            onMethodChange(newMethod);
        }
    };

    return (
        <div className="recommendation-toggle">
            <div className="toggle-label">
                <span className="icon">🎯</span>
                <span>Phương thức đề xuất:</span>
            </div>
            
            <div className="toggle-buttons">
                {methods.map((m) => (
                    <button
                        key={m.value}
                        className={`toggle-button ${method === m.value ? 'active' : ''}`}
                        onClick={() => handleMethodChange(m.value)}
                        title={m.description}
                    >
                        <span className="button-icon">{m.icon}</span>
                        <span className="button-label">{m.label}</span>
                    </button>
                ))}
            </div>

            <style jsx>{`
                .recommendation-toggle {
                    background: white;
                    border-radius: 12px;
                    padding: 20px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    margin-bottom: 24px;
                }

                .toggle-label {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 16px;
                    font-size: 16px;
                    font-weight: 600;
                    color: #333;
                }

                .toggle-label .icon {
                    font-size: 20px;
                }

                .toggle-buttons {
                    display: flex;
                    gap: 12px;
                    flex-wrap: wrap;
                }

                .toggle-button {
                    flex: 1;
                    min-width: 150px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 6px;
                    padding: 12px 16px;
                    background: #f8f9fa;
                    border: 2px solid #e9ecef;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-size: 14px;
                }

                .toggle-button:hover {
                    background: #e9ecef;
                    border-color: #667eea;
                }

                .toggle-button.active {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-color: #667eea;
                    color: white;
                    font-weight: 600;
                }

                .button-icon {
                    font-size: 24px;
                }

                .button-label {
                    font-size: 13px;
                }

                @media (max-width: 768px) {
                    .toggle-buttons {
                        flex-direction: column;
                    }

                    .toggle-button {
                        min-width: 100%;
                        flex-direction: row;
                        justify-content: center;
                    }

                    .button-label {
                        font-size: 14px;
                    }
                }
            `}</style>
        </div>
    );
};

export default RecommendationToggle;

