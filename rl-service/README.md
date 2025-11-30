# 🤖 RL Service - PPO Product Recommendation

Microservice độc lập sử dụng **Proximal Policy Optimization (PPO)** để huấn luyện và inference gợi ý sản phẩm cá nhân hóa.

---

## 📋 Tổng Quan

Service này implement thuật toán **PPO (Proximal Policy Optimization)** - một trong những thuật toán Reinforcement Learning hiệu quả nhất cho recommendation systems.

### Kiến Trúc

```
┌─────────────────────────────────────────────┐
│           RL Service (Port 5000)            │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────┐      ┌─────────────┐     │
│  │   Policy    │      │    Value    │     │
│  │   Network   │      │   Network   │     │
│  └─────────────┘      └─────────────┘     │
│         ↓                     ↓             │
│  ┌─────────────────────────────────┐       │
│  │     Inference Engine            │       │
│  │  (Product Ranking)              │       │
│  └─────────────────────────────────┘       │
│         ↓                                   │
│  ┌─────────────────────────────────┐       │
│  │     Express API Server          │       │
│  │  POST /rank-products            │       │
│  └─────────────────────────────────┘       │
│                                             │
└─────────────────────────────────────────────┘
         ↓                    ↑
    Recommendations      User Events
         ↓                    ↑
┌─────────────────────────────────────────────┐
│              MongoDB                        │
│  • userinteractions                         │
│  • useractivities                           │
│  • productreviews                           │
│  • payments                                 │
│  • rlrecommendations                        │
└─────────────────────────────────────────────┘
```

---

## 🚀 Cài Đặt

### 1. Install Dependencies

```bash
cd rl-service
npm install
```

### 2. Cấu Hình Environment

Tạo file `.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/shoe2

STATE_DIM=20
ACTION_DIM=100
HIDDEN_DIM=128

LEARNING_RATE=0.0003
GAMMA=0.99
LAMBDA=0.95
EPSILON=0.2
EPOCHS=10
BATCH_SIZE=64
```

### 3. Kiểm Tra MongoDB

Đảm bảo MongoDB đang chạy và có dữ liệu:

```bash
mongod

# Kiểm tra collections
mongosh
use shoe2
db.userinteractions.countDocuments()
db.rlrecommendations.countDocuments()
```

---

## 🎓 Training Model

### Bước 1: Chuẩn Bị Dữ Liệu

Service sẽ tự động load dữ liệu từ MongoDB:

-   `userinteractions` - View, click, add_to_cart, purchase events
-   `useractivities` - Daily user activities
-   `productreviews` - Product ratings
-   `payments` - Purchase history
-   `rlrecommendations` - Past recommendations với feedback

### Bước 2: Chạy Training

```bash
npm run train
```

**Output:**

```
🚀 Initializing PPO Trainer...
✅ Connected to MongoDB
📦 Building new model...
✅ Policy Network built
✅ Value Network built
✅ Trainer initialized

🎯 Starting PPO Training...
Iterations: 10
Epochs per iteration: 10
Batch size: 64
────────────────────────────────────────────────────────────

📊 Iteration 1/10
📊 Loading trajectories from MongoDB...
Found 500 recommendations with feedback
✅ Loaded 450 trajectories
  Trajectories: 450
  Avg Reward: 2.3456
  Policy Loss: 0.1234
  Value Loss: 0.5678
  Entropy: 1.2345

...

✅ Training completed!
────────────────────────────────────────────────────────────
📈 Final Training Statistics:
  Total Episodes: 10
  Total Reward: 10543.21
  Average Reward: 2.3429
  Final Policy Loss: 0.0987
  Final Value Loss: 0.4321
  Final Entropy: 1.1234
```

### Bước 3: Kiểm Tra Model

Model được lưu tại:

-   `models/policy/` - Policy network
-   `models/value/` - Value network
-   `logs/` - Training logs

---

## 🎯 Chạy API Server

### Start Server

```bash
npm start
```

**Output:**

```
🚀 Initializing RL Service...
✅ Connected to MongoDB
✅ Policy network loaded
✅ Value network loaded
✅ RL Service initialized

============================================================
🤖 RL Service API Server
============================================================
🚀 Server running on port 5000
📡 Health check: http://localhost:5000/health
🎯 Rank products: POST http://localhost:5000/rank-products
👤 Get user state: POST http://localhost:5000/get-user-state
ℹ️  Model info: GET http://localhost:5000/model-info
============================================================
```

---

## 📡 API Endpoints

### 1. Health Check

```bash
GET /health
```

**Response:**

```json
{
    "status": "ok",
    "ready": true,
    "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. Rank Products (Main Endpoint)

```bash
POST /rank-products
Content-Type: application/json

