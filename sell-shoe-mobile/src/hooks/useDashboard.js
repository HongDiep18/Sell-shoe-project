// src/hooks/useDashboard.js
import { useState, useCallback } from 'react';
import { getDashboardData } from '../services/apiService';

// Custom hook để quản lý dashboard data
export const useDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadDashboard = useCallback(async ({ retries = 2, timeout = 10000 } = {}) => {
        setLoading(true);
        setError(null);

        let attempt = 0;
        while (attempt <= retries) {
            try {
                // Use timeout option in api call
                const response = await getDashboardData({ timeout });
                // Normalize response shapes: older admin endpoint returned flat fields,
                // the users admin endpoint returns { overview, revenueByDay, ... } inside metadata.
                if (response && response.metadata) {
                    const meta = response.metadata;
                    // If server returned overview (web admin shape) or revenueByDay, map it to the mobile shape
                    if (meta.overview || meta.revenueByDay) {
                        // totalRevenue from overview
                        const totalRevenue = meta.overview?.totalRevenue || 0;

                        // todayRevenue: try to find today's revenue from revenueByDay array
                        let todayRevenue = 0;
                        try {
                            const todayIso = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
                            const found = (meta.revenueByDay || []).find(
                                (d) =>
                                    d.date === todayIso || (d.date && d.date.startsWith && d.date.startsWith(todayIso)),
                            );
                            if (found) todayRevenue = found.revenue || 0;
                        } catch (e) {
                            todayRevenue = 0;
                        }

                        const totalOrders = meta.overview?.totalOrders || meta.overview?.totalOrders || 0;
                        const totalCustomers = meta.overview?.totalUsers || meta.overview?.totalCustomers || 0;
                        const totalProducts = meta.overview?.totalProducts || 0;

                        // Normalize recentOrders: server returns recentOrders with fields { id, user, totalPrice, status, createdAt }
                        const recentOrdersRaw = meta.recentOrders || [];
                        const recentOrders = (recentOrdersRaw || []).map((o) => {
                            const id = o.id || o._id || '';
                            const orderCode = id
                                ? `ORD${String(id).slice(-8).toUpperCase()}`
                                : o.orderCode || 'ORD_UNKNOWN';
                            return {
                                orderCode,
                                customer: o.user || o.fullName || o.customer || 'Khách lẻ',
                                total: o.totalPrice || o.total || o.totalAmount || 0,
                                status: o.status || 'pending',
                                createdAt: o.createdAt,
                            };
                        });

                        // Normalize topProducts
                        const topProductsRaw = meta.topProducts || [];
                        const topProducts = (topProductsRaw || []).map((p) => ({
                            name: p.name || p.product?.name || 'Sản phẩm',
                            totalSold: p.totalSold || 0,
                            revenue: p.revenue || 0,
                        }));

                        const unified = {
                            totalRevenue: Math.round(totalRevenue),
                            todayRevenue: Math.round(todayRevenue),
                            totalOrders: totalOrders,
                            totalCustomers: totalCustomers,
                            totalProducts: totalProducts,
                            recentOrders,
                            topProducts,
                        };

                        setData(unified);
                        setError(null);
                        setLoading(false);
                        return; // success
                    }

                    // Fallback: if metadata already matches mobile shape, use it directly
                    setData(meta);
                    setError(null);
                    setLoading(false);
                    return; // success
                }
                throw new Error('Không có dữ liệu');
            } catch (err) {
                attempt += 1;
                const msg = err?.message || 'Lỗi tải dữ liệu';
                console.warn(`Dashboard load attempt ${attempt} failed:`, msg);

                if (attempt > retries) {
                    setError(msg);
                    console.error('Dashboard hook error:', err);
                    break;
                }

                // Backoff before retrying
                const backoffMs = 500 * attempt; // 500ms, 1s, ...
                await new Promise((res) => setTimeout(res, backoffMs));
            }
        }

        setLoading(false);
    }, []);

    return { data, loading, error, loadDashboard };
};
