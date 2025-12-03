// App.js (đặt ở gốc project, cùng cấp với package.json)
import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';

// Import màn hình
import LoginScreen from '../src/screens/LoginScreen';
import DashboardScreen from '../src/screens/DashboardScreen';
import HomeScreen from '../src/screens/HomeScreen';
import ProductDetailScreen from '../src/screens/ProductDetailScreen';
import PostsScreen from '../src/screens/PostsScreen';
import ContactScreen from '../src/screens/ContactScreen';
import CartScreen from '../src/screens/CartScreen';
import CheckoutScreen from '../src/screens/CheckoutScreen';

// Import context
import { CartProvider } from '../src/context/CartContext';

const Stack = createNativeStackNavigator();

function RootNavigator({ isLoggedIn }) {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={'Login'}>
            {/* Public shop routes (khách) */}
            <Stack.Screen name="ShopHome" component={HomeScreen} />
            <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
            <Stack.Screen name="Posts" component={PostsScreen} />
            <Stack.Screen name="Contact" component={ContactScreen} />
            <Stack.Screen name="Cart" component={CartScreen} />
            <Stack.Screen name="Checkout" component={CheckoutScreen} />

            {isLoggedIn ? (
                // ĐÃ ĐĂNG NHẬP → vào Dashboard
                <Stack.Screen name="Dashboard" component={DashboardScreen} />
            ) : (
                // CHƯA ĐĂNG NHẬP → hiện Login
                <Stack.Screen
                    name="Login"
                    component={LoginScreen}
                    options={{
                        animationEnabled: true,
                    }}
                />
            )}
        </Stack.Navigator>
    );
}

export default function App() {
    const [isLoading, setIsLoading] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        // Kiểm tra đã đăng nhập chưa (dùng SecureStore)
        const checkLoginStatus = async () => {
            try {
                // ưu tiên kiểm tra token thực tế
                const token = await SecureStore.getItemAsync('admin_token');
                // nếu token tồn tại thì coi là đã đăng nhập; tùy chọn: validate token bằng API
                setIsLoggedIn(!!token);
            } catch (error) {
                setIsLoggedIn(false);
            } finally {
                setIsLoading(false);
            }
        };

        checkLoginStatus();
    }, []);

    // Hàm đăng xuất (dùng chung cho toàn app)
    const handleLogout = async () => {
        await SecureStore.deleteItemAsync('admin_logged');
        await SecureStore.deleteItemAsync('admin_token');
        await SecureStore.deleteItemAsync('admin_name');
        await SecureStore.deleteItemAsync('admin_email');
        setIsLoggedIn(false);
    };

    // Hàm đăng nhập thành công (gọi từ LoginScreen)
    const handleLoginSuccess = async () => {
        // LoginScreen already sets admin_token and admin_logged; ensure flag is present
        try {
            await SecureStore.setItemAsync('admin_logged', '1');
        } catch (e) {
            // ignore
        }
        setIsLoggedIn(true);
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ed1d24" />
                <Text style={styles.loadingText}>Đang tải ứng dụng...</Text>
            </View>
        );
    }

    return (
        <SafeAreaProvider>
            <CartProvider>
                <NavigationContainer>
                    <RootNavigator isLoggedIn={isLoggedIn} />
                </NavigationContainer>
            </CartProvider>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
    },
});
