import { useParams, Link, useLocation } from 'react-router-dom';
import Footer from '../components/Footer';
import Header from '../components/Header';
import { useEffect, useState } from 'react';
import { requestGetPaymentById } from '../config/PaymentsRequest';
import { requestRemoveItemFromCart } from '../config/CartRequest';
import { CheckCircle, Package, Tag, ShoppingBag, ArrowRight, Home, Phone, Mail } from 'lucide-react';
import { useStore } from '../hooks/useStore';

function PaymentSucces() {
    const { fetchCart } = useStore();
    const [payment, setPayment] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const { id } = useParams();
    const location = useLocation();

    useEffect(() => {
        const fetchPaymentById = async () => {
            try {
                setIsLoading(true);

                // FIRST: Prefer navigation state (if provided) -> sessionStorage -> backend
                const paidItemsFromState = location?.state?.paidItems;
                const itemIdsFromState = location?.state?.itemIdsToRemove;
                if (paidItemsFromState)
                    console.log(
                        '[PaymentSucces] Received paidItems via navigation state:',
                        paidItemsFromState.map?.((p) => p._id) ?? paidItemsFromState,
                    );

                // sessionStorage raw
                const paidItemsFromSession = sessionStorage.getItem('paidItems');
                console.log('[PaymentSucces] Raw paidItems from sessionStorage:', paidItemsFromSession);
                console.log(
                    '[PaymentSucces] sessionStorage keys:',
                    Object.keys(sessionStorage).filter((k) => k.includes('paid') || k.includes('remove')),
                );

                let paymentData = null;

                // Prefer navigation state first (useful for COD flows where we can pass state)
                if (paidItemsFromState) {
                    try {
                        paymentData = await requestGetPaymentById(id);
                        console.log('[PaymentSucces] Backend returned items count:', paymentData.items?.length);
                        // Override backend items with navigation-state paid items (these were the selected items)
                        paymentData.items = paidItemsFromState;
                        console.log(
                            '[PaymentSucces] Using paidItems from navigation state, final count:',
                            paymentData.items.length,
                        );
                    } catch (err) {
                        console.error(
                            '[PaymentSucces] Error fetching payment from backend while using navigation state:',
                            err,
                        );
                        // fallback to display navigation state items
                        paymentData = { items: paidItemsFromState };
                    }
                } else if (paidItemsFromSession) {
                    try {
                        const items = JSON.parse(paidItemsFromSession);
                        console.log('[PaymentSucces] Parsed items count from sessionStorage:', items.length);
                        console.log(
                            '[PaymentSucces] Parsed items details:',
                            items.map((i) => ({ id: i._id, name: i.name })),
                        );

                        // Get payment from backend but override items with sessionStorage
                        const res = await requestGetPaymentById(id);
                        paymentData = res.metadata;
                        console.log('[PaymentSucces] Backend returned items count:', paymentData.items?.length);
                        console.log(
                            '[PaymentSucces] Backend items details:',
                            paymentData.items?.map((i) => ({ id: i._id, name: i.name })),
                        );

                        // Override with sessionStorage items - these are the SELECTED items that were paid
                        console.log('[PaymentSucces] OVERRIDING payment.items with sessionStorage items');
                        paymentData.items = items;
                        console.log('[PaymentSucces] Final items count after override:', paymentData.items.length);
                        console.log(
                            '[PaymentSucces] Final items details:',
                            paymentData.items.map((i) => ({ id: i._id, name: i.name })),
                        );
                    } catch (parseError) {
                        console.error('[PaymentSucces] Error parsing paid items from sessionStorage:', parseError);
                        // Fallback: use backend data
                        const res = await requestGetPaymentById(id);
                        paymentData = res.metadata;
                    }
                } else {
                    // No state or sessionStorage - use all items from backend
                    console.log(
                        '[PaymentSucces] WARNING: No paidItems in navigation state or sessionStorage, using backend data (all items)',
                    );
                    const res = await requestGetPaymentById(id);
                    paymentData = res.metadata;
                    console.log('[PaymentSucces] Backend returned items count:', paymentData.items?.length);
                }

                console.log('[PaymentSucces] Setting payment state...');
                setPayment(paymentData);

                // Remove paid items from cart (for MoMo/VNPay return or if not removed in Checkout)
                const itemIdsToRemove = sessionStorage.getItem('itemIdsToRemove');
                if (itemIdsToRemove) {
                    try {
                        const itemIds = JSON.parse(itemIdsToRemove);
                        console.log('[PaymentSucces] Removing paid items with IDs:', itemIds);
                        let removedCount = 0;
                        for (const itemId of itemIds) {
                            try {
                                await requestRemoveItemFromCart({ itemId });
                                removedCount++;
                                console.log(
                                    `[PaymentSucces] Successfully removed item (${removedCount}/${itemIds.length}):`,
                                    itemId,
                                );
                            } catch (itemError) {
                                console.warn(
                                    '[PaymentSucces] Failed to remove individual item:',
                                    itemId,
                                    itemError.message,
                                );
                                // Continue with next item even if one fails
                            }
                        }
                        console.log(
                            `[PaymentSucces] Removal complete: ${removedCount}/${itemIds.length} items removed`,
                        );

                        // Clear sessionStorage after removal
                        sessionStorage.removeItem('itemIdsToRemove');
                        sessionStorage.removeItem('paidItems');
                    } catch (error) {
                        console.error('Error during item removal:', error);
                        // Still clear sessionStorage even if removal fails
                        sessionStorage.removeItem('itemIdsToRemove');
                        sessionStorage.removeItem('paidItems');
                    }

                    // Refresh the store cart to reflect removed items
                    try {
                        await fetchCart();
                        console.log('Cart refreshed after payment');
                    } catch (error) {
                        console.error('Error refreshing cart:', error);
                    }
                }
            } catch (error) {
                console.error('Error fetching payment:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPaymentById();
    }, [id, fetchCart]);

    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(price);
    };

    const calculateSubtotal = () => {
        return payment?.items?.reduce((sum, item) => sum + item.subtotal, 0) || 0;
    };

    const calculateCouponDiscount = () => {
        return payment?.coupon?.discountAmount || 0;
    };

    const calculateTotal = () => {
        return calculateSubtotal() - calculateCouponDiscount();
    };

    const paymentMethodLabel =
        payment && (payment.paymentMethod || payment.method)
            ? (payment.paymentMethod || payment.method).toUpperCase()
            : 'N/A';

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500"></div>
                </div>
                <Footer />
            </div>
        );
    }

    if (!payment) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Không tìm thấy đơn hàng</h2>
                        <p className="text-gray-600">Vui lòng kiểm tra lại đường dẫn</p>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Success Header */}
                <div className="text-center mb-8 mt-13">
                    <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="w-12 h-12 text-green-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Đặt hàng thành công!</h1>
                    <p className="text-gray-600">Cảm ơn bạn đã mua sắm. Đơn hàng của bạn đã được xác nhận.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Order Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Order Items */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <Package className="w-5 h-5 mr-2 text-red-600" />
                                Sản phẩm đã đặt
                            </h2>

                            <div className="space-y-4">
                                {payment.items?.map((item) => (
                                    <div
                                        key={item._id}
                                        className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg"
                                    >
                                        <img
                                            src={`${import.meta.env.VITE_API_URL}/uploads/products/${item.image}`}
                                            alt={item.name}
                                            className="w-20 h-20 object-cover rounded-lg"
                                        />
                                        <div className="flex-1">
                                            <h3 className="font-medium text-gray-900">{item.name}</h3>
                                            <div className="text-sm text-gray-500 mt-1">
                                                <span>Màu: {item.color}</span>
                                                <span className="mx-2">•</span>
                                                <span>Size: {item.size}</span>
                                                <span className="mx-2">•</span>
                                                <span>Số lượng: {item.quantity}</span>
                                            </div>
                                            <div className="mt-2 flex items-center space-x-2">
                                                <span className="text-lg font-semibold text-red-600">
                                                    {formatPrice(item.priceAfterDiscount * item.quantity)}
                                                </span>
                                                {item.discount > 0 && (
                                                    <span className="text-sm text-gray-500 line-through">
                                                        {formatPrice(item.price * item.quantity)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Applied Coupon */}
                        {payment.coupon && (
                            <div className="bg-white rounded-lg shadow-sm p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                    <Tag className="w-5 h-5 mr-2 text-green-600" />
                                    Mã giảm giá đã áp dụng
                                </h2>

                                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                            <Tag className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-green-900">{payment.coupon.code}</div>
                                            <div className="text-sm text-green-600">
                                                Giảm {payment.coupon.discount}% - Tiết kiệm{' '}
                                                {formatPrice(payment.coupon.discountAmount)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-semibold text-green-600">
                                            -{formatPrice(payment.coupon.discountAmount)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Order Information */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Thông tin đơn hàng</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Mã đơn hàng</label>
                                    <p className="text-sm text-gray-900 font-mono">#{id}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngày đặt</label>
                                    <p className="text-sm text-gray-900">{new Date().toLocaleDateString('vi-VN')}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        Đã xác nhận
                                    </span>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Phương thức thanh toán
                                    </label>
                                    <p className="text-sm text-gray-900">{paymentMethodLabel}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tóm tắt đơn hàng</h2>

                            {/* Price Breakdown */}
                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Tạm tính ({payment.items?.length} sản phẩm)</span>
                                    <span className="font-medium">{formatPrice(calculateSubtotal())}</span>
                                </div>

                                {payment.coupon && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 flex items-center">
                                            <Tag className="w-4 h-4 mr-1" />
                                            Giảm giá ({payment.coupon.code})
                                        </span>
                                        <span className="font-medium text-green-600">
                                            -{formatPrice(calculateCouponDiscount())}
                                        </span>
                                    </div>
                                )}

                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Phí vận chuyển</span>
                                    <span className="font-medium text-green-600">Miễn phí</span>
                                </div>

                                <div className="border-t border-gray-200 pt-3">
                                    <div className="flex justify-between text-lg font-semibold">
                                        <span>Tổng cộng</span>
                                        <span className="text-red-600">{formatPrice(calculateTotal())}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-3">
                                <Link to="/" className="block">
                                    <button className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center">
                                        <Home className="w-5 h-5 mr-2" />
                                        Tiếp tục mua sắm
                                    </button>
                                </Link>
                            </div>

                            {/* Contact Information */}
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <h3 className="text-sm font-medium text-gray-900 mb-3">Cần hỗ trợ?</h3>
                                <div className="space-y-2 text-sm text-gray-600">
                                    <div className="flex items-center space-x-2">
                                        <Phone className="w-4 h-4" />
                                        <span>Hotline: 1900 1234</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Mail className="w-4 h-4" />
                                        <span>support@example.com</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

export default PaymentSucces;
