import { Rate, Typography, Card } from 'antd';
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { useEffect, useState } from 'react';
import { requestGetAllPreviewProduct } from '../config/PreviewProduct';

const { Title, Text } = Typography;

function FeedbackHome() {
    // Mock data for feedback

    const [previewProduct, setPreviewProduct] = useState([]);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const fetchPreviewProduct = async () => {
            const res = await requestGetAllPreviewProduct();
            setPreviewProduct(res.metadata);
        };
        fetchPreviewProduct();
    }, []);

    // Detect mobile viewport to switch to vertical list if desired
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 640px)');
        const handle = (e) => setIsMobile(e.matches);
        // set initial
        setIsMobile(mq.matches);
        if (mq.addEventListener) mq.addEventListener('change', handle);
        else mq.addListener(handle);
        return () => {
            if (mq.removeEventListener) mq.removeEventListener('change', handle);
            else mq.removeListener(handle);
        };
    }, []);

    // Prepare sorted reviews. On mobile show only 5 newest, on larger screens show all (sorted newest-first).
    const sortedReviews = Array.isArray(previewProduct)
        ? [...previewProduct].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        : [];

    const visibleReviews = isMobile ? sortedReviews.slice(0, 5) : sortedReviews;

    // Custom arrow components for slick
    // Hide arrows on small screens (mobile) by adding `hidden sm:flex`
    const PrevArrow = ({ className = '', style, onClick }) => (
        <button
            type="button"
            className={`${className} hidden sm:flex bg-white shadow-md rounded-full items-center justify-center`}
            style={{ ...style }}
            onClick={onClick}
            aria-label="previous"
        >
            <ChevronLeft className="text-red-600 w-4 h-4" />
        </button>
    );

    const NextArrow = ({ className = '', style, onClick }) => (
        <button
            type="button"
            className={`${className} hidden sm:flex bg-white shadow-md rounded-full items-center justify-center`}
            style={{ ...style }}
            onClick={onClick}
            aria-label="next"
        >
            <ChevronRight className="text-red-600 w-4 h-4" />
        </button>
    );

    const sliderSettings = {
        dots: true,
        infinite: true,
        speed: 500,
        slidesToShow: 3,
        slidesToScroll: 1,
        rows: 2,
        slidesPerRow: 1,
        arrows: true,
        prevArrow: <PrevArrow />,
        nextArrow: <NextArrow />,
        autoplay: true,
        autoplaySpeed: 4000,
        pauseOnHover: true,
        responsive: [
            {
                breakpoint: 1280,
                settings: {
                    slidesToShow: 3,
                    rows: 2,
                },
            },
            {
                breakpoint: 1024,
                settings: {
                    slidesToShow: 2,
                    rows: 2,
                },
            },
            // On mobile, show 1 slide per view and a single row for better readability
            {
                breakpoint: 640,
                settings: {
                    slidesToShow: 1,
                    rows: 1,
                    arrows: false,
                },
            },
        ],
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    };

    return (
        <div className="py-16 bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="container mx-auto px-4">
                {/* Section Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-3 bg-[#FF3B2F] text-white px-6 py-3 rounded-full shadow-lg mb-4">
                        <Star className="w-5 h-5" />
                        <span className="font-semibold">Đánh giá từ khách hàng</span>
                    </div>
                    <Title level={2} className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                        Trải nghiệm tuyệt vời cùng chúng tôi
                    </Title>
                    <Text className="text-gray-600 text-lg max-w-2xl mx-auto">
                        Hàng nghìn khách hàng đã tin tưởng và lựa chọn sản phẩm giày của chúng tôi
                    </Text>
                </div>

                {/* Feedback Carousel */}
                <div className="-mx-4 sm:mx-0 px-4 sm:px-0">
                    <div className="feedback-carousel">
                        <style jsx>{`
                            .feedback-carousel .slick-dots {
                                bottom: -40px !important;
                            }

                            .feedback-carousel .slick-dots li button:before {
                                font-size: 12px !important;
                                color: #ef4444 !important;
                                opacity: 0.4 !important;
                            }

                            .feedback-carousel .slick-dots li.slick-active button:before {
                                opacity: 1 !important;
                                color: #ef4444 !important;
                            }

                            .feedback-carousel .slick-prev,
                            .feedback-carousel .slick-next {
                                width: 44px !important;
                                height: 44px !important;
                                z-index: 30 !important;
                                display: flex !important;
                                align-items: center;
                                justify-content: center;
                                background: white !important;
                                box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08) !important;
                                border-radius: 9999px !important;
                            }

                            .feedback-carousel .slick-prev {
                                left: -26px !important;
                                top: 45% !important;
                            }

                            .feedback-carousel .slick-next {
                                right: -26px !important;
                                top: 45% !important;
                            }

                            /* Ensure slides fill height */
                            .feedback-carousel .slick-slide > div {
                                height: 100% !important;
                            }

                            /* Shorter content preview for better layout */
                            .line-clamp-3 {
                                display: -webkit-box;
                                -webkit-line-clamp: 3;
                                -webkit-box-orient: vertical;
                                overflow: hidden;
                            }

                            .line-clamp-1 {
                                display: -webkit-box;
                                -webkit-line-clamp: 1;
                                -webkit-box-orient: vertical;
                                overflow: hidden;
                            }

                            /* Mobile specific adjustments */
                            @media (max-width: 640px) {
                                .feedback-carousel .slick-prev,
                                .feedback-carousel .slick-next {
                                    display: none !important;
                                }
                                .feedback-carousel .slick-dots {
                                    bottom: -30px !important;
                                }
                                /* reduce lines on very small screens */
                                .line-clamp-3 {
                                    -webkit-line-clamp: 2 !important;
                                }
                            }
                        `}</style>
                        {isMobile ? (
                            // On mobile show a simple vertical list (100% width per item)
                            <div className="space-y-4">
                                {visibleReviews.map((review) => (
                                    <div key={review._id} className="px-2">
                                        <Card className="w-full shadow-md rounded-2xl overflow-hidden border-0">
                                            <div className="p-4">
                                                <div className="flex items-start gap-3 mb-3">
                                                    <div className="w-9 h-9 bg-[#FF3B2F] rounded-full flex items-center justify-center">
                                                        <span className="text-white font-bold text-sm">
                                                            {review.userId?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-semibold text-gray-800 text-sm line-clamp-1">
                                                            {review.userId?.fullName || 'Khách hàng'}
                                                        </h4>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Rate disabled value={review.rating} className="text-xs" />
                                                            <span className="text-xs text-gray-500">
                                                                {formatDate(review.createdAt)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mb-3">
                                                    <p className="text-gray-700 text-sm line-clamp-2">
                                                        {review.comment || review.content || ''}
                                                    </p>
                                                </div>
                                                {review.productId && (
                                                    <div className="mt-2 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-3 border border-gray-100">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                                                                <span className="text-xs">👟</span>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h5 className="font-semibold text-gray-800 text-sm line-clamp-1">
                                                                    {review.productId.name || review.productId.title}
                                                                </h5>
                                                                <p className="text-xs text-gray-500">
                                                                    {review.productId.category?.name ||
                                                                        review.productId.destination ||
                                                                        ''}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </Card>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <Slider {...sliderSettings}>
                                {visibleReviews.map((review) => (
                                    <div key={review._id} className="px-3 h-full">
                                        <Card className="h-full flex flex-col shadow-lg border-0 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300">
                                            <div className="p-4 flex flex-col flex-1">
                                                {/* Top Row: quote + avatar + name */}
                                                <div className="flex items-start gap-3 mb-3">
                                                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#FF3B2F] rounded-full flex items-center justify-center shadow">
                                                        <span className="text-white font-bold text-sm sm:text-base">
                                                            {review.userId?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                                                        </span>
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-semibold text-gray-800 text-sm line-clamp-1">
                                                            {review.userId?.fullName || 'Khách hàng'}
                                                        </h4>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Rate disabled value={review.rating} className="text-xs" />
                                                            <span className="text-xs text-gray-500">
                                                                {formatDate(review.createdAt)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="ml-2 mt-1 hidden sm:block">
                                                        <div className="w-9 h-9 bg-[#FF3B2F] rounded-bl-2xl flex items-center justify-center">
                                                            <Quote className="w-4 h-4 text-white" />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Review Content */}
                                                <div className="mb-4 flex-1">
                                                    <p className="text-gray-700 text-sm leading-relaxed line-clamp-3">
                                                        {review.comment || review.content || ''}
                                                    </p>
                                                </div>

                                                {/* Product Info pinned to bottom */}
                                                {review.productId && (
                                                    <div className="mt-2">
                                                        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-3 border border-gray-100">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                                                                    <span className="text-xs">👟</span>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <h5 className="font-semibold text-gray-800 text-sm line-clamp-1">
                                                                        {review.productId.name ||
                                                                            review.productId.title}
                                                                    </h5>
                                                                    <p className="text-xs text-gray-500">
                                                                        {review.productId.category?.name ||
                                                                            review.productId.destination ||
                                                                            ''}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </Card>
                                    </div>
                                ))}
                            </Slider>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default FeedbackHome;
