'use strict';

/* =========================================================
   CONFIG
   ========================================================= */

// Backend base URL. Take the port from Properties/launchSettings.json
// of the API project (the "https" profile), keep the "/api" at the end.
const API_URL = 'https://localhost:7127/api';

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

