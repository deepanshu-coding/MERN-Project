/* ============================================================
   SoulLink Co. — Shared JavaScript
   Password-based auth · Full API integration · Auth guard
   ============================================================ */

const API      = 'https://soullink-backendv2.onrender.com/api';
const AUTH     = `${API}/auth`;         // POST /api/auth/login, /api/auth/signup
const INVEST   = `${API}/investments`;  // POST /api/investments
const WITHDRAW = `${API}/withdrawals`;  // POST /api/withdrawals
const PORTFOLIO= `${API}/portfolio`;    // GET  /api/portfolio/:userId
const PAYOUTS  = `${API}/payouts`;      // GET  /api/payouts/:userId
const USERS    = `${API}/users`;        // GET  /api/users/:userId/transactions

// ---- TICKER ----
const tickerData = [
  { sym:'NIFTY 50',  price:'22,418.45',   change:'+0.62%', up:true  },
  { sym:'BANKNIFTY', price:'47,812.30',   change:'+0.84%', up:true  },
  { sym:'SENSEX',    price:'73,961.00',   change:'+0.55%', up:true  },
  { sym:'BITCOIN',   price:'$68,240',     change:'-1.12%', up:false },
  { sym:'GOLD',      price:'₹71,450/10g', change:'+0.31%', up:true  },
  { sym:'USD/INR',   price:'83.42',       change:'-0.08%', up:false },
  { sym:'NIFTY IT',  price:'35,211.60',   change:'+1.22%', up:true  },
  { sym:'CRUDE OIL', price:'$84.62',      change:'+0.18%', up:true  },
];

(function buildTicker() {
  const track = document.getElementById('tickerTrack');
  if (!track) return;
  const all = [...tickerData, ...tickerData];
  track.innerHTML = all.map(t =>
    `<span class="ticker-item">
       <span class="sym">${t.sym}</span>${t.price}
       <span class="${t.up ? 'up' : 'dn'}">${t.change}</span>&nbsp;·
     </span>`
  ).join('');
})();

// ============================================================
// AUTH HELPERS
// ============================================================
const PROTECTED_PAGES = ['portfolio', 'withdraw', 'invest'];

function isLoggedIn()  { return sessionStorage.getItem('slc_auth') === 'true'; }
function getUser()     { return sessionStorage.getItem('slc_user')   || 'Investor'; }
function getUserId()   { return sessionStorage.getItem('slc_userId') || ''; }
function getToken()    { return sessionStorage.getItem('slc_token')  || ''; }
function getRefresh()  { return sessionStorage.getItem('slc_refresh') || ''; }

