import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestAddToCart } from '../config/CartRequest';
import { requestCreateFavourite } from '../config/FavouriteRequest';
import { toast } from 'react-toastify';
import { useStore } from './useStore';

/**
 * Custom hook để xử lý các hành động trên card sản phẩm
 * - Thêm vào giỏ hàng
 * - Mua ngay (thêm vào giỏ + chuyển hướng)
 * - Thêm/xóa yêu thích
 */
export const useProductActions = () => {
    const [likedProducts, setLikedProducts] = useState({});
    const navigate = useNavigate();
    const { fetchCart } = useStore();

    /**
     * Thêm sản phẩm vào giỏ hàng
     * @param {Object} product - Dữ liệu sản phẩm
     * @param {Event} e - Event object (optional, để dừng propagation)
     */
    const handleAddToCart = async (product, e) => {
        if (e) {
            e.stopPropagation();
        }

        try {
            const data = {
                productId: product?._id,
                quantity: 1,
                size: product?.variants?.[0],
                color: product?.colors?.[0],
            };
            await requestAddToCart(data);
            fetchCart();
            toast.success('Thêm vào giỏ hàng thành công');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Lỗi khi thêm vào giỏ hàng');
        }
    };

    /**
     * Mua ngay - thêm vào giỏ hàng rồi chuyển hướng
     * @param {Object} product - Dữ liệu sản phẩm
     * @param {Event} e - Event object (optional, để dừng propagation)
     */
    const handleBuyNow = async (product, e) => {
        if (e) {
            e.stopPropagation();
        }

        try {
            const data = {
                productId: product?._id,
                quantity: 1,
                size: product?.variants?.[0],
                color: product?.colors?.[0],
            };
            await requestAddToCart(data);
            fetchCart();
            navigate('/cart');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Lỗi khi mua hàng');
        }
    };

    /**
     * Thêm/xóa sản phẩm khỏi danh sách yêu thích
     * @param {Object} product - Dữ liệu sản phẩm
     * @param {Event} e - Event object (optional, để dừng propagation)
     */
    const handleAddToFavorite = async (product, e) => {
        if (e) {
            e.stopPropagation();
        }

        try {
            const data = {
                productId: product?._id,
            };
            await requestCreateFavourite(data);
            // Cập nhật state
            const newLikedState = !likedProducts[product._id];
            setLikedProducts((prev) => ({
                ...prev,
                [product._id]: newLikedState,
            }));
            toast.success(newLikedState ? 'Đã thêm vào yêu thích' : 'Đã xóa khỏi yêu thích');
        } catch (error) {
            const errorMsg = error?.response?.data?.message || '';
            // Xử lý error từ API - khi xóa yêu thích, API throw error
            if (errorMsg.includes('Đã') && errorMsg.includes('khỏi yêu thích')) {
                const newLikedState = !likedProducts[product._id];
                setLikedProducts((prev) => ({
                    ...prev,
                    [product._id]: newLikedState,
                }));
                toast.success('Đã xóa khỏi yêu thích');
            } else {
                toast.error(errorMsg || 'Lỗi khi cập nhật yêu thích');
            }
        }
    };

    /**
     * Kiểm tra sản phẩm có được yêu thích hay không
     * @param {string} productId - ID sản phẩm
     * @returns {boolean} - Trạng thái yêu thích
     */
    const isProductLiked = (productId) => {
        return likedProducts[productId] || false;
    };

    /**
     * Khởi tạo trạng thái yêu thích từ dữ liệu sản phẩm
     * @param {Array} products - Mảng sản phẩm
     * @param {string} userId - ID của user
     */
    const initializeLikedProducts = (products, userId) => {
        const newLiked = {};
        if (Array.isArray(products)) {
            products.forEach((product) => {
                const productData = product?.product || product;
                newLiked[productData._id] = productData?.favourite?.includes(userId) || false;
            });
        }
        setLikedProducts(newLiked);
    };

    /**
     * Set trạng thái yêu thích cho một sản phẩm
     * @param {string} productId - ID sản phẩm
     * @param {boolean} isLiked - Trạng thái yêu thích
     */
    const setProductLiked = (productId, isLiked) => {
        setLikedProducts((prev) => ({
            ...prev,
            [productId]: isLiked,
        }));
    };

    return {
        likedProducts,
        handleAddToCart,
        handleBuyNow,
        handleAddToFavorite,
        isProductLiked,
        initializeLikedProducts,
        setProductLiked,
    };
};
