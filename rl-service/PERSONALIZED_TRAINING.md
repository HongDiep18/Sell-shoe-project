# 🎯 Personalized Training Guide

Hướng dẫn train model PPO riêng cho từng user thay vì model global cho tất cả user.

---

## 📖 Tổng Quan

### Trước đây: Global Model

-   **1 model** cho tất cả users
-   Không cá nhân hóa
-   Training từ dữ liệu của **TẤT CẢ** users

### Bây giờ: Personalized Models

-   **1 model riêng** cho MỖI user
-   Hoàn toàn cá nhân hóa
-   Training chỉ từ dữ liệu của **TỪNG user cụ thể**

---

## 🚀 Cách Sử dụng

### 1. Train cho TẤT CẢ active users

Train model riêng cho tất cả users có đủ dữ liệu (≥50 trajectories):

```bash
npm run train:personalized
```

**Output:**

```
======================================================================
🎯 PERSONALIZED PPO TRAINING
Train separate models for each active user
======================================================================

🔍 Finding active users with at least 50 trajectories...
✅ Found 15 active users

📊 Found 15 active users to train
──────────────────────────────────────────────────────────────────────

======================================================================
👤 Training model for user 1/15
User ID: 507f1f77bcf86cd799439011
======================================================================
🚀 Initializing PPO Trainer for user 507f1f77bcf86cd799439011...
✅ Connected to MongoDB
📦 Building new model...
✅ Trainer initialized

🎯 Starting PPO Training for user 507f1f77bcf86cd799439011...
Iterations: 10
Epochs per iteration: 10
Batch size: 64
────────────────────────────────────────────────────────────

📊 Iteration 1/10
📊 Loading trajectories for user 507f1f77bcf86cd799439011...
Found 150 recommendations for user 507f1f77bcf86cd799439011
✅ Loaded 140 trajectories
  Trajectories: 140
  Avg Reward: 2.5123
  Policy Loss: 0.0956
  Value Loss: 0.4231
  Entropy: 1.3456

...

✅ Training completed for user 507f1f77bcf86cd799439011

======================================================================
👤 Training model for user 2/15
...
```

### 2. Train cho MỘT user cụ thể

```bash
npm run train:user 507f1f77bcf86cd799439011
```

Hoặc:

```bash
node src/trainPersonalized.js 507f1f77bcf86cd799439011
```

### 3. Train global model (fallback)

Vẫn có thể train model global như cũ:

```bash
npm run train
```

---

## 📂 Cấu Trúc Lưu Model

### Global Model (trước đây)

```
models/
├── policy/
│   ├── model.json
│   ├── weights.bin
│   └── metadata.json
└── value/
    ├── model.json
    └── weights.bin
```

### Personalized Models (bây giờ)

```
models/
├── policy/
│   ├── model.json          # Global model (fallback)
│   ├── weights.bin
│   ├── 507f1f77bcf86cd799439011/  # User 1's model
│   │   ├── model.json
│   │   ├── weights.bin
│   │   └── metadata.json
│   ├── 507f1f77bcf86cd799439012/  # User 2's model
│   │   ├── model.json
│   │   └── weights.bin
│   └── ...
└── value/
    ├── model.json          # Global model (fallback)
    ├── weights.bin
    ├── 507f1f77bcf86cd799439011/
    │   └── ...
    └── ...
```

---

## 🎯 API Sử Dụng

### 1. Rank Products với Personalized Model

**Trước đây:**

```bash
POST /rank-products
{
  "state": [0.5, 0.3, ...],
  "candidates": [...]
}
```

**Bây giờ (thêm userId):**

```bash
POST /rank-products
{
  "userId": "507f1f77bcf86cd799439011",  # ← Thêm userId
  "state": [0.5, 0.3, ...],
  "candidates": [...]
}
```

**Response:**

```json
{
  "recommended": [...],
  "total": 10,
  "topK": 10,
  "modelType": "personalized"  // hoặc "global" nếu không có personalized model
}
```

### 2. Reload Model

Reload model của user cụ thể:

```bash
POST /reload-model
{
  "userId": "507f1f77bcf86cd799439011"
}
```

Reload global model:

```bash
POST /reload-model
{}
```

---

## 🔄 Flow Hoạt Động

### 1. Training Flow

```
1. DataLoader.getActiveUsers()
   └── Tìm users có ≥50 trajectories

2. Với mỗi userId:
   └── PPOTrainer(userId)
       ├── PPOModel(userId)  # Tạo model cho user
       ├── Load trajectories chỉ cho user này
       ├── Train model
       └── Save model vào models/policy/{userId}/
```

### 2. Inference Flow

```
1. Request đến với userId

2. API.getInferenceEngine(userId)
   ├── Check cache: có model cho userId?
   │   ├── Yes: Return cached model
   │   └── No: Try load from disk
   │       ├── Success: Cache và return
   │       └── Fail: Fallback to global model

3. Inference với model phù hợp
   └── Return result + modelType
```

---

## ⚙️ Configuration

### Minimum Trajectories

Thay đổi số trajectory tối thiểu trong `trainPersonalized.js`:

```javascript
const minTrajectories = 50; // Giảm xuống nếu ít data
```

### Training Iterations

Thay đổi số iterations trong `trainPersonalized.js`:

```javascript
await trainer.train(10); // Tăng lên cho model tốt hơn
```

---

## 📊 So Sánh Performance

### Global Model

-   ✅ Đơn giản, chỉ 1 model
-   ✅ Ít memory, ít storage
-   ❌ Không cá nhân hóa
-   ❌ Avg performance cho tất cả users

