# Offward Frontend Authentication and Localhost Contamination Audit

Date: 2026-09-11

## Scope and conclusion

This is a read-only audit of the Offward frontend repository. It covers the management login flow, API configuration, browser-side auth state, route protection, and references to Kata Wild or localhost.

**Primary conclusion:** Offward does not appear to share a browser cookie with Kata Wild because both frontends use the same localhost port. Instead, Offward is explicitly configured to call the Kata Wild Heroku backend and to include that backend's cookies on every Axios request. If Kata Wild's local frontend uses the same backend origin and session-cookie scheme, both applications will intentionally observe the same server-side Django session. Logging in through one application can therefore make the other application appear logged in, and logging out can invalidate the session used by both.

There is no evidence in this frontend of localStorage/sessionStorage auth, JWTs, a query cache, a global auth store, or a localhost API proxy. The durable auth state is the backend session cookie; the CSRF token is held only in module memory with a `document.cookie` fallback.

## Exact relevant files

### Authentication and routing

- [`src/pages/manage/ManageLoginPage.jsx`](../../src/pages/manage/ManageLoginPage.jsx): login form, existing-session bootstrap, post-login redirects.
- [`src/pages/manage/ManagementGuard.jsx`](../../src/pages/manage/ManagementGuard.jsx): protected-route session bootstrap and access checks.
- [`src/pages/manage/ManageLayout.jsx`](../../src/pages/manage/ManageLayout.jsx): logout action and redirect.
- [`src/app/manageRouter.jsx`](../../src/app/manageRouter.jsx): public login/access-denied routes and protected management route tree.
- [`src/app/router.jsx`](../../src/app/router.jsx): mounts management routes at `/manage/*`.
- [`src/services/authApi.js`](../../src/services/authApi.js): CSRF, session, login, logout, and response normalization.
- [`src/services/apiClient.js`](../../src/services/apiClient.js): shared Axios instance, credential configuration, CSRF cookie lookup, and unsafe-request interceptor.

### Configuration and supporting documentation

- [`.env`](../../.env): active API base URL.
- [`.env.example`](../../.env.example): example API base URL, currently identical to the active value.
- [`vite.config.js`](../../vite.config.js): Vite configuration; no explicit port or proxy is configured.
- [`package.json`](../../package.json): scripts and dependencies; Axios is the HTTP client.
- [`docs/OFFWARD_FRONTEND_ARCHITECTURE.md`](../../docs/OFFWARD_FRONTEND_ARCHITECTURE.md): shared Axios and credentialing rule.
- [`docs/OFFWARD_API_CONTRACT_PLAN.md`](../../docs/OFFWARD_API_CONTRACT_PLAN.md): documents that Offward uses the existing Kata Wild backend.
- [`docs/OFFWARD_DECISIONS.md`](../../docs/OFFWARD_DECISIONS.md): records the shared-backend decision.
- [`docs/audits/OFFWARD_FRONTEND_MANAGEMENT_AUDIT.md`](../../docs/audits/OFFWARD_FRONTEND_MANAGEMENT_AUDIT.md): earlier implementation notes, including the shared backend/session assumptions.

## Current auth architecture

Offward has a management-only authentication surface at `/manage/login`. Public content routes are not guarded.

1. `ManageLoginPage` calls `getSession()` on mount.
2. `getSession()` sends `GET /api/auth/session/` through the shared Axios client.
3. A response is authenticated only when `is_authenticated === true`; staff access additionally requires `is_staff === true`.
4. An authenticated staff user is redirected to the requested route, defaulting to `/manage`.
5. An authenticated non-staff user is redirected to `/manage/access-denied`.
6. An unauthenticated user sees the username/password form.
7. Submit first calls `GET /api/auth/csrf/`, then posts credentials to `POST /api/auth/login/`, then calls `GET /api/auth/session/` again.
8. A successful staff login navigates to the original route with `replace: true`; a successful non-staff login goes to `/manage/access-denied`; an unauthenticated response remains on the login page with an error.
9. `ManagementGuard` repeats `GET /api/auth/session/` whenever a protected route is entered or the pathname changes. It renders a loading state while pending, redirects unauthenticated users to `/manage/login`, redirects authenticated non-staff users to `/manage/access-denied`, and renders the protected outlet only for authenticated staff.
10. Logout calls `GET /api/auth/csrf/` when necessary, posts to `POST /api/auth/logout/`, clears the in-memory CSRF token, and navigates to `/manage/login` with `replace: true`. It does not perform a full reload.

There is no `AuthProvider` or global auth context in this repository. The attempted provider path does not exist. Each relevant page/guard performs its own session request.

## API configuration

### Base URL and environment

The active `.env` contains:

```dotenv
VITE_API_BASE_URL=https://kata-wild-backend-5b989da54ce2.herokuapp.com
```

