import React, { useState, useEffect } from 'react';
import { generateId, getMonthName } from '../utils';
import { useStore } from '../store';
import { TransactionType, PaymentMethod, ExpenseType, Transaction } from '../types';
import { X, Save, Repeat, CreditCard, CheckSquare } from 'lucide-react';

interface TransactionFormProps {
  onClose: () => void;
  initialData?: Transaction | null;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ onClose, initialData }) => {
  const { addTransaction, addTransactions, updateTransaction, categories, showNotification } = useStore();
  
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [expenseType, setExpenseType] = useState<ExpenseType>('variable');
  const [installments, setInstallments] = useState(1);
  const [isRecurringIncome, setIsRecurringIncome] = useState(false);
  
  // New state for editing future recurring events
  const [updateFuture, setUpdateFuture] = useState(false);

  const isEditing = !!initialData;

  // Initialize form if editing
  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setAmount(initialData.amount.toString());
      setDescription(initialData.description);
      setCategoryId(initialData.category);
      // Handle date conversion safely
      setDate(initialData.date.split('T')[0]);
      setPaymentMethod(initialData.paymentMethod);
      if (initialData.expenseType) setExpenseType(initialData.expenseType);
      // Disable recurring/installments logic visually for simple edits
      // We generally don't want to re-trigger 12 month generation on a single edit
    }
  }, [initialData]);

  // Filter categories based on selected type
  const filteredCategories = categories.filter(c => c.type === type);

  // Auto-select first category when switching types (only if not editing or if category invalid)
  useEffect(() => {
    if (!initialData && filteredCategories.length > 0 && !categoryId) {
      setCategoryId(filteredCategories[0].id);
    } else if (!initialData) {
        // Only reset if we are not editing
        if (filteredCategories.length > 0) {
             const defaultCat = filteredCategories[0].id;
             setCategoryId(defaultCat);
        } else {
            setCategoryId('');
        }
    }
  }, [type, filteredCategories, initialData, categoryId]);

  // Auto-enable recurring for Salary (Only on creation)
  useEffect(() => {
    if (!isEditing) {
        if (type === 'income' && categoryId === 'cat_salary') {
        setIsRecurringIncome(true);
        } else if (type === 'income') {
        setIsRecurringIncome(false);
        }
    }
  }, [categoryId, type, isEditing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !categoryId) return;

    const numericAmount = parseFloat(amount);
    const [year, month, day] = date.split('-').map(Number);
    // Fix Timezone issue: Set to noon to avoid date shifting
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
        }, updateFuture); // Pass the flag to update future recurring transactions

        showNotification(updateFuture ? 'Transacción y futuras actualizadas' : 'Transacción actualizada', 'success');
        onClose();
        return;
    }

    // --- CASE: CREATING ---
    const createdAt = Date.now();

    // --- CASE 1: Recurring Income (Salary) ---
    if (type === 'income' && isRecurringIncome) {
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
          recurringId: recurringId // Add ID to group them
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
                  onChange={e => setAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-lg font-semibold"
                  placeholder="0.00"
                  required
                  step="0.01"
                />
              </div>
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
                  {filteredCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
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

            {/* Recurring Income Option - Creation */}
            {!isEditing && type === 'income' && (
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
                  Repetir automáticamente por 12 meses
                </label>
              </div>
            )}
            
            {/* Update Future Recurrings Option - Editing */}
            {isEditing && initialData?.recurringId && (
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