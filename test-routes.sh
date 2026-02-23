#!/bin/bash
# Test admin dashboard routes

echo "Testing Norstar Frontend Routes"
echo "================================"
echo ""

# Test home page
echo "1. Testing home page..."
RESP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/)
echo "   GET / → $RESP"

# Test login page
echo "2. Testing login page..."
RESP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/login)
echo "   GET /login → $RESP"

# Test dashboard (should redirect)
echo "3. Testing dashboard (should redirect to login)..."
RESP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/dashboard)
echo "   GET /dashboard → $RESP"

# Test dashboard/users (should redirect)
echo "4. Testing dashboard/users (should redirect to login)..."
RESP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/dashboard/users)
echo "   GET /dashboard/users → $RESP"

# Test dashboard/children (should redirect)
echo "5. Testing dashboard/children/all (should redirect to login)..."
RESP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/dashboard/children/all)
echo "   GET /dashboard/children/all → $RESP"

# Test 404 page
echo "6. Testing 404 page (nonexistent route)..."
RESP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/this-does-not-exist)
echo "   GET /this-does-not-exist → $RESP"

echo ""
echo "================================"
echo "Expected status codes:"
echo "  /                         → 200"
echo "  /login                    → 200"
echo "  /dashboard                → 302 (redirect)"
echo "  /dashboard/users          → 302 (redirect)"
echo "  /dashboard/children/all   → 302 (redirect)"
echo "  /nonexistent-route        → 404"
echo ""
echo "If all showing 302 or 200, routes are working!"
