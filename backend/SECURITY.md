# HostelBite Security Architecture

This document outlines the security controls, monitoring capabilities, and operational best practices for the HostelBite platform (Phase 2B Hardened).

---

## 1. Authentication & Authorization

### 1.1 JSON Web Tokens (JWT)
- **Algorithm:** HS256 with a minimum 32-character secret (enforced at boot).
- **Session invalidation:** Tokens include a `tokenVersion` claim. When a user changes or resets their password, their `tokenVersion` is incremented in the database, instantly invalidating all previously issued tokens for that user.
- **Expiration:** Tokens expire in 7 days by default (configurable via `JWT_EXPIRE`).

### 1.2 Role-Based Access Control (RBAC)
- **Roles:** `customer`, `seller`, `admin`.
- **Enforcement:** The `authorize('role1', 'role2')` middleware strictly enforces access. Any attempt to access a route without the required role results in a 403 Forbidden and logs an `authorization_failed` security event.
- **Admin Guards:** Admins cannot remove their own admin role or deactivate their own account, preventing accidental lockouts.

---

## 2. Request Handling & Validation

### 2.1 Input Validation & Sanitization
1. **Schema Validation:** All incoming data is validated against strict schemas using `express-validator`. Unrecognized or malformed fields are rejected before reaching business logic.
2. **NoSQL Injection Guard:** `express-mongo-sanitize` strips MongoDB operator keys (e.g., `$ne`, `$gt`) from `req.body`, `req.query`, and `req.params`. Any stripped payload logs a `suspicious_request` event.
3. **XSS Guard:** All string inputs are stripped of HTML and `<script>` tags as a defense-in-depth measure.

### 2.2 Rate Limiting
Rate limits are enforced per-IP using `express-rate-limit`. Violations return 429 Too Many Requests and log a `rate_limit_exceeded` event.
- **Global:** 100 requests / 15 minutes.
- **Login/Register:** 5-10 requests / 15 minutes.
- **Password Reset/Forgot:** 5 requests / 60 minutes.

### 2.3 Body Limits
- JSON body max size: `1mb` (configurable via `JSON_LIMIT`).
- Form body max size: `1mb` (configurable via `FORM_LIMIT`).
- Exceeding the limit returns 413 Payload Too Large and logs a `large_request_body` event.

---

## 3. Auditing & Logging

### 3.1 Immutable Audit Log (`AuditLog` Model)
All critical administrative and seller actions are recorded in a MongoDB collection that is **insert-only**. No application code is permitted to update or delete these logs.
- **Captured Fields:** Timestamp, Actor (User ID), Action, Resource Type, Resource ID, IP Address, User Agent, Status, and a Diff of Changes (for updates).
- **Logged Actions:** `product_created`, `product_updated`, `product_deleted`, `user_updated`, `user_deleted`, `role_changed`, `seller_created`, `order_status_changed`, `price_updated`, `inventory_updated`.

### 3.2 Security Event Logging
Security events are logged to stdout as structured, single-line JSON objects, making them easy to parse in log aggregators (like Datadog or Render Log Streams).
- **Event Types:** `login_failed`, `login_succeeded`, `user_registered`, `password_change_failed`, `authorization_failed`, `rate_limit_exceeded`, `suspicious_request`, `unknown_route`, `malformed_payload`, `server_error`, etc.
- **Redaction:** A strict `SENSITIVE_KEYS` scrubber ensures passwords, tokens, and secrets are never logged.

### 3.3 Request Logging
Every incoming HTTP request is logged (excluding `/api/health`).
- **Format:** JSON containing method, path, status, response time (ms), IP, authenticated user ID, and user agent.

---

## 4. Network & Infrastructure Security

### 4.1 Security Headers (Helmet)
- **Content-Security-Policy (CSP):** Set to `default-src 'none'`, `base-uri 'none'`, `form-action 'self'`. (This is a JSON API, so it does not load external assets).
- **Cross-Origin Resource Policy (CORP):** Set to `cross-origin` to allow the separate React frontend to fetch data.
- **Strict-Transport-Security (HSTS):** Enforced for 1 year, including subdomains (in production).
- **Permissions-Policy:** Explicitly disables camera, microphone, geolocation, and payment APIs.

### 4.2 Cross-Origin Resource Sharing (CORS)
- **Allowed Origins:** Strictly limited to the origins defined in `FRONTEND_URL`.
- **Credentials:** Allowed (for authorization headers).
- **Rejection:** Unauthorized origins receive a CORS error and trigger a `suspicious_request` log event.

### 4.3 Timeouts & Resource Exhaustion
- **Server Timeout:** 30 seconds (configurable via `SERVER_TIMEOUT_MS`).
- **Keep-Alive & Headers Timeout:** Set to 65s/66s to exceed the default 60s Application Load Balancer (ALB) idle timeout used by providers like Render, preventing intermittent 502 errors.
- **MongoDB Connection Timeouts:** `socketTimeoutMS` (45s) and `connectTimeoutMS` (10s) prevent stalled database queries from hanging the server indefinitely.

---

## 5. Deployment & Operations

### 5.1 Environment Variables
Review `.env.example` for the complete list of required and optional configuration parameters.

### 5.2 MongoDB Security Checklist
1. **TLS/SSL:** Use the `mongodb+srv://` scheme for enforced TLS in transit (default for MongoDB Atlas).
2. **Least Privilege:** The database user provisioned for this application should only have `readWrite` permissions on the `hostel-snacks` database. Do not use an account with `dbAdmin` or `clusterAdmin` privileges.
3. **Network Isolation:** Restrict database access to the static outbound IPs of your backend hosting provider (e.g., Render) if available on your pricing tier.

### 5.3 Dependency Management
- Unused dependencies (`nodemailer`, `multer`) have been removed to minimize the attack surface.
- Run `npm audit` regularly to check for known vulnerabilities in third-party packages.
