// src/screens/LoginScreen.jsx
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';

// API login helper
import { loginAdmin, registerUser } from '../services/apiService';
import { ScrollView, Modal } from 'react-native';

// Helper to decode JWT payload (basic, with fallbacks)
const decodeJWT = (token) => {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        // Pad base64 string if necessary
        while (b64.length % 4) b64 += '=';

        let json = null;
        try {
            if (typeof atob === 'function') {
                json = atob(b64);
            } else if (typeof Buffer !== 'undefined') {
                json = Buffer.from(b64, 'base64').toString('utf8');
            }
        } catch (e) {
            // ignore decode error
            return null;
        }

        if (!json) return null;
        return JSON.parse(json);
    } catch (e) {
        return null;
    }
};

export default function LoginScreen({ navigation, onLoginSuccess, route }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showRegister, setShowRegister] = useState(false);

    React.useEffect(() => {
        // If navigated with { openRegister: true }, open the register modal
        try {
            if (route && route.params && route.params.openRegister) {
                setShowRegister(true);
            }
        } catch (e) {}
    }, [route?.params?.openRegister]);

    // register form state
    const [regName, setRegName] = useState('');
    const [regPhone, setRegPhone] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regConfirm, setRegConfirm] = useState('');
    const [regLoading, setRegLoading] = useState(false);

    const handleNormalLogin = async () => {
        setLoading(true);
        try {
            const res = await loginAdmin(email, password);
            if (res.message !== 'success') throw new Error(res.message || 'Đăng nhập thất bại');

            const token = res.metadata?.token;
            if (!token) throw new Error('Không nhận được token từ server');

            const payload = decodeJWT(token) || {};

            // Save customer email (not admin token)
            await SecureStore.setItemAsync('customer_email', email);
            await SecureStore.setItemAsync('user_role', 'customer');

            // Navigate to shop home for customers
            navigation.replace('ShopHome');
        } catch (error) {
            Alert.alert('Lỗi đăng nhập', error.message);
        } finally {
            setLoading(false);
        }
    };

    // Separate admin-only login: if credentials are not admin, show alert
    const handleAdminLogin = async () => {
        setLoading(true);
        try {
            const res = await loginAdmin(email, password);
            console.log('Admin login response:', JSON.stringify(res, null, 2));
            if (res.message !== 'success') throw new Error(res.message || 'Đăng nhập thất bại');

            const token = res.metadata?.token;
            if (!token) throw new Error('Không nhận được token từ server');

            const user = res.metadata?.user;
            console.log('User from response:', user);

            // Check if user is admin
            if (!user?.isAdmin) {
                Alert.alert('Không phải admin', 'Bạn không phải là admin');
                return;
            }

            // persist admin session
            await SecureStore.setItemAsync('user_role', 'admin');
            await SecureStore.setItemAsync('admin_token', token);
            await SecureStore.setItemAsync('admin_name', user?.fullName || user?.email || email);
            await SecureStore.setItemAsync('admin_email', user?.email || email);
            await SecureStore.setItemAsync('admin_logged', '1');

            try {
                onLoginSuccess();
            } catch (e) {}

            navigation.replace('Dashboard');
        } catch (error) {
            Alert.alert('Lỗi đăng nhập', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        // basic validation
        if (!regName.trim() || !regPhone.trim() || !regEmail.trim() || !regPassword) {
            Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc');
            return;
        }
        if (regPassword.length < 6) {
            Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }
        if (regPassword !== regConfirm) {
            Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
            return;
        }

        setRegLoading(true);
        try {
            const payload = {
                fullName: regName.trim(),
                phone: regPhone.trim(),
                email: regEmail.trim(),
                password: regPassword,
            };
            const res = await registerUser(payload);
            if (res.message !== 'success') throw new Error(res.message || 'Đăng ký thất bại');
            Alert.alert('Thành công', 'Đăng ký thành công. Vui lòng đăng nhập.');
            // reset and close
            setShowRegister(false);
            setRegName('');
            setRegPhone('');
            setRegEmail('');
            setRegPassword('');
            setRegConfirm('');
            // optionally prefill email on login
            setEmail(payload.email);
        } catch (err) {
            Alert.alert('Lỗi đăng ký', err.message || String(err));
        } finally {
            setRegLoading(false);
        }
    };

    const handleCancelRegister = () => {
        setRegName('');
        setRegPhone('');
        setRegEmail('');
        setRegPassword('');
        setRegConfirm('');
        setRegLoading(false);
        setShowRegister(false);
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerText}>ĐĂNG NHẬP TÀI KHOẢN</Text>
                <Text style={styles.subText}>SHOE BACONBAO</Text>
            </View>

            {/* Form đăng nhập */}
            <View style={styles.formContainer}>
                <Text style={styles.welcomeText}>Chào mừng quay lại!</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#999"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                />

                <TextInput
                    style={styles.input}
                    placeholder="Mật khẩu"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    editable={!loading}
                />

                <TouchableOpacity
                    style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                    onPress={handleNormalLogin}
                    disabled={loading}
                >
                    <Text style={styles.loginButtonText}>{loading ? 'Đang đăng nhập...' : 'ĐĂNG NHẬP'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.adminButton, loading && styles.loginButtonDisabled]}
                    onPress={handleAdminLogin}
                    disabled={loading}
                >
                    <Text style={styles.adminButtonText}>{loading ? 'Đang kiểm tra...' : 'ĐĂNG NHẬP ADMIN'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.registerButton]}
                    onPress={() => setShowRegister(true)}
                    disabled={loading}
                >
                    <Text style={[styles.registerButtonText]}>Đăng ký tài khoản</Text>
                </TouchableOpacity>
            </View>

            <Modal
                visible={showRegister}
                animationType="slide"
                transparent={true}
                onRequestClose={handleCancelRegister}
            >
                <View style={styles.regOverlay}>
                    <View style={styles.regBox}>
                        <ScrollView contentContainerStyle={{ padding: 12 }}>
                            <Text style={styles.regTitle}>Đăng ký tài khoản</Text>
                            <Text style={styles.regLabel}>
                                Họ và tên <Text style={{ color: '#e11d48' }}>*</Text>
                            </Text>
                            <TextInput
                                placeholder="Nhập họ và tên"
                                value={regName}
                                onChangeText={setRegName}
                                style={styles.input}
                            />
                            <Text style={styles.regLabel}>
                                Số điện thoại <Text style={{ color: '#e11d48' }}>*</Text>
                            </Text>
                            <TextInput
                                placeholder="Nhập số điện thoại"
                                value={regPhone}
                                onChangeText={setRegPhone}
                                style={styles.input}
                                keyboardType="phone-pad"
                            />
                            <Text style={styles.regLabel}>
                                Email <Text style={{ color: '#e11d48' }}>*</Text>
                            </Text>
                            <TextInput
                                placeholder="Nhập email"
                                value={regEmail}
                                onChangeText={setRegEmail}
                                style={styles.input}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />

                            <Text style={styles.regLabel}>
                                Mật khẩu <Text style={{ color: '#e11d48' }}>*</Text>
                            </Text>
                            <TextInput
                                placeholder="Nhập mật khẩu"
                                value={regPassword}
                                onChangeText={setRegPassword}
                                style={styles.input}
                                secureTextEntry
                            />

                            <Text style={styles.regLabel}>
                                Xác nhận mật khẩu <Text style={{ color: '#e11d48' }}>*</Text>
                            </Text>
                            <TextInput
                                placeholder="Xác nhận mật khẩu"
                                value={regConfirm}
                                onChangeText={setRegConfirm}
                                style={styles.input}
                                secureTextEntry
                            />

                            <TouchableOpacity
                                style={[styles.loginButton, regLoading && styles.loginButtonDisabled]}
                                onPress={handleRegister}
                                disabled={regLoading}
                            >
                                <Text style={styles.loginButtonText}>{regLoading ? 'Đang đăng ký...' : 'ĐĂNG KÝ'}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.cancelBtn, { marginTop: 8 }]}
                                onPress={handleCancelRegister}
                            >
                                <Text style={styles.cancelText}>Hủy</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        backgroundColor: '#ed1d24',
        paddingTop: 80,
        paddingBottom: 60,
        alignItems: 'center',
    },
    headerText: {
        fontSize: 30,
        fontWeight: 'bold',
        color: '#fff',
    },
    subText: {
        fontSize: 16,
        color: '#ffcdd2',
        marginTop: 8,
    },
    formContainer: {
        flex: 1,
        paddingHorizontal: 30,
        marginTop: -40,
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: '600',
        color: '#f0f2f5ff',
        textAlign: 'center',
        marginBottom: 40,
    },
    input: {
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderRadius: 16,
        fontSize: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    },
    loginButton: {
        backgroundColor: '#ed1d24',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#ed1d24',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    loginButtonDisabled: {
        opacity: 0.7,
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    hintBox: {
        marginTop: 30,
        padding: 16,
        backgroundColor: '#fef3c7',
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#f59e0b',
    },
    hintTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#92400e',
        marginBottom: 4,
    },
    hintText: {
        fontSize: 13,
        color: '#78350f',
    },
    guestButton: {
        marginTop: 12,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: '#111827',
    },
    guestButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    registerButton: {
        marginTop: 12,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: '#10b981',
    },
    registerButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    adminButton: {
        marginTop: 12,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: '#1f2937',
    },
    adminButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    regOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
    regBox: { backgroundColor: '#fff', borderRadius: 12, maxHeight: '90%' },
    regTitle: { fontSize: 18, fontWeight: '700', padding: 12, color: '#111' },
    regLabel: { fontSize: 13, color: '#374151', marginBottom: 6, marginTop: 8, marginLeft: 4 },
    cancelBtn: {
        marginTop: 8,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    cancelText: { color: '#111', fontWeight: '700' },
});
