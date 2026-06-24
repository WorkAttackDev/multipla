# izinet-api — Flows & Scenarios

A Node.js/Express bridge connecting **ProxyPay** (Angolan payment processor, Multicaixa/ATM) with **Splynx** (ISP billing platform).

---

## Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js ≥ 22, TypeScript (strict) |
| Framework | Express 4 |
| Database | MySQL via Knex + mysql2 |
| Validation | Zod |
| Testing | Vitest |
| Package manager | pnpm |

---

## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/` | None | Health check |
| `GET` | `/update-references` | `x-api-pass` | Batch create/update ProxyPay references for Splynx customers |
| `GET` | `/process-payments` | `x-api-pass` | Batch process all pending ProxyPay payments into Splynx |
| `POST` | `/splynxcallback` | HMAC-SHA1 + rate limit | Splynx webhook — create ProxyPay reference for new customer |
| `POST` | `/proxypaycallback` | HMAC-SHA256 + rate limit | ProxyPay webhook — process single payment into Splynx |

---

## Flow 1: Reference Creation (Splynx → ProxyPay)

**Trigger**: Splynx sends a webhook when a customer is created/updated.

```
Splynx → POST /splynxcallback → izinet-api → PUT /references/{login} → ProxyPay
```

1. Splynx sends `{data.attributes: {login, id}}` with HMAC-SHA1 signature (`x-splynx-signature`)
2. API verifies signature using `SPLYNX_HOOK_SECRET`
3. Validates `login` is exactly 9 chars (Zod)
4. Calls ProxyPay `PUT /references/{login}` with `callback_url` and `user_id` as custom fields
5. Returns `200 {message: "reference created"}`

---

## Flow 2: Single Payment Processing (ProxyPay → Splynx) — Real-time

**Trigger**: ProxyPay sends a webhook when a customer pays at an ATM.

```
ProxyPay → POST /proxypaycallback → izinet-api → POST admin/finance/payments → Splynx
                                                         ↓
                                                    Local DB (payments)
```

1. ProxyPay sends payment payload `{id, amount, custom_fields.user_id}` with HMAC-SHA256 signature (`x-signature`)
2. API verifies signature using `PROXY_PAY_API_KEY` as the secret
3. **Idempotency check**: looks up local `payments` table — if `status=completed` exists, returns 200 immediately
4. Inserts `payments` row with `status=pending`
5. Validates `custom_fields.user_id` is numeric
6. Calls Splynx `POST admin/finance/payments` with `{customer_id, payment_type: "2", date, receipt_number, amount}`
7. **Success**: updates local status to `completed`, deletes payment from ProxyPay (`DELETE /payments/{id}`)
8. **Failure**: updates local status to `failed`, inserts into `failed_payments` with error details

---

## Flow 3: Batch Payment Processing (Scheduled/Manual)

**Trigger**: Admin cron job or manual call.

```
Admin/Scheduler → GET /process-payments → izinet-api → GET /payments → ProxyPay
                                                         (for each pending)
                                                         POST admin/finance/payments → Splynx
                                                         UPDATE payments → Local DB
                                                         DELETE /payments/{id} → ProxyPay
```

1. Fetches **all** pending payments from ProxyPay (`GET /payments`)
2. Filters out payments already tracked in local DB
3. For each pending payment (serially, **isolated per-item**):
   - Inserts local `payments` row (`pending`)
   - Posts to Splynx
   - On **success**: `completed` + delete from ProxyPay
   - On **failure**: `failed` + record in `failed_payments` + continue to next
4. Returns `{message: "done", succeeded: [...], failed: [...]}`

**Key design**: One bad payment never aborts the entire batch.

---

## Flow 4: Batch Reference Update (Admin)

**Trigger**: Admin needs to create/refresh ProxyPay references for Splynx customers.

```
Admin → GET /update-references?limit=100&offset=0 → izinet-api → GET admin/customers/customer → Splynx
                                                                    (for each numeric-login customer)
                                                                    PUT /references/{login} → ProxyPay
```

