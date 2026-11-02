'use strict';

/* =========================================================
   CONFIG
   ========================================================= */

// Backend base URL. Take the port from Properties/launchSettings.json
// of the API project (the "https" profile), keep the "/api" at the end.
const API_URL = 'http://localhost:5117/api';

const CURRENCY = 'USD';

// The order MUST be the same as in the C# enums:
//   enum ExpenseType     { Income, Expense }
//   enum ExpenseCategory { Food, Entertainment, Shopping, Health, Other }
const EXPENSE_TYPES      = ['income', 'expense'];
const EXPENSE_CATEGORIES = ['food', 'entertainment', 'shopping', 'health', 'other'];

// true  -> enums are sent as numbers (0, 1, ...): works with the ASP.NET default
// false -> enums are sent as strings ("Income"): needs JsonStringEnumConverter on the backend
const SEND_ENUMS_AS_NUMBERS = true;

const CATEGORY_LABELS = {
  food:          'Food',
  health:        'Health',
  entertainment: 'Entertainment',
  shopping:      'Shopping',
  other:         'Other',
};

/* ---------------------------------------------------------
   ICONS FOR THE HISTORY ROWS (32x32).
   History rows are created by JS, so their icon paths are set here.
   Put the path to the image inside the quotes, for example:
       food: 'img/food.svg',
   (The icons in the sidebar, the calendar and the Statistics rows
   are plain <img> tags in index.html.)
   --------------------------------------------------------- */
const ICONS = {
  food:          '', // <-- path to the Food icon
  health:        '', // <-- path to the Health icon
  entertainment: '', // <-- path to the Entertainment icon
  shopping:      '', // <-- path to the Shopping icon
  other:         '', // <-- path to the Other icon
};

const MONTHS   = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/* Transaction shape used on the frontend:
   {
     id:       string,
     type:     'income' | 'expense',
     amount:   number (always positive),
     category: 'food' | 'health' | 'entertainment' | 'shopping' | 'other',
     note:     string,
     date:     ISO string
   }
*/

/* =========================================================
   API LAYER  (the only place that talks to the backend)
   ========================================================= */

async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    // Content-Type is sent only with a body, so GET stays a "simple" request
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`${method} ${path} failed: ${response.status} ${details}`);
  }
  return response.status === 204 ? null : response.json();
}

/*  C# Expense                 frontend
    Id        (string)    <->  id
    Title     (string)    <->  note
    Amount    (decimal)   <->  amount
    Type      (enum)      <->  type
    Category  (enum)      <->  category
    CreatedAt (DateTime)  <->  date                                  */

// 0 / "Income" / "income"  ->  'income'
function enumFromServer(value, list, fallback) {
  if (typeof value === 'number') return list[value] ?? fallback;
  const key = String(value).toLowerCase();
  return list.includes(key) ? key : fallback;
}

