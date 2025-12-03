// src/services/apiService.js
import * as SecureStore from 'expo-secure-store';
import API_URL from '../config/api';

// Small helper to wait
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * api - Fetch wrapper with timeout and Abort support
 * options.timeout: milliseconds (default 10000)
 */
const api = async (endpoint, options = {}) => {
    const url = `${API_URL}${endpoint}`;
    const token = await SecureStore.getItemAsync('admin_token');

    const timeout = typeof options.timeout === 'number' ? options.timeout : 10000;

    // Build fetch options
    const fetchOptions = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        },
    };

    // Use AbortController when available to cancel the request on timeout
    let controller;
    let timer;
    if (typeof AbortController !== 'undefined') {
        controller = new AbortController();
        fetchOptions.signal = controller.signal;
        timer = setTimeout(() => controller.abort(), timeout);
    }

    try {
        const res = await fetch(url, fetchOptions);
        clearTimeout(timer);

        // Try parse JSON safely
        let data = {};
        // Some endpoints may return empty body (204) or non-json; guard against that
        try {
            const text = await res.text();
            if (text) {
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    // If response is HTML (404 page) or plain text, include status and body for debugging
                    console.warn('api: invalid JSON response', { url, status: res.status, body: text.slice(0, 1000) });
                    throw new Error(`Invalid JSON response from server (status ${res.status})`);
                }
            } else {
                data = {};
            }
        } catch (e) {
            throw e;
        }

        if (!res.ok) throw new Error(data.message || 'Lỗi mạng');
        return data;
    } catch (err) {
        // Map AbortError to friendly message
        if (err.name === 'AbortError' || err.message === 'Aborted' || err.message === 'The operation was aborted.') {
            throw new Error('Network request timed out');
        }
        // rethrow other errors
        throw err;
    }
};

export const loginAdmin = (email, password) =>
    api('/api/users/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });

// Dashboard endpoint (accept options e.g. { timeout })
// Use the same admin dashboard endpoint as the web admin panel
export const getDashboardData = (options = {}) => api('/api/users/admin/dashboard', options);

// Orders endpoints
export const getOrders = (status = null, options = {}) => {
    const query = status ? `?status=${status}` : '';
    return api(`/api/admin/orders${query}`, options);
};

export const updateOrderStatus = (orderId, status, options = {}) =>
    api(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        ...options,
    });

// Revenue statistics
export const getRevenueStats = (days = 7, options = {}) => api(`/api/admin/revenue-stats?days=${days}`, options);

// Product endpoints for customer mobile UI
// Backend mounts product routes under `/api/product` (see server/src/routes/index.routes.js)
export const getProducts = (page = 1, limit = 20, options = {}) => {
    const q = `?page=${page}&limit=${limit}`;
    return api(`/api/product/all${q}`, options);
};

export const getProductById = (productId, options = {}) => api(`/api/product/product/${productId}`, options);

// Register user (customer)
export const registerUser = (data, options = {}) =>
    api('/api/users/register', {
        method: 'POST',
        body: JSON.stringify(data),
        ...options,
    });

// Blog / Posts endpoints
export const getBlogs = (options = {}) => api('/api/blog/get-all', options);
export const getBlogById = (id, options = {}) => api(`/api/blog/get-by-id?id=${id}`, options);

// Cart endpoints (require authentication)
export const addToCart = (data, options = {}) =>
    api('/api/cart/add-to-cart', {
        method: 'POST',
        body: JSON.stringify(data),
        ...options,
    });

export const getCart = (options = {}) => api('/api/cart/get-cart', options);

export const updateCartQuantity = (data, options = {}) =>
    api('/api/cart/update-quantity', {
        method: 'PUT',
        body: JSON.stringify(data),
        ...options,
    });

export const removeItemFromCart = (data, options = {}) =>
    api('/api/cart/remove-item', {
        method: 'DELETE',
        body: JSON.stringify(data),
        ...options,
    });

export const applyCoupon = (data, options = {}) =>
    api('/api/cart/apply-coupon', {
        method: 'POST',
        body: JSON.stringify(data),
        ...options,
    });

export const updateCartInfo = (data, options = {}) =>
    api('/api/cart/update-info-cart', {
        method: 'PUT',
        body: JSON.stringify(data),
        ...options,
    });

// Payment / Checkout endpoints (require authentication)
export const createPayment = (data, options = {}) =>
    api('/api/payment/create', {
        method: 'POST',
        body: JSON.stringify(data),
        ...options,
    });

export const getPaymentById = (id, options = {}) => api(`/api/payment/detail/${id}`, options);

export const getOrderHistory = (options = {}) => api('/api/payment/order-history', options);