1. Fetches **all** customers from Splynx (`GET admin/customers/customer`)
2. Filters to only customers with **numeric logins** (skips text/lead logins)
3. Applies pagination from query params
4. For each customer (via `Promise.allSettled`):
   - Calls ProxyPay `PUT /references/{login}` with callback URL and user ID
5. Returns `{message, data: {failedCustomers, successCustomers}}`

---

## Flow 5: Reconciliation Script

**Run via**: `npm run reconcile`

**Purpose**: Fix discrepancies between ProxyPay pending payments and local DB.

```
reconcile.ts → GET /payments → ProxyPay
                (for each pending payment)
                SELECT from payments → Local DB
                → DELETE /payments/{id} (if local=completed, cleanup orphan)
                → POST to Splynx + update local (if local=pending, reprocess)
```

For each pending payment from ProxyPay:
| Local DB state | Action |
|----------------|--------|
| No record | Skip (not yet tracked) |
| `status=completed` | Delete from ProxyPay (cleanup orphan) |
| `status=pending` | Repost to Splynx, mark completed, delete from ProxyPay |
| Error during processing | Mark failed in `failed_payments` |

---

## Flow 6: Health Check

**Endpoint**: `GET /`

Runs `SELECT 1` against MySQL.
- Success: `200 {message: "Izinet payment process API", db: "connected"}`
- Failure: `503 {message: "...", db: "disconnected"}`

---

## Authentication & Authorization

| Mechanism | Used On | How It Works |
|-----------|---------|--------------|
| `x-api-pass` header | `GET /update-references`, `GET /process-payments` | `crypto.timingSafeEqual` against `API_ROUTE_PASS` env var (constant-time comparison) |
| HMAC-SHA1 | `POST /splynxcallback` | Verify `x-splynx-signature` using `SPLYNX_HOOK_SECRET` |
| HMAC-SHA256 | `POST /proxypaycallback` | Verify `x-signature` using `PROXY_PAY_API_KEY` |
| Rate limiting | Both webhooks | 30 req/min per IP (in-memory) |

---

## External Integrations

### ProxyPay
- **Base URL**: `PROXY_PAY_URL` env var
- **Auth**: `Authorization: Token {PROXY_PAY_API_KEY}`
- **API Version**: `application/vnd.proxypay.v2+json`
- **Endpoints**: `PUT /references/{login}`, `GET /payments`, `DELETE /payments/{id}`
- **HTTP client**: Custom wrapper with 3 retries, exponential backoff + jitter, max 10s delay

### Splynx
- **Client**: `splynx-nodejs-api` (community npm package)
- **Auth**: Admin login via `SPLYNX_USER` / `SPLYNX_PASSWORD`
- **Endpoints**: `GET admin/customers/customer`, `POST admin/finance/payments`

---

## Database Schema

### `payments`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | increments | PRIMARY KEY |
| `payment_id` | string | NOT NULL, UNIQUE |
| `status` | enum('pending','completed','failed') | NOT NULL, DEFAULT 'pending' |
| `created_at` | timestamp | NOT NULL |

### `failed_payments`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | increments | PRIMARY KEY |
| `payment_id` | string | NOT NULL |
| `customer_id` | string | NOT NULL |
| `error_message` | text | nullable |
| `retry_count` | integer | NOT NULL, DEFAULT 0 |
| `created_at` | timestamp | NOT NULL |
| `updated_at` | timestamp | NOT NULL |

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Confirm Splynx before recording locally** | Prevents desync — local DB only updates after Splynx confirms |
| **Delete from ProxyPay after processing** | Removes from ProxyPay's queue, preventing double-processing |
| **Payment type "2"** | Hardcoded Splynx payment type for this integration |
| **Skip non-numeric logins** | Customers with text logins (leads) cannot be processed |
| **No automated retries** | Reconciliation script exists as manual/scheduled backfill |
| **Per-item isolation in batches** | One failure never aborts the entire batch |
| **Dual failure recording** | `payments.status=failed` + row in `failed_payments` with full error |
| **Zod env validation at startup** | Fail fast on misconfiguration; clear per-field error messages |
