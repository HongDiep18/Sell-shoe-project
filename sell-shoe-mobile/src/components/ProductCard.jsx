import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import API_URL from '../config/api';

// Tạo URL ảnh hoàn chỉnh từ nhiều dạng dữ liệu trả về
const buildImageUrl = (img) => {
    if (!img) return null;
    // Nếu đã là URL đầy đủ
    if (typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'))) return img;
    // Nếu server chỉ trả filename, server phục vụ static files tại /uploads/products/<filename>
    return `${API_URL}/uploads/products/${img}`;
};

export default function ProductCard({ item, onPress }) {
    return (
        <TouchableOpacity style={styles.card} onPress={() => onPress?.(item)} activeOpacity={0.85}>
            <Image
                source={{
                    uri:
                        buildImageUrl(item.image) ||
                        buildImageUrl(item.images?.[0]) ||
                        buildImageUrl(item.colors?.[0]?.images),
                }}
                style={styles.image}
            />
            <View style={styles.info}>
                <Text numberOfLines={2} style={styles.name}>
                    {item.name || 'Sản phẩm'}
                </Text>
                <Text style={styles.price}>{(item.price || 0).toLocaleString?.('vi-VN')} đ</Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: 10,
        width: '48%',
        marginHorizontal: '1%',
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 3,
    },
    image: { width: '100%', height: 140, borderRadius: 8, backgroundColor: '#f3f4f6' },
    info: { width: '100%', marginTop: 8 },
    name: { fontSize: 14, fontWeight: '600', color: '#111' },
    price: { marginTop: 6, fontSize: 14, fontWeight: '700', color: '#ed1d24' },
});
