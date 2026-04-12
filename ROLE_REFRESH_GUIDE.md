# Role Refresh Implementation Guide

## Overview

When an admin changes a user's role in Supabase (e.g., from `parent` → `coach`), the frontend needs to sync this change to show the correct dashboard and permissions. This guide explains how the role refresh flow works.

---

## Architecture

### 1. Backend Endpoint: `GET /api/auth/me`

**Location:** Your backend (Norstar API)

**Responsibility:**
- Accepts a JWT token in `Authorization: Bearer {token}` header
- Queries the latest user data from Supabase (not cached)
- Returns the current role and user info

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "role": "coach",
    "full_name": "John Doe"
  }
}
```

---

### 2. Frontend Endpoint: `POST /api/auth/refresh-role`

**Location:** `src/app.ts`

**Responsibility:**
- Called by the browser/admin
- Uses the user's `req.session.accessToken` to call the backend `/api/auth/me`
- Updates the server-side session with the latest role
- Returns whether the role changed

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "role": "coach",
    "full_name": "John Doe",
    "roleChanged": true,
    "oldRole": "parent",
    "newRole": "coach"
  }
}
```

---

### 3. Client-Side: JavaScript Function `refreshUserRole()`

**Location:** `src/public/js/main.js` and `src/views/dashboard/users/detail.njk`

**Responsibility:**
- Calls `POST /api/auth/refresh-role`
- Handles the response and shows feedback
- Reloads the page if role changed (to apply new dashboard/permissions)

---

## How to Use

### For Admins: Refresh a User's Role

1. **Go to User Detail Page**
   - Navigate to `Dashboard` → `Users` → Click a user name

2. **Change the Role in Supabase** (if not already done)
   - Open Supabase table editor
   - Find the user in the `users` table
   - Change their `role` column (e.g., `parent` → `coach`)
   - Save

3. **Click "Refresh Role Now" Button**
   - On the user detail page, you'll see a notice about role updates
   - Click the "Refresh Role Now" button
   - The page will show a success message and reload
   - The user's session will now have the updated role

### For Users: After Role Changes

If an admin changed your role, you have two options:

**Option A: Automatic (if button is added to dashboard)**
- An admin can click the "Refresh Role Now" button on your user detail page
- Your browser session will update and reload

**Option B: Manual**
- Log out and log back in
- Your role will be synced from Supabase on login

---

## Code Walkthrough

### Backend Integration

The frontend makes this call to your backend:

```typescript
// In src/app.ts, the /api/auth/refresh-role endpoint:
app.post('/api/auth/refresh-role', requireAuth, async (req: Request, res: Response) => {
    const token = req.session.accessToken!;
    const result = await getCurrentUser(token); // ← Calls your /api/auth/me
    
    if (result.success && result.data?.role) {
        // Update session with latest role
        req.session.user.role = result.data.role;
        // ... return success with role info
    }
});
```

### Frontend Call

The user detail page has a button that calls:

```javascript
async function refreshUserRole() {
    const result = await fetch('/api/auth/refresh-role', {
        method: 'POST',
    }).then(r => r.json());
    
    if (result.success && result.data?.roleChanged) {
        // Page reloads with new role
        location.reload();
    }
}
```

---

## Testing the Flow

1. **Start both servers:**
   ```bash
   # Frontend (port 3001 or as configured)
   npm start
   
   # Backend (port 3000 or as configured)
   # Run your backend server
   ```

2. **Login as a user (e.g., parent)**

3. **Change their role in Supabase:**
   - Open Supabase dashboard
   - Go to `users` table
   - Find the logged-in user
   - Change `role` from `parent` to `coach`

4. **Admin refreshes the role:**
   - Go to Dashboard → Users → Click the user
   - Click "Refresh Role Now"
   - Page should reload showing the new role

5. **Verify permissions:**
   - The dashboard should now show the Coach Dashboard (not Parent Dashboard)
   - Coach-only routes should be accessible

---

## Files Modified

| File | Changes |
|------|---------|
| `src/app.ts` | Added `/api/auth/refresh-role` endpoint |
| `src/utils/api.ts` | Added `getCurrentUser()` helper function |
| `src/public/js/main.js` | Added `refreshUserRole()` function |
| `src/views/dashboard/users/detail.njk` | Added "Refresh Role Now" button and inline script |

---

## Troubleshooting

### Issue: Button click does nothing

**Check:**
1. Is the backend `/api/auth/me` endpoint working? (Test with Postman/curl)
2. Are you logged in? (Check if `req.session.user` exists)
3. Check browser console for errors (F12 → Console)

### Issue: Role doesn't change after refresh

**Check:**
1. Did you actually change the role in Supabase?
2. Is the backend query returning the new role?
3. Test: `curl -H "Authorization: Bearer {token}" http://localhost:3000/api/auth/me`

### Issue: "Failed to fetch" error

**Check:**
1. Are both frontend and backend running?
2. Is `API_URL` correctly set in frontend `.env`?
3. Check CORS if the backend is on a different domain

---

## Future Enhancements

- **Auto-refresh on page load:** Periodically sync role from backend (with caching)
- **Websocket notifications:** Push role changes to users in real-time
- **Multiple tabs:** Sync role across browser tabs using `localStorage` or `sessionStorage`
