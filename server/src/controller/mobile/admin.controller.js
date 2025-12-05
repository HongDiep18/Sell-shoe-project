const AdminService = require('../services/admin.service');
const { OK, CREATED } = require('../../core/success.response');
const { BadRequestError, NotFoundError } = require('../../core/error.response');

class AdminController {
    // Lấy dữ liệu dashboard
    async getDashboard(req, res, next) {
        try {
            const data = await AdminService.getDashboardData();
            new OK({
                message: 'Lấy dữ liệu dashboard thành công',
                metadata: data,
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    // Lấy danh sách đơn hàng
    async getOrders(req, res, next) {
        try {
            const { status } = req.query;
            const filter = status ? { status } : {};
            const orders = await AdminService.getOrders(filter);
            new OK({
                message: 'Lấy danh sách đơn hàng thành công',
                metadata: orders,
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    // Cập nhật trạng thái đơn hàng
    async updateOrderStatus(req, res, next) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!status) {
                throw new BadRequestError('Vui lòng cung cấp trạng thái');
            }

            const order = await AdminService.updateOrderStatus(id, status);
            if (!order) {
                throw new NotFoundError('Không tìm thấy đơn hàng');
            }

            new OK({
                message: 'Cập nhật trạng thái đơn hàng thành công',
                metadata: order,
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    // Lấy thống kê doanh thu
    async getRevenueStats(req, res, next) {
        try {
            const { days = 7 } = req.query;
            const stats = await AdminService.getRevenueStats(parseInt(days));
            new OK({
                message: 'Lấy thống kê doanh thu thành công',
                metadata: stats,
            }).send(res);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AdminController();
