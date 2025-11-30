import React, { useEffect, useState } from 'react';
import { Layout } from 'antd';
import SidebarAdmin from './components/SidebarAdmin';
import CategoryAdmin from './components/CategoryAdmin';
import ProductAdmin from './components/ProductAdmin';
import CouponManagement from './components/CounponManager';
import OrderAdmin from './components/OrderAdmin';
import WarrantyAdmin from './components/WarrantyAdmin';
import MessageManager from './components/MessageManager';
import FlashSaleAdmin from './components/FlashSaleManagement';
import BlogAdmin from './components/BlogAdmin';
import ContactManager from './components/ContactManager';
import RecommendationDashboard from './components/RecommendationDashboard';
import { requestGetDashboardAdmin } from '../../config/UserRequest';
import { useNavigate, useLocation } from 'react-router-dom';
import Dashbroad from './components/Dashbroad';

const { Content, Header } = Layout;

// Ánh xạ các path admin sang key của menu
const pathToKeyMap = {
    '/admin': 'dashboard',
    '/admin/': 'dashboard',
    '/admin/category': 'category',
    '/admin/category/': 'category',
    '/admin/product': 'product',
    '/admin/product/': 'product',
    '/admin/coupon': 'coupon',
    '/admin/coupon/': 'coupon',
    '/admin/order': 'order',
    '/admin/order/': 'order',
    '/admin/warranty': 'warranty',
    '/admin/warranty/': 'warranty',
    '/admin/message': 'message',
    '/admin/message/': 'message',
    '/admin/flashsale': 'flashSale',
    '/admin/flashsale/': 'flashSale',
    '/admin/blog': 'blog',
    '/admin/blog/': 'blog',
    '/admin/contacts': 'contact',
    '/admin/contacts/': 'contact',
    '/admin/recommendation': 'recommendation',
    '/admin/recommendation/': 'recommendation',
};

function Admin() {
    const [selectedKey, setSelectedKey] = useState('dashboard');
    const navigate = useNavigate();
    const location = useLocation();

    // Synchronize selectedKey with URL path
    useEffect(() => {
        const pathKey = pathToKeyMap[location.pathname] || 'dashboard';
        setSelectedKey(pathKey);
    }, [location.pathname]);

    // Handle sidebar menu click - navigate to corresponding URL
    const handleMenuSelect = (key) => {
        // Find URL from key
        const url = Object.keys(pathToKeyMap).find((path) => pathToKeyMap[path] === key);
        if (url) {
            navigate(url);
        }
    };

    useEffect(() => {
        const fetchDashboardAdmin = async () => {
            try {
                await requestGetDashboardAdmin();
                return;
            } catch (error) {
                navigate('/', error);
            }
        };
        fetchDashboardAdmin();
    });

    return (
        <Layout className="min-h-screen">
            <Layout.Sider
                width={260}
                collapsible
                trigger={null}
                className="shadow-xl transition-all duration-300"
                style={{
                    background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)',
                    minHeight: '100vh',
                }}
            >
                <div className="p-4 flex items-center justify-center">
                    <div className="text-white text-xl font-bold">
                        <span>Trang Quản Trị</span>
                    </div>
                </div>
                <SidebarAdmin selectedKey={selectedKey} onSelect={handleMenuSelect} />
            </Layout.Sider>

            <Layout>
                <Content className="bg-gray-50">
                    <div className="bg-white rounded-xl shadow-md ">
                        {selectedKey === 'category' && <CategoryAdmin />}
                        {selectedKey === 'product' && <ProductAdmin />}
                        {selectedKey === 'coupon' && <CouponManagement />}
                        {selectedKey === 'order' && <OrderAdmin />}
                        {selectedKey === 'warranty' && <WarrantyAdmin />}
                        {selectedKey === 'message' && <MessageManager />}
                        {selectedKey === 'flashSale' && <FlashSaleAdmin />}
                        {selectedKey === 'blog' && <BlogAdmin />}
                        {selectedKey === 'contact' && <ContactManager />}
                        {selectedKey === 'dashboard' && <Dashbroad />}
                        {selectedKey === 'recommendation' && <RecommendationDashboard />}
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
}

export default Admin;
