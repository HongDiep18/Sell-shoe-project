import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCart } from '../services/apiService';
import * as SecureStore from 'expo-secure-store';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(false);
    const [coupon, setCoupon] = useState(null);

    const fetchCart = useCallback(async () => {
        try {
            const token = await SecureStore.getItemAsync('admin_token');
            if (!token && !(await SecureStore.getItemAsync('customer_email'))) {
                // Not logged in
                setCart([]);
                return;
            }
            setLoading(true);
            const res = await getCart();
            const items = res.metadata?.items || res.items || [];
            setCart(items);
            if (res.metadata?.coupon) {
                setCoupon(res.metadata.coupon);
            }
        } catch (err) {
            console.warn('Error fetching cart:', err);
            setCart([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Auto fetch cart when user logs in
    useEffect(() => {
        fetchCart();
    }, [fetchCart]);

    return (
        <CartContext.Provider value={{ cart, setCart, loading, fetchCart, coupon, setCoupon }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within CartProvider');
    }
    return context;
};
