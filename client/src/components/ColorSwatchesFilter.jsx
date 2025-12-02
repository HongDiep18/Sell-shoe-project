import React, { useState } from 'react';

function ColorSwatchesFilter({ colors, selectedColor, onColorChange }) {
    const [showAllColors, setShowAllColors] = useState(false);

    const colorMap = {
        Trắng: '#FFFFFF',
        White: '#FFFFFF',
        Đen: '#000000',
        Black: '#000000',
        Đỏ: '#DC2626',
        Red: '#DC2626',
        Xanh: '#3B82F6',
        Blue: '#3B82F6',
        'Xanh lá': '#22C55E',
        Green: '#22C55E',
        Vàng: '#FBBF24',
        Yellow: '#FBBF24',
        Xám: '#9CA3AF',
        Gray: '#9CA3AF',
        Tím: '#A855F7',
        Purple: '#A855F7',
        Cam: '#F97316',
        Orange: '#F97316',
    };

    const visibleColors = colors.slice(0, 8);
    const hasMore = colors.length > 8;

    return (
        <div>
            {/* All Color Button */}
            <div className="mb-3">
                <button
                    onClick={() => onColorChange('all')}
                    className={`w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedColor === 'all'
                            ? 'bg-red-50 text-red-700 border-2 border-red-300'
                            : 'text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }`}
                >
                    Tất cả màu
                </button>
            </div>

            {/* Color Swatches Grid */}
            <div className="grid grid-cols-4 gap-3">
                {(showAllColors ? colors : visibleColors).map((color) => {
                    const colorName = typeof color === 'string' ? color : color.name;
                    const colorValue = colorMap[colorName] || '#CCCCCC';
                    const colorCount = typeof color === 'object' && color.count ? color.count : null;

                    return (
                        <button
                            key={colorName}
                            onClick={() => onColorChange(colorName)}
                            className={`group relative flex flex-col items-center gap-1 transition-all ${
                                selectedColor === colorName ? 'scale-110' : 'scale-100'
                            }`}
                            title={colorName}
                        >
                            {/* Color Circle */}
                            <div
                                className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${
                                    selectedColor === colorName
                                        ? 'border-red-600 ring-2 ring-red-200'
                                        : 'border-gray-300 group-hover:border-gray-500'
                                }`}
                                style={{
                                    backgroundColor: colorValue,
                                    boxShadow: colorValue === '#FFFFFF' ? 'inset 0 0 0 1px #D1D5DB' : 'none',
                                }}
                            >
                                {selectedColor === colorName && <span className="text-white text-xs">✓</span>}
                            </div>
                            {/* Color Name */}
                            <span className="text-xs text-gray-700 text-center">{colorName}</span>
                            {colorCount && <span className="text-xs text-gray-500">({colorCount})</span>}
                        </button>
                    );
                })}
            </div>

            {/* Show More Button */}
            {hasMore && (
                <button
                    onClick={() => setShowAllColors(!showAllColors)}
                    className="mt-3 w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                >
                    {showAllColors ? 'Ẩn bớt' : `Xem tất cả (${colors.length})`}
                </button>
            )}
        </div>
    );
}

export default ColorSwatchesFilter;
