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
                    // If response is HTML (404 page) or plain text, throw a clearer error
                    throw new Error('Invalid JSON response from server');
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
