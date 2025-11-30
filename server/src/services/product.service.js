const modelProduct = require('../models/product.model');
const modelCategory = require('../models/category.model');
const modelFlashSale = require('../models/flashSale.model');
const modelPreviewProduct = require('../models/previewProduct.model');

class ProductService {
    async uploadImage(image) {
        return image.filename;
    }

    async createProduct(
        name,
        category,
        price,
        discount,
        description,
        sizes,
        colors,
        images,
        stock,
        isFeatured,
        status,
        variants,
    ) {
        const product = await modelProduct.create({
            name,
            category,
            price,
            discount,
            description,
            sizes,
            colors,
            images,
            stock,
            isFeatured,
            status,
            variants,
        });
        return product;
    }

    async getAllProduct() {
        const product = await modelProduct.find().populate('category');
        return product;
    }

    async updateProduct(
        id,
        name,
        category,
        price,
        discount,
        description,
        sizes,
        colors,
        images,
        stock,
        isFeatured,
        status,
        variants,
    ) {
        const product = await modelProduct
            .findByIdAndUpdate(
                id,
                {
                    name,
                    category,
                    price,
                    discount,
                    description,
                    sizes,
                    colors,
                    images,
                    stock,
                    isFeatured,
                    status,
                    variants,
                },
                { new: true },
            )
            .populate('category');
        return product;
    }

    async deleteProduct(id) {
        const product = await modelProduct.findByIdAndDelete(id);
        return product;
    }

    async getProductByCategory(category) {
        const product = await modelProduct.find({ category });
        return product;
    }

    async getProductById(id) {
        const product = await modelProduct.findById(id);
        const findFlashSale = await modelFlashSale.findOne({ productId: id });
        if (findFlashSale) {
            product.discount = findFlashSale.discount;
        }

        const findProductRelated = (await modelProduct.find({ category: product.category })).filter(
            (item) => item._id.toString() !== id.toString(),
        );

        if (findProductRelated) {
            product.productRelated = findProductRelated;
        }
        const findPreviewProduct = await modelPreviewProduct.find({ productId: id }).populate('userId');

        if (findPreviewProduct) {
            product.previewProduct = findPreviewProduct;
        }
        return product;
    }
    async searchProduct(query, userId = null) {
        // 1. Tìm sản phẩm theo từ khóa search
        const searchResults = await modelProduct
            .find({
                name: { $regex: query, $options: 'i' },
                status: 'active',
            })
            .populate('category', 'name');

        // 2. Lấy sản phẩm trending (cá nhân hóa theo user nếu có)
        const RecommendationService = require('./recommendation.service');
        let trendingProducts = [];
        try {
            const trendingData = await RecommendationService.getTrendingProducts({
                userId, // Truyền userId để personalized
                limit: 5, // Lấy 5 sản phẩm trending
                days: 7,
            });
            trendingProducts = trendingData.map((item) => item.product);
        } catch (err) {
            console.log('Error fetching trending:', err);
        }

        // 3. Gộp chung: Trending lên đầu, sau đó là kết quả search
        const trendingIds = new Set(trendingProducts.map((p) => p._id.toString()));

        // Lọc bỏ sản phẩm trending khỏi search results để tránh trùng
        const uniqueSearchResults = searchResults.filter((p) => !trendingIds.has(p._id.toString()));

        // Kết hợp: Trending trước, search sau
        const combinedResults = [
            ...trendingProducts.map((p) => ({ ...p.toObject(), isTrending: true })),
            ...uniqueSearchResults.map((p) => ({ ...p.toObject(), isTrending: false })),
        ];

        // 4. Gắn flash sale nếu có
        for (let product of combinedResults) {
            const findFlashSale = await modelFlashSale.findOne({ productId: product._id });
            if (findFlashSale) {
                product.discount = findFlashSale.discount;
            }
        }

        return combinedResults;
    }

    async filterProduct(
        category,
        priceMin,
        priceMax,
        size,
        color,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 12,
    ) {
        try {
            // Build filter query
            let filterQuery = { status: 'active' };

            // Category filter
            if (category && category !== 'all') {
                filterQuery.category = category;
            }

            // Price filter
            if (priceMin || priceMax) {
                filterQuery.price = {};
                if (priceMin) filterQuery.price.$gte = Number(priceMin);
                if (priceMax) filterQuery.price.$lte = Number(priceMax);
            }

            // Size filter
            if (size && size !== 'all') {
                filterQuery['variants.size'] = size;
            }

            // Color filter
            if (color && color !== 'all') {
                filterQuery['colors.name'] = { $regex: color, $options: 'i' };
            }

            // Build sort query
            let sortQuery = {};
            switch (sortBy) {
                case 'price_asc':
                    sortQuery.price = 1;
                    break;
                case 'price_desc':
                    sortQuery.price = -1;
                    break;
                case 'name':
                    sortQuery.name = 1;
                    break;
                case 'newest':
                    sortQuery.createdAt = -1;
                    break;
                case 'oldest':
                    sortQuery.createdAt = 1;
                    break;
                default:
                    sortQuery.createdAt = -1;
            }

            // Calculate pagination
            const skip = (page - 1) * limit;

            // Execute query with pagination
            const products = await modelProduct
                .find(filterQuery)
                .populate('category', 'categoryName')
                .sort(sortQuery)
                .skip(skip)
                .limit(limit);

            // Get total count for pagination
            const totalProducts = await modelProduct.countDocuments(filterQuery);
            const totalPages = Math.ceil(totalProducts / limit);

            // Get filter options for UI
            const categories = await modelCategory.find();

            // Get unique sizes and colors for filters
            const allProducts = await modelProduct.find({ status: 'active' });
            const uniqueSizes = [...new Set(allProducts.flatMap((p) => p.variants?.map((v) => v.size) || []))].sort();

            // Get unique colors and normalize them (group similar names)
            const allColors = allProducts.flatMap((p) => p.colors?.map((c) => c.name) || []);
            const colorMap = new Map();
            const colorCountMap = new Map();

            // Group colors by normalized name (lowercase, trimmed)
            allColors.forEach((color) => {
                if (!color) return;
                const normalized = color.toLowerCase().trim();

                if (!colorMap.has(normalized)) {
                    // Store the first occurrence (original case) as the display name
                    colorMap.set(normalized, color);
                    colorCountMap.set(normalized, 0);
                }
                colorCountMap.set(normalized, colorCountMap.get(normalized) + 1);
            });

            // Get unique colors with counts, sorted alphabetically
            const uniqueColors = Array.from(colorMap.entries())
                .map(([normalized, displayName]) => ({
                    name: displayName,
                    normalized: normalized,
                    count: colorCountMap.get(normalized),
                }))
                .sort((a, b) => a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' }));

            const result = {
                products,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalProducts,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1,
                    limit,
                },
                filters: {
                    categories,
                    sizes: uniqueSizes,
                    colors: uniqueColors,
                    priceRanges: [
                        { label: 'Dưới 500K', min: 0, max: 500000 },
                        { label: '500K - 1M', min: 500000, max: 1000000 },
                        { label: '1M - 2M', min: 1000000, max: 2000000 },
                        { label: '2M - 5M', min: 2000000, max: 5000000 },
                        { label: 'Trên 5M', min: 5000000, max: null },
                    ],
                },
                appliedFilters: {
                    category,
                    priceMin,
                    priceMax,
                    size,
                    color,
                    sortBy,
                    sortOrder,
                },
            };

            return result;
        } catch (error) {
            throw new Error(`Error filtering products: ${error.message}`);
        }
    }
}

module.exports = new ProductService();