`.env.example` contains the same Kata Wild backend URL. `src/services/apiClient.js` reads only `import.meta.env.VITE_API_BASE_URL`; there is no fallback URL, runtime hostname selection, or environment-specific API mapping in the frontend.

This confirms that the current Offward frontend is configured against Kata Wild infrastructure. The source does not contain a separate Offward API host.

### Localhost ports and proxies

- `vite.config.js` does not set `server.port`, so Vite's default development port is expected unless overridden by a command-line flag or external configuration.
- No `localhost` or `127.0.0.1` URL appears in first-party source/configuration relevant to the app.
- No Vite proxy is configured.
- No Kata Wild frontend port is present in this repository, so the other project's local port cannot be confirmed from Offward.

### Credential behavior

The shared Axios client is created with `withCredentials: true`. Every domain service, including management CRUD, uses this client. This causes browser cookies eligible for the API origin to be included in cross-origin XHR requests. There is no use of `fetch()` and no separate Axios instance.

Unsafe `POST`, `PATCH`, and `DELETE` requests receive an `X-CSRFToken` header. The token comes first from module memory and then from a `csrftoken` cookie visible to the current document; if absent, the client calls `GET /api/auth/csrf/`.

## Browser-side auth state

### Persistent state

No application code reads or writes `localStorage` or `sessionStorage`. No JWT, bearer token, or serialized user object is persisted in browser storage.

### Cookies

The only cookie read by JavaScript is a cookie named `csrftoken`, through `document.cookie` in `apiClient.js`. The frontend does not read the session cookie. The session cookie is therefore expected to be an HTTP cookie managed by the browser and sent automatically by Axios when `withCredentials` and the backend's cookie/CORS/SameSite policy permit it.

Because the configured API origin is `kata-wild-backend-5b989da54ce2.herokuapp.com`, an API session cookie belongs to that backend host, not to `localhost`. Browser cookies are not isolated by localhost port. Two local frontends calling the same API origin can consequently share the same backend cookie jar.

The frontend cannot establish the backend cookie name, `Domain`, `Path`, `SameSite`, `Secure`, or `HttpOnly` attributes. Those must be verified from the browser's network/application panels or backend configuration. The existing frontend audit documents `SESSION_COOKIE_SECURE=True` and `CSRF_COOKIE_SECURE=True` as a current backend limitation for local development, but that backend setting is not defined in this repository.

### In-memory state and caching

`apiClient.js` stores only the CSRF token in the module-level variable `csrfToken`. It is lost on a full page reload. Session/user state is component-local in `ManageLoginPage` and `ManagementGuard`; it is not cached across reloads. React Router's own internal session storage behavior, if any, is not application auth state and is unrelated to authentication.

## Kata Wild contamination findings

### Confirmed

- The active API URL is explicitly a Kata Wild Heroku backend URL.
- The example environment file repeats that URL.
- Repository documentation says Offward intentionally lives inside and reuses the Kata Wild backend/deployment/authentication infrastructure.
- Credentialed requests are enabled globally with Axios `withCredentials: true`.
- Auth endpoints use a shared `/api/auth/*` namespace and Django session/CSRF conventions.
- No Offward-specific backend origin, cookie namespace, token namespace, or frontend auth namespace is configured.

### Not found in Offward frontend code

- No `katawild` identifier or Kata Wild localhost port in `src/`.
- No old API URL separate from the currently configured Heroku URL.
- No copied localStorage/sessionStorage auth utility.
- No frontend code that manually sets, deletes, or namespaces the session cookie.
- No shared environment variable other than `VITE_API_BASE_URL`.
- No local auth cache or query-cache auth state.

### Likely shared-session problem

If Kata Wild's local frontend also calls `https://kata-wild-backend-5b989da54ce2.herokuapp.com` with credentials, both local applications are clients of the same backend session store and browser cookie origin. This is the most likely explanation for apparent cross-project login/logout interference. It is an intentional consequence of the shared-backend decision, not a localhost-port collision in Offward's React code.

## Cookie/session or token auth?

Offward uses **cookie-backed server-side session authentication with CSRF protection**.

Evidence:

- `withCredentials: true` is enabled.
- Login/logout are session endpoints, not token issuance/refresh endpoints.
- The client never extracts or stores an access token.
- The route guard asks the backend whether the current session is authenticated.
- Unsafe requests use a CSRF token/header.

The authenticated identity is therefore determined by the session cookie sent to the shared API backend. The CSRF token is a separate anti-forgery value and is not an authentication token.

## Requested scenarios

### 1. Kata Wild is logged in locally