// Silently refresh the access token using the stored refresh token.
// Returns the new access token string, or '' if refresh fails.
async function refreshAccessToken() {
  const refresh = getRefresh();
  if (!refresh) return '';
  try {
    const res  = await fetch(`${AUTH}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      const newToken   = data.data?.accessToken || '';
      const newRefresh = data.data?.refreshToken || '';
      if (newToken) sessionStorage.setItem('slc_token',   newToken);
      if (newRefresh) sessionStorage.setItem('slc_refresh', newRefresh);
      return newToken;
    }
  } catch (_) {}
  return '';
}

// Fetch wrapper that auto-refreshes on 401 and retries once.
async function authFetch(url, options = {}) {
  let token = getToken();
  options.headers = { ...(options.headers || {}), 'Authorization': `Bearer ${token}` };
  let res = await fetch(url, options);
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      options.headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(url, options);
    }
  }
  return res;
}

function setLoggedIn(name, userId, token) {
  sessionStorage.setItem('slc_auth',   'true');
  sessionStorage.setItem('slc_user',   name   || 'Investor');
  sessionStorage.setItem('slc_userId', userId || '');
  if (token) sessionStorage.setItem('slc_token', token);
}

function logout() {
  sessionStorage.clear();
  window.location.href = 'index.html';
}

// ---- AUTH GUARD — redirect to login if page is protected ----
(function authGuard() {
  const page = location.pathname.split('/').pop().replace('.html', '');
  if (PROTECTED_PAGES.includes(page) && !isLoggedIn()) {
    sessionStorage.setItem('slc_redirect', location.href);
    location.href = 'login.html';
  }
})();

// ---- NAV: highlight active link + show user/login buttons ----
(function setActiveNav() {
  const page = location.pathname.split('/').pop().replace('.html', '');

  document.querySelectorAll('.nav-link').forEach(link => {
    const href  = link.getAttribute('href') || '';
    const lpage = href.replace('.html','').replace('../pages/','').replace('pages/','');
    if (lpage === page) link.classList.add('active');
  });

  const navActions = document.querySelector('.nav-actions');
  if (!navActions) return;

  if (isLoggedIn()) {
    navActions.innerHTML = `
      <span style="font-size:12px;color:var(--ms-blue);padding:0 8px;font-weight:600;">
        ${getUser()}
      </span>
      <button class="btn btn-outline" onclick="logout()">Sign out</button>`;
  } else {
    navActions.innerHTML = `
      <a href="login.html"  style="text-decoration:none"><button class="btn btn-outline">Sign in</button></a>
      <a href="signup.html" style="text-decoration:none"><button class="btn btn-solid">Sign up</button></a>`;
  }
})();

// ============================================================
// UI HELPERS
// ============================================================

// ---- BAR CHART ----
function buildBarChart(cid, lid, data, labels) {
  const c = document.getElementById(cid);
  const l = document.getElementById(lid);
  if (!c) return;
  const max = Math.max(...data);
  c.innerHTML = data.map((v, i) =>
    `<div class="bar" style="height:${(v / max) * 100}%" title="${labels[i]}: ${v}%"></div>`
  ).join('');
  if (l) l.innerHTML = labels.map(lb => `<div class="bar-label">${lb}</div>`).join('');
}

// ---- TOAST — theme-aware colours ----
function toast(msg, type) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  // Light theme: coloured left border instead of coloured background
  el.style.background  = 'rgba(255,255,255,0.92)';
  el.style.color       = type === 'error' ? '#a80000' : type === 'success' ? '#107c10' : 'var(--text)';
  el.style.borderLeft  = type === 'error'   ? '4px solid #a80000'
                       : type === 'success' ? '4px solid #107c10'
                       : '4px solid var(--ms-blue)';
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3800);
}

// ---- TABS ----
function switchTab(name) {
  ['holdings','payouts','transactions'].forEach((t, i) => {
    const el  = document.getElementById('tab-' + t);
    const tab = document.querySelectorAll('.tab')[i];
    if (el)  el.style.display = t === name ? 'block' : 'none';
    if (tab) tab.classList.toggle('active', t === name);
  });
}

// ---- HAMBURGER ----
function toggleNav() {
  document.getElementById('navLinks')?.classList.toggle('open');
  document.getElementById('hamburger')?.classList.toggle('open');
}
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      document.getElementById('navLinks')?.classList.remove('open');
      document.getElementById('hamburger')?.classList.remove('open');
    });
  });
});

// ---- INVEST: payment mode toggle ----
function showPayDetails() {
  const m = document.getElementById('payMode');
  if (!m) return;
  document.getElementById('payDetailsUPI').style.display   = m.value === 'upi'  ? 'block' : 'none';
  document.getElementById('payDetailsBank').style.display  = m.value === 'bank' ? 'block' : 'none';
  document.getElementById('payPlaceholder').style.display  = m.value === ''     ? 'block' : 'none';
}

// ============================================================
// LOGIN  →  POST /api/auth/login
// Accepts: { identifier (aadhaarNumber or userId), password }
// Returns: { success, token, user: { fullName, _id } }
// ============================================================
async function verifyLogin() {
  const identifierEl = document.getElementById('loginIdentifier');
  const passwordEl   = document.getElementById('loginPassword');
  if (!identifierEl || !passwordEl) return;

  const identifier = identifierEl.value.trim().replace(/\s/g, '');
  const password   = passwordEl.value;

  if (!identifier || !password) {
    toast('Enter your Aadhaar / User ID and password', 'error'); return;
  }

  const btn = document.getElementById('loginBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Signing in…'; }

  try {
    const res  = await fetch(`${AUTH}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      // Backend returns: { success, data: { accessToken, refreshToken, user } }
      const payload = data.data || data;
      const userObj = payload.user || {};
      const name    = userObj.fullName || userObj.name || 'Investor';
      const userId  = userObj._id || userObj.id || '';
      const token   = payload.accessToken || payload.token || payload.access_token || '';
      const refresh = payload.refreshToken || '';
      setLoggedIn(name, userId, token);
      if (refresh) sessionStorage.setItem('slc_refresh', refresh);
      toast('Welcome back, ' + name + '!', 'success');
      setTimeout(() => {
        const redir = sessionStorage.getItem('slc_redirect');
        sessionStorage.removeItem('slc_redirect');
        location.href = redir || 'portfolio.html';
      }, 900);
    } else {
      toast(data.message || data.error || 'Invalid credentials. Please try again.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Sign in'; }
    }
  } catch (err) {
    console.error(err);
    toast('Network error. Please try again later.', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Sign in'; }
  }
}

// ============================================================
// SIGNUP  →  POST /api/auth/signup
// Field names must match backend validator exactly:
// fullName, email, mobile, dateOfBirth, aadhaarNumber, panNumber
// bankDetails: { bankName, accountNumber, ifscCode, accountHolderName }
// password (you need to add this to your authController)
// ============================================================
async function submitSignup() {
  const get = sel => document.querySelector(sel)?.value?.trim() || '';

  const fullName          = get('input[placeholder="As per PAN Card"]');
  const email             = get('input[placeholder="you@example.com"]');
  const mobile            = get('input[placeholder="+91 XXXXX XXXXX"]').replace(/\s/g, '').replace('+91','');
  const dateOfBirth       = document.querySelector('input[type="date"]')?.value || '';
  const aadhaarNumber     = get('input[placeholder="XXXX XXXX XXXX"]').replace(/\s/g, '');
  const panNumber         = get('input[placeholder="ABCDE1234F"]').toUpperCase();
  const password          = document.getElementById('signupPassword')?.value || '';
  const confirmPass       = document.getElementById('confirmPassword')?.value || '';
  const bankName          = get('input[placeholder="e.g. State Bank of India"]');
  const accountNumber     = get('input[placeholder="Account Number"]');
  const ifscCode          = get('input[placeholder="e.g. SBIN0001234"]').toUpperCase();
  const accountHolderName = get('input[placeholder="As per bank records"]');

  // Validation
  if (!fullName || !email || !aadhaarNumber || !panNumber || !mobile) {
    toast('Please fill all required fields', 'error'); return;
  }
  if (!/^\d{12}$/.test(aadhaarNumber)) {
    toast('Enter a valid 12-digit Aadhaar number', 'error'); return;
  }
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNumber)) {
    toast('Enter a valid PAN number (e.g. ABCDE1234F)', 'error'); return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    toast('Enter a valid email address', 'error'); return;
  }
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    toast('Enter a valid 10-digit Indian mobile number', 'error'); return;
  }
  if (password.length < 8) {
    toast('Password must be at least 8 characters', 'error'); return;
  }
  if (password !== confirmPass) {
    toast('Passwords do not match', 'error'); return;
  }

  const btn = document.getElementById('signupSubmit');
  if (btn) { btn.disabled = true; btn.textContent = 'Creating account…'; }

  try {
    const res = await fetch(`${AUTH}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName,
        email,
        mobile,
        dateOfBirth,
        aadhaarNumber,
        panNumber,
        password,
        bankDetails: {
          bankName,
          accountNumber,
          ifscCode,
          accountHolderName,
        }
      })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      toast('Account created successfully! Please sign in.', 'success');
      setTimeout(() => location.href = 'login.html', 2000);
    } else {
      // Show the exact validation error from backend if available
      const msg = data.message || data.error
        || (data.errors?.[0]?.msg)
        || 'Sign-up failed. Please try again.';
      toast(msg, 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
    }
  } catch (err) {
    console.error(err);
    toast('Network error. Please try again later.', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
  }
}

// ============================================================
// INVEST  →  POST /api/investments  (requires Bearer token)
// Accepts: { amount, fundName, paymentMode, transactionId }
// Returns: { success, message, data }
// ============================================================
async function submitInvest() {
  const get = sel => document.querySelector(sel)?.value?.trim() || '';

  const amount        = get('input[placeholder="Minimum ₹10,000"]');
  const payModeRaw    = document.getElementById('payMode')?.value || '';
  // Backend expects 'upi' or 'bank_transfer' — form value 'bank' must be remapped
  const paymentMode   = payModeRaw === 'bank' ? 'bank_transfer' : payModeRaw;
  const transactionId =
    document.querySelector('input[placeholder="Enter UTR / Transaction ID"]')?.value?.trim() ||
    document.querySelector('input[placeholder="Enter reference number"]')?.value?.trim() || '';

  // Auth guard: invest is a protected page, but double-check here too
  if (!isLoggedIn()) {
    toast('Please sign in to invest', 'error');
    setTimeout(() => { sessionStorage.setItem('slc_redirect', location.href); location.href = 'login.html'; }, 1200);
    return;
  }
  const token = getToken();
  if (!paymentMode) {
    toast('Please select a payment mode', 'error'); return;
  }
  if (!transactionId) {
    toast('Please enter the UTR / Transaction ID after payment', 'error'); return;
  }
  if (Number(amount) < 10000) {
    toast('Minimum investment amount is ₹10,000', 'error'); return;
  }

  const btn = document.getElementById('investSubmit');
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }

  try {
    const res  = await authFetch(`${INVEST}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount:        parseFloat(amount),
        fundName:      'SoulLink Growth Fund',
        paymentMode,
        transactionId,
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      toast('Investment request submitted! Verification within 24 hours.', 'success');
    } else if (res.status === 401) {
      toast('Session expired — please sign in again.', 'error');
      setTimeout(() => { sessionStorage.clear(); location.href = 'login.html'; }, 1500);
    } else if (res.status === 403) {
      // KYC not approved yet
      const kycStatus = data.kycStatus || 'pending';
      const kycLabels = {
        'pending':      'Your KYC is pending review. Our team will verify your documents within 24–48 hours.',
        'under_review': 'Your KYC is currently under review. You will be notified once approved.',
        'rejected':     'Your KYC was rejected. Please contact support at soullinkco.pvt.ltd@gmail.com.',
      };
      toast(kycLabels[kycStatus] || 'KYC approval required before investing. Please contact support.', 'error');
    } else {
      toast(data.message || data.error || 'Submission failed. Try again.', 'error');
    }
  } catch (err) {
    console.error(err);
    toast('Network error. Please try again later.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Submit Investment Request'; }
  }
}

