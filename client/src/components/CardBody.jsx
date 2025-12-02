import { Heart, ShoppingCart, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useStore } from '../hooks/useStore';
import { useProductActions } from '../hooks/useProductActions';

function discountPrice(price, discount) {
    return price - (price * discount) / 100;
}

function CardBody({ product }) {
    const sumStock = product?.variants?.reduce((acc, curr) => acc + curr.stock, 0);
    const hasDiscount = product?.discount > 0;
    const finalPrice = hasDiscount ? discountPrice(product?.price, product?.discount) : product?.price;

    const { dataUser } = useStore();
    const { likedProducts, handleAddToCart, handleBuyNow, handleAddToFavorite, initializeLikedProducts } =
        useProductActions();

    useEffect(() => {
        if (product) {
            initializeLikedProducts([product], dataUser?._id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [product?._id, product?.favourite, dataUser?._id]);

    return (
        <div className="w-full relative bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col h-full">
            {/* Product Image Container */}
            <Link to={`/product/${product?._id}`} className="block">
                <div className="relative overflow-hidden bg-gray-50 group">
                    <img
                        src={`${import.meta.env.VITE_URL_IMAGE}/uploads/products/${product?.colors?.[0]?.images}`}
                        alt={product?.name}
                        className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                    />

                    {/* Discount Badge */}
                    {hasDiscount && (
                        <div className="absolute top-3 left-3">
                            <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
                                -{product?.discount}%
                            </div>
                        </div>
                    )}

                    {/* Trending Badge */}
                    {product?.isTrending && (
                        <div className="absolute top-3 right-3">
                            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                                🔥 XU HƯỚNG
                            </div>
                        </div>
                    )}

                    {/* Featured Badge */}
                    {product?.isFeatured && !product?.isTrending && (
                        <div className="absolute top-3 right-3">
                            <div className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold shadow-lg">
                                HOT
                            </div>
                        </div>
                    )}
                </div>
            </Link>

            {/* Product Info - Flex grow để chiếm hết không gian còn lại */}
            <div className="p-4 flex flex-col flex-grow">
                {/* Product Name - Fixed height */}
                <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2 leading-relaxed transition-colors duration-200 h-10">
                    {product?.name}
                </h3>

                {/* Price Section */}
                <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2">
                        {hasDiscount && (
                            <span className="text-gray-400 text-xs line-through">
                                {product?.price?.toLocaleString()} VND
                            </span>
                        )}
                        <span className="text-red-600 font-bold text-sm">{finalPrice?.toLocaleString()} VND</span>
                    </div>

                    {/* Stock Status */}
                    <div className="flex items-center justify-between">
                        <div
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                sumStock === 0
                                    ? 'bg-red-100 text-red-600'
                                    : sumStock < 10
                                    ? 'bg-yellow-100 text-yellow-600'
                                    : 'bg-green-100 text-green-600'
                            }`}
                        >
                            {sumStock === 0 ? 'Hết hàng' : sumStock < 10 ? 'Sắp hết' : 'Còn hàng'}
                        </div>

                        {sumStock > 0 && <span className="text-xs text-gray-500">{sumStock} sản phẩm</span>}
                    </div>
                </div>

                {/* Action Buttons - Đẩy xuống dưới cùng */}
                <div className="space-y-2 mt-auto" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleAddToCart(product, e);
                            }}
                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition-colors duration-200"
                            title="Thêm vào giỏ hàng"
                        >
                            <ShoppingCart size={14} />
                            Giỏ hàng
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleAddToFavorite(product, e);
                            }}
                            className={`px-3 py-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition-colors duration-200 ${
                                likedProducts[product._id]
                                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            title={likedProducts[product._id] ? 'Bỏ yêu thích' : 'Yêu thích'}
                        >
                            <Heart size={14} fill={likedProducts[product._id] ? 'currentColor' : 'none'} />
                        </button>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleBuyNow(product, e);
                        }}
                        className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition-colors duration-200"
                        title="Mua ngay"
                    >
                        <Zap size={14} />
                        Mua ngay
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CardBody;
