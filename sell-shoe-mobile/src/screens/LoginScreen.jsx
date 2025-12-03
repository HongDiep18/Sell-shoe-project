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

// Import mock data
// API login helper
import { loginAdmin } from '../services/apiService';

// Helper to decode JWT payload (basic)
const decodeJWT = (token) => {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = JSON.parse(atob(parts[1]));
        return payload;
    } catch (e) {
        return null;
    }
};

export default function LoginScreen({ navigation, onLoginSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setLoading(true);
        try {
            const res = await loginAdmin(email, password);
            if (res.message !== 'success') throw new Error(res.message || 'Đăng nhập thất bại');

            const token = res.metadata?.token;
            if (!token) throw new Error('Không nhận được token từ server');

            const payload = decodeJWT(token);
            const adminName = payload?.fullName || payload?.email || 'Admin';

            await SecureStore.setItemAsync('admin_token', token);
            await SecureStore.setItemAsync('admin_name', adminName);
            await SecureStore.setItemAsync('admin_email', payload?.email || email);
            await SecureStore.setItemAsync('admin_logged', '1');

            onLoginSuccess();
        } catch (error) {
            Alert.alert('Lỗi đăng nhập', error.message);
        } finally {
            setLoading(false);
        }
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
                    onPress={handleLogin}
                    disabled={loading}
                >
                    <Text style={styles.loginButtonText}>{loading ? 'Đang đăng nhập...' : 'ĐĂNG NHẬP'}</Text>
                </TouchableOpacity>
            </View>
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
});
