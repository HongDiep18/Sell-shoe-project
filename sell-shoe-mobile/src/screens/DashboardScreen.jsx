// src/screens/DashboardScreen.jsx
import React, { useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    RefreshControl,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { useDashboard } from '../hooks/useDashboard';

export default function DashboardScreen({ onLogout, navigation }) {
    const [adminName, setAdminName] = React.useState('');
    const { data, loading, error, loadDashboard } = useDashboard();

    // Fetch admin name from SecureStore
    useEffect(() => {
        const fetchAdminName = async () => {
            try {
                const name = await SecureStore.getItemAsync('admin_name');
                setAdminName(name || 'Admin');
            } catch (err) {
                console.error('Error fetching admin name:', err);
                setAdminName('Admin');
            }
        };
        fetchAdminName();
    }, []);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    useEffect(() => {
        if (error) {
            // Provide actionable suggestions for timeout errors
            if (typeof error === 'string' && error.toLowerCase().includes('timeout')) {
                Alert.alert(
                    'Lỗi kết nối',
                    'Yêu cầu tới server bị hết thời gian chờ (timeout).\n\nKiểm tra: \n- Server đang chạy? (port 5000)\n- `src/config/api.js` có đúng IP/host không?\n- Thiết bị đang cùng mạng với server?\n\nThử: chạy backend, dùng `curl` từ máy phát triển hoặc bật chế độ LAN trong Expo.',
                );
            } else {
                Alert.alert('Lỗi kết nối', error?.toString?.() || 'Lỗi kết nối');
            }
        }
    }, [error]);

    const handleRefresh = useCallback(async () => {
        await loadDashboard();
    }, [loadDashboard]);

    const handleLogout = async () => {
        Alert.alert('Đăng xuất', 'Bạn chắc chắn muốn đăng xuất?', [
            { text: 'Hủy', onPress: () => {}, style: 'cancel' },
            {
                text: 'Đăng xuất',
                onPress: async () => {
                    try {
                        await SecureStore.deleteItemAsync('admin_token');
                        await SecureStore.deleteItemAsync('admin_name');
                        await SecureStore.deleteItemAsync('admin_email');
                        await SecureStore.deleteItemAsync('admin_logged');
                        
                        // Call the logout callback from App
                        onLogout?.();
                        
                        // Navigate back to Login
                        navigation?.replace('Login');
                    } catch (err) {
                        Alert.alert('Lỗi', 'Không thể đăng xuất');
                        console.error('Logout error:', err);
                    }
                },
                style: 'destructive',
            },
        ]);
    };

    // Loading state
    if (loading && !data) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ed1d24" />
                <Text style={styles.loadingText}>Đang tải dữ liệu từ server...</Text>
            </View>
        );
    }

    // Default data nếu không có
    const displayData = data || {
        totalRevenue: 0,
        todayRevenue: 0,
        totalOrders: 0,
        totalCustomers: 0,
        totalProducts: 0,
        recentOrders: [],
        topProducts: [],
    };

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={loading && data !== null} onRefresh={handleRefresh} colors={['#ed1d24']} />
            }
            scrollEventThrottle={16}
        >
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.headerGreeting}>Xin chào,{adminName}</Text>
                        <Text style={styles.headerName}>DASHBOARD</Text>
                    </View>
                    <View style={styles.rightButtons}>
                        <TouchableOpacity
                            style={styles.refreshButton}
                            onPress={() => {
                                // disable rapid taps by ignoring while loading
                                if (!loading) loadDashboard();
                            }}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Ionicons name="refresh" size={20} color="white" />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.logoutButton}
                            onPress={handleLogout}
                        >
                            <Ionicons name="log-out" size={24} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <View style={styles.content}>
                {/* Tổng doanh thu */}
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>Tổng doanh thu</Text>
                    <Text style={styles.totalRevenue}>
                        {displayData.totalRevenue?.toLocaleString?.('vi-VN') || 0} đ
                    </Text>
                </View>

                {/* Doanh thu hôm nay */}
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>Doanh thu hôm nay</Text>
                    <Text style={styles.todayRevenue}>
                        {displayData.todayRevenue?.toLocaleString?.('vi-VN') || 0} đ
                    </Text>
                </View>

                {/* 4 card nhỏ đẹp như web */}
                <View style={styles.smallCards}>
                    <View style={[styles.smallCard, { borderLeftColor: '#2563eb' }]}>
                        <Text style={styles.smallLabel}>Tổng đơn</Text>
                        <Text style={styles.smallValueBlue}>{displayData.totalOrders || 0}</Text>
                    </View>
                    <View style={[styles.smallCard, { borderLeftColor: '#ea580c' }]}>
                        <Text style={styles.smallLabel}>Khách hàng</Text>
                        <Text style={styles.smallValueOrange}>{displayData.totalCustomers || 0}</Text>
                    </View>
                    <View style={[styles.smallCard, { borderLeftColor: '#9333ea' }]}>
                        <Text style={styles.smallLabel}>Sản phẩm</Text>
                        <Text style={styles.smallValuePurple}>{displayData.totalProducts || 0}</Text>
                    </View>
                </View>

                {/* Đơn hàng gần đây */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Đơn hàng gần đây</Text>
                    {(displayData.recentOrders || []).slice(0, 5).map((order, index) => (
                        <View key={index} style={styles.orderItem}>
                            <View style={styles.orderHeader}>
                                <Text style={styles.orderCode}>{order.orderCode || 'ORD' + Date.now()}</Text>
                                <View style={[styles.statusBadge, getStatusStyle(order.status)]}>
                                    <Text style={styles.statusText}>{getStatusLabel(order.status)}</Text>
                                </View>
                            </View>
                            <Text style={styles.orderCustomer}>{order.customer || 'Khách lẻ'}</Text>
                            <Text style={styles.orderTotal}>{(order.total || 0).toLocaleString?.('vi-VN')} đ</Text>
                        </View>
                    ))}
                    {(!displayData.recentOrders || displayData.recentOrders.length === 0) && (
                        <Text style={styles.emptyText}>Chưa có đơn hàng nào</Text>
                    )}
                </View>

                {/* Top sản phẩm bán chạy */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Top sản phẩm bán chạy</Text>
                    {(displayData.topProducts || []).slice(0, 5).map((item, index) => (
                        <View key={index} style={styles.productItem}>
                            <View style={styles.rankBadge}>
                                <Text style={styles.rankText}>{index + 1}</Text>
                            </View>
                            <View style={styles.productInfo}>
                                <Text style={styles.productName}>{item.name || 'Sản phẩm'}</Text>
                                <Text style={styles.productSku}>Đã bán: {item.totalSold || 0}</Text>
                            </View>
                            <Text style={styles.productPrice}>{(item.revenue || 0).toLocaleString?.('vi-VN')} đ</Text>
                        </View>
                    ))}
                    {(!displayData.topProducts || displayData.topProducts.length === 0) && (
                        <Text style={styles.emptyText}>Chưa có dữ liệu bán hàng</Text>
                    )}
                </View>

                {/* Footer đẹp */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Dữ liệu được cập nhật từ server</Text>
                    <Text style={styles.footerSubText}>Kéo xuống để làm mới • {new Date().toLocaleTimeString()}</Text>
                </View>
            </View>
        </ScrollView>
    );
}

// Helper functions
const getStatusLabel = (status) => {
    const map = {
        pending: 'Chờ xử lý',
        processing: 'Đang xử lý',
        confirmed: 'Đã xác nhận',
        shipped: 'Đang giao',
        delivered: 'Đã giao',
        cancelled: 'Đã hủy',
    };
    return map[status] || status;
};

const getStatusStyle = (status) => {
    const stylesMap = {
        pending: { backgroundColor: '#fff7ed', borderColor: '#f97316' },
        processing: { backgroundColor: '#dbeafe', borderColor: '#3b82f6' },
        confirmed: { backgroundColor: '#f3e8ff', borderColor: '#a855f7' },
        shipped: { backgroundColor: '#fef3c7', borderColor: '#f59e0b' },
        delivered: { backgroundColor: '#f0fdf4', borderColor: '#22c55e' },
        cancelled: { backgroundColor: '#fee2e2', borderColor: '#ef4444' },
    };
    return [styles.statusBadge, stylesMap[status] || {}];
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { backgroundColor: '#ed1d24', paddingTop: 50, padding: 20 },
    headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerLeft: { flex: 1 },
    headerGreeting: { fontSize: 16, color: '#ffcccc', fontWeight: '500' },
    headerName: { fontSize: 38, fontWeight: 'bold', color: '#fff', marginTop: 4 },
    rightButtons: { flexDirection: 'row', alignItems: 'center' },
    refreshButton: { padding: 8, marginRight: 8, borderRadius: 8 },
    headerText: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    logoutButton: { padding: 10 },
    content: { padding: 20 },
    card: {
        backgroundColor: '#fff',
        padding: 24,
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 6,
        borderLeftWidth: 5,
        borderLeftColor: '#ed1d24',
    },
    cardLabel: { fontSize: 16, color: '#666', marginBottom: 8 },
    totalRevenue: { fontSize: 32, fontWeight: 'bold', color: '#ed1d24' },
    todayRevenue: { fontSize: 32, fontWeight: 'bold', color: '#16a34a' },
    smallCards: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10 },
    smallCard: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        flex: 1,
        marginHorizontal: 5,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 4,
        borderLeftWidth: 4,
    },
    smallLabel: { fontSize: 14, color: '#666', textAlign: 'center' },
    smallValueBlue: { fontSize: 26, fontWeight: 'bold', color: '#2563eb', marginTop: 8 },
    smallValueOrange: { fontSize: 26, fontWeight: 'bold', color: '#ea580c', marginTop: 8 },
    smallValuePurple: { fontSize: 26, fontWeight: 'bold', color: '#9333ea', marginTop: 8 },
    section: { marginVertical: 20 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 12 },
    orderItem: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#3b82f6',
        shadowColor: '#000',
        shadowOpacity: 0.08,
        elevation: 3,
    },
    orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    orderCode: { fontSize: 15, fontWeight: 'bold', color: '#111' },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
    },
    statusText: { fontSize: 12, fontWeight: '600', color: '#333' },
    orderCustomer: { fontSize: 14, color: '#666', marginVertical: 4 },
    orderTotal: { fontSize: 15, fontWeight: 'bold', color: '#ed1d24' },
    productItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        elevation: 3,
    },
    rankBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#ed1d24',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    rankText: { color: '#fff', fontWeight: 'bold' },
    productInfo: { flex: 1 },
    productName: { fontSize: 15, fontWeight: '600', color: '#111' },
    productSku: { fontSize: 13, color: '#666', marginTop: 4 },
    productPrice: { fontSize: 15, fontWeight: 'bold', color: '#16a34a' },
    emptyText: { textAlign: 'center', color: '#999', fontStyle: 'italic', padding: 20 },
    footer: {
        backgroundColor: '#fefce8',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 30,
        borderWidth: 1,
        borderColor: '#f59e0b',
        marginBottom: 30,
    },
    footerText: { fontSize: 15, fontWeight: 'bold', color: '#92400e' },
    footerSubText: { fontSize: 12, color: '#78350f', marginTop: 4 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
    loadingText: { marginTop: 16, fontSize: 16, color: '#ed1d24' },
});
