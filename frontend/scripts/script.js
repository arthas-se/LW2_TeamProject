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
