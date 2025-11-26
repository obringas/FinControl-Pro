
export type TransactionType = 'income' | 'expense';
export type PaymentMethod = 'cash' | 'debit_card' | 'credit_card' | 'transfer';
export type ExpenseType = 'fixed' | 'variable';

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