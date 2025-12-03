import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ContactScreen() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!name.trim() || !email.trim() || !message.trim()) {
            Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc (*)');
            return;
        }

        setLoading(true);
        try {
            // Simulate API call (backend integration optional)
            await new Promise((r) => setTimeout(r, 800));
            Alert.alert('Cảm ơn', 'Tin nhắn của bạn đã được gửi thành công. Chúng tôi sẽ liên hệ lại sớm nhất có thể.');
            setName('');
            setEmail('');
            setPhone('');
            setSubject('');
            setMessage('');
        } catch (err) {
            Alert.alert('Lỗi', 'Gửi tin nhắn thất bại. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header Card */}
                <View style={styles.headerCard}>
                    <Ionicons name="mail-outline" size={40} color="#ed1d24" />
                    <Text style={styles.headerTitle}>Liên Hệ Với Chúng Tôi</Text>
                    <Text style={styles.headerSubtitle}>
                        Hãy gửi tin nhắn cho chúng tôi, đội ngũ sẽ phản hồi trong thời gian sớm nhất
                    </Text>
                </View>

                {/* Form */}
                <View style={styles.formCard}>
                    <Text style={styles.label}>
                        Họ và tên <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                        placeholder="Nhập họ và tên"
                        value={name}
                        onChangeText={setName}
                        style={styles.input}
                        placeholderTextColor="#999"
                        editable={!loading}
                    />

                    <Text style={styles.label}>
                        Email <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                        placeholder="Nhập email"
                        value={email}
                        onChangeText={setEmail}
                        style={styles.input}
                        keyboardType="email-address"
                        placeholderTextColor="#999"
                        editable={!loading}
                        autoCapitalize="none"
                    />

                    <Text style={styles.label}>Số điện thoại</Text>
                    <TextInput
                        placeholder="Nhập số điện thoại"
                        value={phone}
                        onChangeText={setPhone}
                        style={styles.input}
                        keyboardType="phone-pad"
                        placeholderTextColor="#999"
                        editable={!loading}
                    />

                    <Text style={styles.label}>Chủ đề</Text>
                    <TextInput
                        placeholder="Nhập chủ đề"
                        value={subject}
                        onChangeText={setSubject}
                        style={styles.input}
                        placeholderTextColor="#999"
                        editable={!loading}
                    />

                    <Text style={styles.label}>
                        Nội dung <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                        placeholder="Nhập nội dung tin nhắn"
                        value={message}
                        onChangeText={setMessage}
                        style={[styles.input, styles.textArea]}
                        multiline
                        numberOfLines={5}
                        placeholderTextColor="#999"
                        editable={!loading}
                        textAlignVertical="top"
                    />

                    <TouchableOpacity
                        style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
                        onPress={handleSend}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="send" size={18} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.sendText}>{loading ? 'Đang gửi...' : 'Gửi Tin Nhắn'}</Text>
                    </TouchableOpacity>

                    <Text style={styles.infoText}>Các trường đánh dấu * là bắt buộc</Text>
                </View>

                {/* Contact Info */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Thông Tin Liên Hệ</Text>

                    <View style={styles.infoItem}>
                        <Ionicons name="location-outline" size={20} color="#ed1d24" />
                        <View style={{ marginLeft: 12 }}>
                            <Text style={styles.infoLabel}>Địa chỉ</Text>
                            <Text style={styles.infoText}>123 Đường ABC, Q.1, TP.HCM</Text>
                        </View>
                    </View>

                    <View style={styles.infoItem}>
                        <Ionicons name="call-outline" size={20} color="#ed1d24" />
                        <View style={{ marginLeft: 12 }}>
                            <Text style={styles.infoLabel}>Điện thoại</Text>
                            <Text style={styles.infoText}>+84 123 456 789</Text>
                        </View>
                    </View>

                    <View style={styles.infoItem}>
                        <Ionicons name="mail-outline" size={20} color="#ed1d24" />
                        <View style={{ marginLeft: 12 }}>
                            <Text style={styles.infoLabel}>Email</Text>
                            <Text style={styles.infoText}>support@shoebaco.com</Text>
                        </View>
                    </View>

                    <View style={styles.infoItem}>
                        <Ionicons name="time-outline" size={20} color="#ed1d24" />
                        <View style={{ marginLeft: 12 }}>
                            <Text style={styles.infoLabel}>Giờ làm việc</Text>
                            <Text style={styles.infoText}>Thứ 2 - Chủ nhật: 9:00 - 21:00</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    scrollContent: { paddingVertical: 16, paddingHorizontal: 16 },

    headerCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
    },
    headerTitle: { fontSize: 22, fontWeight: '800', color: '#111', marginTop: 12 },
    headerSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 8,
        textAlign: 'center',
        lineHeight: 20,
    },

    formCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
    },

    label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 12 },
    required: { color: '#e11d48', fontWeight: '700' },

    input: {
        backgroundColor: '#f3f4f6',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 14,
        fontSize: 15,
        color: '#111',
    },

    textArea: { height: 120, textAlignVertical: 'top', paddingTop: 12 },

    sendBtn: {
        backgroundColor: '#ed1d24',
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        flexDirection: 'row',
        shadowColor: '#ed1d24',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    sendBtnDisabled: { opacity: 0.7 },
    sendText: { color: '#fff', fontWeight: '700', fontSize: 16 },

    infoText: { fontSize: 12, color: '#9ca3af', marginTop: 8, textAlign: 'center' },

    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
    },
    infoTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 16 },
    infoItem: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-start' },
    infoLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
});
