import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Search as SearchIcon,
    Loader2,
    TrendingUp,
    Sparkles,
    X,
    Filter,
    SlidersHorizontal,
    Package,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import CardBody from '../components/CardBody';
import { requestSearchProduct, requestFilterProduct } from '../config/ProductRequest';
import { getPersonalizedRecommendations, getTrendingRecommendations } from '../config/RecommendationRequest';
import { trackInteraction } from '../config/UserInteractionRequest';

function Search() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // States
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
    const [searchResults, setSearchResults] = useState([]);
    const [ppoRecommendations, setPpoRecommendations] = useState([]);
    const [trendingProducts, setTrendingProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [recommendationsLoading, setRecommendationsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // Filter states
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        priceMin: '',
        priceMax: '',
        sortBy: 'relevance',
    });

    // Session tracking
    const [sessionId] = useState(`search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

    // Sort options
    const sortOptions = [
        { value: 'relevance', label: 'Liên quan nhất' },
        { value: 'newest', label: 'Mới nhất' },
        { value: 'price_asc', label: 'Giá thấp đến cao' },
        { value: 'price_desc', label: 'Giá cao đến thấp' },
        { value: 'name', label: 'Tên A-Z' },
    ];

    // Load PPO recommendations and trending products on mount
    useEffect(() => {
        loadRecommendations();
    }, []);

    // Perform search when query changes
    useEffect(() => {
        const query = searchParams.get('q');
        if (query) {
            setSearchQuery(query);
            performSearch(query);
        }
    }, [searchParams]);

    const loadRecommendations = async () => {
        setRecommendationsLoading(true);
        try {
            // Load PPO-based personalized recommendations
            const ppoResponse = await getPersonalizedRecommendations();
            if (ppoResponse.statusCode === 200) {
                setPpoRecommendations(ppoResponse.metadata.products || []);
            }

            // Load trending products based on views and feedback
            const trendingResponse = await getTrendingRecommendations();
            if (trendingResponse.statusCode === 200) {
                setTrendingProducts(trendingResponse.metadata.products || []);
            }
        } catch (error) {
            console.error('Error loading recommendations:', error);
        } finally {
            setRecommendationsLoading(false);
        }
    };

    const performSearch = async (query) => {
        if (!query.trim()) {
            setSearchResults([]);
            setHasSearched(false);
            return;
        }

        setLoading(true);
        setHasSearched(true);

        try {
            // Search products
            const response = await requestSearchProduct(query);

            console.log('🔍 Search.jsx Response:', response);

            // Handle response - metadata can be an array directly
            let results = [];
            if (response && response.statusCode === 200) {
                if (response.metadata) {
                    // If metadata is an array directly
                    if (Array.isArray(response.metadata)) {
                        results = response.metadata;
                    }
                    // If metadata has a products property
                    else if (Array.isArray(response.metadata.products)) {
                        results = response.metadata.products;
                    }
                }
            } else if (response && Array.isArray(response.metadata)) {
                // Fallback: if metadata is array (for different response formats)
                results = response.metadata;
            }

            console.log('📦 Total Results from API:', results.length);

            // Apply filters and sorting
            results = applyFiltersAndSort(results);

            console.log('🎯 Final Results after filters:', results.length);

            setSearchResults(results);

            // Track search interaction
            await trackInteraction({
                productId: null,
                interactionType: 'search',
                sessionId,
                metadata: {
                    searchQuery: query,
                    resultsCount: results.length,
                    filters: filters,
                },
            });
        } catch (error) {
            console.error('❌ Error searching products:', error);
            console.error('Error details:', error.message);
            setSearchResults([]);
        } finally {
            setLoading(false);
        }
    };

    const applyFiltersAndSort = (products) => {
        if (!Array.isArray(products)) {
            console.warn('⚠️ applyFiltersAndSort: products is not an array', products);
            return [];
        }

        let filtered = [...products];

        // Apply price filters - only if values are provided
        if (filters.priceMin && filters.priceMin !== '') {
            const minPrice = parseFloat(filters.priceMin);
            filtered = filtered.filter((p) => {
                const price = p?.price || 0;
                return !isNaN(minPrice) && price >= minPrice;
            });
        }

        if (filters.priceMax && filters.priceMax !== '') {
            const maxPrice = parseFloat(filters.priceMax);
            filtered = filtered.filter((p) => {
                const price = p?.price || 0;
                return !isNaN(maxPrice) && price <= maxPrice;
            });
        }

        // Apply sorting
        switch (filters.sortBy) {
            case 'price_asc':
                filtered.sort((a, b) => (a?.price || 0) - (b?.price || 0));
                break;
            case 'price_desc':
                filtered.sort((a, b) => (b?.price || 0) - (a?.price || 0));
                break;
            case 'name':
                filtered.sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));
                break;
            case 'newest':
                filtered.sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));
                break;
            // 'relevance' is default order from search
            default:
                break;
        }

        console.log('🎯 Filtered results:', filtered.length, 'products from', products.length);
        return filtered;
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            setSearchParams({ q: searchQuery });
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const applyFilters = () => {
        performSearch(searchQuery);
        setShowFilters(false);
    };

    const clearFilters = () => {
        setFilters({
            priceMin: '',
            priceMax: '',
            sortBy: 'relevance',
        });
    };

    const handleProductClick = async (productId, source = 'search_results') => {
        // Track click interaction
        await trackInteraction({
            productId,
            interactionType: 'click',
            sessionId,
            metadata: {
                source: 'search_page',
                searchQuery,
                section: source,
            },
        });
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            minimumFractionDigits: 0,
        }).format(price);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            {/* Search Header */}
            <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white py-12">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto">
                        <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center">Tìm kiếm sản phẩm</h1>

                        {/* Quick Stats */}
                        {hasSearched && (
                            <div className="mt-4 text-center text-white/90">
                                <p className="text-sm">
                                    Tìm thấy <span className="font-bold">{searchResults.length}</span> sản phẩm
                                    {searchQuery && ` cho "${searchQuery}"`}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-8">
                {/* Filter Button */}
                <div className="mb-6 flex justify-end">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center space-x-2 bg-white px-4 py-2.5 rounded-lg border border-gray-300 shadow-sm hover:bg-gray-50 transition-colors"
                    >
                        <SlidersHorizontal size={18} />
                        <span>Bộ lọc</span>
                    </button>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Bộ lọc tìm kiếm</h3>
                            <button
                                onClick={clearFilters}
                                className="text-sm text-red-600 hover:text-red-700 font-medium"
                            >
                                Xóa bộ lọc
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Price Min */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Giá tối thiểu</label>
                                <input
                                    type="number"
                                    value={filters.priceMin}
                                    onChange={(e) => handleFilterChange('priceMin', e.target.value)}
                                    placeholder="0"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                />
                            </div>

                            {/* Price Max */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Giá tối đa</label>
                                <input
                                    type="number"
                                    value={filters.priceMax}
                                    onChange={(e) => handleFilterChange('priceMax', e.target.value)}
                                    placeholder="10000000"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                />
                            </div>

                            {/* Sort By */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Sắp xếp theo</label>
                                <select
                                    value={filters.sortBy}
                                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                >
                                    {sortOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={applyFilters}
                                className="bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
                            >
                                Áp dụng bộ lọc
                            </button>
                        </div>
                    </div>
                )}

                {/* Unified Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="animate-spin text-red-600 mb-4" size={48} />
                        <p className="text-gray-600">Đang tìm kiếm...</p>
                    </div>
                ) : !hasSearched ? (
                    <div className="text-center py-20">
                        <SearchIcon className="mx-auto text-gray-400 mb-4" size={64} />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Bắt đầu tìm kiếm</h3>
                        <p className="text-gray-600">Nhập từ khóa để tìm kiếm sản phẩm bạn muốn</p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {/* Search Results Section */}
                        {searchResults.length > 0 && (
                            <>
                                {/* Trending Products in Search Results */}
                                {searchResults.filter((p) => p.isTrending).length > 0 && (
                                    <section>
                                        <div className="mb-6 bg-gradient-to-r from-orange-100 to-red-100 rounded-lg p-6 border border-orange-200">
                                            <div className="flex items-start space-x-3">
                                                <TrendingUp className="text-orange-600 mt-1" size={24} />
                                                <div>
                                                    <h2 className="text-2xl font-bold text-orange-900 mb-2">
                                                        🔥 Sản phẩm xu hướng
                                                    </h2>
                                                    <p className="text-orange-800 text-sm">
                                                        {searchResults.filter((p) => p.isTrending).length} sản phẩm đang
                                                        được quan tâm nhiều nhất
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                            {searchResults
                                                .filter((p) => p.isTrending)
                                                .map((product) => (
                                                    <div
                                                        key={product._id}
                                                        onClick={() =>
                                                            handleProductClick(product._id, 'trending_search_results')
                                                        }
                                                    >
                                                        <CardBody product={product} />
                                                    </div>
                                                ))}
                                        </div>
                                    </section>
                                )}

                                {/* Other Search Results */}
                                {searchResults.filter((p) => !p.isTrending).length > 0 && (
                                    <section>
                                        <div className="mb-6">
                                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                                Kết quả tìm kiếm khác
                                            </h2>
                                            <p className="text-gray-600">
                                                {searchResults.filter((p) => !p.isTrending).length} sản phẩm phù hợp với
                                                "{searchQuery}"
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                            {searchResults
                                                .filter((p) => !p.isTrending)
                                                .map((product) => (
                                                    <div
                                                        key={product._id}
                                                        onClick={() =>
                                                            handleProductClick(product._id, 'search_results')
                                                        }
                                                    >
                                                        <CardBody product={product} />
                                                    </div>
                                                ))}
                                        </div>
                                    </section>
                                )}
                            </>
                        )}

                        {/* No Search Results */}
                        {searchResults.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
                                <Package className="text-gray-400 mb-4" size={64} />
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">Không tìm thấy sản phẩm</h3>
                                <p className="text-gray-600 text-center mb-6">
                                    Không có sản phẩm nào phù hợp với từ khóa "{searchQuery}"
                                </p>
                            </div>
                        )}

                        {/* PPO Recommendations Section */}
                        {ppoRecommendations.length > 0 && (
                            <section>
                                <div className="mb-6 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-6 border border-purple-200">
                                    <div className="flex items-start space-x-3">
                                        <Sparkles className="text-purple-600 mt-1" size={24} />
                                        <div>
                                            <h2 className="text-2xl font-bold text-purple-900 mb-2">
                                                Gợi ý thông minh dành cho bạn (PPO)
                                            </h2>
                                            <p className="text-purple-800 text-sm">
                                                Được cá nhân hóa bởi AI với thuật toán PPO (Proximal Policy
                                                Optimization), dựa trên lịch sử xem, mua hàng và sở thích của bạn.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                {recommendationsLoading ? (
                                    <div className="flex justify-center py-12">
                                        <Loader2 className="animate-spin text-purple-600" size={40} />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                        {ppoRecommendations.map((product) => (
                                            <div
                                                key={product._id}
                                                onClick={() => handleProductClick(product._id, 'ppo_recommendations')}
                                            >
                                                <CardBody product={product} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        )}

                        {/* Trending Products Section */}
                        {trendingProducts.length > 0 && (
                            <section>
                                <div className="mb-6 bg-gradient-to-r from-orange-100 to-red-100 rounded-lg p-6 border border-orange-200">
                                    <div className="flex items-start space-x-3">
                                        <TrendingUp className="text-orange-600 mt-1" size={24} />
                                        <div>
                                            <h2 className="text-2xl font-bold text-orange-900 mb-2">
                                                Sản phẩm xu hướng
                                            </h2>
                                            <p className="text-orange-800 text-sm">
                                                Những sản phẩm được xem và mua nhiều nhất, dựa trên feedback và tương
                                                tác của người dùng.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                {recommendationsLoading ? (
                                    <div className="flex justify-center py-12">
                                        <Loader2 className="animate-spin text-orange-600" size={40} />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                        {trendingProducts.map((product) => (
                                            <div
                                                key={product?._id}
                                                onClick={() => handleProductClick(product?._id, 'trending_products')}
                                            >
                                                <CardBody product={product} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        )}
                    </div>
                )}
            </div>

            <Footer />
        </div>
    );
}

export default Search;
