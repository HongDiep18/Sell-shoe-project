# Training Model Fix Summary

## Problem

`POST http://localhost:3000/api/recommendation/admin/train` returned **HTTP 500** with error:

```
"Cannot read properties of undefined (reading 'train')"
```

## Root Cause

In `server/src/services/recommendation.service.js`, the `trainModel()` method called:

```javascript
const result = await this.ppoAgent.train({ limit, minInteractions });
```

But `this.ppoAgent` object **does not exist**, causing the undefined error.

## Solution Implemented

### 1. Fixed `recommendation.service.js` trainModel Method

Changed from calling non-existent `this.ppoAgent.train()` to:

-   **Primary**: Try calling RL Service endpoint `/api/train` (if available)
-   **Fallback**: Spawn child process to run `trainPersonalized.js` script

```javascript
static async trainModel({ limit = 1000, minInteractions = 5 }) {
    // Try RL Service endpoint first
    // If fails, spawn trainPersonalized.js as subprocess
    // With 5-minute timeout
}
```

### 2. Fixed `recommendation.controller.js` trainModel Handler

Updated to accept parameters from **both request body and query**:

```javascript
const limit = parseInt(req.body?.limit || req.query?.limit) || 1000;
const minInteractions = parseInt(req.body?.minInteractions || req.query?.minInteractions) || 5;
```

### 3. Enhanced `RecommendationDashboard.jsx` Error Handling

-   Increased timeout from 60s to 300s (5 minutes)
-   Improved error messages with specific suggestions
-   Better distinction between timeout/500 error/other errors

## Flow After Fix

1. **Client** clicks "Train Model" button with params: `{ limit: 1000, minInteractions: 5 }`
2. **Frontend** calls `POST /api/recommendation/admin/train` with body params
3. **Backend Controller** extracts params from body
4. **RecommendationService.trainModel()** executes:
    - Tries calling RL Service (if endpoint exists)
    - Falls back to spawning `node src/trainPersonalized.js`
    - Waits up to 5 minutes for completion
5. **Response** returns success/error with details
6. **Frontend** displays result or detailed error message

## Testing Prerequisites

Before clicking "Train Model":

1. **RL Service must be running**: `cd rl-service && npm start`
2. **Database should have user interaction data**:
    - Minimum 50 interactions per user required
    - Minimum 5 interactions per product required
3. **Check backend logs** if timeout occurs

## API Endpoints

-   **Train**: `POST /api/recommendation/admin/train`
    -   Body: `{ limit: 1000, minInteractions: 5 }`
    -   Response timeout: 5 minutes
-   **Dataset**: `GET /api/recommendation/admin/download-dataset` / `POST /api/recommendation/admin/prepare-dataset`

-   **Stats**: `GET /api/recommendation/admin/statistics`

## Troubleshooting

### If Still Getting 500 Error

1. Check backend console logs for:
    - `[TRAIN]` prefix logs showing training progress
    - `[TRAIN ERROR]` prefix showing any subprocess errors
2. Verify `trainPersonalized.js` file exists at `rl-service/src/trainPersonalized.js`
3. Check if Node.js can run: `node --version`

### If Training Timeouts (After 5 minutes)

1. Check MongoDB - ensure data is being persisted correctly
2. Check system resources (CPU, Memory)
3. Reduce `limit` parameter or `minInteractions` parameter
4. Try running training script manually: `cd rl-service && npm run train`

### If No Error But Nothing Happens

1. Check if any users have enough interactions (min 50)
2. Check `rl-service` logs to see if it's loading models
3. Verify PPO model files exist in `rl-service/models/`

## Files Modified

1. `server/src/services/recommendation.service.js` - trainModel method
2. `server/src/controller/recommendation.controller.js` - trainModel handler
3. `client/src/pages/admin/components/RecommendationDashboard.jsx` - error handling
