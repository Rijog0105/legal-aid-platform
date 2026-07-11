# Phase 2 — Authentication & Session Management

## Status: ✅ Complete

## Commit
`Phase 2 - Authentication & Session Management`

## What Was Implemented

### 1. LoginPage (`src/features/auth/components/LoginPage.tsx`)
- Wired to `useAuth().login()` → calls `supabase.auth.signInWithPassword`
- Zod + react-hook-form validation (email format, password min-length)
- Server error display (invalid credentials, unconfirmed email, network errors)
- Role-based redirect on successful login:
  - `volunteer` → `/volunteer`
  - All others → `/dashboard`
- Redirect guard: already-authenticated users are immediately redirected
- Show/hide password toggle
- Loading spinner on submit button

### 2. Session Persistence & Restoration (`useAuth.ts` + Supabase client)
- Supabase client uses `localStorage` by default — session persists across tabs and browser restarts
- `onAuthStateChange` fires `INITIAL_SESSION` on every mount, which restores the existing session and fetches the user profile
- `App.tsx` blocks the router render until `isInitialized = true`, preventing flash of wrong content

### 3. Auth State Restoration on Refresh
- `useAuth` initializes `onAuthStateChange` listener in `useEffect` on app mount
- If a valid session exists in `localStorage`, Supabase fires `INITIAL_SESSION` → store is populated → UI renders authenticated state
- If session is expired, Supabase fires `SIGNED_OUT` → store resets → user is redirected to `/login`

### 4. Role-Based Redirects
- `RootRedirect` component (`src/components/guards/RootRedirect.tsx`) handles the `/` route
- Routes to `/volunteer` for volunteers, `/dashboard` for all others
- `ProtectedRoute` guards all authenticated routes and checks allowed roles
- Unauthorized role access → `/unauthorized`

### 5. Error Handling
| Error | Behaviour |
|---|---|
| Invalid email/password | Alert shown under form |
| Email not confirmed | Supabase message surfaced |
| Network error | Generic retry message |
| Session expired | Auto-redirected to `/login` |
| Wrong role for route | Redirected to `/unauthorized` |

## Files Changed
| File | Change |
|---|---|
| `src/features/auth/components/LoginPage.tsx` | Full implementation |
| `src/app/routes.tsx` | Added `RootRedirect` for `/` route |
| `src/components/guards/RootRedirect.tsx` | New file |
| `docs/PHASE_02_AUTH.md` | This file |

## No Schema Changes Required
Phase 2 uses existing Supabase Auth + `users` table + `roles` table as designed.

## Next: Phase 3 — People Registry
