import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, ActivityIndicator, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getProductById, addToCart } from '../services/apiService';
import { useCart } from '../context/CartContext';
import API_URL from '../config/api';
import Breadcrumb from '../components/Breadcrumb';
import * as SecureStore from 'expo-secure-store';

const buildImageUrl = (img) => {
    if (!img) return null;
    if (typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'))) return img;
    return `${API_URL}/uploads/products/${img}`;
};

export default function ProductDetailScreen({ route, navigation }) {
    const { id, item } = route.params || {};
    const { fetchCart } = useCart();
    const [product, setProduct] = useState(item || null);
    const [loading, setLoading] = useState(!item);
    const [descExpanded, setDescExpanded] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [addingToCart, setAddingToCart] = useState(false);

    useEffect(() => {
        if (!product && id) {
            (async () => {
                setLoading(true);
                try {
                    const res = await getProductById(id);
                    // backend returns { message, metadata }
                    setProduct(res.metadata || res.data || res.item || res);
                } catch (err) {
                    console.warn('Load product error', err);
                } finally {
                    setLoading(false);
                }
            })();
        }
    }, [id]);

    const dec = () => setQuantity((q) => Math.max(1, q - 1));
    const inc = () => setQuantity((q) => q + 1);

    const handleAddToCart = async () => {
        // Check if user is logged in
        const token = await SecureStore.getItemAsync('admin_token');
        const customerEmail = await SecureStore.getItemAsync('customer_email');

        if (!token && !customerEmail) {
            Alert.alert('Thông báo', 'Vui lòng đăng nhập trước khi thêm vào giỏ', [
                { text: 'Đăng nhập', onPress: () => navigation.navigate('Login') },
                { text: 'Hủy', style: 'cancel' },
            ]);
            return;
        }

        setAddingToCart(true);
        try {
            const payload = {
                productId: product._id || id,
                quantity,
                price: product.price,
                image: product.image,
                name: product.name,
                discount: product.discount || 0,
            };
            await addToCart(payload);
            await fetchCart();
            Alert.alert('Thành công', `Đã thêm ${quantity} sản phẩm vào giỏ`, [
                { text: 'Tiếp tục mua', style: 'default' },
                { text: 'Xem giỏ', onPress: () => navigation.navigate('Cart') },
            ]);
            setQuantity(1);
        } catch (err) {
            Alert.alert('Lỗi', err.message || 'Không thể thêm vào giỏ');
        } finally {
            setAddingToCart(false);
        }
    };

    const renderDescription = (html) => {
        if (!html) return <Text style={styles.desc}>Không có mô tả</Text>;

        const strongSplit = html.split(/(<\s*strong[^>]*>.*?<\s*\/\s*strong\s*>)/gis).filter(Boolean);

        const nodes = strongSplit.map((chunk, idx) => {
            const strongMatch = chunk.match(/<\s*strong[^>]*>(.*?)<\s*\/\s*strong\s*>/is);
            if (strongMatch) {
                const inner = strongMatch[1].replace(/<[^>]+>/g, '').trim();
                return (
                    <Text key={`s-${idx}`} style={styles.bold}>
                        {inner}
                    </Text>
                );
            }

            let t = String(chunk);
            t = t.replace(/<\s*br\s*\/?\s*>/gi, '\n');
            t = t.replace(/<\s*\/p\s*>/gi, '\n\n');
            t = t.replace(/<\s*p[^>]*>/gi, '');
            t = t.replace(/<\s*\/li\s*>/gi, '\n');
            t = t.replace(/<\s*li[^>]*>/gi, ' - ');
            t = t.replace(/<[^>]+>/g, '');
            t = t.replace(/&nbsp;/gi, ' ');
            t = t.replace(/&amp;/gi, '&');
            t = t.replace(/&lt;/gi, '<');
            t = t.replace(/&gt;/gi, '>');
            t = t.replace(/&quot;/gi, '"');
            t = t.replace(/&#39;/gi, "'");
            t = t.replace(/\n{3,}/g, '\n\n');

            const paras = t
                .split(/\n\n/)
                .map((p) => p.trim())
                .filter(Boolean);
            return paras.map((p, i) => (
                <Text key={`p-${idx}-${i}`} style={styles.descParagraph}>
                    {p}
                </Text>
            ));
        });

        return nodes.flat();
    };

    if (loading)
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#ed1d24" />
            </View>
        );

    if (!product)
        return (
            <View style={styles.center}>
                <Text>Không tìm thấy sản phẩm</Text>
            </View>
        );

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
            <Breadcrumb
                items={[
                    'Trang chủ',
                    'Mua sắm',
                    (product.name || '').length > 24
                        ? `${(product.name || '').slice(0, 21)}...`
                        : product.name || 'Sản phẩm',
                ]}
                onPressItem={(idx) => {
                    if (idx === 0) navigation.navigate('Login'); // or root — adjust as needed
                    else if (idx === 1) navigation.navigate('ShopHome');
                }}
            />
            <Image
                source={{
                    uri:
                        buildImageUrl(product.image) ||
                        buildImageUrl(product.images?.[0]) ||
                        buildImageUrl(product.colors?.[0]?.images),
                }}
                style={styles.image}
            />
            <Text style={styles.name}>{product.name}</Text>
            <Text style={styles.price}>{(product.price || 0).toLocaleString?.('vi-VN')} đ</Text>

            <View style={styles.section}>
                <TouchableOpacity style={styles.descHeader} onPress={() => setDescExpanded((s) => !s)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="document-text-outline" size={18} color="#111" />
                        <Text style={styles.sectionTitle}> Mô tả</Text>
                    </View>
                    <Ionicons name={descExpanded ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
                </TouchableOpacity>

                <View style={[styles.descContainer, !descExpanded && styles.descCollapsed]}>
                    {renderDescription(product.description)}
                </View>
            </View>

            <View style={styles.qtyRow}>
                <Text style={styles.qtyLabel}>Số lượng</Text>
                <View style={styles.qtyControls}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={dec}>
                        <Text style={styles.qtyBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{quantity}</Text>
                    <TouchableOpacity style={styles.qtyBtn} onPress={inc}>
                        <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <TouchableOpacity
                style={[styles.buyBtn, addingToCart && styles.buyBtnDisabled]}
                onPress={handleAddToCart}
                disabled={addingToCart}
            >
                <Ionicons name="cart-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.buyText}>{addingToCart ? 'Đang thêm...' : 'Thêm vào giỏ'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.continueBtn} onPress={() => navigation.navigate('ShopHome')}>
                <Text style={styles.continueText}>Tiếp tục mua sắm</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    image: { width: '100%', height: 300, borderRadius: 12, backgroundColor: '#f3f4f6' },
    name: { fontSize: 22, fontWeight: '700', marginTop: 12, color: '#111' },
    price: { fontSize: 20, fontWeight: '800', marginTop: 8, color: '#ed1d24' },
    section: { marginTop: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
    desc: { marginTop: 8, color: '#444', lineHeight: 20 },
    descContainer: { marginTop: 8 },
    descParagraph: { color: '#444', lineHeight: 20, marginBottom: 8 },
    bold: { fontWeight: '700', color: '#111' },
    descCollapsed: { maxHeight: 90, overflow: 'hidden' },
    descHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

    // quantity
    qtyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 },
    qtyLabel: { fontSize: 16, fontWeight: '600', color: '#111' },
    qtyControls: { flexDirection: 'row', alignItems: 'center' },
    qtyBtn: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    qtyBtnText: { fontSize: 20, fontWeight: '700' },
    qtyValue: { marginHorizontal: 12, fontSize: 16, fontWeight: '700' },
    buyBtn: {
        marginTop: 24,
        backgroundColor: '#ed1d24',
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    buyBtnDisabled: { opacity: 0.6 },
    buyText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    continueBtn: {
        marginTop: 12,
        backgroundColor: '#fff',
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    continueText: { color: '#111', fontWeight: '700', fontSize: 16 },
});
