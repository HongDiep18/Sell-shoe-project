import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { ChevronLeft, ChevronRight, ShoppingCart, Heart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { requestGetFlashSaleByDate } from '../config/flashSale';
import { Link } from 'react-router-dom';
import { useProductActions } from '../hooks/useProductActions';
import { useStore } from '../hooks/useStore';

function FlashSale() {
    const [flashSale, setFlashSale] = useState([]);
    const [timeLeft, setTimeLeft] = useState({});
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const { dataUser } = useStore();
    const {
        likedProducts,
        handleAddToCart: hookAddToCart,
        handleBuyNow: hookBuyNow,
        handleAddToFavorite: hookAddToFavorite,
        initializeLikedProducts,
    } = useProductActions();

    // Handle window resize to update mobile state
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const fetchFlashSale = async () => {
            const res = await requestGetFlashSaleByDate();
            setFlashSale(res.metadata);
            const products = res.metadata?.map((sale) => sale.productId) || [];
            initializeLikedProducts(products, dataUser?._id);
        };
        fetchFlashSale();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Countdown timer for flash sales
    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date().getTime();
            const newTimeLeft = {};

            flashSale.forEach((sale) => {
                const endTime = new Date(sale.endDate).getTime();
                const distance = endTime - now;

                if (distance > 0) {
                    newTimeLeft[sale._id] = {
                        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
                        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
                        seconds: Math.floor((distance % (1000 * 60)) / 1000),
                    };
                } else {
                    newTimeLeft[sale._id] = null;
                }
            });

            setTimeLeft(newTimeLeft);
        }, 1000);

        return () => clearInterval(timer);
    }, [flashSale]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(amount);
    };

    const calculateDiscountPrice = (originalPrice, discount) => {
        return originalPrice - (originalPrice * discount) / 100;
    };

    const handleAddToCart = async (e, product) => {
        e.stopPropagation();
        await hookAddToCart(product, e);
    };

    const handleBuyNow = async (e, product) => {
        e.stopPropagation();
        await hookBuyNow(product, e);
    };

    const handleAddToFavorite = async (e, product) => {
        e.stopPropagation();
        await hookAddToFavorite(product, e);
    };

    const sliderSettings = {
        dots: false,
        infinite: true,
        speed: 500,
        slidesToShow: isMobile ? 2 : 5,
        slidesToScroll: 1,
        arrows: true,
        autoplay: true,
        autoplaySpeed: 4000,
        pauseOnHover: true,
        // use custom arrows so they can be styled and shown on mobile
        prevArrow: <PrevArrow />,
        nextArrow: <NextArrow />,
        responsive: [
            {
                breakpoint: 1024,
                settings: {
                    slidesToShow: 3,
                    slidesToScroll: 1,
                },
            },
            {
                breakpoint: 768,
                settings: {
                    // mobile/tablet: show 2 slides
                    slidesToShow: 2,
                    slidesToScroll: 1,
                },
            },
            {
                breakpoint: 480,
                settings: {
                    // small mobile: show 2 slides as requested
                    slidesToShow: 2,
                    slidesToScroll: 1,
                },
            },
        ],
    };

    // Custom arrow components for the slider. They are simple buttons positioned
    // vertically centered; visible on mobile to allow left/right navigation.
    function PrevArrow({ onClick }) {
        return (
            <button
                type="button"
                onClick={onClick}
                className={`absolute z-40 left-2 top-1/2 transform -translate-y-1/2 bg-white/95 p-2 rounded-full shadow-md block lg:hidden`}
            >
                <ChevronLeft size={18} className="text-gray-700" />
            </button>
        );
    }

    function NextArrow({ onClick }) {
        return (
            <button
                type="button"
                onClick={onClick}
                className={`absolute z-40 right-2 top-1/2 transform -translate-y-1/2 bg-white/95 p-2 rounded-full shadow-md block lg:hidden`}
            >
                <ChevronRight size={18} className="text-gray-700" />
            </button>
        );
    }

    return (
        <div className="bg-[#ed1d24] text-white py-8">
            <div className="w-[90%] mx-auto ">
                {/* Header */}
                <div className="flex items-center mb-6 text-center justify-center">
                    <div className="flex items-center space-x-2 ">
                        <div className="text-yellow-300 text-2xl">⚡</div>
                        <h2 className="text-2xl font-bold ">SIÊU KHUYẾN MÃI</h2>
                    </div>
                </div>

                {/* Products Slider */}
                <div className="mb-6">
                    <Slider className="flashsale-slider" {...sliderSettings}>
                        {flashSale.map((sale) => {
                            const product = sale.productId;
                            const discountPrice = calculateDiscountPrice(product.price, sale.discount);
                            const timer = timeLeft[sale._id];
                            const isLiked = likedProducts[product._id] || false;

                            return (
                                <div className="px-2" key={sale._id}>
                                    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 cursor-pointer group">
                                        {/* Product Image */}
                                        <div className="relative">
                                            <Link to={`/product/${product._id}`}>
                                                <img
                                                    src={`${import.meta.env.VITE_URL_IMAGE}/uploads/products/${
                                                        product.colors[0]?.images
                                                    }`}
                                                    alt={product.name}
                                                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                                                    onError={(e) => {
                                                        e.target.src =
                                                            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RUG8E+UDNmyJUu2ZMmSLVmSBUuWLFmyZMmSJVmyZMuSJUu2bMmSJVuyZMmWLVmyZMvSbMmSLdmyJUuyZEmWJUu2ZMmSJUt2ZEuWLNmyJUuWbNmSJUuWLFmy9U=';
                                                    }}
                                                />
                                            </Link>

                                            {/* Discount Badge */}
                                            <div className="absolute top-2 left-2">
                                                <div className="bg-yellow-400 text-red-800 px-2 py-1 rounded-full text-xs font-bold flex items-center">
                                                    <span className="mr-1">🔥</span>-{sale.discount}%
                                                </div>
                                            </div>

                                            {/* Flash Sale Badge */}
                                            <div className="absolute top-2 right-2">
                                                <div className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold animate-pulse">
                                                    FLASH SALE
                                                </div>
                                            </div>
                                        </div>

                                        {/* Product Info */}
                                        <div className="p-4 text-gray-800">
                                            {/* Product Name */}
                                            <h3 className="font-semibold text-sm mb-2 line-clamp-2 min-h-[2.5rem]">
                                                {product.name}
                                            </h3>

                                            {/* Colors Available */}
                                            <div className="flex items-center mb-2">
                                                <span className="text-xs text-gray-500 mr-2">Màu:</span>
                                                <div className="flex space-x-1">
                                                    {product.colors.slice(0, 3).map((color) => (
                                                        <div key={color._id}>
                                                            <span className="text-xs text-gray-500">{color.name}</span>
                                                        </div>
                                                    ))}
                                                    {product.colors.length > 3 && (
                                                        <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center">
                                                            <span className="text-xs text-gray-600">
                                                                +{product.colors.length - 3}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Sizes Available */}
                                            {product.variants && product.variants.length > 0 && (
                                                <div className="flex items-center mb-3">
                                                    <span className="text-xs text-gray-500 mr-2">Size:</span>
                                                    <div className="flex space-x-1">
                                                        {product.variants.slice(0, 3).map((variant) => (
                                                            <span
                                                                key={variant._id}
                                                                className="text-xs bg-gray-100 px-2 py-1 rounded"
                                                            >
                                                                {variant.size}
                                                            </span>
                                                        ))}
                                                        {product.variants.length > 3 && (
                                                            <span className="text-xs text-gray-500">...</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Price */}
                                            <div className="mb-3">
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-lg font-bold text-red-600">
                                                        {formatCurrency(discountPrice)}
                                                    </span>
                                                    <span className="text-sm text-gray-500 line-through">
                                                        {formatCurrency(product.price)}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-green-600 font-medium">
                                                    Tiết kiệm {formatCurrency(product.price - discountPrice)}
                                                </div>
                                            </div>

                                            {/* Countdown Timer */}
                                            {timer && (
                                                <div className="bg-red-50 border border-red-200 rounded p-2">
                                                    <div className="text-xs text-red-700 font-medium mb-1 text-center">
                                                        ⏰ Kết thúc sau:
                                                    </div>
                                                    <div className="flex justify-center space-x-1 text-xs">
                                                        {timer.days > 0 && (
                                                            <div className="bg-red-600 text-white px-1 py-1 rounded min-w-[20px] text-center">
                                                                {timer.days}d
                                                            </div>
                                                        )}
                                                        <div className="bg-red-600 text-white px-1 py-1 rounded min-w-[20px] text-center">
                                                            {String(timer.hours).padStart(2, '0')}h
                                                        </div>
                                                        <div className="bg-red-600 text-white px-1 py-1 rounded min-w-[20px] text-center">
                                                            {String(timer.minutes).padStart(2, '0')}m
                                                        </div>
                                                        <div className="bg-red-600 text-white px-1 py-1 rounded min-w-[20px] text-center">
                                                            {String(timer.seconds).padStart(2, '0')}s
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Stock Info */}
                                            {product.variants && (
                                                <div className="mt-2">
                                                    <div className="text-xs text-gray-500">
                                                        Còn lại:{' '}
                                                        {product.variants.reduce(
                                                            (total, variant) => total + variant.stock,
                                                            0,
                                                        )}{' '}
                                                        sản phẩm
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                                        <div
                                                            className="bg-red-600 h-1.5 rounded-full"
                                                            style={{
                                                                width: `${Math.min(
                                                                    100,
                                                                    (product.variants.reduce(
                                                                        (total, variant) => total + variant.stock,
                                                                        0,
                                                                    ) /
                                                                        20) *
                                                                        100,
                                                                )}%`,
                                                            }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Action Buttons */}
                                            <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={(e) => handleAddToCart(e, product)}
                                                        className="flex-1 flex items-center justify-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-2 rounded font-medium text-xs transition-colors"
                                                        title="Thêm vào giỏ hàng"
                                                    >
                                                        <ShoppingCart size={14} />
                                                        Giỏ
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleAddToFavorite(e, product)}
                                                        className={`px-2 py-2 rounded font-medium text-xs transition-all flex items-center justify-center ${
                                                            isLiked
                                                                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                        }`}
                                                        title={isLiked ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
                                                    >
                                                        <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} />
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={(e) => handleBuyNow(e, product)}
                                                    className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-2 rounded font-medium text-xs transition-colors"
                                                >
                                                    Mua ngay
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </Slider>
                </div>
            </div>

            <style jsx>{`
                .bg-red-700 .slick-dots {
                    bottom: -40px;
                }

                .bg-red-700 .slick-dots li button:before {
                    color: white;
                    font-size: 12px;
                    opacity: 0.5;
                }

                .bg-red-700 .slick-dots li.slick-active button:before {
                    color: white;
                    opacity: 1;
                }

                .line-clamp-2 {
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                /* Force 2 slides per row on small screens if slick calculation is off */
                @media (max-width: 768px) {
                    .flashsale-slider :global(.slick-slide) {
                        width: 50% !important;
                        display: inline-block;
                    }
                    .flashsale-slider :global(.slick-list) {
                        padding: 0;
                    }
                }
            `}</style>
        </div>
    );
}

export default FlashSale;