Assuming Kata Wild and Offward call the same configured API origin and the backend accepts credentialed cross-origin requests, the browser holds a valid Kata Wild backend session cookie. Opening Offward does not clear or replace it. Offward's initial `GET /api/auth/session/` sends that cookie, so Offward may see the same authenticated user. If that user is staff, Offward redirects from `/manage/login` to `/manage`; if authenticated but not staff, it redirects to `/manage/access-denied`.

If cookie `SameSite`, `Secure`, CORS, or backend origin rules prevent the cross-origin cookie from being sent, Offward instead sees an unauthenticated session. That is a deployment/browser-policy variable, not something the frontend can resolve by reading local storage.

### 2. Offward is then opened locally

The Offward page starts with no persisted React auth state. On `/manage/login`, it calls `/api/auth/session/`; on a protected management URL, `ManagementGuard` calls the same endpoint and temporarily displays its loading state. The result comes from the shared backend session, not from Offward-specific local state.

### 3. Offward attempts login

Offward requests a CSRF token, posts the entered username/password to `/api/auth/login/`, and then re-reads `/api/auth/session/`. A successful login changes the shared backend session cookie. Kata Wild, if open in another tab and using the same API session, can observe that changed session on its next authenticated request or refresh. A failed login leaves the existing session behavior dependent on the backend: this frontend does not explicitly clear a pre-existing session before attempting login.

### 4. Page refresh occurs

The in-memory CSRF token is lost. The application mounts again and re-runs `GET /api/auth/session/`. The browser may send the existing API session cookie automatically, so a valid shared backend session survives the refresh. There is no localStorage/sessionStorage state to restore and no client-side user cache to become stale. If the cookie is unavailable under local development policy, the session check normalizes to unauthenticated and the guard redirects to `/manage/login`.

## Confirmed problems

1. **The active Offward API configuration points to Kata Wild infrastructure.** This is explicit in both `.env` and `.env.example`.
2. **Authentication is globally credentialed against that shared origin.** `withCredentials: true` means the browser session is shared at the API host level when both apps use that host.
3. **There is no frontend isolation boundary for sessions.** No separate API origin, cookie namespace, or login realm is configured by Offward.
4. **The environment example reproduces the coupling.** New local setups will continue to point at the Kata Wild backend unless deliberately overridden.

## Likely problems requiring backend/browser confirmation

1. **Both projects may be using the same backend session cookie.** Confirm by inspecting the request `Cookie` header and `Set-Cookie` response attributes for both apps.
2. **The backend may be rejecting or inconsistently accepting local credentialed requests.** Confirm `Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials`, `SameSite`, `Secure`, and cookie domain/path attributes.
3. **The configured Heroku backend may not be the intended development backend for Offward.** The repository documentation says it is shared by design, but that does not prove it is suitable for isolated local auth testing.
4. **A pre-existing shared session is not cleared before a new login attempt.** If the backend login endpoint does not replace the session as expected, a failed or partial login attempt could leave the previous shared identity visible.
5. **The backend's secure-cookie local-development behavior may make auth appear stale or inconsistent.** The existing audit records secure session/CSRF cookie settings, but the actual deployed response headers should be checked rather than inferred from frontend code.

## Recommended frontend fixes

### Required for isolation

1. Give Offward a dedicated development API origin and set `VITE_API_BASE_URL` locally to it. Do not use the Kata Wild backend in Offward's `.env.example` unless shared auth is an explicit requirement.
2. If a shared backend must remain, establish an Offward-specific auth boundary on the backend: a distinct cookie name/domain/path or a separate session namespace, plus matching CSRF and CORS configuration. Cookie names alone are insufficient if both applications still intentionally use the same server-side session store without isolation.
3. Use separate backend environments or databases for local Kata Wild and local Offward development when independent login state is required.

### Useful frontend hardening

1. Make the API origin explicit at startup and fail fast in development when it is the Kata Wild production URL, unless a deliberate override is present.
2. Add an explicit environment label or development-only diagnostic showing the selected API origin, without exposing credentials.
3. Consider a dedicated Offward logout/reset action that calls the correct isolated backend logout endpoint; do not attempt to delete a remote HttpOnly session cookie from JavaScript.
4. Add integration coverage for session isolation: log in through one app, query the other app's session endpoint, refresh both, and log out from each. The test must run against the actual CORS/cookie configuration because unit tests cannot prove browser cookie behavior.
5. Keep the current positive-boolean session checks and guarded route behavior; they correctly avoid treating an HTTP 200 response alone as authenticated.

## Audit limitations

This repository contains the Offward frontend only. It does not contain Kata Wild's frontend, backend cookie settings, backend CORS configuration, or the browser's actual cookie jar. Therefore this audit confirms the shared API/session design and its frontend implications, but cannot confirm the exact Kata Wild local port or the exact `Set-Cookie` attributes without inspecting the other project or a browser network trace.