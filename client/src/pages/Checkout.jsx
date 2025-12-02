import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Footer from '../components/Footer';
import Header from '../components/Header';
import { requestGetCart, requestUpdateInfoCart } from '../config/CartRequest';
import { CreditCard, MapPin, Phone, User, Package, Tag, CheckCircle, Smartphone, Wallet } from 'lucide-react';
import { requestCreatePayment } from '../config/PaymentsRequest';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useStore } from '../hooks/useStore';

function Checkout() {
    const { fetchCart } = useStore();
    const [cartData, setCartData] = useState([]);
    const [couponData, setCouponData] = useState([]);
    const location = useLocation();
    const [isLoading, setIsLoading] = useState(true);
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        address: '',
    });
    const [paymentMethod, setPaymentMethod] = useState('cod');

    useEffect(() => {
        // If selected products are passed via navigation state, use them instead of fetching the full cart
        if (location && location.state && location.state.selectedProducts) {
            console.log(
                '[Checkout] Received selectedProducts from Cart, count:',
                location.state.selectedProducts.length,
            );
            console.log(
                '[Checkout] Selected products IDs:',
                location.state.selectedProducts.map((p) => ({ id: p._id, name: p.name })),
            );
            setCartData(location.state.selectedProducts);
            if (location.state.selectedCoupon) {
                setCouponData([location.state.selectedCoupon]);
            } else {
                setCouponData([]);
            }
            setIsLoading(false);
            return;
        }

        console.log('[Checkout] No selectedProducts in location.state, fetching full cart from backend');
        const fetchCart = async () => {
            try {
                setIsLoading(true);
                const res = await requestGetCart();
                console.log('[Checkout] Fetched full cart, items count:', res.metadata.items.length);
                setCartData(res.metadata.items);
                setCouponData(res.metadata.coupon);
            } catch (error) {
                console.error('Error fetching cart:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCart();
    }, [location]);

    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(price);
    };

    const calculateSubtotal = () => {
        return cartData.reduce((sum, item) => {
            const priceAfter = item.priceAfterDiscount ?? item.price - (item.price * (item.discount ?? 0)) / 100;
            return sum + priceAfter * item.quantity;
        }, 0);
    };

    const calculateCouponDiscount = () => {
        // If couponData provided via navigation, use that; otherwise fallback to existing logic
        if (couponData && couponData.length > 0) {
            const c = couponData[0];
            // support both percentage-based ({discount}) and fixed amount ({discountAmount}) coupon objects
            if (c.discountAmount) return c.discountAmount;
            if (c.discount) return (calculateSubtotal() * c.discount) / 100;
        }
        const appliedCoupon = cartData.find((item) => item.coupon);
        return appliedCoupon ? appliedCoupon.coupon.discountAmount : 0;
    };

    const calculateTotal = () => {
        return calculateSubtotal() - calculateCouponDiscount();
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handlePhoneChange = (e) => {
        const { name, value } = e.target;
        // Only allow digits (0-9)
        const phoneValue = value.replace(/\D/g, '');
        setFormData((prev) => ({
            ...prev,
            [name]: phoneValue,
        }));
    };

    const navigate = useNavigate();

    const handleSubmit = async () => {
        if (!formData.fullName || !formData.phone || !formData.address) {
            toast.error('Vui lòng nhập đầy đủ thông tin');
            return;
        }

        const data = {
            fullName: formData.fullName,
            phone: formData.phone,
            address: formData.address,
        };

        try {
            await requestUpdateInfoCart(data);
            const itemIdsToPurchase = cartData.map((item) => item._id);

            // include ids so backend only processes the selected cart items
            const payload = {
                paymentMethod,
                itemIds: itemIdsToPurchase,
                coupon: couponData && couponData.length > 0 ? couponData[0] : null,
            };

            console.log('Creating payment with payload:', payload);

            const handlePaymentSuccess = async (orderId) => {
                // FIRST: Always store the paid items in sessionStorage before any other operation
                console.log('[Checkout.handlePaymentSuccess] Storing paid items in sessionStorage');
                console.log('[Checkout.handlePaymentSuccess] cartData count:', cartData.length);
                console.log(
                    '[Checkout.handlePaymentSuccess] cartData IDs:',
                    cartData.map((p) => ({ id: p._id, name: p.name })),
                );
                sessionStorage.setItem('paidItems', JSON.stringify(cartData));

                // The backend now removes the paid items, ensure any stale keys are cleared
                sessionStorage.removeItem('itemIdsToRemove');

                // Refresh the store cart to reflect removed items
                try {
                    await fetchCart();
                    console.log('[Checkout.handlePaymentSuccess] Cart refreshed after payment');
                } catch (error) {
                    console.error('[Checkout.handlePaymentSuccess] Error refreshing cart:', error);
                }

                // FINALLY: Navigate to success page (sessionStorage is already set)
                // Pass paid items and itemIdsToRemove in navigation state for immediate availability
                console.log('[Checkout.handlePaymentSuccess] Navigating to success page with orderId:', orderId);
                try {
                    navigate(`/payment/success/${orderId}`, { state: { paidItems: cartData } });
                } catch (navErr) {
                    console.warn(
                        '[Checkout.handlePaymentSuccess] navigate state failed, falling back to sessionStorage only',
                        navErr,
                    );
                    navigate(`/payment/success/${orderId}`);
                }
            };

            if (paymentMethod === 'cod') {
                console.log('Processing COD payment');
                const res = await requestCreatePayment(payload);
                console.log('Payment response:', res);
                if (res && res.metadata && res.metadata._id) {
                    await handlePaymentSuccess(res.metadata._id);
                } else {
                    toast.error('Lỗi: không nhận được ID đơn hàng');
                }
            } else if (paymentMethod === 'momo') {
                console.log('Processing MoMo payment');
                const res = await requestCreatePayment(payload);
                console.log('MoMo payment response:', res);
                // For MoMo, store items to remove in sessionStorage before redirecting
                const itemIdsToRemove = cartData.map((item) => item._id);
                sessionStorage.setItem('itemIdsToRemove', JSON.stringify(itemIdsToRemove));
                sessionStorage.setItem('paidItems', JSON.stringify(cartData));
                if (res && res.metadata && res.metadata.payUrl) {
                    window.location.href = res.metadata.payUrl;
                } else {
                    toast.error('Lỗi: không nhận được đường dẫn thanh toán MoMo');
                }
            } else if (paymentMethod === 'vnpay') {
                console.log('Processing VNPay payment');
                const res = await requestCreatePayment(payload);
                console.log('VNPay payment response:', res);
                // For VNPay, store items to remove in sessionStorage before redirecting
                const itemIdsToRemove = cartData.map((item) => item._id);
                sessionStorage.setItem('itemIdsToRemove', JSON.stringify(itemIdsToRemove));
                sessionStorage.setItem('paidItems', JSON.stringify(cartData));
                if (res && res.metadata) {
                    window.location.href = res.metadata;
                } else {
                    toast.error('Lỗi: không nhận được đường dẫn thanh toán VNPay');
                }
            }
        } catch (error) {
            console.error('Payment error:', error);
            if (error.response && error.response.data && error.response.data.message) {
                toast.error(error.response.data.message);
            } else if (error.message) {
                toast.error(error.message);
            } else {
                toast.error('Lỗi thanh toán. Vui lòng thử lại.');
            }
        }
    };

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

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Thanh toán</h1>
                    <p className="text-gray-600 text-sm mt-1">Hoàn tất đơn hàng của bạn</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Customer Information Form */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Customer Details */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <User className="w-5 h-5 mr-2 text-red-600" />
                                Thông tin giao hàng
                            </h2>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Họ và tên *</label>
                                    <input
                                        type="text"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                        placeholder="Nhập họ và tên"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Số điện thoại *
                                    </label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handlePhoneChange}
                                        required
                                        minLength="10"
                                        maxLength="11"
                                        pattern="[0-9]{10,11}"
                                        title="Vui lòng nhập số điện thoại từ 10-11 chữ số"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                        placeholder="Nhập số điện thoại (10-11 chữ số)"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Địa chỉ giao hàng *
                                    </label>
                                    <textarea
                                        name="address"
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        required
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                        placeholder="Nhập địa chỉ giao hàng chi tiết"
                                    />
                                </div>
                            </form>
                        </div>

                        {/* Payment Method */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <CreditCard className="w-5 h-5 mr-2 text-red-600" />
                                Phương thức thanh toán
                            </h2>

                            <div className="space-y-3">
                                <label className="flex items-center p-3 border-2 border-red-200 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100">
                                    <input
                                        type="radio"
                                        name="payment"
                                        value="cod"
                                        className="mr-3"
                                        defaultChecked
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                    />
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center">
                                            <MapPin className="w-5 h-5 mr-2 text-red-600" />
                                            <span className="font-medium text-red-800">
                                                Thanh toán khi nhận hàng (COD)
                                            </span>
                                        </div>
                                        <span className="text-xs text-red-600 font-medium">Khuyến nghị</span>
                                    </div>
                                </label>

                                <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                                    <input
                                        type="radio"
                                        name="payment"
                                        value="momo"
                                        className="mr-3"
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                    />
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center">
                                            <Smartphone className="w-5 h-5 mr-2 text-pink-600" />
                                            <span className="font-medium">Ví điện tử MoMo</span>
                                        </div>
                                        <span className="text-xs text-gray-500">Nhanh chóng & An toàn</span>
                                    </div>
                                </label>

                                <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                                    <input
                                        type="radio"
                                        name="payment"
                                        value="vnpay"
                                        className="mr-3"
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                    />
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center">
                                            <Wallet className="w-5 h-5 mr-2 text-blue-600" />
                                            <span className="font-medium">VNPay</span>
                                        </div>
                                        <span className="text-xs text-gray-500">Đa dạng phương thức</span>
                                    </div>
                                </label>

                                {/* <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                                    <input
                                        type="radio"
                                        name="payment"
                                        value="bank"
                                        className="mr-3"
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                    />
                                    <div className="flex items-center">
                                        <CreditCard className="w-5 h-5 mr-2 text-gray-600" />
                                        <span className="font-medium">Chuyển khoản ngân hàng</span>
                                    </div>
                                </label> */}
                            </div>

                            {/* Payment Note */}
                            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-start space-x-2">
                                    <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                                        <span className="text-blue-600 text-xs font-bold">i</span>
                                    </div>
                                    <div className="text-xs text-blue-800">
                                        <p className="font-medium mb-1">Lưu ý về thanh toán:</p>
                                        <ul className="space-y-1 text-blue-700">
                                            <li>
                                                • <strong>COD:</strong> Thanh toán bằng tiền mặt khi nhận hàng
                                            </li>
                                            <li>
                                                • <strong>MoMo:</strong> Thanh toán qua ứng dụng MoMo
                                            </li>
                                            <li>
                                                • <strong>VNPay:</strong> Hỗ trợ thẻ ATM, Internet Banking, QR Code
                                            </li>
                                            {/* <li>
                                                • <strong>Chuyển khoản:</strong> Chuyển khoản trực tiếp vào tài khoản
                                                ngân hàng
                                            </li> */}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Order Items */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <Package className="w-5 h-5 mr-2 text-red-600" />
                                Sản phẩm đã chọn
                            </h2>

                            <div className="space-y-4">
                                {cartData.map((item) => (
                                    <div
                                        key={item._id}
                                        className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg"
                                    >
                                        <img
                                            src={`${import.meta.env.VITE_API_URL}/uploads/products/${item.image}`}
                                            alt={item.name}
                                            className="w-16 h-16 object-cover rounded-lg"
                                        />
                                        <div className="flex-1">
                                            <h3 className="font-medium text-gray-900 text-sm">{item.name}</h3>
                                            <div className="text-xs text-gray-500 mt-1">
                                                <span>Màu: {item.color}</span>
                                                <span className="mx-2">•</span>
                                                <span>Size: {item.size}</span>
                                                <span className="mx-2">•</span>
                                                <span>Số lượng: {item.quantity}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-semibold text-gray-900">
                                                {formatPrice(
                                                    (item.priceAfterDiscount ??
                                                        item.price - (item.price * (item.discount ?? 0)) / 100) *
                                                        item.quantity,
                                                )}
                                            </div>
                                            {item.discount > 0 && (
                                                <div className="text-xs text-gray-500 line-through">
                                                    {formatPrice(item.price * item.quantity)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
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
                                    <span className="text-gray-600">Tạm tính ({cartData.length} sản phẩm)</span>
                                    <span className="font-medium">{formatPrice(calculateSubtotal())}</span>
                                </div>

                                {calculateCouponDiscount() > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 flex items-center">
                                            <Tag className="w-4 h-4 mr-1" />
                                            Giảm giá
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
                                    <div className="flex justify-between text-base font-semibold">
                                        <span>Tổng cộng</span>
                                        <span className="text-red-600">{formatPrice(calculateTotal())}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Place Order Button */}
                            <button
                                onClick={handleSubmit}
                                className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-red-700 transition-colors mb-4 flex items-center justify-center"
                            >
                                <CheckCircle className="w-5 h-5 mr-2" />
                                Đặt hàng
                            </button>

                            {/* Security Features */}
                            <div className="space-y-3 text-xs text-gray-500">
                                <div className="flex items-center space-x-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    <span>Thanh toán an toàn</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Package className="w-4 h-4 text-green-500" />
                                    <span>Giao hàng nhanh chóng</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Phone className="w-4 h-4 text-green-500" />
                                    <span>Hỗ trợ 24/7</span>
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

export default Checkout;
