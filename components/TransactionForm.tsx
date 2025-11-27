import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { X, Save, CreditCard, Repeat, CalendarClock, TrendingUp, CheckSquare } from 'lucide-react';
import { TransactionType, PaymentMethod, ExpenseType, IncomeType, Transaction } from '../types';
import { generateId, getMonthName } from '../utils';

interface TransactionFormProps {
  onClose: () => void;
  initialData?: Transaction;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ onClose, initialData }) => {
  const { addTransaction, addTransactions, updateTransaction, updateRecurringFuture, categories, showNotification } = useStore();
  const isEditing = !!initialData;

  // Form State
  const [type, setType] = useState<TransactionType>(initialData?.type || 'expense');
  const [amount, setAmount] = useState(initialData?.amount.toString() || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [categoryId, setCategoryId] = useState(initialData?.category || '');
  const [date, setDate] = useState(initialData?.date.split('T')[0] || new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initialData?.paymentMethod || 'cash');
  const [expenseType, setExpenseType] = useState<ExpenseType>(initialData?.expenseType || 'variable');
  const [incomeType, setIncomeType] = useState<IncomeType>(initialData?.incomeType || 'variable');
  const [installments, setInstallments] = useState(1);
  const [isRecurringIncome, setIsRecurringIncome] = useState(false);

  // Edit Mode Specifics
  const [updateFuture, setUpdateFuture] = useState(false);
  const [percentageIncrease, setPercentageIncrease] = useState('');

  // Future Increase Scheduling
  const [showScheduleIncrease, setShowScheduleIncrease] = useState(false);
  const [increaseStartDate, setIncreaseStartDate] = useState('');
  const [increasePercentageFuture, setIncreasePercentageFuture] = useState('');

  // Filter categories by type
  const filteredCategories = categories.filter(c => c.type === type);

  // Effect to handle percentage increase calculation (Immediate)
  useEffect(() => {
    if (isEditing && initialData && percentageIncrease) {
      const pct = parseFloat(percentageIncrease);
      if (!isNaN(pct)) {
        const base = initialData.amount;
        const newAmount = base * (1 + pct / 100);
        setAmount(newAmount.toFixed(2));
        setUpdateFuture(true); // Apply to future by default when using percentage increase
      } else {
        setAmount(initialData.amount.toString());
      }
    } else if (isEditing && initialData && percentageIncrease === '') {
      // Reset to original if cleared
      setAmount(initialData.amount.toString());
    }
  }, [percentageIncrease, isEditing, initialData]);

  const calculateFutureAmount = () => {
    if (!initialData || !increasePercentageFuture) return '0.00';
    const base = initialData.amount;
    const pct = parseFloat(increasePercentageFuture);
    if (isNaN(pct)) return '0.00';
    return (base * (1 + pct / 100)).toFixed(2);
  };

  const handleScheduleIncrease = () => {
    if (!initialData?.recurringId || !increaseStartDate || !increasePercentageFuture) return;

    const newAmount = parseFloat(calculateFutureAmount());

    // Call store action to update future occurrences
    updateRecurringFuture(initialData.recurringId, increaseStartDate, {
      amount: newAmount
    });

    showNotification(`Aumento programado: $${newAmount} a partir del ${increaseStartDate}`, 'success');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) return;

    const [year, month, day] = date.split('-').map(Number);
    const baseDate = new Date(year, month - 1, day, 12, 0, 0);

    // --- CASE: EDITING ---
    if (isEditing && initialData) {
      updateTransaction(initialData.id, {
        amount: numericAmount,
        description,
        category: categoryId,
        date: baseDate.toISOString(),
        originalDate: baseDate.toISOString(), // Update both to keep consistency on single edit
        paymentMethod,
        expenseType: type === 'expense' ? expenseType : undefined,
        incomeType: type === 'income' ? incomeType : undefined,
      }, updateFuture); // Pass the flag to update future recurring transactions

      showNotification(updateFuture ? 'Transacción y futuras actualizadas' : 'Transacción actualizada', 'success');
      onClose();
      return;
    }

    // --- CASE: CREATING ---
    const createdAt = Date.now();

    // --- CASE 1: Recurring Income (Salary/Fixed) ---
    if (type === 'income' && incomeType === 'fixed' && isRecurringIncome) {
      const newTransactions: Transaction[] = [];
      const recurringId = generateId(); // Link all transactions in this series

      for (let i = 0; i < 12; i++) {
        const futureDate = new Date(year, month - 1 + i, day, 12, 0, 0);
        newTransactions.push({
          id: generateId(),
          type: 'income',
          amount: numericAmount,
          description: i === 0 ? description : `${description} (Mes ${i + 1})`,
          category: categoryId,
          date: futureDate.toISOString(),
          originalDate: baseDate.toISOString(),
          paymentMethod: 'transfer',
          isPaid: true,
          createdAt: createdAt + i,
          recurringId: recurringId, // Add ID to group them
          incomeType: 'fixed'
        });
      }
      addTransactions(newTransactions);
      showNotification('Ingreso recurrente proyectado para 12 meses', 'success');
    }
    // --- CASE 2: Credit Card Expense ---
    else if (type === 'expense' && paymentMethod === 'credit_card') {
      const newTransactions: Transaction[] = [];
      const planId = generateId();

      const monthlyAmount = numericAmount / installments;
      let startMonthOffset = 1;
      if (day > 28) {
        startMonthOffset = 2; // If closing date passed, skip next month too
      }

      // Calculate first payment month name for user feedback
      const firstPaymentDate = new Date(year, month - 1 + startMonthOffset, 10);
      const firstPaymentMonthName = getMonthName(firstPaymentDate.getMonth());

      for (let i = 0; i < installments; i++) {
        const futureDate = new Date(year, month - 1 + startMonthOffset + i, 10, 12, 0, 0);

        newTransactions.push({
          id: generateId(),
          type: 'expense',
          amount: monthlyAmount,
          description: installments > 1
            ? `${description} (Cuota ${i + 1}/${installments})`
            : description,
          category: categoryId,
          date: futureDate.toISOString(), // Payment Date
          originalDate: baseDate.toISOString(), // Purchase Date (for tracking)
          paymentMethod: 'credit_card',
          expenseType,
          isPaid: false,
          createdAt: createdAt + i,
          installments: installments > 1 ? {
            current: i + 1,
            total: installments,
            planId
          } : undefined
        });
      }
      addTransactions(newTransactions);
      showNotification(`Gasto registrado. Se paga en ${firstPaymentMonthName}`, 'info');
    }
    // --- CASE 3: Standard Single Transaction ---
    else {
      addTransaction({
        id: generateId(),
        type,
        amount: numericAmount,
        description,
        category: categoryId,
        date: baseDate.toISOString(),
        originalDate: baseDate.toISOString(),
        paymentMethod,
        expenseType: type === 'expense' ? expenseType : undefined,
        incomeType: type === 'income' ? incomeType : undefined,
        isPaid: true,
        createdAt: createdAt,
      });
      showNotification('Transacción guardada correctamente', 'success');
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">
            {isEditing ? 'Editar Transacción' : 'Nueva Transacción'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setType('income')}
              className={`py-2 rounded-md text-sm font-medium transition-all ${type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
            >
              Ingreso
            </button>
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-2 rounded-md text-sm font-medium transition-all ${type === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}
            >
              Gasto
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {!isEditing && type === 'expense' && paymentMethod === 'credit_card' && installments > 1
                  ? 'Monto Total de la Compra'
                  : 'Monto'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => {
                    setAmount(e.target.value);
                    if (percentageIncrease) setPercentageIncrease(''); // Clear % if manual edit
                  }}
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-lg font-semibold"
                  placeholder="0.00"
                  required
                  step="0.01"
                />
              </div>

              {/* Percentage Increase Tool (Only for Editing Income - Immediate) */}
              {isEditing && type === 'income' && !showScheduleIncrease && (
                <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100 animate-in fade-in">
                  <label className="text-xs font-bold text-emerald-700 uppercase mb-1 block flex items-center gap-1">
                    <TrendingUp size={14} />
                    Aplicar Aumento Porcentual (Desde este mes)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative w-24">
                      <input
                        type="number"
                        value={percentageIncrease}
                        onChange={(e) => setPercentageIncrease(e.target.value)}
                        placeholder="0"
                        className="w-full pl-3 pr-6 py-1.5 rounded-lg border border-emerald-200 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">%</span>
                    </div>
                    {percentageIncrease && (
                      <span className="text-xs text-emerald-600 font-medium">
                        Base: ${initialData?.amount} ➜ Nuevo: ${parseFloat(amount).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {!isEditing && type === 'expense' && paymentMethod === 'credit_card' && installments > 1 && amount && (
                <p className="text-xs text-blue-600 mt-1 font-medium">
                  Serán {installments} cuotas de ${(parseFloat(amount) / installments).toFixed(2)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                placeholder="Ej: Supermercado"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                <select
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                  required
                >
                  <option value="" disabled>Seleccionar</option>
                  {/* Group categories by 'group' field */}
                  {Object.entries(
                    filteredCategories.reduce((acc, cat) => {
                      const group = cat.group || 'Otros';
                      if (!acc[group]) acc[group] = [];
                      acc[group].push(cat);
                      return acc;
                    }, {} as Record<string, typeof filteredCategories>)
                  ).map(([groupName, groupCats]) => (
                    <optgroup key={groupName} label={groupName}>
                      {groupCats.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de operación</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  required
                />
              </div>
            </div>

            {/* Income Type Selector */}
            {type === 'income' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Ingreso</label>
                <select
                  value={incomeType}
                  onChange={e => setIncomeType(e.target.value as IncomeType)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none bg-white"
                >
                  <option value="fixed">Fijo (Mensual/Sueldo)</option>
                  <option value="variable">Variable (Extra)</option>
                </select>
              </div>
            )}

            {/* Recurring Income Option - Creation */}
            {!isEditing && type === 'income' && incomeType === 'fixed' && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={isRecurringIncome}
                  onChange={(e) => setIsRecurringIncome(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300"
                />
                <label htmlFor="recurring" className="text-sm text-emerald-800 flex items-center gap-2 cursor-pointer select-none">
                  <Repeat size={16} />
                  Proyectar anualmente (12 meses)
                </label>
              </div>
            )}

            {/* Update Future Recurrings Option - Editing */}
            {isEditing && initialData?.recurringId && !showScheduleIncrease && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                <input
                  type="checkbox"
                  id="updateFuture"
                  checked={updateFuture}
                  onChange={(e) => setUpdateFuture(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="updateFuture" className="text-sm text-blue-800 flex items-center gap-2 cursor-pointer select-none">
                  <CheckSquare size={16} />
                  Actualizar también los meses futuros
                </label>
              </div>
            )}

            {/* Schedule Future Increase (Only for Recurring Income) */}
            {isEditing && type === 'income' && initialData?.recurringId && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowScheduleIncrease(!showScheduleIncrease)}
                  className="text-sm text-indigo-600 font-medium flex items-center gap-2 hover:text-indigo-800"
                >
                  <CalendarClock size={16} />
                  {showScheduleIncrease ? 'Cancelar programación de aumento' : 'Programar aumento futuro'}
                </button>

                {showScheduleIncrease && (
                  <div className="mt-3 p-4 bg-indigo-50 rounded-xl border border-indigo-100 animate-in slide-in-from-top-2">
                    <h4 className="text-sm font-bold text-indigo-900 mb-3">Programar Aumento de Sueldo</h4>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-indigo-700 mb-1">A partir de (fecha)</label>
                        <input
                          type="date"
                          value={increaseStartDate}
                          onChange={e => setIncreaseStartDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-indigo-200 text-sm"
                        />
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-indigo-700 mb-1">Porcentaje %</label>
                          <input
                            type="number"
                            value={increasePercentageFuture}
                            onChange={e => setIncreasePercentageFuture(e.target.value)}
                            placeholder="5"
                            className="w-full px-3 py-2 rounded-lg border border-indigo-200 text-sm"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-indigo-700 mb-1">Nuevo Monto</label>
                          <div className="px-3 py-2 bg-white rounded-lg border border-indigo-200 text-sm font-semibold text-slate-700">
                            ${calculateFutureAmount()}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleScheduleIncrease}
                        disabled={!increaseStartDate || !increasePercentageFuture}
                        className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Aplicar Aumento Programado
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {type === 'expense' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Medio de Pago</label>
                    <select
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none bg-white"
                    >
                      <option value="cash">Efectivo</option>
                      <option value="debit_card">Débito</option>
                      <option value="credit_card">Tarjeta de Crédito</option>
                      <option value="transfer">Transferencia</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                    <select
                      value={expenseType}
                      onChange={e => setExpenseType(e.target.value as ExpenseType)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none bg-white"
                    >
                      <option value="variable">Variable</option>
                      <option value="fixed">Fijo (Mensual)</option>
                    </select>
                  </div>
                </div>

                {/* Installments logic - Hide or simplify on Edit */}
                {!isEditing && paymentMethod === 'credit_card' && (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 text-blue-800 font-medium mb-2">
                      <CreditCard size={18} />
                      <span>Plan de Cuotas</span>
                    </div>
                    <div className="mb-2">
                      <label className="block text-xs text-blue-600 mb-1 uppercase font-bold">Cantidad de Cuotas</label>
                      <select
                        value={installments}
                        onChange={e => setInstallments(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-blue-200 text-blue-900 outline-none bg-white text-sm"
                      >
                        {[1, 2, 3, 4, 5, 6, 9, 12, 18, 24].map(n => (
                          <option key={n} value={n}>{n} Cuota{n > 1 ? 's' : ''}</option>
                        ))}
                      </select>
                    </div>
                    <p className="text-xs text-blue-500 leading-relaxed">
                      * La primera cuota se impactará en {parseInt(date.split('-')[2]) > 28 ? '2 meses' : 'el próximo mes'} (simulando cierre de tarjeta).
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-slate-800 text-white py-3.5 rounded-xl font-semibold transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
            >
              <Save size={20} />
              {isEditing ? 'Actualizar Transacción' : 'Guardar Transacción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};