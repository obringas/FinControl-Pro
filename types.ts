
export type TransactionType = 'income' | 'expense';
export type PaymentMethod = 'cash' | 'debit_card' | 'credit_card' | 'transfer';
export type ExpenseType = 'fixed' | 'variable';
export type IncomeType = 'fixed' | 'variable';

export interface InstallmentDetails {
  current: number;
  total: number;
  planId: string; // To link recurring installments
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  expenseType?: ExpenseType; // Only for expenses
  incomeType?: IncomeType; // Only for incomes
  category: string;
  date: string; // ISO string (Payment/Impact Date)
  originalDate?: string; // ISO string (Purchase/Transaction Date)
  paymentMethod: PaymentMethod;
  installments?: InstallmentDetails;
  recurringId?: string; // For grouped transactions (e.g. Salary 12 months)
  isPaid: boolean;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string; // Lucide icon name
  type: TransactionType;
  group?: string; // High-level grouping (e.g. Vivienda, Transporte)
}

export interface MonthlyStats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  usagePercentage: number;
  healthColor: 'green' | 'yellow' | 'red';
  creditCardConsumption: number;
}

export interface FilterState {
  month: number;
  year: number;
  category?: string;
  type?: TransactionType | 'all';
}

export interface Notification {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}