### Personalized Models

-   ✅ Hoàn toàn cá nhân hóa
-   ✅ Better performance cho từng user
-   ✅ Automatic fallback to global
-   ❌ Nhiều storage hơn (1 model per user)
-   ❌ Training lâu hơn

---

## 🎯 Best Practices

### 1. Training Strategy

**Option A: Train All Users (Recommended)**

```bash
# Train tất cả users có đủ data
npm run train:personalized
```

**Option B: Train Specific Users**

```bash
# Train chỉ VIP users hoặc active users
for userId in $VIP_USERS; do
  npm run train:user $userId
done
```

### 2. Memory Management

API tự động cache personalized models. Nếu lo ngại memory:

```javascript
// Trong production, có thể thêm endpoint để clear cache
POST /clear-cache
{
  "userId": "507f1f77bcf86cd799439011"  // Clear specific user
}

POST /clear-cache
{}  // Clear all user models
```

### 3. Fallback Strategy

Hệ thống tự động fallback:

1. Có personalized model → Dùng personalized
2. Không có → Dùng global model
3. Không có cả 2 → Build default model

### 4. Re-training Schedule

**Recommended:**

-   **Daily**: Train personalized models cho active users
-   **Weekly**: Train global model
-   **On-demand**: Train khi user có nhiều interaction mới

---

## 🐛 Troubleshooting

### 1. Không tìm thấy active users

```bash
⚠️  No active users found with sufficient data.
Minimum required: 50 trajectories per user
```

**Fix:** Giảm `minTrajectories` hoặc generate thêm data:

```bash
# Từ backend chính
curl -X POST "http://localhost:3000/api/test/generate-sample-data?numUsers=20"
```

### 2. User model không load được

```bash
⚠️  No personalized model for user 507f..., using global model
```

**Reasons:**

-   User chưa được train
-   Model file bị corrupt
-   Path không đúng

**Fix:**

```bash
# Train lại cho user đó
npm run train:user 507f1f77bcf86cd799439011
```

### 3. Out of memory khi train nhiều users

**Fix 1:** Train từng batch:

```javascript
// Trong trainPersonalized.js
for (let i = 0; i < activeUsers.length; i++) {
    // ... train ...

    // Cleanup sau mỗi user
    if (global.gc) global.gc();
}
```

**Fix 2:** Train tuần tự thay vì parallel

---

## 📈 Monitoring

### Check số users đã train

```bash
ls -l models/policy/ | grep "^d" | wc -l
```

### Check model của user cụ thể

```bash
ls -la models/policy/507f1f77bcf86cd799439011/
```

### Xem metadata

```bash
cat models/policy/507f1f77bcf86cd799439011/metadata.json
```

**Output:**

```json
{
    "userId": "507f1f77bcf86cd799439011",
    "stateDim": 20,
    "actionDim": 100,
    "hiddenDim": 128,
    "learningRate": 0.0003,
    "savedAt": "2024-01-15T10:30:00.000Z"
}
```

---

## 🔄 Migration từ Global sang Personalized

### Bước 1: Backup global model

```bash
cp -r models/policy models/policy_backup
cp -r models/value models/value_backup
```

### Bước 2: Train personalized models

```bash
npm run train:personalized
```

### Bước 3: Update backend để gửi userId

Từ backend Express:

```javascript
// TRƯỚC
const rankResponse = await axios.post(`${RL_SERVICE_URL}/rank-products`, {
    state: userState,
    candidates: candidateProducts,
});

// SAU (thêm userId)
const rankResponse = await axios.post(`${RL_SERVICE_URL}/rank-products`, {
    userId: userId, // ← Thêm dòng này
    state: userState,
    candidates: candidateProducts,
});
```

### Bước 4: Test

```bash
# Test với user có personalized model
curl -X POST http://localhost:5000/rank-products \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "state": [0.5, 0.3, ...],
    "candidates": [...]
  }'

# Check response
# "modelType": "personalized" ✅
```

---

## 💡 Tips & Tricks

### 1. Train trong background

```bash
# Screen hoặc tmux
screen -S rl-training
npm run train:personalized
# Ctrl+A+D để detach

# PM2
pm2 start "npm run train:personalized" --name rl-training
pm2 logs rl-training
```

### 2. Automatic re-training script

```bash
#!/bin/bash
# retrain.sh

# Train personalized models
npm run train:personalized

# Reload models in API
curl -X POST http://localhost:5000/reload-model

echo "✅ Re-training completed!"
```

```bash
# Cron job - chạy mỗi ngày 2AM
0 2 * * * cd /path/to/rl-service && ./retrain.sh >> logs/retrain.log 2>&1
```

### 3. Selective training

Chỉ train users có interaction mới trong 7 ngày qua - modify `trainPersonalized.js`:

```javascript
// Get recent active users
const recentUsers = await this.models.RLRecommendation.distinct('userId', {
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
});

// Filter by minimum trajectories
const activeUsers = await dataLoader.getActiveUsers(50);
const usersToTrain = recentUsers.filter((u) => activeUsers.includes(u));
```

---

## 🎉 Kết Luận

Bây giờ bạn đã có:

✅ **Personalized PPO models** - 1 model riêng cho từng user  
✅ **Automatic training** - Train tất cả active users tự động  
✅ **Smart fallback** - Tự động dùng global model khi cần  
✅ **Easy API** - Chỉ cần thêm `userId` vào request  
✅ **Production-ready** - Cache, memory management, monitoring

**Happy Training! 🚀**
