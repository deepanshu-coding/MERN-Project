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
const PROTECTED_PAGES = ['portfolio', 'withdraw'];

function isLoggedIn()  { return sessionStorage.getItem('slc_auth') === 'true'; }
function getUser()     { return sessionStorage.getItem('slc_user')   || 'Investor'; }
function getUserId()   { return sessionStorage.getItem('slc_userId') || ''; }

function setLoggedIn(name, userId) {
  sessionStorage.setItem('slc_auth',   'true');
  sessionStorage.setItem('slc_user',   name   || 'Investor');
  sessionStorage.setItem('slc_userId', userId || '');
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
// LOGIN  →  POST /api/login
// Accepts: { identifier (aadhaar or userId), password }
// Returns: { success, name, userId }
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
      setLoggedIn(data.name, data.userId);
      toast('Welcome back, ' + (data.name || 'Investor') + '!', 'success');
      setTimeout(() => {
        const redir = sessionStorage.getItem('slc_redirect');
        sessionStorage.removeItem('slc_redirect');
        location.href = redir || 'portfolio.html';
      }, 900);
    } else {
      toast(data.error || 'Invalid credentials. Please try again.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Sign in'; }
    }
  } catch (err) {
    console.error(err);
    toast('Network error. Please try again later.', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Sign in'; }
  }
}

// ============================================================
// SIGNUP  →  POST /api/signup
// Accepts: { fullname, email, mobile, dob, aadhaar, pan,
//            password, bank_name, account_number, ifsc, holder_name }
// Returns: { success, userId }
// ============================================================
async function submitSignup() {
  const get = sel => document.querySelector(sel)?.value?.trim() || '';

  const fullname       = get('input[placeholder="As per PAN Card"]');
  const email          = get('input[placeholder="you@example.com"]');
  const mobile         = get('input[placeholder="+91 XXXXX XXXXX"]');
  const dob            = document.querySelector('input[type="date"]')?.value || '';
  const aadhaar        = get('input[placeholder="XXXX XXXX XXXX"]').replace(/\s/g, '');
  const pan            = get('input[placeholder="ABCDE1234F"]').toUpperCase();
  const password       = document.getElementById('signupPassword')?.value || '';
  const confirmPass    = document.getElementById('confirmPassword')?.value || '';
  const bank_name      = get('input[placeholder="e.g. State Bank of India"]');
  const account_number = get('input[placeholder="Account Number"]');
  const ifsc           = get('input[placeholder="e.g. SBIN0001234"]').toUpperCase();
  const holder_name    = get('input[placeholder="As per bank records"]');

  // Validation
  if (!fullname || !email || !aadhaar || !pan || !password) {
    toast('Please fill all required fields', 'error'); return;
  }
  if (aadhaar.length !== 12) {
    toast('Enter a valid 12-digit Aadhaar number', 'error'); return;
  }
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
    toast('Enter a valid PAN number (e.g. ABCDE1234F)', 'error'); return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    toast('Enter a valid email address', 'error'); return;
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
    const res  = await fetch(`${AUTH}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullname, email, mobile, dob, aadhaar, pan, password,
        bank_name, account_number, ifsc, holder_name
      })
    });
    const data = await res.json();

    if (res.ok) {
      toast('Account created! Your User ID: ' + (data.userId || ''), 'success');
      setTimeout(() => location.href = 'login.html', 2500);
    } else {
      toast(data.error || 'Sign-up failed. Please try again.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
    }
  } catch (err) {
    console.error(err);
    toast('Network error. Please try again later.', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
  }
}

// ============================================================
// INVEST  →  POST /api/invest
// Accepts: { fullName, email, aadhaar, pan, amount,
//            paymentMode, transactionId, userId }
// Returns: { success, message }
// ============================================================
async function submitInvest() {
  const get = sel => document.querySelector(sel)?.value?.trim() || '';

  const fullName      = get('input[placeholder="As per Aadhaar"]');
  const email         = get('input[placeholder="you@example.com"]');
  const aadhaar       = get('input[placeholder="XXXX XXXX XXXX"]').replace(/\s/g, '');
  const pan           = get('input[placeholder="ABCDE1234F"]');
  const amount        = get('input[placeholder="Minimum ₹10,000"]');
  const bankAccount   = get('input[placeholder="Account Number"]');
  const ifsc          = get('input[placeholder="e.g. BARB0PIYRE"]');
  const paymentMode   = document.getElementById('payMode')?.value || '';
  const transactionId =
    document.querySelector('input[placeholder="Enter UTR / Transaction ID"]')?.value?.trim() ||
    document.querySelector('input[placeholder="Enter reference number"]')?.value?.trim() || '';

  if (!fullName || !email || !aadhaar || !pan || !amount) {
    toast('Please fill all personal details', 'error'); return;
  }
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
    const res  = await fetch(`${INVEST}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName, email, aadhaar, pan, amount,
        bankAccount, ifsc, paymentMode, transactionId,
        userId: getUserId()   // attach userId if already logged in
      })
    });
    const data = await res.json();
    if (res.ok) {
      toast('Investment request submitted! Verification within 24 hours.', 'success');
    } else {
      toast(data.error || 'Submission failed. Try again.', 'error');
    }
  } catch (err) {
    console.error(err);
    toast('Network error. Please try again later.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Submit Investment Request'; }
  }
}

