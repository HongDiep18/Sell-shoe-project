import React, { useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCart } from '../context/CartContext';
import { removeItemFromCart, updateCartQuantity } from '../services/apiService';
import API_URL from '../config/api';

export default function CartScreen({ navigation }) {
    const { cart, loading, fetchCart, coupon, setCoupon } = useCart();
    const [processingId, setProcessingId] = useState(null);

    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(price);
    };

    const calculateDiscountPrice = (originalPrice, discount) => {
        return originalPrice - (originalPrice * discount) / 100;
    };

    const subtotal = useMemo(() => {
        return cart.reduce((sum, item) => {
            const discountedPrice = calculateDiscountPrice(item.price, item.discount || 0);
            return sum + discountedPrice * item.quantity;
        }, 0);
    }, [cart]);

    const couponDiscount = useMemo(() => {
        if (!coupon) return 0;
        return (subtotal * coupon.discount) / 100;
    }, [coupon, subtotal]);

    const total = subtotal - couponDiscount;

    const handleUpdateQuantity = useCallback(
        async (itemId, newQuantity) => {
            if (newQuantity < 1) {
                Alert.alert('Xóa sản phẩm', 'Bạn có chắc muốn xóa sản phẩm này?', [
                    { text: 'Hủy', style: 'cancel' },
                    {
                        text: 'Xóa',
                        style: 'destructive',
                        onPress: () => handleRemoveItem(itemId),
                    },
                ]);
                return;
            }

            try {
                setProcessingId(itemId);
                await updateCartQuantity({ itemId, quantity: newQuantity });
                fetchCart();
            } catch (err) {
                Alert.alert('Lỗi', err.message || 'Không thể cập nhật số lượng');
            } finally {
                setProcessingId(null);
            }
        },
        [fetchCart],
    );

    const handleRemoveItem = useCallback(
        async (itemId) => {
            try {
                setProcessingId(itemId);
                await removeItemFromCart({ itemId });
                fetchCart();
            } catch (err) {
                Alert.alert('Lỗi', err.message || 'Không thể xóa sản phẩm');
            } finally {
                setProcessingId(null);
            }
        },
        [fetchCart],
    );

    const handleRemoveCoupon = () => {
        setCoupon(null);
        Alert.alert('Thông báo', 'Đã xóa mã giảm giá');
    };

    const renderCartItem = ({ item, index }) => {
        const discountedPrice = calculateDiscountPrice(item.price, item.discount || 0);
        const itemTotal = discountedPrice * item.quantity;
        const imageUrl = item.image?.startsWith('http') ? item.image : `${API_URL}/uploads/products/${item.image}`;

        return (
            <View style={styles.cartItem}>
                <Image source={{ uri: imageUrl }} style={styles.itemImage} resizeMode="cover" />

                <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>
                        {item.name}
                    </Text>

                    <View style={styles.priceRow}>
                        {item.discount > 0 && <Text style={styles.originalPrice}>{formatPrice(item.price)}</Text>}
                        <Text style={styles.discountedPrice}>{formatPrice(discountedPrice)}</Text>
                        {item.discount > 0 && <Text style={styles.discountBadge}>-{item.discount}%</Text>}
                    </View>

                    <View style={styles.quantityRow}>
                        <TouchableOpacity
                            onPress={() => handleUpdateQuantity(item._id, item.quantity - 1)}
                            disabled={processingId === item._id}
                        >
                            <Ionicons name="remove-circle-outline" size={24} color="#666" />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{item.quantity}</Text>
                        <TouchableOpacity
                            onPress={() => handleUpdateQuantity(item._id, item.quantity + 1)}
                            disabled={processingId === item._id}
                        >
                            <Ionicons name="add-circle-outline" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.itemActions}>
                    <Text style={styles.itemTotal}>{formatPrice(itemTotal)}</Text>
                    <TouchableOpacity
                        onPress={() => handleRemoveItem(item._id)}
                        disabled={processingId === item._id}
                        style={styles.deleteBtn}
                    >
                        <Ionicons name="trash-outline" size={20} color="#e11d48" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    if (loading && cart.length === 0) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#ed1d24" />
            </View>
        );
    }

    if (cart.length === 0) {
        return (
            <View style={styles.container}>
                <SafeAreaView edges={['top']} style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="chevron-back" size={28} color="#111" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Giỏ Hàng</Text>
                    <View style={{ width: 28 }} />
                </SafeAreaView>

                <View style={styles.emptyContainer}>
                    <Ionicons name="cart-outline" size={64} color="#ccc" />
                    <Text style={styles.emptyText}>Giỏ hàng trống</Text>
                    <Text style={styles.emptySubtext}>Hãy thêm sản phẩm để tiếp tục mua sắm</Text>
                    <TouchableOpacity style={styles.continueBtn} onPress={() => navigation.navigate('ShopHome')}>
                        <Text style={styles.continueBtnText}>Tiếp tục mua sắm</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <SafeAreaView edges={['top']} style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={28} color="#111" />
                </TouchableOpacity>
                <Text style={styles.title}>Giỏ Hàng ({cart.length})</Text>
                <View style={{ width: 28 }} />
            </SafeAreaView>

            <FlatList
                data={cart}
                renderItem={renderCartItem}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContent}
                ListFooterComponent={
                    <View style={styles.summaryContainer}>
                        {/* Coupon Section */}
                        {coupon && (
                            <View style={styles.couponBox}>
                                <View style={styles.couponInfo}>
                                    <Ionicons name="pricetag" size={20} color="#ed1d24" />
                                    <View style={{ marginLeft: 12 }}>
                                        <Text style={styles.couponName}>{coupon.nameCoupon}</Text>
                                        <Text style={styles.couponText}>
                                            Giảm {coupon.discount}% - Tiết kiệm {formatPrice(couponDiscount)}
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={handleRemoveCoupon}>
                                    <Ionicons name="close" size={24} color="#666" />
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Order Summary */}
                        <View style={styles.summaryBox}>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Tạm tính</Text>
                                <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
                            </View>

                            {coupon && (
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Giảm giá</Text>
                                    <Text style={[styles.summaryValue, { color: '#22c55e' }]}>
                                        -{formatPrice(couponDiscount)}
                                    </Text>
                                </View>
                            )}

                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Vận chuyển</Text>
                                <Text style={[styles.summaryValue, { color: '#22c55e' }]}>Miễn phí</Text>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Tổng cộng</Text>
                                <Text style={styles.totalValue}>{formatPrice(total)}</Text>
                            </View>
                        </View>

                        {/* Checkout Button */}
                        <TouchableOpacity
                            style={styles.checkoutBtn}
                            onPress={() =>
                                navigation.navigate('Checkout', {
                                    cartItems: cart,
                                    coupon,
                                    subtotal,
                                    total,
                                })
                            }
                        >
                            <Ionicons name="card-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.checkoutBtnText}>Tiến hành thanh toán</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.continueShopping}
                            onPress={() => navigation.navigate('ShopHome')}
                        >
                            <Text style={styles.continueShoppingText}>← Tiếp tục mua sắm</Text>
                        </TouchableOpacity>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    title: { fontSize: 20, fontWeight: '700', color: '#111' },
    listContent: { padding: 12 },
    cartItem: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        elevation: 2,
    },
    itemImage: { width: 100, height: 100, borderRadius: 8, backgroundColor: '#eee' },
    itemInfo: { flex: 1, marginLeft: 12 },
    itemName: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 4 },
    priceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    originalPrice: { fontSize: 12, color: '#999', textDecorationLine: 'line-through', marginRight: 6 },
    discountedPrice: { fontSize: 14, fontWeight: '700', color: '#ed1d24' },
    discountBadge: {
        fontSize: 12,
        color: '#fff',
        backgroundColor: '#ed1d24',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 6,
    },
    quantityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: 80 },
    quantityText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
    itemActions: { alignItems: 'flex-end', justifyContent: 'space-between' },
    itemTotal: { fontSize: 14, fontWeight: '700', color: '#111' },
    deleteBtn: { padding: 8 },

    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    emptyText: { fontSize: 18, fontWeight: '700', color: '#111', marginTop: 16 },
    emptySubtext: { fontSize: 14, color: '#666', marginTop: 8, textAlign: 'center' },
    continueBtn: {
        marginTop: 20,
        backgroundColor: '#ed1d24',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 10,
    },
    continueBtnText: { color: '#fff', fontWeight: '700' },

    summaryContainer: { padding: 12 },
    couponBox: {
        flexDirection: 'row',
        backgroundColor: '#f0fdf4',
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#bbf7d0',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    couponInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    couponName: { fontSize: 14, fontWeight: '700', color: '#111' },
    couponText: { fontSize: 12, color: '#6b7280', marginTop: 2 },
    summaryBox: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
    },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    summaryLabel: { fontSize: 14, color: '#666' },
    summaryValue: { fontSize: 14, fontWeight: '600', color: '#111' },
    divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 8 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
    totalLabel: { fontSize: 16, fontWeight: '700', color: '#111' },
    totalValue: { fontSize: 18, fontWeight: '800', color: '#ed1d24' },
    checkoutBtn: {
        backgroundColor: '#ed1d24',
        paddingVertical: 14,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    checkoutBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    continueShopping: { alignItems: 'center', paddingVertical: 8 },
    continueShoppingText: { color: '#ed1d24', fontWeight: '700' },
});
