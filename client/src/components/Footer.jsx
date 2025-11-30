import { Twitter, Facebook, Instagram } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="bg-black text-gray-300 py-12">
            <div className="w-[80%] mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
                {/* Cột 1 */}
                <div>
                    <h3 className="text-white font-semibold mb-4 text-lg">SneakerHub Chính Hãng</h3>
                    <p className="text-sm mb-6">
                        Chúng tôi cung cấp các mẫu giày thể thao, thời trang mới nhất, cam kết 100% chính hãng, đa dạng
                        về mẫu mã và giá tốt nhất thị trường.
                    </p>
                    <div className="flex space-x-3">
                        <a href="#" className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700">
                            <Twitter size={18} />
                        </a>
                        <a href="#" className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700">
                            <Facebook size={18} />
                        </a>
                        <a href="#" className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700">
                            <Instagram size={18} />
                        </a>
                    </div>
                </div>

                {/* Cột 2 */}
                <div>
                    <h3 className="text-white font-semibold mb-4 text-lg">Hỗ Trợ Khách Hàng</h3>
                    <ul className="space-y-3 text-sm">
                        <li>📍 78 Xô Viết Nghệ Tĩnh, Bình Thạnh, TP.HCM</li>
                        <li>📞 +84 242 980 152</li>
                        <li>✉️ support@sneakerhub.com</li>
                        <li>🕒 Làm việc: 08:00 - 22:00 (T2 - CN)</li>
                    </ul>
                </div>

                {/* Cột 3 */}
                <div>
                    <h3 className="text-white font-semibold mb-4 text-lg">Danh Mục Nổi Bật</h3>
                    <ul className="space-y-2 text-sm">
                        <li>• Giày Nam / Giày Nữ</li>
                        <li>• Bộ Sưu Tập Mới</li>
                        <li>• Giày Sale / Giày Hot</li>
                        <li>• Thương Hiệu</li>
                    </ul>
                </div>

                {/* Cột 4 */}
                <div>
                    <h3 className="text-white font-semibold mb-4 text-lg">Chính Sách & Dịch Vụ</h3>
                    <ul className="space-y-2 text-sm">
                        <li>• Chính sách Đổi/Trả hàngs</li>
                        <li>• Chính sách Bảo hành</li>
                        <li>• Hướng dẫn chọn size giày</li>
                        <li>• Câu hỏi thường gặp (FAQ)</li>
                    </ul>
                </div>
            </div>
        </footer>
    );
}
