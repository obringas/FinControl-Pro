
import { MonthlyStats, Transaction } from './types';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

export const getMonthName = (monthIndex: number): string => {
  const date = new Date(2000, monthIndex, 1);
  return date.toLocaleString('es-ES', { month: 'long' });
};

export const calculateMonthlyStats = (transactions: Transaction[], month: number, year: number): MonthlyStats => {
  // Standard stats based on Payment Date (Cash Flow)
  const filtered = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  const totalIncome = filtered
    .filter(t => t.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpense = filtered
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const balance = totalIncome - totalExpense;

  // Calculate Credit Card Consumption (Debt generated this month)
  // Sum all transaction parts where originalDate is in this month
  const creditCardConsumption = transactions
    .filter(t => {
      if (t.type !== 'expense' || t.paymentMethod !== 'credit_card' || !t.originalDate) return false;
      const d = new Date(t.originalDate);
      return d.getMonth() === month && d.getFullYear() === year;
    })
    .reduce((acc, curr) => acc + curr.amount, 0);

  let usagePercentage = 0;
  if (totalIncome > 0) {
    usagePercentage = (totalExpense / totalIncome) * 100;
  } else if (totalExpense > 0) {
    usagePercentage = 100; // All debt
  }

  let healthColor: 'green' | 'yellow' | 'red' = 'green';
  if (usagePercentage > 95) healthColor = 'red';
  else if (usagePercentage > 70) healthColor = 'yellow';

  return {
    totalIncome,
    totalExpense,
    balance,
    usagePercentage,
    healthColor,
    creditCardConsumption
  };
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

// Helper to group data for charts
export const getCategoryData = (transactions: Transaction[], month: number, year: number) => {
  const filtered = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === month && d.getFullYear() === year && t.type === 'expense';
  });

  const groups: Record<string, number> = {};
  filtered.forEach(t => {
    groups[t.category] = (groups[t.category] || 0) + t.amount;
  });

  return Object.keys(groups).map(key => ({
    name: key,
    value: groups[key],
  }));
};

export const getMonthlyTrendData = (transactions: Transaction[], currentMonth: number, currentYear: number) => {
  const data = [];

  // Range: Show 2 months back and 9 months forward relative to the selected date
  for (let i = -2; i <= 9; i++) {
    const d = new Date(currentYear, currentMonth + i, 1);
    const m = d.getMonth();
    const y = d.getFullYear();

    const stats = calculateMonthlyStats(transactions, m, y);

    // Calculate Credit Card specific metrics
    // 1. Payments (Cash Flow): How much am I paying for CC this month?
    const ccPayments = transactions
      .filter(t => {
        const td = new Date(t.date);
        return t.type === 'expense' && t.paymentMethod === 'credit_card' && td.getMonth() === m && td.getFullYear() === y;
      })
      .reduce((acc, curr) => acc + curr.amount, 0);

    // 2. Consumption (New Debt): How much did I swipe/buy this month?
    const ccConsumption = transactions
      .filter(t => {
        if (t.type !== 'expense' || t.paymentMethod !== 'credit_card' || !t.originalDate) return false;
        const td = new Date(t.originalDate);
        return td.getMonth() === m && td.getFullYear() === y;
      })
      .reduce((acc, curr) => acc + curr.amount, 0);

    // Short month name + year if it's January
    let name = getMonthName(m).substring(0, 3);
    if (m === 0 || i === -2) {
      name += ` '${y.toString().substring(2)}`;
    }

    data.push({
      name: name,
      Ingresos: stats.totalIncome,
      Gastos: stats.totalExpense,
      Balance: stats.balance,
      ConsumoTC: ccConsumption,
      PagosTC: ccPayments
    });
  }
  return data;
};

export const convertToCSV = (transactions: Transaction[], categories: { id: string, name: string }[]) => {
  // Headers for Excel (Spanish)
  const headers = ['Fecha Pago', 'Tipo', 'Categoría', 'Descripción', 'Monto', 'Medio de Pago', 'Plan Cuotas', 'Fecha Compra Original'];

  const rows = transactions.map(t => {
    const categoryName = categories.find(c => c.id === t.category)?.name || 'Otros';
    const typeLabel = t.type === 'income' ? 'Ingreso' : 'Gasto';

    const methodLabel = {
      'cash': 'Efectivo',
      'debit_card': 'Débito',
      'credit_card': 'Crédito',
      'transfer': 'Transferencia'
    }[t.paymentMethod] || t.paymentMethod;

    const installmentLabel = t.installments
      ? `Cuota ${t.installments.current}/${t.installments.total}`
      : '-';

    // Format dates for Excel YYYY-MM-DD
    const date = t.date.split('T')[0];
    const originalDate = t.originalDate ? t.originalDate.split('T')[0] : date;

    return [
      date,
      typeLabel,
      categoryName,
      `"${t.description.replace(/"/g, '""')}"`, // Escape quotes
      t.amount, // Raw number for Excel calculation
      methodLabel,
      installmentLabel,
      originalDate
    ].join(';'); // Semicolon is safer for Spanish Excel (comma is decimal separator)
  });

  return [headers.join(';'), ...rows].join('\n');
};
export const getCategoryTrendData = (transactions: Transaction[], currentMonth: number, currentYear: number, categories: { id: string, name: string }[]) => {
  const data = [];

  // Range: Show 2 months back and 9 months forward
  for (let i = -2; i <= 9; i++) {
    const d = new Date(currentYear, currentMonth + i, 1);
    const m = d.getMonth();
    const y = d.getFullYear();

    // Filter expenses for this month
    const monthlyExpenses = transactions.filter(t => {
      const td = new Date(t.date);
      return t.type === 'expense' && td.getMonth() === m && td.getFullYear() === y;
    });

    // Group by Category Name (to use as keys in Recharts)
    const monthlyData: Record<string, any> = {};

    // Initialize all categories to 0 to ensure stacked bars work correctly even if 0
    categories.forEach(c => {
      monthlyData[c.name] = 0;
    });

    monthlyExpenses.forEach(t => {
      const catName = categories.find(c => c.id === t.category)?.name || 'Otros';
      monthlyData[catName] = (monthlyData[catName] || 0) + t.amount;
    });

    // Short month name + year if needed
    let name = getMonthName(m).substring(0, 3);
    if (m === 0 || i === -2) {
      name += ` '${y.toString().substring(2)}`;
    }

    data.push({
      name,
      ...monthlyData
    });
  }
  return data;
};
