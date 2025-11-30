const FlashSaleService = require('../services/flashSale.service');
const { Created, OK } = require('../core/success.response');

class FlashSaleController {
    async createFlashSale(req, res) {
        const data = req.body;
        const flashSale = await FlashSaleService.createFlashSale(data);
        new Created({
            message: 'Tạo flash sale thành công',
            metadata: flashSale,
        }).send(res);
    }

    async getAllFlashSale(req, res) {
        const flashSales = await FlashSaleService.getAllFlashSale();
        new OK({
            message: 'Lấy danh sách flash sale thành công',
            metadata: flashSales,
        }).send(res);
    }

    async getFlashSaleByDate(req, res) {
        const flashSales = await FlashSaleService.getFlashSaleByDate();
        new OK({
            message: 'Lấy danh sách flash sale thành công',
            metadata: flashSales,
        }).send(res);
    }
}

module.exports = new FlashSaleController();
