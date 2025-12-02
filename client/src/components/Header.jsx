import { Search, User, ShoppingCart, FileText, Phone, BoxIcon } from 'lucide-react';

import { Dropdown, Avatar, Drawer, Input } from 'antd';

import { UserOutlined, DownOutlined, ProductFilled, MenuOutlined, CloseOutlined } from '@ant-design/icons';

import logo from '../assets/logo.png';
import { Link, useNavigate } from 'react-router-dom';

import { useStore } from '../hooks/useStore';
import { requestLogout } from '../config/UserRequest';
import { toast } from 'react-toastify';
import useDebounce from '../hooks/useDebounce';
import { useEffect, useState } from 'react';
import { requestSearchProduct } from '../config/ProductRequest';

function Header() {
    const { dataUser, cartData } = useStore();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [showSearchOverlay, setShowSearchOverlay] = useState(false);

    const handleLogout = () => {
        try {
            requestLogout();
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            navigate('/login');
        } catch (error) {
            toast.error(error.response.data.message);
        }
    };

    const debounce = useDebounce(query, 500);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        handleResize();
        window.addEventListener('resize', handleResize);

        const fetchSearchProduct = async () => {
            if (debounce.trim()) {
                setIsSearching(true);
                try {
                    const res = await requestSearchProduct(debounce);
                    console.log('🔍 Header Search Response:', res);

                    // Handle response - metadata can be an array directly
                    let results = [];
                    if (res && res.metadata) {
                        // If metadata is an array directly
                        if (Array.isArray(res.metadata)) {
                            results = res.metadata;
                        }
                        // If metadata has a products property
                        else if (Array.isArray(res.metadata.products)) {
                            results = res.metadata.products;
                        }
                    }

                    console.log('📦 Parsed results:', results.length, 'items');
                    setSearchResults(results);
                    setShowResults(true);
                } catch (error) {
                    console.error('❌ Search error:', error);
                    setSearchResults([]);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
                setShowResults(false);
            }
        };
        fetchSearchProduct();
    }, [debounce]);

    // Close search results when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.search-container')) {
                setShowResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const navigateUser = (path) => {
        navigate(path);
    };

    const handleProductClick = (productId) => {
        navigate(`/detail-product/${productId}`);
        setQuery('');
        setShowResults(false);
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(price);
    };

    const calculateDiscountPrice = (originalPrice, discount) => {
        return originalPrice - (originalPrice * discount) / 100;
    };

    const handleSearchInputChange = (e) => {
        setQuery(e.target.value);
        if (!e.target.value.trim()) {
            setShowResults(false);
        }
    };

    const userMenuItems = [
        { key: 'profile', label: 'Thông tin cá nhân', href: '/info-user', onClick: () => navigateUser('/profile') },
        { key: 'bookings', label: 'Đơn hàng của tôi', href: '/bookings', onClick: () => navigateUser('/order') },
        { key: 'warranty', label: 'Quản lý bảo hành', href: '/warranty', onClick: () => navigateUser('/warranty') },
        { key: 'logout', label: 'Đăng xuất', onClick: handleLogout },
    ];

    return (
        <div className="bg-[#ed1d24] text-white fixed top-0 left-0 right-0 z-50">
            <div className="w-[90%] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo Section */}
                    <div className="flex items-center gap-3">
                        {isMobile && (
                            <button
                                onClick={() => setDrawerOpen(true)}
                                className="text-white p-1 focus:outline-none"
                                aria-label="Open menu"
                            >
                                <MenuOutlined style={{ fontSize: 20 }} />
                            </button>
                        )}

                        <Link to="/">
                            <div className="flex items-center">
                                <div className="flex items-center space-x-2">
                                    <img className="w-25 h-15" src={logo} alt="logo" />
                                </div>
                            </div>
                        </Link>
                    </div>

                    {/* Search Bar Section (desktop) */}
                    {!isMobile && (
                        <div className="flex-1 max-w-lg mx-8">
                            <div className="relative search-container">
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm sản phẩm"
                                    className="w-full px-4 py-2 bg-white text-gray-800 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={query}
                                    onChange={handleSearchInputChange}
                                    onFocus={() => query.trim() && setShowResults(true)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && query.trim()) {
                                            navigate(`/search?q=${query}`);
                                            setShowResults(false);
                                        }
                                    }}
                                />
                                <div className="absolute right-0 top-0 h-full flex items-center bg-transparent rounded-r-md">
                                    {query.trim() && (
                                        <button
                                            onClick={() => {
                                                setQuery('');
                                                setShowResults(false);
                                            }}
                                            className="px-2 text-gray-600 hover:text-gray-800"
                                            aria-label="Clear search"
                                        >
                                            <CloseOutlined className="text-black" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            if (query.trim()) {
                                                navigate(`/search?q=${query}`);
                                                setShowResults(false);
                                            }
                                        }}
                                        className="px-3 bg-[#202020] rounded-r-md hover:bg-gray-700 transition-colors h-full flex items-center"
                                    >
                                        <Search className="w-5 h-5 text-white" />
                                    </button>
                                </div>

                                {/* Search Results Dropdown (desktop) */}
                                {showResults && (
                                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto mt-1">
                                        {isSearching ? (
                                            <div className="flex items-center justify-center py-8">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500"></div>
                                                <span className="ml-2 text-gray-600">Đang tìm kiếm...</span>
                                            </div>
                                        ) : searchResults.length > 0 ? (
                                            <>
                                                <div className="px-4 py-2 border-b border-gray-100">
                                                    <span className="text-sm font-semibold text-gray-700">
                                                        Tìm thấy {searchResults.length} sản phẩm
                                                    </span>
                                                </div>
                                                {searchResults.slice(0, 5).map((product) => (
                                                    <div
                                                        key={product._id}
                                                        onClick={() => handleProductClick(product._id)}
                                                        className="flex items-center p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                                    >
                                                        <img
                                                            src={`${import.meta.env.VITE_API_URL}/uploads/products/${
                                                                product.colors?.[0]?.images
                                                            }`}
                                                            alt={product.name}
                                                            className="w-12 h-12 object-cover rounded-lg mr-3"
                                                            onError={(e) => {
                                                                e.target.src =
                                                                    'https://via.placeholder.com/48x48?text=No+Image';
                                                            }}
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="text-sm font-medium text-gray-900 truncate">
                                                                    {product.name}
                                                                </h4>
                                                                {product.isTrending && (
                                                                    <span className="text-xs bg-gradient-to-r from-orange-500 to-red-500 text-white px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
                                                                        🔥 XU HƯỚNG
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center space-x-2 mt-1">
                                                                <span className="text-sm font-bold text-red-600">
                                                                    {formatPrice(
                                                                        calculateDiscountPrice(
                                                                            product.price,
                                                                            product.discount,
                                                                        ),
                                                                    )}
                                                                </span>
                                                                {product.discount > 0 && (
                                                                    <>
                                                                        <span className="text-xs text-gray-500 line-through">
                                                                            {formatPrice(product.price)}
                                                                        </span>
                                                                        <span className="text-xs bg-red-100 text-red-800 px-1 py-0.5 rounded">
                                                                            -{product.discount}%
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {searchResults.length > 5 && (
                                                    <div className="p-3 text-center border-t border-gray-100">
                                                        <button
                                                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                                            onClick={() => {
                                                                navigate(`/search?q=${query}`);
                                                                setShowResults(false);
                                                            }}
                                                        >
                                                            Xem tất cả kết quả
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            query.trim() && (
                                                <div className="flex flex-col items-center justify-center py-8 px-4">
                                                    <div className="text-gray-400 text-4xl mb-2">🔍</div>
                                                    <p className="text-gray-500 text-sm text-center">
                                                        Không tìm thấy sản phẩm nào cho "{query}"
                                                    </p>
                                                </div>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Mobile: small search icon (opens full screen) */}
                    {isMobile && (
                        <div className="flex-1 flex justify-center">
                            <button
                                className="text-white p-1"
                                onClick={() => setShowSearchOverlay(true)}
                                aria-label="Open search"
                            >
                                <Search className="w-6 h-6" />
                            </button>
                        </div>
                    )}

                    <div className="flex items-center space-x-6">
                        {/* Hide the three nav items on mobile; access via Drawer */}
                        {!isMobile && (
                            <>
                                <Link to={'/category'}>
                                    <div className="flex items-center space-x-1 cursor-pointer hover:text-gray-300 transition-colors">
                                        <BoxIcon className="w-5 h-5" />
                                        <div className="text-sm">
                                            <div>Sản phẩm</div>
                                        </div>
                                    </div>
                                </Link>
                                <Link to={'/blog'}>
                                    <div className="flex items-center space-x-1 cursor-pointer hover:text-gray-300 transition-colors">
                                        <FileText className="w-5 h-5" />
                                        <div className="text-sm">
                                            <div>Bài viết</div>
                                        </div>
                                    </div>
                                </Link>
                                <Link to={'/contact'}>
                                    <div className="flex items-center space-x-1 cursor-pointer hover:text-gray-300 transition-colors">
                                        <Phone className="w-5 h-5" />
                                        <div className="text-sm">
                                            <div>Liên hệ</div>
                                        </div>
                                    </div>
                                </Link>
                            </>
                        )}
                        {dataUser._id && (
                            <Link to={'/cart'}>
                                <div className="flex items-center space-x-2 cursor-pointer hover:text-gray-300 transition-colors">
                                    <div className="relative">
                                        <ShoppingCart className="w-6 h-6" />
                                        <div className="absolute -top-2 -right-2 bg-white text-black rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                                            {cartData.length}
                                        </div>
                                    </div>
                                    {!isMobile && <span className="text-sm">Giỏ hàng</span>}
                                </div>
                            </Link>
                        )}
                        {!dataUser._id ? (
                            <div className="flex items-center space-x-4 cursor-pointer ">
                                <User className="w-5 h-5" />
                                <Link to={'/login'}>
                                    <div className="text-sm hover:text-gray-300 transition-colors">Đăng nhập</div>
                                </Link>
                                <Link to={'/register'}>
                                    <span className="text-sm hover:text-gray-300 transition-colors">Đăng ký</span>
                                </Link>
                            </div>
                        ) : (
                            <Dropdown
                                menu={{ items: userMenuItems }}
                                placement="bottomRight"
                                trigger={['click']}
                                dropdownRender={(menu) => (
                                    <div className="bg-white rounded-lg shadow-xl border border-gray-100 mt-1 min-w-[200px] overflow-hidden">
                                        <div className="px-4 py-3 border-b border-gray-100">
                                            <p className="font-medium text-gray-800">
                                                {dataUser.fullName || 'Người dùng'}
                                            </p>

                                            <p className="text-xs text-gray-500 truncate">{dataUser.email}</p>
                                        </div>
                                        {menu}
                                    </div>
                                )}
                            >
                                <div className="flex items-center cursor-pointer gap-2">
                                    <Avatar
                                        icon={<UserOutlined />}
                                        className="bg-green-500 flex items-center justify-center"
                                        size="large"
                                        src={`${import.meta.env.VITE_API_URL}/uploads/avatars/${dataUser.avatar}`}
                                    />
                                    <div className="hidden md:block">
                                        <span className="text-sm font-medium">{dataUser.fullName || 'Người dùng'}</span>
                                        <DownOutlined className="text-xs ml-1" />
                                    </div>
                                </div>
                            </Dropdown>
                        )}
                    </div>
                </div>
            </div>

            {/* responsive hd*/}
            {/* Drawer for mobile nav */}
            <Drawer placement="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
                <div className="flex items-center justify-between mb-4">
                    <div className="font-bold text-lg">Menu</div>
                    <button onClick={() => setDrawerOpen(false)} aria-label="Close menu">
                        <CloseOutlined />
                    </button>
                </div>

                <div className="flex flex-col gap-3 ">
                    <Link to="/category" onClick={() => setDrawerOpen(false)}>
                        <div className="flex items-center gap-2 text-black">
                            <BoxIcon /> <span>Sản phẩm</span>
                        </div>
                    </Link>
                    <Link to="/blog" onClick={() => setDrawerOpen(false)}>
                        <div className="flex items-center gap-2 text-black">
                            <FileText /> <span>Bài viết</span>
                        </div>
                    </Link>
                    <Link to="/contact" onClick={() => setDrawerOpen(false)}>
                        <div className="flex items-center gap-2 text-black">
                            <Phone /> <span>Liên hệ</span>
                        </div>
                    </Link>
                </div>
            </Drawer>

            {/* Full screen search overlay for mobile */}
            {isMobile && showSearchOverlay && (
                <div
                    className="fixed inset-0 bg-black/60 z-50 flex items-start pt-20"
                    onClick={() => setShowSearchOverlay(false)}
                >
                    <div className="w-full px-4">
                        <div className="bg-white rounded-md p-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                                <Input
                                    autoFocus
                                    placeholder="Tìm kiếm sản phẩm"
                                    value={query}
                                    onChange={(e) => handleSearchInputChange(e)}
                                    onPressEnter={() => {
                                        if (query.trim()) navigate(`/search?q=${query}`);
                                        setShowSearchOverlay(false);
                                    }}
                                />
                                <button onClick={() => setShowSearchOverlay(false)} className="p-2">
                                    <CloseOutlined className="text-black" />
                                </button>
                            </div>

                            {/* full product results like desktop */}
                            <div className="mt-3 max-h-[60vh] overflow-y-auto">
                                {isSearching ? (
                                    <div className="p-4">Đang tìm kiếm...</div>
                                ) : searchResults.length > 0 ? (
                                    <>
                                        <div className="px-2 py-2 border-b border-gray-100">
                                            <span className="text-sm font-semibold text-gray-700">
                                                Tìm thấy {searchResults.length} sản phẩm
                                            </span>
                                        </div>
                                        {searchResults.slice(0, 5).map((product) => (
                                            <div
                                                key={product._id}
                                                onClick={() => {
                                                    handleProductClick(product._id);
                                                    setShowSearchOverlay(false);
                                                }}
                                                className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                            >
                                                <img
                                                    src={`${import.meta.env.VITE_API_URL}/uploads/products/${
                                                        product.colors?.[0]?.images
                                                    }`}
                                                    alt={product.name}
                                                    className="w-12 h-12 object-cover rounded-lg mr-3"
                                                    onError={(e) => {
                                                        e.target.src =
                                                            'https://via.placeholder.com/48x48?text=No+Image';
                                                    }}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-sm font-medium text-gray-900 truncate">
                                                            {product.name}
                                                        </h4>
                                                        {product.isTrending && (
                                                            <span className="text-xs bg-gradient-to-r from-orange-500 to-red-500 text-white px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
                                                                🔥 XU HƯỚNG
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center space-x-2 mt-1">
                                                        <span className="text-sm font-bold text-red-600">
                                                            {formatPrice(
                                                                calculateDiscountPrice(product.price, product.discount),
                                                            )}
                                                        </span>
                                                        {product.discount > 0 && (
                                                            <>
                                                                <span className="text-xs text-gray-500 line-through">
                                                                    {formatPrice(product.price)}
                                                                </span>
                                                                <span className="text-xs bg-red-100 text-red-800 px-1 py-0.5 rounded">
                                                                    -{product.discount}%
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {searchResults.length > 5 && (
                                            <div className="p-3 text-center border-t border-gray-100">
                                                <button
                                                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                                    onClick={() => {
                                                        navigate(`/search?q=${query}`);
                                                        setShowSearchOverlay(false);
                                                    }}
                                                >
                                                    Xem tất cả kết quả
                                                </button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="p-6 text-center text-gray-500">Không có kết quả</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Header;
