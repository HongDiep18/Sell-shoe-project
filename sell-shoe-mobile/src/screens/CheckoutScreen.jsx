import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { createPayment, updateCartInfo } from '../services/apiService';

export default function CheckoutScreen({ navigation, route }) {
    const { cartItems = [], coupon, subtotal = 0, total = 0 } = route.params || {};

    const [loading, setLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cod');
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        address: '',
    });
    const [phoneError, setPhoneError] = useState('');
    const [userEmail, setUserEmail] = useState('');

    // Load user info from storage
    useEffect(() => {
        (async () => {
            try {
                const name = await SecureStore.getItemAsync('admin_name');
                const phone = await SecureStore.getItemAsync('user_phone');
                const address = await SecureStore.getItemAsync('user_address');
                const email = await SecureStore.getItemAsync('customer_email');
                const adminEmail = await SecureStore.getItemAsync('admin_email');

                setFormData({
                    fullName: name || '',
                    phone: phone || '',
                    address: address || '',
                });
                setUserEmail(email || adminEmail || '');
            } catch (e) {
                // ignore
            }
        })();
    }, []);

    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(price);
    };

    const handlePhoneChange = (value) => {
        let phoneValue = value.replace(/\D/g, '');
        if (phoneValue.length > 10) phoneValue = phoneValue.slice(0, 10);

        if (phoneValue && !phoneValue.startsWith('0')) {
            setPhoneError('Số điện thoại phải bắt đầu bằng số 0');
        } else {
            setPhoneError('');
        }

        setFormData((prev) => ({ ...prev, phone: phoneValue }));
    };

    const handleInputChange = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const validateForm = () => {
        if (!formData.fullName.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập họ và tên');
            return false;
        }
        if (!formData.phone.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');
            return false;
        }
        if (!/^0\d{9}$/.test(formData.phone)) {
            Alert.alert('Lỗi', 'Số điện thoại phải bắt đầu từ 0 và có 10 chữ số');
            return false;
        }
        if (!formData.address.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ giao hàng');
            return false;
        }
        return true;
    };

    const handleCheckout = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            // Save info to storage for next time
            await SecureStore.setItemAsync('user_phone', formData.phone);
            await SecureStore.setItemAsync('user_address', formData.address);

            // Update cart info
            await updateCartInfo({
                fullName: formData.fullName,
                phone: formData.phone,
                address: formData.address,
            });

            // Prepare payment payload
            const itemIds = cartItems.map((item) => item._id);
            const payload = {
                paymentMethod,
                itemIds,
                coupon: coupon || null,
            };

            // Create payment
            const res = await createPayment(payload);
            const orderId = res.metadata?._id;

            if (!orderId) {
                Alert.alert('Lỗi', 'Không thể tạo đơn hàng');
                return;
            }

            if (paymentMethod === 'cod') {
                // COD: show success
                Alert.alert('Thành công', 'Đơn hàng đã được tạo. Vui lòng chờ xác nhận.', [
                    {
                        text: 'OK',
                        onPress: () => {
                            navigation.navigate('ShopHome');
                        },
                    },
                ]);
            } else if (paymentMethod === 'momo' || paymentMethod === 'vnpay') {
                // Redirect to payment URL
                const payUrl = res.metadata?.payUrl || res.metadata;
                if (payUrl) {
                    Alert.alert(
                        'Chuyển hướng',
                        `Bạn sẽ được chuyển đến trang thanh toán ${paymentMethod.toUpperCase()}`,
                        [
                            { text: 'Hủy', style: 'cancel' },
                            { text: 'OK', onPress: () => {} }, // Real app would open URL
                        ],
                    );
                } else {
                    Alert.alert('Lỗi', 'Không thể lấy URL thanh toán');
                }
            }
        } catch (err) {
            const errMsg = err.response?.data?.message || err.message || 'Lỗi thanh toán';
            Alert.alert('Lỗi', errMsg);
        } finally {
            setLoading(false);
        }
    };

    if (cartItems.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.emptyText}>Giỏ hàng trống</Text>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.backBtnText}>Quay lại</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <SafeAreaView edges={['top']} style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={28} color="#111" />
                </TouchableOpacity>
                <Text style={styles.title}>Thanh Toán</Text>
                <View style={{ width: 28 }} />
            </SafeAreaView>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Delivery Info */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>
                        <Ionicons name="location-outline" size={16} color="#ed1d24" /> Thông tin giao hàng
                    </Text>

                    <Text style={styles.label}>
                        Họ và tên <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                        placeholder="Nhập họ và tên"
                        value={formData.fullName}
                        onChangeText={(value) => handleInputChange('fullName', value)}
                        style={styles.input}
                        editable={!loading}
                    />

                    <Text style={styles.label}>
                        Số điện thoại <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                        placeholder="Nhập số điện thoại (10 chữ số)"
                        value={formData.phone}
                        onChangeText={handlePhoneChange}
                        style={[styles.input, phoneError && styles.inputError]}
                        keyboardType="phone-pad"
                        maxLength={10}
                        editable={!loading}
                    />
                    {phoneError && <Text style={styles.errorText}>{phoneError}</Text>}

                    <Text style={styles.label}>
                        Địa chỉ giao hàng <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                        placeholder="Nhập địa chỉ giao hàng chi tiết"
                        value={formData.address}
                        onChangeText={(value) => handleInputChange('address', value)}
                        style={[styles.input, { height: 100 }]}
                        multiline
                        numberOfLines={4}
                        editable={!loading}
                        textAlignVertical="top"
                    />
                </View>

                {/* Payment Method */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>
                        <Ionicons name="card-outline" size={16} color="#ed1d24" /> Phương thức thanh toán
                    </Text>

                    <TouchableOpacity
                        style={[styles.paymentOption, paymentMethod === 'cod' && styles.paymentOptionSelected]}
                        onPress={() => setPaymentMethod('cod')}
                        disabled={loading}
                    >
                        <Ionicons
                            name={paymentMethod === 'cod' ? 'radio-button-on' : 'radio-button-off'}
                            size={20}
                            color={paymentMethod === 'cod' ? '#ed1d24' : '#999'}
                        />
                        <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={styles.paymentTitle}>Thanh toán khi nhận hàng (COD)</Text>
                            <Text style={styles.paymentDesc}>Không phí, thanh toán trực tiếp</Text>
                        </View>
                        {paymentMethod === 'cod' && <Text style={styles.recommended}>Khuyến nghị</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.paymentOption, paymentMethod === 'momo' && styles.paymentOptionSelected]}
                        onPress={() => setPaymentMethod('momo')}
                        disabled={loading}
                    >
                        <Ionicons
                            name={paymentMethod === 'momo' ? 'radio-button-on' : 'radio-button-off'}
                            size={20}
                            color={paymentMethod === 'momo' ? '#ed1d24' : '#999'}
                        />
                        <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={styles.paymentTitle}>MoMo</Text>
                            <Text style={styles.paymentDesc}>Ví điện tử MoMo</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.paymentOption, paymentMethod === 'vnpay' && styles.paymentOptionSelected]}
                        onPress={() => setPaymentMethod('vnpay')}
                        disabled={loading}
                    >
                        <Ionicons
                            name={paymentMethod === 'vnpay' ? 'radio-button-on' : 'radio-button-off'}
                            size={20}
                            color={paymentMethod === 'vnpay' ? '#ed1d24' : '#999'}
                        />
                        <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={styles.paymentTitle}>VNPay</Text>
                            <Text style={styles.paymentDesc}>Cổng thanh toán VNPay</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Order Summary */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Tóm tắt đơn hàng ({cartItems.length} sản phẩm)</Text>

                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Tạm tính:</Text>
                        <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
                    </View>

                    {coupon && (
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Giảm giá ({coupon.nameCoupon}):</Text>
                            <Text style={[styles.summaryValue, { color: '#22c55e' }]}>
                                -{formatPrice(subtotal - total)}
                            </Text>
                        </View>
                    )}

                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Vận chuyển:</Text>
                        <Text style={[styles.summaryValue, { color: '#22c55e' }]}>Miễn phí</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Tổng tiền:</Text>
                        <Text style={styles.totalPrice}>{formatPrice(total)}</Text>
                    </View>
                </View>
            </ScrollView>

            {/* Checkout Button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.checkoutBtn, loading && styles.checkoutBtnDisabled]}
                    onPress={handleCheckout}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-done" size={18} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.checkoutBtnText}>Xác nhận đơn hàng</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
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
    scrollContent: { padding: 12 },

    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
    },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 12 },

    label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 8 },
    required: { color: '#e11d48' },

    input: {
        backgroundColor: '#f3f4f6',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 14,
        fontSize: 15,
        color: '#111',
        marginBottom: 8,
    },
    inputError: { borderColor: '#e11d48' },
    errorText: { fontSize: 12, color: '#e11d48', marginBottom: 8 },

    paymentOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 10,
        marginBottom: 8,
    },
    paymentOptionSelected: { borderColor: '#ed1d24', backgroundColor: '#fef2f2' },
    paymentTitle: { fontSize: 14, fontWeight: '700', color: '#111' },
    paymentDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },
    recommended: { fontSize: 11, color: '#ed1d24', fontWeight: '700' },

    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    summaryLabel: { fontSize: 13, color: '#666' },
    summaryValue: { fontSize: 13, fontWeight: '600', color: '#111' },
    divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 8 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
    totalLabel: { fontSize: 15, fontWeight: '700', color: '#111' },
    totalPrice: { fontSize: 18, fontWeight: '800', color: '#ed1d24' },

    footer: { padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
    checkoutBtn: {
        backgroundColor: '#ed1d24',
        paddingVertical: 14,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkoutBtnDisabled: { opacity: 0.6 },
    checkoutBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

    emptyText: { fontSize: 16, color: '#666', textAlign: 'center', marginTop: 20 },
    backBtn: { marginTop: 20, alignSelf: 'center' },
    backBtnText: { color: '#ed1d24', fontWeight: '700' },
});
