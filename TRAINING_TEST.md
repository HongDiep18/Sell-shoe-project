# Training Endpoint Test

## Problem Solved ✅

The 500 error "Cannot read properties of undefined (reading 'train')" was caused by calling non-existent `this.ppoAgent.train()` method.

## Solution Implemented

Changed `trainModel()` to spawn a **detached background process** that runs `npm run train:personalized` independently.

### Key Features:

1. **Non-blocking**: Returns immediately, doesn't timeout
2. **Background execution**: Uses `detached: true` and `unref()`
3. **Graceful fallback**: Tries RL Service endpoint first, then spawns subprocess
4. **Better error handling**: Specific messages for different error types

## Testing

### Direct Test (Backend Only)

```bash
cd server
node -e "
const RecommendationService = require('./src/services/recommendation.service');
(async () => {
  try {
    const result = await RecommendationService.trainModel({
      limit: 100,
      minInteractions: 5
    });
    console.log('✅ Result:', JSON.stringify(result, null, 2));
  } catch(e) {
    console.error('❌ Error:', e.message);
  }
  process.exit(0);
})();
"
```

**Expected Output:**

```json
{
    "success": true,
    "message": "Model training initiated as background process. Check backend logs for progress.",
    "note": "Training runs independently. This endpoint returns immediately.",
    "instructions": "Monitor training by checking server logs. Training typically takes 1-5 minutes depending on data volume.",
    "timestamp": "2025-11-30T11:49:18.623Z"
}
```

### UI Test

1. Go to Admin Dashboard > Recommendation tab
2. Click "Train Model" button
3. Confirm in dialog
4. Should see success message mentioning background process
5. Check backend console logs for `[TRAIN]` prefix to monitor training

### Expected Server Logs

```
🚀 Starting PPO training...
📊 Params: limit=100, minInteractions=5
⚠️  RL Service endpoint not available, spawning background training...
📍 RL Service path: ...
✅ Training initiated as background process (PID: XXX)
[TRAIN STARTUP] ...messages from trainPersonalized.js...
```

## Common Issues & Solutions

### Issue: Still getting 500 error

**Solution**:

1. Make sure you restarted backend after code changes
2. Check that spawn works: `cd rl-service && npm run train:personalized` manually
3. Verify npm is in PATH: `npm --version`

### Issue: Training doesn't seem to run

**Solution**:

1. Check backend logs for `[TRAIN]` prefix messages
2. Training needs data: minimum 50 interactions per user
3. Create test data if needed (see database section)

### Issue: "No active users found"

**Solution**: This is expected if no user has enough interactions

1. The training script checks for users with 50+ trajectories
2. Add test data via Postman or manually insert in MongoDB
3. Or run training when you have real user data

## Files Modified

1. `server/src/services/recommendation.service.js` - trainModel method now uses detached spawn
2. `server/src/controller/recommendation.controller.js` - Accepts params from body
3. `client/src/pages/admin/components/RecommendationDashboard.jsx` - Updated error/success messages

## API Endpoint

-   **URL**: `POST /api/recommendation/admin/train`
-   **Body**: `{ limit: 1000, minInteractions: 5 }`
-   **Response Time**: <1 second (returns immediately)
-   **Response Format**:
    ```json
    {
        "success": true,
        "message": "Model training initiated as background process...",
        "note": "Training runs independently...",
        "instructions": "Monitor training by checking server logs...",
        "timestamp": "2025-11-30T..."
    }
    ```

## Monitoring Training Progress

1. Check backend console for logs with `[TRAIN]` prefix
2. Training typically shows:
    - Finding active users
    - Training per user iterations
    - Model save confirmation
    - Completion message

## Next Steps

1. Add actual training data (user interactions)
2. Configure database properly
3. Test end-to-end with real users
4. Consider adding training status endpoint for UI progress tracking