// ============================================================
// WITHDRAW  →  POST /api/withdraw
// Accepts: { name, email, aadhaar, amount, fund,
//            purpose, bankAccount, ifsc, userId }
// Returns: { success, message }
// ============================================================
async function submitWithdraw() {
  const get = sel => document.querySelector(sel)?.value?.trim() || '';

  const name        = get('input[placeholder="Your registered name"]');
  const email       = get('input[placeholder="your@email.com"]');
  const aadhaar     = get('input[placeholder="XXXX XXXX XXXX"]').replace(/\s/g, '');
  const amount      = get('input[placeholder="Min ₹1,000"]');
  const bankAccount = get('input[placeholder="Your bank account number"]');
  const ifsc        = get('input[placeholder="Your bank IFSC"]');
  const fundSel     = document.getElementById('withdrawFund');
  const purposeSel  = document.getElementById('withdrawPurpose');
  const fund        = fundSel?.value    || '';
  const purpose     = purposeSel?.value || '';

  if (!name || !email || !aadhaar || !amount || !bankAccount || !ifsc) {
    toast('Please fill all required fields', 'error'); return;
  }
  if (Number(amount) < 1000) {
    toast('Minimum withdrawal amount is ₹1,000', 'error'); return;
  }

  const btn = document.getElementById('withdrawSubmit');
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }

  try {
    const res  = await fetch(`${WITHDRAW}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, email, aadhaar, amount, fund, purpose,
        bankAccount, ifsc, userId: getUserId()
      })
    });
    const data = await res.json();
    if (res.ok) {
      toast('Withdrawal request submitted. Processing within 3–5 business days.', 'success');
    } else {
      toast(data.error || 'Request failed. Try again.', 'error');
    }
  } catch (err) {
    console.error(err);
    toast('Network error. Please try again later.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Submit Withdrawal Request'; }
  }
}

// ============================================================
// PORTFOLIO PAGE — load all three tabs from API
// GET /api/user/investments/:userId   → holdings tab
// GET /api/user/payouts/:userId       → payouts tab
// GET /api/user/transactions/:userId  → transactions tab
// ============================================================
(function loadPortfolioData() {
  const page   = location.pathname.split('/').pop().replace('.html', '');
  if (page !== 'portfolio') return;
  const userId = getUserId();
  if (!userId) return;

  // ---- Holdings ----
  fetch(`${PORTFOLIO}/${userId}`)
    .then(r => r.json())
    .then(data => {
      const tbody = document.querySelector('#tab-holdings tbody');
      if (!tbody || !data.investments?.length) return;

      // Update summary stats from live data
      const totalInvested    = data.investments.reduce((s, i) => s + Number(i.amount), 0);
      const totalCurrent     = data.investments.reduce((s, i) => s + Number(i.currentValue || i.amount), 0);
      const totalEarnings    = totalCurrent - totalInvested;
      const roi              = totalInvested ? ((totalEarnings / totalInvested) * 100).toFixed(2) : '0.00';

      const fmt = n => '₹' + Number(n).toLocaleString('en-IN');
      const setVal = (idx, val, color) => {
        const el = document.querySelectorAll('.ps-val')[idx];
        if (el) { el.textContent = val; if (color) el.style.color = color; }
      };
      setVal(0, fmt(totalInvested));
      setVal(1, fmt(totalCurrent),  'var(--green)');
      setVal(2, (totalEarnings >= 0 ? '+' : '') + fmt(totalEarnings), 'var(--green)');
      setVal(3, roi + '%', 'var(--ms-blue)');

      tbody.innerHTML = data.investments.map(inv => `
        <tr>
          <td><strong>${inv.fund || 'SoulLink Fund'}</strong></td>
          <td style="font-size:11px;color:var(--text4)">${inv.date || '—'}</td>
          <td>${'₹' + Number(inv.amount).toLocaleString('en-IN')}</td>
          <td><span class="badge badge-blue">8% p.m.</span></td>
          <td style="color:var(--green);font-weight:600">${'₹' + Number(inv.currentValue || inv.amount).toLocaleString('en-IN')}</td>
          <td style="color:var(--green)">${'+₹' + Number((inv.currentValue || inv.amount) - inv.amount).toLocaleString('en-IN')}</td>
          <td><span class="badge badge-green">${inv.status || 'Active'}</span></td>
        </tr>`).join('');

      // Also populate withdraw fund selector with real funds
      const sel = document.getElementById('withdrawFund');
      if (sel) {
        sel.innerHTML = data.investments.map(inv =>
          `<option value="${inv.fund}">${inv.fund} (Available: ₹${Number((inv.currentValue||inv.amount) - inv.amount).toLocaleString('en-IN')})</option>`
        ).join('');
      }
    })
    .catch(err => console.error('Investments fetch error:', err));

  // ---- Payouts ----
  fetch(`${PAYOUTS}/${userId}`)
    .then(r => r.json())
    .then(data => {
      const tbody = document.querySelector('#tab-payouts tbody');
      if (!tbody || !data.payouts?.length) return;
      tbody.innerHTML = data.payouts.map(p => `
        <tr>
          <td>${p.month || '—'}</td>
          <td>${p.fund  || '—'}</td>
          <td>${'₹' + Number(p.amount).toLocaleString('en-IN')}</td>
          <td>${p.rate  || '8%'}</td>
          <td style="font-size:11px;color:var(--text4)">${p.date || '—'}</td>
          <td><span class="badge ${p.status === 'Paid' ? 'badge-green' : 'badge-blue'}">${p.status || 'Pending'}</span></td>
        </tr>`).join('');
    })
    .catch(err => console.error('Payouts fetch error:', err));

  // ---- Transactions ----
  fetch(`${USERS}/${userId}/transactions`)
    .then(r => r.json())
    .then(data => {
      const tbody = document.querySelector('#tab-transactions tbody');
      if (!tbody || !data.transactions?.length) return;
      tbody.innerHTML = data.transactions.map(t => `
        <tr>
          <td><span class="badge ${t.type === 'DEPOSIT' ? 'badge-green' : 'badge-red'}">${t.type}</span></td>
          <td>${'₹' + Number(t.amount).toLocaleString('en-IN')}</td>
          <td>${t.method || '—'}</td>
          <td style="font-size:11px;color:var(--text4)">${t.reference || '—'}</td>
          <td style="font-size:11px;color:var(--text4)">${t.date || '—'}</td>
          <td><span class="badge badge-green">${t.status || 'Confirmed'}</span></td>
        </tr>`).join('');
    })
    .catch(err => console.error('Transactions fetch error:', err));
})();
