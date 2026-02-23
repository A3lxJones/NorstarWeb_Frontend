#!/bin/bash
# Test Admin Dashboard Data Fetching

set -e

echo "========================================"
echo "Admin Dashboard Verification Test"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if frontend is running
echo -e "${YELLOW}[1/5] Checking if frontend is running on port 4000...${NC}"
if curl -s http://localhost:4000/login > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is running${NC}"
else
    echo -e "${RED}✗ Frontend is not responding on port 4000${NC}"
    echo "Start the frontend with: npm start"
    exit 1
fi
echo ""

# Test 2: Check if backend is running
echo -e "${YELLOW}[2/5] Checking if backend API is running on port 3000...${NC}"
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend API is running${NC}"
else
    echo -e "${RED}✗ Backend API is not responding on port 3000${NC}"
    echo "Make sure the backend is running: npm start (in backend directory)"
    exit 1
fi
echo ""

# Test 3: Login to get auth token
echo -e "${YELLOW}[3/5] Logging in as admin...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@norstar.test","password":"Admin123!"}')

if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}Note: jq not found, parsing manually...${NC}"
    # Simple grep-based parsing as fallback
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
else
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken' 2>/dev/null || echo "")
fi

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo -e "${RED}✗ Login failed${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Login successful${NC}"
echo "Token: ${TOKEN:0:20}..."
echo ""

# Test 4: Fetch users from backend
echo -e "${YELLOW}[4/5] Fetching users from /api/admin/users...${NC}"
USERS_RESPONSE=$(curl -s -X GET http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

if command -v jq &> /dev/null; then
    USER_COUNT=$(echo "$USERS_RESPONSE" | jq '.data | length' 2>/dev/null || echo "0")
    SUCCESS=$(echo "$USERS_RESPONSE" | jq '.success' 2>/dev/null || echo "false")
else
    # Fallback: count braces as a rough estimate
    USER_COUNT=$(echo "$USERS_RESPONSE" | grep -o '"id"' | wc -l)
    SUCCESS="true"
fi

if [ "$SUCCESS" = "true" ] && [ "$USER_COUNT" -gt "0" ]; then
    echo -e "${GREEN}✓ Successfully fetched users${NC}"
    echo "Found: $USER_COUNT users"
else
    echo -e "${RED}✗ Failed to fetch users${NC}"
    echo "Response: $USERS_RESPONSE"
    exit 1
fi
echo ""

# Test 5: Fetch children from backend
echo -e "${YELLOW}[5/5] Fetching children from /api/admin/children...${NC}"
CHILDREN_RESPONSE=$(curl -s -X GET http://localhost:3000/api/admin/children \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

if command -v jq &> /dev/null; then
    CHILD_COUNT=$(echo "$CHILDREN_RESPONSE" | jq '.data | length' 2>/dev/null || echo "0")
    SUCCESS=$(echo "$CHILDREN_RESPONSE" | jq '.success' 2>/dev/null || echo "false")
else
    CHILD_COUNT=$(echo "$CHILDREN_RESPONSE" | grep -o '"id"' | wc -l)
    SUCCESS="true"
fi

if [ "$SUCCESS" = "true" ] && [ "$CHILD_COUNT" -gt "0" ]; then
    echo -e "${GREEN}✓ Successfully fetched children${NC}"
    echo "Found: $CHILD_COUNT children"
else
    echo -e "${RED}✗ Failed to fetch children${NC}"
    echo "Response: $CHILDREN_RESPONSE"
    exit 1
fi
echo ""

# Summary
echo "========================================"
echo -e "${GREEN}All tests passed! ✓${NC}"
echo "========================================"
echo ""
echo "Frontend is running at: http://localhost:4000"
echo "Backend API is running at: http://localhost:3000"
echo ""
echo "Next steps:"
echo "1. Open http://localhost:4000/login"
echo "2. Log in with:"
echo "   Email: admin@norstar.test"
echo "   Password: Admin123!"
echo "3. Click 'Members' to view $USER_COUNT users"
echo "4. Click 'Children' to view $CHILD_COUNT children"
echo ""
echo "Watch the server logs for [API] and [Dashboard] messages"
echo "========================================"