// ============================================================
// WITHDRAW  →  POST /api/withdrawals  (requires Bearer token)
// Accepts: { amount, withdrawType, investmentId?, remarks }
// Bank details are pulled from the user's stored profile on backend
// Returns: { success, message }
// ============================================================
async function submitWithdraw() {
  const get = sel => document.querySelector(sel)?.value?.trim() || '';

  const amount      = get('input[placeholder="Min ₹1,000"]');
  const purposeSel  = document.getElementById('withdrawPurpose');
  const remarks     = purposeSel?.value || '';

  if (!isLoggedIn()) {
    toast('Please sign in to withdraw', 'error');
    setTimeout(() => { sessionStorage.setItem('slc_redirect', location.href); location.href = 'login.html'; }, 1200);
    return;
  }
  const token = getToken();
  if (!amount) {
    toast('Please enter the withdrawal amount', 'error'); return;
  }
  if (Number(amount) < 1000) {
    toast('Minimum withdrawal amount is ₹1,000', 'error'); return;
  }

  const btn = document.getElementById('withdrawSubmit');
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }

  try {
    const res  = await authFetch(`${WITHDRAW}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount:       parseFloat(amount),
        withdrawType: 'earnings',
        remarks,
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      toast('Withdrawal request submitted. Processing within 3–5 business days.', 'success');
    } else if (res.status === 401) {
      toast('Session expired — please sign in again.', 'error');
      setTimeout(() => { sessionStorage.clear(); location.href = 'login.html'; }, 1500);
    } else {
      toast(data.message || data.error || 'Request failed. Try again.', 'error');
    }
  } catch (err) {
    console.error(err);
    toast('Network error. Please try again later.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Submit Withdrawal Request'; }
  }
}

// ============================================================
// PORTFOLIO PAGE — single API call returns all data
// GET /api/portfolio  (token-based, no userId in URL)
// Returns: { data: { summary, investments, payouts, withdrawals, transactions } }
// ============================================================
(function loadPortfolioData() {
  const page = location.pathname.split('/').pop().replace('.html', '');
  if (page !== 'portfolio') return;

  const token = getToken();

  if (!isLoggedIn() || !token) {
    // Not logged in or token missing — redirect to login
    sessionStorage.setItem('slc_redirect', location.href);
    location.href = 'login.html';
    return;
  }

  const fmt = n => {
    const num = Number(n || 0);
    // Use en-IN for Indian comma grouping (1,00,000 style)
    // minimumFractionDigits:0 avoids ".00" on whole numbers
    // maximumFractionDigits:2 keeps paise when present
    return '₹' + num.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  authFetch(`${PORTFOLIO}`, {
    headers: { 'Content-Type': 'application/json' },
  })
  .then(async r => {
    // If response is not JSON (e.g. HTML error page), handle gracefully
    const contentType = r.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error(`Server returned non-JSON response (${r.status})`);
    }
    return r.json();
  })
  .then(data => {
    if (!data.success) {
      const msg = data.message || 'Failed to load portfolio.';
      ['holdings-tbody','payouts-tbody','transactions-tbody'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--red);">${msg}</td></tr>`;
      });
      return;
    }

    const { summary, investments = [], payouts = [], transactions = [], withdrawals = [] } = data.data;

    // ── KYC status banner ────────────────────────────────
    const kycBanner = document.getElementById('kyc-banner');
    if (kycBanner) {
      const ks = data.data?.kycStatus || summary?.kycStatus || '';
      if (ks && ks !== 'approved') {
        const kycMsgs = {
          'pending':      '⏳ KYC Pending — Your documents are queued for verification (24–48 hrs). You cannot invest until approved.',
          'under_review': '🔍 KYC Under Review — Our team is verifying your documents. You will be notified by email once approved.',
          'rejected':     '❌ KYC Rejected — Please contact support at soullinkco.pvt.ltd@gmail.com to resolve your KYC.',
        };
        kycBanner.textContent = kycMsgs[ks] || 'KYC verification required before investing.';
        kycBanner.style.display = 'block';
      } else if (ks === 'approved') {
        kycBanner.style.display = 'none';
      }
    }

    // ── Summary stats ────────────────────────────────────
    document.getElementById('stat-invested').textContent = fmt(summary?.totalInvested);
    document.getElementById('stat-current').textContent  = fmt(summary?.currentValue);
    document.getElementById('stat-earnings').textContent = (summary?.totalEarnings >= 0 ? '+' : '') + fmt(summary?.totalEarnings);
    document.getElementById('stat-roi').textContent      = (summary?.roi || '0.00') + '%';

    // ── Holdings tab ──────────────────────────────────────
    const holdingsTbody = document.getElementById('holdings-tbody');
    if (!investments.length) {
      holdingsTbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text4);">
        No investments yet. <a href="invest.html" style="color:var(--ms-blue)">Make your first investment →</a>
      </td></tr>`;
    } else {
      holdingsTbody.innerHTML = investments.map(inv => `
        <tr>
          <td><strong>${inv.fundName || inv.fund || 'SoulLink Fund'}</strong></td>
          <td style="font-size:11px;color:var(--text4)">${inv.investedAt ? new Date(inv.investedAt).toLocaleDateString('en-IN') : '—'}</td>
          <td>${fmt(inv.amount)}</td>
          <td><span class="badge badge-blue">${inv.returnRate || 8}% p.m.</span></td>
          <td style="color:var(--green);font-weight:600">${fmt(inv.currentValue || inv.amount)}</td>
          <td style="color:var(--green)">+${fmt((inv.currentValue || inv.amount) - inv.amount)}</td>
          <td><span class="badge badge-green">${inv.status || 'Active'}</span></td>
        </tr>`).join('');
    }

    // ── Payouts tab ───────────────────────────────────────
    const payoutsTbody = document.getElementById('payouts-tbody');
    if (!payouts.length) {
      payoutsTbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text4);">No payouts yet.</td></tr>`;
    } else {
      payoutsTbody.innerHTML = payouts.map(p => `
        <tr>
          <td>${p.month || '—'}</td>
          <td>${p.investment?.fundName || p.fundName || '—'}</td>
          <td>${fmt(p.amount)}</td>
          <td>${p.rate || '8'}%</td>
          <td style="font-size:11px;color:var(--text4)">${p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-IN') : '—'}</td>
          <td><span class="badge ${p.status === 'paid' ? 'badge-green' : 'badge-blue'}">${p.status || 'Pending'}</span></td>
        </tr>`).join('');
    }

    // ── Transactions tab (investments + withdrawals merged) ──
    const txTbody = document.getElementById('transactions-tbody');

    // Combine deposits (investments) and withdrawals into one list
    const deposits = investments.map(inv => ({
      type:      'DEPOSIT',
      amount:    inv.amount,
      method:    inv.paymentMode || 'Bank Transfer',
      reference: inv.transactionId || inv.utrNumber || '—',
      date:      inv.investedAt,
      status:    inv.status === 'active' ? 'Confirmed' : inv.status,
    }));
    const wds = withdrawals.map(w => ({
      type:      'WITHDRAW',
      amount:    w.amount,
      method:    'Bank Transfer',
      reference: w.utrNumber || '—',
      date:      w.requestedAt,
      status:    w.status || 'Processing',
    }));

    const allTx = [...deposits, ...wds].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (!allTx.length) {
      txTbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text4);">No transactions yet.</td></tr>`;
    } else {
      txTbody.innerHTML = allTx.map(t => `
        <tr>
          <td><span class="badge ${t.type === 'DEPOSIT' ? 'badge-green' : 'badge-red'}">${t.type}</span></td>
          <td>${fmt(t.amount)}</td>
          <td>${t.method || '—'}</td>
          <td style="font-size:11px;color:var(--text4)">${t.reference || '—'}</td>
          <td style="font-size:11px;color:var(--text4)">${t.date ? new Date(t.date).toLocaleDateString('en-IN') : '—'}</td>
          <td><span class="badge badge-green">${t.status || 'Confirmed'}</span></td>
        </tr>`).join('');
    }
  })
  .catch(err => {
    console.error('Portfolio fetch error:', err);
    ['holdings-tbody','payouts-tbody','transactions-tbody'].forEach(id => {
      const el = document.getElementById(id);
      const cols = id === 'holdings-tbody' ? 7 : 6;
      if (el) el.innerHTML = `<tr><td colspan="${cols}" style="text-align:center;padding:32px;color:var(--red);">
        Could not load data: ${err.message}
      </td></tr>`;
    });
  });
})();
