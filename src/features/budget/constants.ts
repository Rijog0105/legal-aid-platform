export const EXPENSE_CATEGORIES = [
  'Travel & Transport',
  'Food & Refreshments',
  'Printing & Stationery',
  'Venue & Equipment',
  'Honorarium & Fees',
  'Miscellaneous',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
