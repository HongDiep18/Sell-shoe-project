import React from 'react';
import { Menu } from 'antd';
import {
    PieChartOutlined,
    AppstoreOutlined,
    ShoppingOutlined,
    DollarOutlined,
    ThunderboltFilled,
    RobotOutlined,
} from '@ant-design/icons';
import { FileText, MessageCircle, Phone, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function SidebarAdmin({ selectedKey, onSelect }) {
    const navigate = useNavigate();

    const menuItems = [
        {
            key: 'dashboard',
            icon: <PieChartOutlined />,
            label: <span className="font-medium">Thống kê</span>,
        },
        {
            key: 'category',
            icon: <AppstoreOutlined />,
            label: <span className="font-medium">Quản lý danh mục</span>,
        },
        {
            key: 'product',
            icon: <ShoppingOutlined />,
            label: <span className="font-medium">Quản lý sản phẩm</span>,
        },
        {
            key: 'coupon',
            icon: <DollarOutlined />,
            label: <span className="font-medium">Quản lý mã giảm giá</span>,
        },
        {
            key: 'order',
            icon: <ShoppingOutlined />,
            label: <span className="font-medium">Quản lý đơn hàng</span>,
        },
        {
            key: 'warranty',
            icon: <Shield size={16} />,
            label: <span className="font-medium">Quản lý bảo hành</span>,
        },
        {
            key: 'message',
            icon: <MessageCircle size={16} />,
            label: <span className="font-medium">Quản lý tin nhắn</span>,
        },
        {
            key: 'flashSale',
            icon: <ThunderboltFilled size={16} />,
            label: <span className="font-medium">Quản lý khuyến mãi</span>,
        },
        {
            key: 'blog',
            icon: <FileText size={16} />,
            label: <span className="font-medium">Quản lý blog</span>,
        },
        {
            key: 'contact',
            icon: <Phone size={16} />,
            label: <span className="font-medium">Quản lý liên hệ</span>,
        },
        {
            key: 'recommendation',
            icon: <RobotOutlined />,
            label: <span className="font-medium">AI Gợi Ý Sản Phẩm</span>,
        },
    ];

    // Map key to URL path
    const keyToPathMap = {
        dashboard: '/admin',
        category: '/admin/category',
        product: '/admin/product',
        coupon: '/admin/coupon',
        order: '/admin/order',
        warranty: '/admin/warranty',
        message: '/admin/message',
        flashSale: '/admin/flashsale',
        blog: '/admin/blog',
        contact: '/admin/contacts',
        recommendation: '/admin/recommendation',
    };

    const handleMenuClick = ({ key }) => {
        const path = keyToPathMap[key];
        if (path) {
            navigate(path);
        }
        if (onSelect) {
            onSelect(key);
        }
    };

    return (
        <div className="flex flex-col">
            <Menu
                mode="inline"
                selectedKeys={[selectedKey]}
                onClick={handleMenuClick}
                items={menuItems}
                className="border-r-0 text-white"
                style={{
                    background: 'transparent',
                }}
                theme="dark"
            />
        </div>
    );
}

export default SidebarAdmin;
