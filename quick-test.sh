#!/bin/bash

# Quick Test Script for RL/PPO System
# Usage: ./quick-test.sh

echo "🧪 Quick Testing RL/PPO System..."
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: MongoDB
echo "📊 Test 1: MongoDB Connection"
if mongo mongodb://localhost:27017/shoe-promax --eval "db.version()" --quiet > /dev/null 2>&1; then
    echo -e "${GREEN}✅ MongoDB is running${NC}"
    PRODUCTS=$(mongo mongodb://localhost:27017/shoe-promax --eval "db.products.countDocuments()" --quiet)
    USERS=$(mongo mongodb://localhost:27017/shoe-promax --eval "db.users.countDocuments()" --quiet)
    echo "   - Products: $PRODUCTS"
    echo "   - Users: $USERS"
else
    echo -e "${RED}❌ MongoDB is not running${NC}"
    echo "   Run: mongod"
fi
echo ""

# Test 2: Python RL Service (Port 5001)
echo "🐍 Test 2: Python RL Service (Port 5001)"
HEALTH_RESPONSE=$(curl -s http://localhost:5001/health)
if [ $? -eq 0 ]; then
    STATUS=$(echo $HEALTH_RESPONSE | grep -o '"status":"healthy"')
    if [ ! -z "$STATUS" ]; then
        echo -e "${GREEN}✅ Python RL Service is running${NC}"
        VERSION=$(echo $HEALTH_RESPONSE | grep -o '"version":"[^"]*"' | cut -d':' -f2 | tr -d '"')
        echo "   - Version: $VERSION"
        echo "   - URL: http://localhost:5001"
    else
        echo -e "${YELLOW}⚠️  Service running but unhealthy${NC}"
    fi
else
    echo -e "${RED}❌ Python RL Service is not running${NC}"
    echo "   Run: cd rl-service && python app.py"
fi
echo ""

# Test 3: Model Info
echo "🤖 Test 3: Model Information"
MODEL_INFO=$(curl -s http://localhost:5001/api/model-info)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Model info accessible${NC}"
    # Try to parse with jq if available
    if command -v jq &> /dev/null; then
        echo "$MODEL_INFO" | jq '.info' 2>/dev/null || echo "$MODEL_INFO"
    else
        echo "$MODEL_INFO"
    fi
else
    echo -e "${RED}❌ Cannot access model info${NC}"
fi
echo ""

# Test 4: Node.js Backend (Port 3000)
echo "🟢 Test 4: Node.js Backend (Port 3000)"
BACKEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/product)
if [ "$BACKEND_RESPONSE" = "200" ] || [ "$BACKEND_RESPONSE" = "401" ]; then
    echo -e "${GREEN}✅ Node.js Backend is running${NC}"
    echo "   - URL: http://localhost:3000"
else
    echo -e "${RED}❌ Node.js Backend is not running${NC}"
    echo "   Run: cd server && npm run dev"
fi
echo ""

# Test 5: React Frontend (Port 5173)
echo "⚛️  Test 5: React Frontend (Port 5173)"
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173)
if [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ React Frontend is running${NC}"
    echo "   - URL: http://localhost:5173"
else
    echo -e "${RED}❌ React Frontend is not running${NC}"
    echo "   Run: cd client && npm run dev"
fi
echo ""

# Test 6: Backend → Python Service Connection
echo "🔗 Test 6: Backend ↔ Python Service Connection"
# This test would require auth token, so we skip for basic test
echo -e "${YELLOW}ℹ️  Requires authentication (skip in basic test)${NC}"
echo ""

# Summary
echo "=================================="
echo "📋 Summary"
echo "=================================="
echo ""
echo "Services Status:"
if mongo mongodb://localhost:27017/shoe-promax --eval "db.version()" --quiet > /dev/null 2>&1; then
    echo -e "  MongoDB:        ${GREEN}✅ Running${NC}"
else
    echo -e "  MongoDB:        ${RED}❌ Not Running${NC}"
fi

if curl -s http://localhost:5001/health | grep -q "healthy"; then
    echo -e "  Python Service: ${GREEN}✅ Running (Port 5001)${NC}"
else
    echo -e "  Python Service: ${RED}❌ Not Running${NC}"
fi

if [ "$BACKEND_RESPONSE" = "200" ] || [ "$BACKEND_RESPONSE" = "401" ]; then
    echo -e "  Node.js Backend:${GREEN}✅ Running (Port 3000)${NC}"
else
    echo -e "  Node.js Backend:${RED}❌ Not Running${NC}"
fi

if [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo -e "  React Frontend: ${GREEN}✅ Running (Port 5173)${NC}"
else
    echo -e "  React Frontend: ${RED}❌ Not Running${NC}"
fi

echo ""
echo "=================================="
echo "🎯 Next Steps:"
echo "=================================="
echo ""
echo "1. If all services running → Test recommendations:"
echo "   curl http://localhost:3000/api/recommendation/cold-start?limit=5"
echo ""
echo "2. View detailed testing guide:"
echo "   cat TESTING_GUIDE.md"
echo ""
echo "3. Start missing services:"
echo "   - MongoDB:     mongod"
echo "   - Python:      cd rl-service && python app.py"
echo "   - Backend:     cd server && npm run dev"
echo "   - Frontend:    cd client && npm run dev"
echo ""
echo "✨ Done!"


