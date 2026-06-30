# SoulLink Co. — Frontend Redesign
## Microsoft Fluent Design System Inspired

---

## File Structure

```
soullink/
├── css/
│   └── shared.css          ← All styles (Microsoft Fluent-inspired)
├── js/
│   └── shared.js           ← Auth, API calls, shared logic
└── pages/
    ├── index.html          ← Home (public)
    ├── login.html          ← Sign in (public)
    ├── signup.html         ← Create account (public)
    ├── invest.html         ← Investment form (public)
    ├── portfolio.html      ← Dashboard (LOGIN REQUIRED)
    ├── withdraw.html       ← Withdraw funds (LOGIN REQUIRED)
    ├── about.html          ← About us (public)
    ├── financials.html     ← Company financials (public)
    ├── team.html           ← Our team (public)
    ├── services.html       ← Services (public)
    ├── privacy.html        ← Privacy policy (public)
    └── terms.html          ← Terms & conditions (public)
```

Place your `assets/` folder (brand_logo.png, qr-code.jpeg) at the same level as `css/`, `js/`, `pages/`.

---

## Authentication Flow

### How it works:
1. User creates account on `signup.html` → sends to `POST /api/signup` with a **password**
2. Backend hashes password (bcrypt), stores user, returns a **User ID** (e.g. `SLC-000123`)
3. User logs in on `login.html` using their **Aadhaar or User ID** + **password**
4. Backend verifies → returns `{ success: true, name, userId }`
5. Frontend stores auth in `sessionStorage` — **Portfolio and Withdraw are hidden until logged in**
6. Nav bar shows username + "Sign out" button when authenticated

---

## Backend API Contract

**Base URL:** `https://soullink-backendv2.onrender.com/api`

### POST /api/signup
**Request:**
```json
{
  "fullname": "Rahul Sharma",
  "email": "rahul@example.com",
  "mobile": "+91 98765 43210",
  "dob": "1995-06-15",
  "aadhaar": "123456789012",
  "pan": "ABCDE1234F",
  "password": "MyPassword123",
  "bank_name": "State Bank of India",
  "account_number": "1234567890",
  "ifsc": "SBIN0001234",
  "holder_name": "Rahul Sharma"
}
```
**Response (200):**
```json
{
  "success": true,
  "userId": "SLC-000123",
  "message": "Account created successfully"
}
```
**Response (400/409):**
```json
{ "error": "Aadhaar already registered" }
```

> **Backend must:** Hash password with bcrypt (cost ≥ 10), generate unique `userId` like `SLC-XXXXXX`, store all fields.

---

### POST /api/login
**Request:**
```json
{
  "identifier": "123456789012",
  "password": "MyPassword123"
}
```
> `identifier` can be either a 12-digit Aadhaar number OR a User ID like `SLC-000123`

**Response (200):**
```json
{
  "success": true,
  "name": "Rahul Sharma",
  "userId": "SLC-000123"
}
```
**Response (401):**
```json
{ "error": "Invalid credentials" }
```

> **Backend must:** Accept both Aadhaar and userId as identifier, compare bcrypt hash.

---

### POST /api/invest
**Request:**
```json
{
  "fullName": "Rahul Sharma",
  "email": "rahul@example.com",
  "aadhaar": "123456789012",
  "pan": "ABCDE1234F",
  "amount": "50000",
  "paymentMode": "upi",
  "transactionId": "UTR123456789"
}
```
**Response (200):**
```json
{ "success": true, "message": "Investment request received" }
```

---

### POST /api/withdraw
**Request:**
```json
{
  "name": "Rahul Sharma",
  "email": "rahul@example.com",
  "aadhaar": "123456789012",
  "amount": "5000",
  "purpose": "Withdraw Monthly Earnings",
  "bankAccount": "1234567890",
  "ifsc": "SBIN0001234",
  "userId": "SLC-000123"
}
```
**Response (200):**
```json
{ "success": true, "message": "Withdrawal request submitted" }
```

---

### GET /api/user/investments/:userId
**Response (200):**
```json
{
  "investments": [
    {
      "fund": "SoulLink Growth Fund",
      "date": "Jan 2024",
      "amount": 50000,
      "currentValue": 57480,
      "status": "Active"
    }
  ]
}
```

---

## Session Storage Keys

| Key | Value | Description |
|-----|-------|-------------|
| `slc_auth` | `"true"` | Is user logged in |
| `slc_user` | `"Rahul Sharma"` | Display name |
| `slc_userId` | `"SLC-000123"` | User ID from DB |
| `slc_redirect` | URL string | Page to return to after login |

---

## Notes
- All pages link to assets via `../assets/` — keep your assets folder at root level
- CSS and JS loaded via `../css/shared.css` and `../js/shared.js`
- No jQuery or external JS libraries required
- Fonts loaded from Google Fonts (Segoe UI fallback works offline)