{
  "state": [0.5, 0.3, 0.8, ...],  // 20-dim user state vector
  "candidates": [
    {
      "productId": "abc123",
      "price": 500000,
      "category": "sneakers"
    },
    {
      "productId": "def456",
      "price": 750000,
      "category": "boots"
    }
  ]
}
```

**Response:**

```json
{
    "recommended": [
        {
            "productId": "abc123",
            "score": 0.8765,
            "rank": 1
        },
        {
            "productId": "def456",
            "score": 0.7654,
            "rank": 2
        }
    ],
    "total": 2,
    "topK": 2
}
```

### 3. Get User State

```bash
POST /get-user-state
Content-Type: application/json

{
  "userId": "507f1f77bcf86cd799439011"
}
```

**Response:**

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "state": [0.5, 0.3, 0.8, ...],
  "stateDim": 20
}
```

### 4. Model Info

```bash
GET /model-info
```

**Response:**

```json
{
    "stateDim": 20,
    "actionDim": 100,
    "hiddenDim": 128,
    "learningRate": 0.0003,
    "gamma": 0.99,
    "epsilon": 0.2,
    "topK": 10,
    "ready": true
}
```

### 5. Reload Model

```bash
POST /reload-model
```

**Response:**

```json
{
    "message": "Model reloaded successfully",
    "timestamp": "2024-01-15T10:35:00.000Z"
}
```

### 6. Batch Ranking

```bash
POST /batch-rank-products
Content-Type: application/json

{
  "requests": [
    {
      "state": [0.5, 0.3, ...],
      "candidates": [...]
    },
    {
      "state": [0.7, 0.2, ...],
      "candidates": [...]
    }
  ]
}
```

---

## 🔗 Tích Hợp với Backend Chính

### Từ Backend Express

```javascript
const axios = require('axios');

const RL_SERVICE_URL = 'http://localhost:5000';

async function getRecommendations(userId, candidateProducts) {
    try {
        // 1. Get user state
        const stateResponse = await axios.post(`${RL_SERVICE_URL}/get-user-state`, {
            userId,
        });

        const userState = stateResponse.data.state;

        // 2. Rank products
        const rankResponse = await axios.post(`${RL_SERVICE_URL}/rank-products`, {
            state: userState,
            candidates: candidateProducts.map((p) => ({
                productId: p._id.toString(),
                price: p.price,
                category: p.category?.name,
            })),
        });

        const recommended = rankResponse.data.recommended;

        // 3. Map back to full product objects
        const rankedProducts = recommended.map((rec) => {
            const product = candidateProducts.find((p) => p._id.toString() === rec.productId);
            return {
                ...product,
                score: rec.score,
                rank: rec.rank,
            };
        });

        return rankedProducts;
    } catch (error) {
        console.error('Error calling RL service:', error);
        // Fallback to default ranking
        return candidateProducts.slice(0, 10);
    }
}

// Usage
const recommendations = await getRecommendations(userId, products);
```

---

## 🧠 PPO Algorithm Details

### State Vector (20 dimensions)

```javascript
[
    // Purchase Behavior (4)
    totalPurchases_norm, // 0-1
    avgOrderValue_norm, // 0-1
    daysSinceLastPurchase_norm, // 0-1
    purchaseFrequency_norm, // 0-1

    // Engagement (5)
    totalVisits_norm, // 0-1
    avgSessionTime_norm, // 0-1
    totalViews_norm, // 0-1
    clickThroughRate, // 0-1
    addToCartRate, // 0-1

    // Conversion (2)
    conversionRate, // 0-1
    totalAddToCarts_norm, // 0-1

    // Satisfaction (2)
    avgRating_norm, // 0-1 (rating/5)
    reviewCount_norm, // 0-1

    // Recency (1)
    daysSinceLastVisit_norm, // 0-1

    // Category Preferences (6)
    category1_pref, // 0-1
    category2_pref, // 0-1
    category3_pref, // 0-1
    category4_pref, // 0-1
    category5_pref, // 0-1
    category6_pref, // 0-1
];
```

### Reward Function

```javascript
reward =
    clicks * 1 + // +1 per click
    add_to_cart * 3 + // +3 per add to cart
    purchases * 5 + // +5 per purchase
    rank_bonus; // +1 if rank <= 3
```

### Policy Network Architecture

```
Input (20)
  ↓
Dense(128, ReLU)
  ↓
Dropout(0.2)
  ↓
Dense(128, ReLU)
  ↓
Dense(100, Linear) → Logits
  ↓
Softmax → Action Probabilities
```

### Value Network Architecture

