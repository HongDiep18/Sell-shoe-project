import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Filter, ShoppingCart } from 'lucide-react';

const PageNav = ({
    variant = 'breadcrumb-title',
    breadcrumb = [],
    title = '',
    tabs = [],
    activeTab = 0,
    onTabChange = () => {},
    onFilter, // optional handler for filter icon
    showCartIcon = true,
}) => {
    const navigate = useNavigate();
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 640px)');
        const handle = (e) => setIsMobile(e.matches);
        handle(mq);
        mq.addEventListener('change', handle);
        return () => mq.removeEventListener('change', handle);
    }, []);

    // Render breadcrumb inline
    const Breadcrumb = () => (
        <nav className="flex items-center text-sm text-gray-600 space-x-2" aria-label="Breadcrumb">
            {breadcrumb.map((b, i) => (
                <span
                    key={i}
                    className={`flex items-center ${
                        i === breadcrumb.length - 1 ? 'text-gray-900 font-medium' : 'cursor-pointer hover:text-red-600'
                    }`}
                    onClick={() => b.to && navigate(b.to)}
                >
                    {b.label}
                    {i < breadcrumb.length - 1 && <span className="mx-2">/</span>}
                </span>
            ))}
        </nav>
    );

    // Mobile fixed title bar
    const MobileBar = () => (
        <div className="sm:hidden fixed top-16 left-0 right-0 z-40 bg-white border-b shadow-sm">
            <div className="flex items-center justify-between px-3 py-3">
                <div className="flex items-center space-x-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-md">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex flex-col">
                        <div className="text-xs text-gray-500">
                            {breadcrumb && breadcrumb.length > 0 ? (
                                <span className="flex items-center gap-1">
                                    {breadcrumb.map((b, i) => (
                                        <span
                                            key={i}
                                            onClick={() => b.to && navigate(b.to)}
                                            className={`${
                                                i === breadcrumb.length - 1
                                                    ? 'text-gray-800 font-medium'
                                                    : 'text-gray-500 underline'
                                            } text-xs`}
                                        >
                                            {b.label}
                                            {i < breadcrumb.length - 1 && <span className="mx-1">/</span>}
                                        </span>
                                    ))}
                                </span>
                            ) : (
                                <span className="text-xs text-gray-500">Trang chủ</span>
                            )}
                        </div>
                        <div className="text-sm font-medium truncate">{title}</div>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    {typeof onFilter === 'function' && (
                        <button onClick={onFilter} className="p-2 rounded-md">
                            <Filter size={18} />
                        </button>
                    )}
                    {showCartIcon && (
                        <button onClick={() => navigate('/cart')} className="p-2 rounded-md">
                            <ShoppingCart size={18} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="page-nav">
            {/* Mobile fixed bar */}
            {isMobile && <MobileBar />}
            {/* Spacer so fixed mobile bar doesn't overlap page content (height matches MobileBar) */}
            {isMobile && <div className="sm:hidden h-14" />}

            <div className="hidden sm:block sticky top-16 z-40 bg-white border-b shadow-sm">
                <div className="container mx-auto px-4 py-4">
                    {variant === 'breadcrumb-title' && (
                        <div className="space-y-2">
                            <Breadcrumb />
                            <h1 className="text-3xl font-extrabold text-gray-900">{title}</h1>
                        </div>
                    )}

                    {variant === 'breadcrumb-tabs' && (
                        <div className="space-y-3">
                            <Breadcrumb />
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-semibold text-gray-900 truncate">{title}</h2>
                            </div>

                            {tabs && tabs.length > 0 && (
                                <div className="mt-3">
                                    <div className="flex space-x-2 overflow-x-auto">
                                        {tabs.map((tab, idx) => (
                                            <button
                                                key={tab.label || idx}
                                                onClick={() => onTabChange(idx)}
                                                className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                                                    idx === activeTab
                                                        ? 'bg-red-600 text-white'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PageNav;
