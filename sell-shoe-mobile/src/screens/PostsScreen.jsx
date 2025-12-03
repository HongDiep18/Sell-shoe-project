import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    Image,
    TouchableOpacity,
    Modal,
    ScrollView,
    useWindowDimensions,
} from 'react-native';
import API_URL from '../config/api';
import { getBlogs } from '../services/apiService';

export default function PostsScreen() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const { width } = useWindowDimensions();

    // Responsive: 1 column on phones, 2 columns on wider screens
    const numColumns = useMemo(() => (width > 700 ? 2 : 1), [width]);

    const openPost = (post) => {
        setSelected(post);
        setModalVisible(true);
    };

    React.useEffect(() => {
        let mounted = true;
        const fetchPosts = async () => {
            setLoading(true);
            try {
                const res = await getBlogs();
                // res.metadata should be an array of blog docs
                const blogs = Array.isArray(res.metadata) ? res.metadata : [];
                // map image filenames to full URLs
                const mapped = blogs.map((b) => ({
                    ...b,
                    image: b.image ? `${API_URL}/uploads/blogs/${b.image}` : null,
                    id: b._id || b.id,
                    excerpt: b.content ? (b.content.length > 120 ? b.content.slice(0, 120) + '...' : b.content) : '',
                    author: b.author || 'Admin',
                    date: b.createdAt ? b.createdAt.split('T')[0] : '',
                }));
                if (mounted) setPosts(mapped);
            } catch (err) {
                console.warn('Failed to load posts', err);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchPosts();
        return () => {
            mounted = false;
        };
    }, []);

    const renderItem = ({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => openPost(item)} activeOpacity={0.9}>
            {item.image ? <Image source={{ uri: item.image }} style={styles.cardImage} resizeMode="cover" /> : null}
            <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.title}
                </Text>
                <View style={styles.metaRow}>
                    <Text style={styles.metaText}>{item.author}</Text>
                    <Text style={styles.dot}>•</Text>
                    <Text style={styles.metaText}>{item.date}</Text>
                </View>
                <Text style={styles.excerpt} numberOfLines={3}>
                    {item.excerpt}
                </Text>
                <Text style={styles.readMore}>Đọc tiếp</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={posts}
                keyExtractor={(i) => i.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 16 }}
                numColumns={numColumns}
                columnWrapperStyle={numColumns > 1 ? { justifyContent: 'space-between' } : null}
            />

            <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalContainer}>
                    <ScrollView contentContainerStyle={{ padding: 16 }}>
                        <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                            <Text style={styles.closeText}>Đóng</Text>
                        </TouchableOpacity>
                        {selected && (
                            <>
                                {selected.image ? (
                                    <Image source={{ uri: selected.image }} style={styles.detailImage} />
                                ) : null}
                                <Text style={styles.detailTitle}>{selected.title}</Text>
                                <View style={styles.metaRow}>
                                    <Text style={styles.metaText}>{selected.author}</Text>
                                    <Text style={styles.dot}>•</Text>
                                    <Text style={styles.metaText}>{selected.date}</Text>
                                </View>
                                <Text style={styles.detailContent}>{selected.content}</Text>
                            </>
                        )}
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
        flex: 1,
        // shadow for iOS
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
    },
    cardImage: { width: '100%', height: 160, backgroundColor: '#eee' },
    cardBody: { padding: 12 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    metaText: { color: '#6b7280', fontSize: 12 },
    dot: { marginHorizontal: 6, color: '#c7c7c7' },
    excerpt: { marginTop: 8, color: '#4b5563', fontSize: 14 },
    readMore: { marginTop: 10, color: '#ed1d24', fontWeight: '700' },

    modalContainer: { flex: 1, backgroundColor: '#fff' },
    closeBtn: { alignSelf: 'flex-end', padding: 8 },
    closeText: { color: '#ed1d24', fontWeight: '700' },
    detailImage: { width: '100%', height: 220, backgroundColor: '#eee', borderRadius: 8 },
    detailTitle: { fontSize: 20, fontWeight: '800', marginTop: 12, color: '#111' },
    detailContent: { marginTop: 12, fontSize: 16, color: '#374151', lineHeight: 22 },
});