```
Input (20)
  ↓
Dense(128, ReLU)
  ↓
Dropout(0.2)
  ↓
Dense(128, ReLU)
  ↓
Dense(1, Linear) → State Value
```

### PPO Update

```
1. Collect trajectories from MongoDB
2. Compute advantages using GAE (λ=0.95)
3. Normalize advantages
4. For each epoch:
   a. Compute ratio = π_new / π_old
   b. Clipped surrogate: min(ratio * A, clip(ratio, 1-ε, 1+ε) * A)
   c. Policy loss = -mean(clipped_surrogate) - entropy_bonus
   d. Value loss = MSE(V_pred, returns)
   e. Update networks
```

---

## 📊 Monitoring & Debugging

### Training Logs

```bash
# View training logs
cat logs/final_stats.json

# View checkpoint
cat logs/stats_iter_5.json
```

### TensorFlow.js Memory

```javascript
// Check memory usage
console.log(tf.memory());

// Output:
// {
//   numTensors: 42,
//   numDataBuffers: 42,
//   numBytes: 1234567,
//   unreliable: false
// }
```

### API Logs

Server logs mọi request với Morgan:

```
POST /rank-products 200 45.123 ms - 256
GET /health 200 2.456 ms - 89
```

---

## 🐛 Troubleshooting

### 1. Model không load được

```bash
# Check model files
ls -la models/policy/
ls -la models/value/

# Nếu không có, train lại
npm run train
```

### 2. MongoDB connection error

```bash
# Check MongoDB
mongod --version
mongosh

# Check connection string
echo $MONGODB_URI
```

### 3. Not enough trajectories

```bash
# Generate sample data từ backend chính
curl -X POST "http://localhost:3000/api/test/generate-sample-data?numUsers=50"

# Hoặc đợi user interactions thực
```

### 4. Memory leak

```javascript
// Dispose tensors after use
tf.tidy(() => {
    // Your tensor operations
});

// Check memory
console.log(tf.memory());
```

---

## 🔧 Configuration

### Hyperparameters

| Parameter       | Default | Description                   |
| --------------- | ------- | ----------------------------- |
| `LEARNING_RATE` | 0.0003  | Adam optimizer learning rate  |
| `GAMMA`         | 0.99    | Discount factor               |
| `LAMBDA`        | 0.95    | GAE lambda                    |
| `EPSILON`       | 0.2     | PPO clipping parameter        |
| `EPOCHS`        | 10      | Training epochs per iteration |
| `BATCH_SIZE`    | 64      | Mini-batch size               |

### Model Architecture

| Parameter    | Default | Description            |
| ------------ | ------- | ---------------------- |
| `STATE_DIM`  | 20      | User state dimension   |
| `ACTION_DIM` | 100     | Max candidate products |
| `HIDDEN_DIM` | 128     | Hidden layer size      |

---

## 📈 Performance

### Training Time

-   **500 trajectories**: ~30 seconds
-   **1000 trajectories**: ~60 seconds
-   **10 iterations**: ~10 minutes

### Inference Time

-   **Single ranking**: ~10-20ms
-   **Batch ranking (10 users)**: ~100-150ms

### Memory Usage

-   **Model size**: ~2MB
-   **Runtime memory**: ~100-200MB

---

## 🎯 Best Practices

### 1. Training

-   Train với ít nhất 500 trajectories
-   Retrain model mỗi tuần
-   Monitor avg reward (target > 2.0)
-   Save checkpoints thường xuyên

### 2. Inference

-   Cache user states (5 minutes)
-   Batch requests khi có thể
-   Fallback to trending nếu service down
-   Monitor response time (<50ms)

### 3. Production

-   Run service trên dedicated server
-   Use PM2 hoặc Docker
-   Setup health check monitoring
-   Log all requests
-   Implement rate limiting

---

## 🚀 Deployment

### Using PM2

```bash
npm install -g pm2

# Start service
pm2 start src/api.js --name rl-service

# Monitor
pm2 monit

# Logs
pm2 logs rl-service

# Restart
pm2 restart rl-service
```

### Using Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

```bash
docker build -t rl-service .
docker run -p 5000:5000 --env-file .env rl-service
```

---

## 📚 References

-   [PPO Paper](https://arxiv.org/abs/1707.06347)
-   [TensorFlow.js](https://www.tensorflow.org/js)
-   [Reinforcement Learning Book](http://incompleteideas.net/book/the-book.html)

---

## 📞 Support

Nếu gặp vấn đề:

1. Check logs: `logs/final_stats.json`
2. Check model: `models/policy/model.json`
3. Check MongoDB: `mongosh`
4. Check API: `curl http://localhost:5000/health`

---

**🎉 RL Service sẵn sàng! Happy Training! 🚀**
