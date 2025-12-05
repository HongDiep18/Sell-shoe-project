import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Breadcrumb({ items = [], onPressItem = () => {} }) {
    const insets = useSafeAreaInsets();

    if (!items || items.length === 0) return null;

    return (
        <View style={[styles.container, { top: insets.top + 8 }]} pointerEvents="box-none">
            <View style={styles.inner}>
                {items.map((it, idx) => (
                    <React.Fragment key={`bc-${idx}`}>
                        <TouchableOpacity
                            onPress={() => onPressItem(idx)}
                            disabled={idx === items.length - 1}
                            style={styles.itemTouch}
                        >
                            <Text
                                style={[styles.itemText, idx === items.length - 1 && styles.current]}
                                numberOfLines={1}
                            >
                                {it}
                            </Text>
                        </TouchableOpacity>
                        {idx < items.length - 1 && <Text style={styles.sep}>›</Text>}
                    </React.Fragment>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 8,
        right: 8, // Thêm right để container không bị tràn màn hình
        zIndex: 50,
        alignItems: 'flex-start', // Căn trái cho nội dung bên trong
    },
    inner: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap', // QUAN TRỌNG: Cho phép xuống dòng nếu quá dài
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 12, // Tăng padding chút cho đẹp
        paddingVertical: 8,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 3,
        alignSelf: 'flex-start', // Để background co giãn theo nội dung, không full width nếu chữ ngắn
        // Đã xóa maxWidth: 240 để không bị giới hạn chiều rộng
    },
    itemTouch: {
        maxWidth: 120, // Giới hạn chiều rộng từng item con để text không quá dài chiếm hết chỗ
    },
    itemText: {
        color: '#111',
        fontSize: 12,
    },
    current: {
        fontWeight: '700',
    },
    sep: {
        marginHorizontal: 6,
        color: '#666',
        fontSize: 12,
    },
});
