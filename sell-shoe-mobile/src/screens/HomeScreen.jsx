import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity, TextInput, Modal } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getProducts } from '../services/apiService';
import ProductCard from '../components/ProductCard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen({ navigation }) {
    const [products, setProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    // state giữ giá trị search đã debounce để tránh lọc quá nhanh khi gõ
    const [debouncedQuery, setDebouncedQuery] = useState('');

    // Hàm chuẩn hoá chuỗi: loại bỏ dấu và về lowercase để tìm không phân biệt dấu/hoa
    const normalize = (s) => {
        if (!s) return '';
        try {
            // NFD + regex để loại bỏ các dấu tiếng Việt
            return s
                .normalize('NFD')
                .replace(/\p{Diacritic}/gu, '')
                .toLowerCase();
        } catch (e) {
            // Fallback nếu môi trường JS không hỗ trợ unicode property escapes
            return s.replace(/[\u0300-\u036f]/g, '').toLowerCase();
        }
    };
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [userName, setUserName] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [userMenuVisible, setUserMenuVisible] = useState(false);
    const [hamburgerVisible, setHamburgerVisible] = useState(false);

    const load = useCallback(
        async (p = 1) => {
            if (loading) return;
            setLoading(true);
            try {
                const res = await getProducts(p, 20);
                // backend returns { message, metadata }
                const items = Array.isArray(res.metadata)
                    ? res.metadata
                    : Array.isArray(res.data)
                    ? res.data
                    : res.items || [];

                // CHÚ THÍCH (tiếng Việt):
                // - Đây là phần lấy dữ liệu từ API. Nếu đang load trang đầu (p === 1) thì set thẳng items,
                // - Nếu load trang tiếp theo, cần tránh duplicate bằng cách kiểm tra _id/id đã tồn tại.

                if (p === 1) {
                    setProducts(items);
                } else {
                    // De-duplicate when loading more: avoid duplicate IDs
                    const existingIds = new Set(products.map((prod) => (prod._id || prod.id)?.toString()));
                    const newItems = items.filter((item) => !existingIds.has((item._id || item.id)?.toString()));
                    setProducts((s) => [...s, ...newItems]);
                }

                setHasMore((items || []).length >= 20);
                setPage(p);
            } catch (err) {
                console.warn('Load products error', err);
                // stop further automatic load attempts on error to avoid tight retry loops
                setHasMore(false);
            } finally {
                setLoading(false);
            }
        },
        [loading, products],
    );

    useEffect(() => {
        load(1);
    }, []);

    // Load user info from SecureStore to show in header
    useEffect(() => {
        (async () => {
            try {
                const role = await SecureStore.getItemAsync('user_role');
                const adminName = await SecureStore.getItemAsync('admin_name');
                const customerEmail = await SecureStore.getItemAsync('customer_email');
                setUserRole(role || null);
                setUserName(adminName || customerEmail || null);
            } catch (e) {
                // ignore
            }
        })();
    }, []);

    // Hiển thị sản phẩm dựa trên query đã debounce (tìm theo substring, không cần match nguyên từ)
    // Debounce input: chỉ cập nhật debouncedQuery sau 300ms
    React.useEffect(() => {
        const t = setTimeout(() => setDebouncedQuery((searchQuery || '').trim()), 300);
        return () => clearTimeout(t);
    }, [searchQuery]);

    // displayedProducts: Tìm kiếm linh hoạt (gõ từ khóa không cần liền mạch)
    const displayedProducts = useMemo(() => {
        const q = normalize(debouncedQuery);
        if (!q) return products;

        //  Tách chuỗi tìm kiếm thành mảng các từ khóa (loại bỏ khoảng trắng thừa)
        const searchTerms = q.split(' ').filter((term) => term.trim() !== '');

        return products.filter((p) => {
            const nameNorm = normalize(p.name);

            return searchTerms.every((term) => nameNorm.includes(term));
        });
    }, [products, debouncedQuery]);

    const renderItem = ({ item }) => (
        <ProductCard
            item={item}
            onPress={(it) => navigation.navigate('ProductDetail', { id: it._id || it.id, item: it })}
        />
    );

    const loadMore = () => {
        if (!loading && hasMore) load(page + 1);
    };

    return (
        <View style={styles.container}>
            <SafeAreaView edges={['top']} style={styles.header}>
                <View style={styles.headerRow}>
                    <TouchableOpacity style={styles.hamburgerBtn} onPress={() => setHamburgerVisible(true)}>
                        <Ionicons name="menu-outline" size={26} color="#111" />
                    </TouchableOpacity>

                    <Text style={styles.title}>Sản phẩm</Text>

                    <View style={styles.rightRow}>
                        <TouchableOpacity style={styles.cartBtn} onPress={() => navigation.navigate('Cart')}>
                            <Ionicons name="cart-outline" size={24} color="#111" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.userBtn} onPress={() => setUserMenuVisible(true)}>
                            <Ionicons name="person-circle-outline" size={26} color="#111" />
                            {userName ? (
                                <Text style={styles.userName} numberOfLines={1}>
                                    {userName}
                                </Text>
                            ) : null}
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.searchRow}>
                    <Ionicons name="search" size={18} color="#999" style={{ marginLeft: 8 }} />
                    <TextInput
                        placeholder="Tìm sản phẩm..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={styles.searchInput}
                        returnKeyType="search"
                    />
                </View>
            </SafeAreaView>

            {loading && products.length === 0 ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#ed1d24" />
                </View>
            ) : (
                <FlatList
                    data={displayedProducts}
                    // keyExtractor: ưu tiên dùng _id/id từ server, nếu không có thì dùng index làm fallback
                    keyExtractor={(i, idx) => (i._id || i.id ? (i._id || i.id).toString() : `idx-${idx}`)}
                    renderItem={renderItem}
                    numColumns={2}
                    columnWrapperStyle={styles.columnWrapper}
                    contentContainerStyle={{ padding: 16 }}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    ListEmptyComponent={<Text style={styles.empty}>Không có sản phẩm</Text>}
                    removeClippedSubviews={false}
                    initialNumToRender={8}
                />
            )}

            <Modal
                visible={userMenuVisible}
                animationType="fade"
                transparent
                onRequestClose={() => setUserMenuVisible(false)}
            >
                <TouchableOpacity
                    style={styles.menuOverlay}
                    activeOpacity={1}
                    onPress={() => setUserMenuVisible(false)}
                >
                    <View style={styles.menuBox}>
                        <Text style={styles.menuTitle}>{userName || 'Người dùng'}</Text>
                        <Text style={styles.menuRole}>{userRole === 'admin' ? 'Quản trị viên' : 'Khách hàng'}</Text>
                        <View style={{ height: 12 }} />
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={async () => {
                                // logout: clear relevant keys and go to Login
                                try {
                                    await SecureStore.deleteItemAsync('admin_token');
                                    await SecureStore.deleteItemAsync('admin_logged');
                                    await SecureStore.deleteItemAsync('admin_name');
                                    await SecureStore.deleteItemAsync('admin_email');
                                    await SecureStore.deleteItemAsync('user_role');
                                    await SecureStore.deleteItemAsync('customer_email');
                                } catch (e) {
                                    // ignore
                                }
                                setUserMenuVisible(false);
                                navigation.replace('Login');
                            }}
                        >
                            <Text style={styles.menuItemText}>Đăng xuất</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <Modal
                visible={hamburgerVisible}
                animationType="fade"
                transparent
                onRequestClose={() => setHamburgerVisible(false)}
            >
                <TouchableOpacity
                    style={styles.menuOverlayLeft}
                    activeOpacity={1}
                    onPress={() => setHamburgerVisible(false)}
                >
                    <View style={styles.menuBoxLeft}>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                setHamburgerVisible(false);
                                navigation.navigate('ShopHome');
                            }}
                        >
                            <Text style={styles.menuItemText}>Sản phẩm</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                setHamburgerVisible(false);
                                navigation.navigate('Posts');
                            }}
                        >
                            <Text style={styles.menuItemText}>Bài viết</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                setHamburgerVisible(false);
                                navigation.navigate('Contact');
                            }}
                        >
                            <Text style={styles.menuItemText}>Liên hệ</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                setHamburgerVisible(false);
                                navigation.navigate('Logout', { openRegister: true });
                            }}
                        >
                            <Text style={styles.menuItemText}>Đăng xuất</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8 },
    rightRow: { flexDirection: 'row', alignItems: 'center' },
    userBtn: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
    userName: { marginLeft: 6, maxWidth: 120, fontSize: 14, color: '#111' },
    title: { fontSize: 20, fontWeight: '700', color: '#111' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { textAlign: 'center', color: '#999', marginTop: 40 },
    cartBtn: { padding: 8 },
    searchRow: {
        marginTop: 10,
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        height: 44,
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 8,
    },
    searchInput: { flex: 1, paddingHorizontal: 8, color: '#111' },
    columnWrapper: { justifyContent: 'space-between' },
    menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-start', alignItems: 'flex-end' },
    menuBox: {
        marginTop: 80,
        marginRight: 12,
        width: 220,
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 12,
        elevation: 6,
    },
    menuTitle: { fontWeight: '700', fontSize: 16, color: '#111' },
    menuRole: { color: '#666', fontSize: 13, marginTop: 6 },
    menuItem: { marginTop: 10, paddingVertical: 10, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center' },
    menuItemText: { fontWeight: '700', color: '#111' },
    hamburgerBtn: { padding: 8 },
    menuOverlayLeft: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
    },
    menuBoxLeft: {
        marginTop: 80,
        marginLeft: 12,
        width: 220,
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 12,
        elevation: 6,
    },
});