// 'income'  ->  0  or  "Income"
function enumToServer(value, list) {
  if (SEND_ENUMS_AS_NUMBERS) return Math.max(list.indexOf(value), 0);
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// a date without a time zone is treated as UTC
function dateFromServer(value) {
  const text = String(value);
  return /(Z|[+-]\d\d:?\d\d)$/.test(text) ? text : `${text}Z`;
}

// backend -> frontend (ASP.NET sends camelCase)
function fromServer(e) {
  return {
    id:       String(e.id),
    type:     enumFromServer(e.type, EXPENSE_TYPES, 'expense'),
    amount:   Number(e.amount),
    category: enumFromServer(e.category, EXPENSE_CATEGORIES, 'other'),
    note:     e.title || '',
    date:     dateFromServer(e.createdAt),
  };
}

// frontend -> backend (no Id: the controller creates it)
function toServer(t) {
  return {
    title:     t.note,
    amount:    t.amount,
    type:      enumToServer(t.type, EXPENSE_TYPES),
    category:  enumToServer(t.category, EXPENSE_CATEGORIES),
    createdAt: t.date,
  };
}

const api = {
  // GET /api/expenses
  async getAll() {
    const list = await request('/expenses');
    return list.map(fromServer);
  },

  // POST /api/expenses
  async create(transaction) {
    return request('/expenses', { method: 'POST', body: toServer(transaction) });
  },

  // DELETE /api/expenses/{id}
  async remove(id) {
    return request(`/expenses/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};

/* =========================================================
   STATE & ELEMENTS
   ========================================================= */
const state = {
  transactions: [],
  loaded: false,
  failed: false,
};

const $ = (id) => document.getElementById(id);

const els = {
  balance: $('balance'),

  form:      $('add-form'),
  amount:    $('amount'),
  type:      $('type'),
  date:      $('date'),
  dateField: $('date-field'),
  note:      $('note'),
  submit:    $('add-button'),

  history:   $('history-list'),
  rowTpl:    $('transaction-template'),
  hSearch:   $('history-search'),
  hType:     $('history-type'),
  hCategory: $('history-category'),
  hPeriod:   $('history-period'),

  sPeriod:   $('stats-period'),
  sType:     $('stats-type'),
  sTotal:    $('stat-total'),
  sIncome:   $('stat-income'),
  sExpenses: $('stat-expenses'),
  sRows:     [...document.querySelectorAll('.stat-row[data-category]')],
  chart:     $('chart'),
};

/* =========================================================
   HELPERS
   ========================================================= */
const pad = (n) => String(n).padStart(2, '0');

// 1 007 890,70
function formatNumber(value, fixed = false) {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: fixed ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value).replace(/[\u202f\u00a0]/g, '\u00a0');
}

const formatCompact = (value) =>
  new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

const formatDate  = (d) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
const formatTime  = (d) => `${d.getHours()}:${pad(d.getMinutes())}`;
const toInputDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// '2024-05-14' (date input) + current time  ->  ISO string (UTC)
function buildIsoDate(inputValue) {
  const now = new Date();
  return new Date(`${inputValue}T${pad(now.getHours())}:${pad(now.getMinutes())}`).toISOString();
}

function dayLabel(date) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const key = toInputDate(date);
  if (key === toInputDate(today)) return 'Today';
  if (key === toInputDate(yesterday)) return 'Yesterday';
  return formatDate(date);
}

// "1 250,5" / "1250.50"  ->  1250.5
function parseAmount(raw) {
  const n = parseFloat(String(raw).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

const sum = (list) => list.reduce((total, t) => total + t.amount, 0);

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

/* =========================================================
   FILTERING
   ========================================================= */
// period: 'week' | 'month' | 'year'
function inPeriod(isoDate, period) {
  const d = new Date(isoDate);
  const now = new Date();

  if (period === 'week') {
    const daysFromMonday = (now.getDay() + 6) % 7;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysFromMonday);
    return d >= start;
  }
  if (period === 'month') {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  if (period === 'year') {
    return d.getFullYear() === now.getFullYear();
  }
  return true;
}

function getHistoryList() {
  const search   = els.hSearch.value.trim().toLowerCase();
  const type     = els.hType.value;
  const category = els.hCategory.value;
  const period   = els.hPeriod.value;

  return state.transactions
    .filter((t) => {
      if (type !== 'all' && t.type !== type) return false;
      if (category !== 'all' && t.category !== category) return false;
      if (!inPeriod(t.date, period)) return false;

      if (search) {
        const haystack = `${t.note} ${CATEGORY_LABELS[t.category]} ${t.amount}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

/* =========================================================
   RENDER: BALANCE & HISTORY
   ========================================================= */
function renderBalance() {
  const income  = sum(state.transactions.filter((t) => t.type === 'income'));
  const expense = sum(state.transactions.filter((t) => t.type === 'expense'));
  els.balance.textContent = formatNumber(income - expense, true);
}

function createRow(t) {
  const row = els.rowTpl.content.firstElementChild.cloneNode(true);
  const date = new Date(t.date);
  const isIncome = t.type === 'income';

  row.dataset.id = t.id;

  row.querySelector('.transaction__icon').classList.add(`transaction__icon--${t.category}`);
  if (ICONS[t.category]) row.querySelector('img').src = ICONS[t.category];

  row.querySelector('.transaction__name').textContent = t.note || CATEGORY_LABELS[t.category];

  const amount = row.querySelector('.transaction__amount');
  amount.classList.add(isIncome ? 'transaction__amount--plus' : 'transaction__amount--minus');
  amount.textContent = `${isIncome ? '+' : '-'}${formatNumber(t.amount)} ${CURRENCY}`;

  row.querySelector('.transaction__date').textContent = `${formatDate(date)}, ${formatTime(date)}`;
  return row;
}

function setHistoryMessage(text) {
  const message = document.createElement('p');
  message.className = 'empty';
  message.textContent = text;
  els.history.replaceChildren(message);
}

function renderHistory() {
  if (!state.loaded) {
    setHistoryMessage(state.failed ? 'Could not load transactions' : 'Loading...');
    return;
  }

  const list = getHistoryList();
  if (!list.length) {
    setHistoryMessage('No transactions found');
    return;
  }

  const fragment = document.createDocumentFragment();
  let lastDay = '';

  for (const t of list) {
    const day = dayLabel(new Date(t.date));
    if (day !== lastDay) {
      const heading = document.createElement('h3');
      heading.className = 'history__day';
      heading.textContent = day;
      fragment.appendChild(heading);
      lastDay = day;
    }
    fragment.appendChild(createRow(t));
  }

  els.history.replaceChildren(fragment);
}

/* =========================================================
   RENDER: STATISTICS
   ========================================================= */
function renderStats() {
  const period = els.sPeriod.value;
  const type = els.sType.value;

  const inRange = state.transactions.filter((t) => inPeriod(t.date, period));
  const income  = sum(inRange.filter((t) => t.type === 'income'));
  const expense = sum(inRange.filter((t) => t.type === 'expense'));
  const balance = sum(state.transactions.filter((t) => t.type === 'income'))
                - sum(state.transactions.filter((t) => t.type === 'expense'));

  els.sTotal.textContent    = `${formatNumber(balance)} ${CURRENCY}`;
  els.sIncome.textContent   = `+${formatNumber(income)} ${CURRENCY}`;
  els.sExpenses.textContent = `-${formatNumber(expense)} ${CURRENCY}`;

  // "By category": Income -> income only, "Expense" and "All types" -> expenses
  const breakdownType = type === 'income' ? 'income' : 'expense';
  const list = inRange.filter((t) => t.type === breakdownType);
  const total = sum(list);

  for (const row of els.sRows) {
    const amount = sum(list.filter((t) => t.category === row.dataset.category));
    const percent = total ? Math.round((amount / total) * 100) : 0;

    row.querySelector('[data-amount]').textContent = formatNumber(amount);
    row.querySelector('[data-percent]').textContent = `${percent}%`;
    row.querySelector('[data-bar]').style.width = `${percent}%`;
  }

  renderChart(inRange, period, type);
}

/* ---------- chart (inline SVG, no libraries) ---------- */
function bucketKey(date, period) {
  return period === 'year' ? `${date.getFullYear()}-${date.getMonth()}` : toInputDate(date);
}

// the columns of the chart for the selected period
function buildBuckets(period) {
  const now = new Date();
  const year = now.getFullYear();
  const buckets = [];

  if (period === 'year') {
    MONTHS.forEach((name, m) => {
      buckets.push({ key: `${year}-${m}`, label: name, title: `${name} ${year}` });
    });
  } else if (period === 'week') {
    const daysFromMonday = (now.getDay() + 6) % 7;
    for (let i = 0; i < 7; i++) {
      const d = new Date(year, now.getMonth(), now.getDate() - daysFromMonday + i);
      buckets.push({ key: toInputDate(d), label: WEEKDAYS[i], title: formatDate(d) });
    }
  } else {
    const days = new Date(year, now.getMonth() + 1, 0).getDate();
    for (let day = 1; day <= days; day++) {
      const d = new Date(year, now.getMonth(), day);
      buckets.push({ key: toInputDate(d), label: String(day), title: formatDate(d) });
    }
  }
  return buckets;
}

// 1, 2, 5 x 10^n  that is >= value
function niceMax(value) {
  if (value <= 0) return 0;
  const power = 10 ** Math.floor(Math.log10(value));
  const f = value / power;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * power;
}

function renderChart(list, period, type) {
  const showIncome  = type !== 'expense';
  const showExpense = type !== 'income';

  const buckets = buildBuckets(period);
  const indexByKey = new Map(buckets.map((b, i) => [b.key, i]));
  const income  = buckets.map(() => 0);
  const expense = buckets.map(() => 0);

  for (const t of list) {
    const i = indexByKey.get(bucketKey(new Date(t.date), period));
    if (i === undefined) continue;
    if (t.type === 'income') income[i] += t.amount;
    else expense[i] += t.amount;
  }

  const peak = Math.max(0, ...(showIncome ? income : []), ...(showExpense ? expense : []));
  const max = niceMax(peak);

  if (!max) {
    els.chart.innerHTML = '<p class="empty">No data for this period</p>';
    return;
  }

  const series = [];
  if (showIncome)  series.push({ name: 'Income',   cls: 'income',  values: income });
  if (showExpense) series.push({ name: 'Expenses', cls: 'expense', values: expense });

  const W = 710, H = 320;
  const left = 64, right = 16, top = 40, bottom = 34;
  const plotW = W - left - right;
  const plotH = H - top - bottom;
  const groupW = plotW / buckets.length;
  const barW = Math.min((groupW * 0.7) / series.length, 22);
  const labelStep = Math.ceil(buckets.length / 12);

  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Income and expenses overview">`;

  // grid + y axis labels
  for (let i = 0; i <= 5; i++) {
    const y = top + plotH - (plotH * i) / 5;
    svg += `<line class="chart__grid" x1="${left}" x2="${W - right}" y1="${y}" y2="${y}"/>`;
    svg += `<text class="chart__label" x="${left - 8}" y="${y + 4}" text-anchor="end">${formatCompact((max * i) / 5)}</text>`;
  }

  // bars + x axis labels
  buckets.forEach((bucket, i) => {
    const groupX = left + i * groupW + (groupW - barW * series.length) / 2;

    series.forEach((s, j) => {
      const value = s.values[i];
      if (!value) return;
      const h = Math.max((value / max) * plotH, 2);
      svg += `<rect class="chart__bar chart__bar--${s.cls}" x="${groupX + j * barW}" y="${top + plotH - h}" width="${barW}" height="${h}" rx="2">`
          +  `<title>${s.name}, ${bucket.title}: ${formatNumber(value)} ${CURRENCY}</title></rect>`;
    });

    if (i % labelStep === 0) {
      svg += `<text class="chart__label" x="${left + i * groupW + groupW / 2}" y="${H - 10}" text-anchor="middle">${bucket.label}</text>`;
    }
  });

  // legend
  let legendX = left;
  for (const s of series) {
    svg += `<rect class="chart__bar chart__bar--${s.cls}" x="${legendX}" y="12" width="12" height="12" rx="2"/>`;
    svg += `<text class="chart__label" x="${legendX + 18}" y="23">${s.name}</text>`;
    legendX += 100;
  }

  els.chart.innerHTML = `${svg}</svg>`;
}

function renderAll() {
  renderBalance();
  renderHistory();
  renderStats();
}

/* =========================================================
   LOADING DATA
   ========================================================= */
async function loadTransactions() {
  try {
    state.transactions = await api.getAll();
    state.failed = false;
  } catch (error) {
    console.error(error);
    state.failed = true;
    showToast('Could not load transactions');
  } finally {
    state.loaded = true;
    renderAll();
  }
}

/* =========================================================
   ADD FORM
   ========================================================= */
function clearErrors() {
  document.querySelectorAll('.field--error').forEach((el) => el.classList.remove('field--error'));
}

async function handleSubmit(event) {
  event.preventDefault();
  clearErrors();

  const amount = parseAmount(els.amount.value);
  const checked = els.form.querySelector('input[name="category"]:checked');
  let valid = true;

  if (!(amount > 0)) {
    els.amount.classList.add('field--error');
    valid = false;
  }
  if (!els.date.value) {
    els.dateField.classList.add('field--error');
    valid = false;
  }
  if (!checked) {
    showToast('Choose a category');
    valid = false;
  }
  if (!valid) return;

  const transaction = {
    type:     els.type.value,
    amount,
    category: checked.value,
    note:     els.note.value.trim(),
    date:     buildIsoDate(els.date.value),
  };

  els.submit.disabled = true;
  try {
    await api.create(transaction);

    els.amount.value = '';
    els.note.value = '';
    els.date.value = toInputDate(new Date());

    await loadTransactions(); // always show what is really stored in the database
  } catch (error) {
    console.error(error);
    showToast('Could not save the transaction');
  } finally {
    els.submit.disabled = false;
  }
}

/* =========================================================
   HISTORY ACTIONS
   ========================================================= */
async function handleDelete(id) {
  if (!confirm('Delete this transaction?')) return;

  try {
    await api.remove(id);
    await loadTransactions();
  } catch (error) {
    console.error(error);
    showToast('Could not delete the transaction');
  }
}

/* =========================================================
   INIT
   ========================================================= */
function bindEvents() {
  els.form.addEventListener('submit', handleSubmit);

  // remove the red outline as soon as the user edits the field
  els.amount.addEventListener('input', () => els.amount.classList.remove('field--error'));
  els.date.addEventListener('input', () => els.dateField.classList.remove('field--error'));

  // history filters
  els.hSearch.addEventListener('input', renderHistory);
  [els.hType, els.hCategory, els.hPeriod].forEach((el) => el.addEventListener('change', renderHistory));

  // statistics filters
  [els.sPeriod, els.sType].forEach((el) => el.addEventListener('change', renderStats));

  // the "..." button of a row (works for rows created later)
  els.history.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="delete"]');
    if (button) handleDelete(button.closest('.transaction').dataset.id);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  els.date.value = toInputDate(new Date());
  bindEvents();
  renderAll();        // empty state while the data is loading
  loadTransactions(); // GET /api/expenses
});