# Offward Management Access — Implementation Report

Date: 2026-09-11

## Summary

Offward management authorization no longer derives from the shared Django session (`/api/auth/session/`, `is_staff`). It is now determined exclusively by the new endpoint `GET /api/offward/manage/access/`, using `can_manage_offward === true` as the sole authorization rule. A valid but non-Offward-authorized Kata Wild session is treated as logged out of Offward; Offward never calls logout automatically for such a session.

## Changed files

- [src/services/authApi.js](../../src/services/authApi.js)
  - Added `getOffwardAccess()`, which calls `GET /api/offward/manage/access/` and normalizes the response to `{ isAuthenticated, isSuperuser, canManageOffward }`. Any error or malformed body normalizes to all-false (`canManageOffward: false`), never throwing.
  - `loginWithSession()` now resolves with `getOffwardAccess()` after login instead of `getSession()`.
  - `getSession()` and `GET /api/auth/session/` are left in place (still used for possible shared-infrastructure needs) but are no longer called by any Offward authorization path.
- [src/pages/manage/ManageLoginPage.jsx](../../src/pages/manage/ManageLoginPage.jsx)
  - On mount, calls `getOffwardAccess()` instead of `getSession()`. If `canManageOffward === true`, redirects to the original destination. Otherwise (including when `is_authenticated === true` but `can_manage_offward === false`) the login form remains visible — no redirect to `/manage/access-denied`.
  - On submit, still does `GET csrf` → `POST login` → (now) `GET /api/offward/manage/access/`. Success requires `canManageOffward === true`; otherwise the form stays on `/manage/login` with the message "This account does not have Offward management access."
- [src/pages/manage/ManagementGuard.jsx](../../src/pages/manage/ManagementGuard.jsx)
  - Replaced the session check with `getOffwardAccess()`. Any state where `canManageOffward !== true` redirects to `/manage/login` (with `state.from`) — including an authenticated-but-unauthorized shared Kata Wild session. No automatic logout is triggered.
- [src/pages/manage/ManageLayout.jsx](../../src/pages/manage/ManageLayout.jsx)
  - No functional change. Logout still calls `logoutSession()` (`GET csrf` → `POST /api/auth/logout/`, clears in-memory CSRF token) only when the user explicitly clicks Logout, then navigates to `/manage/login`.
- [docs/.audit/OFFWARD_MANAGE_ACCESS_IMPLEMENTATION.md](../.audit/OFFWARD_MANAGE_ACCESS_IMPLEMENTATION.md) (this report, new file).

No backend files, Kata Wild frontend files, tests, or Offward CRUD files (`entityApi.js`, `entityConfig.js`, `EntityListPage.jsx`, `EntityFormPage.jsx`, etc.) were modified. `src/app/manageRouter.jsx` and `AccessDeniedPage.jsx` were left untouched; the `/manage/access-denied` route remains registered but is no longer navigated to by the guard or login page.

## Startup / page-refresh behavior

1. On any `/manage/*` route render (guard) or on `/manage/login` mount, the frontend calls `GET /api/offward/manage/access/` — never `/api/auth/session/` for authorization.
2. `ManagementGuard` shows a loading state until the response resolves.
3. If `can_manage_offward === true`: protected routes render normally.
4. If `can_manage_offward === false` (regardless of `is_authenticated` or `is_superuser`): the guard redirects to `/manage/login`, and the login page renders the credential form rather than redirecting away.
5. No auth state is persisted in `localStorage`/`sessionStorage`; every load re-checks the backend endpoint.

## Shared Kata Wild session behavior

- A user with a valid Kata Wild Django session (`is_authenticated: true`) who is not an Offward superuser (`can_manage_offward: false`) is treated by Offward as logged out.
- Offward does **not** call `POST /api/auth/logout/` in this case — the shared Kata Wild session is left completely intact. Only explicit use of the Offward Logout button triggers a logout call, and that call affects the shared Django session (as it always has).
- Visiting any `/manage/*` route with such a session simply shows the Offward login form; it does not display an "access denied" page and does not clear any cookies.

## Offward login behavior

- The login page is always reachable and renders its form whenever `can_manage_offward !== true`, including when a shared session is already authenticated as a non-superuser Kata Wild user.
- Submitting credentials runs `GET /api/auth/csrf/` → `POST /api/auth/login/` → `GET /api/offward/manage/access/`.
- If the resulting `can_manage_offward === true`, the user is navigated to the originally requested route (default `/manage`).
- Otherwise, the user stays on `/manage/login` and sees "This account does not have Offward management access." (covers both failed credentials and successful Django auth without Offward authorization).

## Logout behavior

- Unchanged: the Logout action in `ManageLayout` (rendered only inside the guarded, authorized route tree) calls `logoutSession()`, which ensures a CSRF token and posts to `POST /api/auth/logout/`, then clears the in-memory CSRF token and navigates to `/manage/login`.
- This path only runs on an explicit user click from an already Offward-authorized session — it is never invoked automatically for a session that merely fails the `can_manage_offward` check.

## Not changed / explicitly out of scope

- No backend code, Kata Wild frontend code, or test files were touched.
- Offward CRUD services/pages are unchanged.
- `GET /api/auth/session/` remains available in `authApi.js` for any other shared-infrastructure use, but no Offward authorization decision reads it anymore.
- No localStorage/sessionStorage usage was introduced.
