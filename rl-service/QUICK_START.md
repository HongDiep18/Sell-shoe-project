# ⚡ QUICK START - RL SERVICE

## 🚀 Khởi Động Nhanh (5 phút)

### 1. Cài Đặt

```bash
cd rl-service
npm install
```

### 2. Cấu Hình

File `.env` đã có sẵn với config mặc định. Chỉ cần đảm bảo MongoDB đang chạy:

```bash
# Check MongoDB
mongod --version

# Start MongoDB nếu chưa chạy
mongod
```

### 3. Train Model (Lần Đầu)

```bash
npm run train
```

**Chờ ~10 phút** để model train xong. Bạn sẽ thấy:

```
✅ Training completed!
📈 Final Training Statistics:
  Average Reward: 2.3429
  Final Policy Loss: 0.0987
```

### 4. Start API Server

```bash
npm start
```

Server sẽ chạy tại `http://localhost:5000`

### 5. Test API

```bash
# Terminal mới
npm test
```

Hoặc test thủ công:

```bash
curl http://localhost:5000/health
```

---

## 🎯 Sử Dụng Từ Backend Chính

### Cài Axios (nếu chưa có)

```bash
cd ../server
npm install axios
```

### Tạo RL Client Service

Tạo file `server/src/services/rlClient.service.js`:

```javascript
const axios = require('axios');

const RL_SERVICE_URL = process.env.RL_SERVICE_URL || 'http://localhost:5000';

class RLClientService {
    static async rankProducts(userState, candidates) {
        try {
            const response = await axios.post(`${RL_SERVICE_URL}/rank-products`, {
                state: userState,
                candidates: candidates.map((p) => ({
                    productId: p._id.toString(),
                    price: p.price,
                    category: p.category?.name,
                })),
            });

            return response.data.recommended;
        } catch (error) {
            console.error('RL Service error:', error.message);
            // Fallback: return candidates as-is
            return candidates.map((p, idx) => ({
                productId: p._id.toString(),
                score: 1 - idx * 0.1,
                rank: idx + 1,
            }));
        }
    }

    static async getUserState(userId) {
        try {
            const response = await axios.post(`${RL_SERVICE_URL}/get-user-state`, {
                userId: userId.toString(),
            });

            return response.data.state;
        } catch (error) {
            console.error('RL Service error:', error.message);
            // Return default state
            return new Array(20).fill(0);
        }
    }
}

module.exports = RLClientService;
```

### Sử Dụng Trong Controller

```javascript
const RLClientService = require('../services/rlClient.service');

async function getPersonalizedRecommendations(req, res) {
    try {
        const userId = req.user._id;

        // 1. Get candidate products
        const candidates = await Product.find({ status: 'active' }).limit(100).populate('category');

        // 2. Get user state from RL service
        const userState = await RLClientService.getUserState(userId);

        // 3. Rank products using RL service
        const ranked = await RLClientService.rankProducts(userState, candidates);

        // 4. Map back to full products
        const recommendations = ranked
            .map((r) => {
                const product = candidates.find((p) => p._id.toString() === r.productId);
                return {
                    product,
                    score: r.score,
                    rank: r.rank,
                };
            })
            .slice(0, 10);

        res.json({
            message: 'Recommendations retrieved',
            metadata: { recommendations },
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
```

---

## 📊 Workflow Hoàn Chỉnh

```
1. User vào trang chủ
   ↓
2. Backend gọi RL Service: GET user state
   ↓
3. Backend lấy candidate products từ DB
   ↓
4. Backend gọi RL Service: POST /rank-products
   ↓
5. RL Service trả về ranked products
   ↓
6. Backend trả về top 10 cho frontend
   ↓
7. User click/purchase → Track feedback
   ↓
8. Feedback lưu vào MongoDB
   ↓
9. Retrain model (weekly) → Cải thiện
```

---

## 🔄 Retrain Model

Khi có thêm dữ liệu mới (sau 1 tuần):

```bash
# Stop API server (Ctrl+C)

# Retrain
npm run train

# Restart API
npm start

# Hoặc reload model không cần restart
curl -X POST http://localhost:5000/reload-model
```

---

## 📈 Monitor Performance

### Check Training Stats

```bash
cat logs/final_stats.json
```

### Check Model Info

```bash
curl http://localhost:5000/model-info
```

### Monitor API Logs

Server tự động log mọi request:

```
POST /rank-products 200 45.123 ms - 256
POST /get-user-state 200 12.456 ms - 189
```

---

## 🐛 Troubleshooting

### Service không start

```bash
# Check port
lsof -i :5000

# Kill process nếu cần
kill -9 <PID>
```

### Model không load

```bash
# Check model files
ls -la models/policy/
ls -la models/value/

# Train lại nếu cần
npm run train
```

### MongoDB error

```bash
# Check MongoDB
mongosh
use shoe2
db.userinteractions.countDocuments()

# Nếu = 0, generate sample data
cd ../server
curl -X POST "http://localhost:3000/api/test/generate-sample-data?numUsers=50"
```

---

## ✅ Checklist

-   [ ] MongoDB đang chạy
-   [ ] Dependencies đã install (`npm install`)
-   [ ] Model đã train (`npm run train`)
-   [ ] API server đang chạy (`npm start`)
-   [ ] Health check OK (`curl http://localhost:5000/health`)
-   [ ] Backend đã tích hợp RLClientService
-   [ ] Test API thành công (`npm test`)

---

## 🎉 Done!

RL Service đã sẵn sàng! Bây giờ bạn có:

✅ **PPO Model** được train từ dữ liệu thực  
✅ **API Server** chạy độc lập  
✅ **Inference nhanh** (<50ms)  
✅ **Tích hợp dễ dàng** với backend  
✅ **Auto fallback** nếu service down

**Next Steps:**

1. Monitor metrics
2. Retrain weekly
3. A/B test với baseline
4. Optimize hyperparameters

**Happy Recommending! 🚀**
