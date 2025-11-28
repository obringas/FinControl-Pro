import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useStore } from '../../../store';
import { X, Save, CreditCard, Repeat, CalendarClock, TrendingUp } from 'lucide-react';
import { Transaction, InstallmentDetails } from '../../../types';
import { generateId } from '../../../utils';
import { transactionSchema, TransactionFormData } from '../transactionSchemas';

interface TransactionFormProps {
  onClose: () => void;
  initialData?: Transaction;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ onClose, initialData }) => {
  const { addTransaction, addTransactions, updateTransaction, categories, showNotification } = useStore();
  const isEditing = !!initialData;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: initialData?.type || 'expense',
      amount: initialData?.amount || undefined,
      description: initialData?.description || '',
      category: initialData?.category || '',
      date: initialData?.date ? initialData.date.split('T')[0] : new Date().toISOString().split('T')[0],
      isRecurring: initialData?.isRecurring || false,
      recurringDay: initialData?.recurringDay || new Date().getDate(),
      paymentMethod: initialData?.paymentMethod || 'cash',
      installments: (initialData?.installments as any)?.total || 1,
    }
  });

  const type = watch('type');
  const isRecurring = watch('isRecurring');
  const paymentMethod = watch('paymentMethod');
  const installments = watch('installments');
  const amount = watch('amount');

  useEffect(() => {
    if (!initialData) {
      setValue('category', '');
    }
  }, [type, setValue, initialData]);

  const onSubmit = (data: TransactionFormData) => {
    try {
      const transactionData: Transaction = {
        id: initialData?.id || generateId(),
        type: data.type,
        amount: Number(data.amount),
        category: data.category,
        description: data.description,
        date: data.date,
        isRecurring: data.isRecurring,
        recurringDay: data.isRecurring ? Number(data.recurringDay) : undefined,
        paymentMethod: (data.type === 'expense' && data.paymentMethod) ? data.paymentMethod : 'cash',
        installments: data.paymentMethod === 'credit_card' && data.installments && data.installments > 1
          ? { current: 1, total: data.installments, planId: generateId() } as InstallmentDetails
          : undefined,
        createdAt: initialData?.createdAt || Date.now(),
        isPaid: true
      };

      if (isEditing && initialData) {
        updateTransaction(transactionData.id, transactionData);
        showNotification('Transacción actualizada', 'success');
      } else {
        if (data.paymentMethod === 'credit_card' && (data.installments || 1) > 1) {
          const transactions: Transaction[] = [];
          const startDate = new Date(data.date);
          const totalAmount = Number(data.amount);
          const installmentAmount = totalAmount / (data.installments || 1);
          const planId = generateId();

          for (let i = 0; i < (data.installments || 1); i++) {
            const date = new Date(startDate);
            date.setMonth(startDate.getMonth() + i);

            transactions.push({
              ...transactionData,
              id: generateId(),
              amount: installmentAmount,
              date: date.toISOString().split('T')[0],
              description: `${data.description} (Cuota ${i + 1}/${data.installments})`,
              installments: { current: i + 1, total: data.installments || 1, planId }
            });
          }
          addTransactions(transactions);
          showNotification(`Se crearon ${data.installments} cuotas`, 'success');
        } else {
          addTransaction(transactionData);
          showNotification('Transacción guardada', 'success');
        }
      }
      onClose();
    } catch (error) {
      console.error(error);
      showNotification('Error al guardar', 'error');
    }
  };

  const filteredCategories = categories.filter(c => c.type === type);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

        <div className={`p-6 text-white flex justify-between items-center ${type === 'income' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          <h2 className="text-xl font-bold flex items-center gap-2">
            {isEditing ? 'Editar Transacción' : 'Nueva Transacción'}
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto custom-scrollbar space-y-5">

          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-xl">
            <button
              type="button"
              onClick={() => setValue('type', 'expense')}
              className={`py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${type === 'expense' ? 'bg-white dark:bg-slate-600 text-red-600 dark:text-red-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              <TrendingUp className="rotate-180" size={18} />
              Gasto
            </button>
            <button
              type="button"
              onClick={() => setValue('type', 'income')}
              className={`py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${type === 'income' ? 'bg-white dark:bg-slate-600 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              <TrendingUp size={18} />
              Ingreso
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Monto</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">$</span>
              <input
                type="number"
                step="0.01"
                {...register('amount', { valueAsNumber: true })}
                className={`w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border ${errors.amount ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-lg font-bold text-slate-800 dark:text-white`}
                placeholder="0.00"
                autoFocus={!isEditing}
              />
            </div>
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
            <input
              type="text"
              {...register('description')}
              className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border ${errors.description ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all dark:text-white`}
              placeholder="Ej: Supermercado, Sueldo..."
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoría</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filteredCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setValue('category', cat.id)}
                  className={`p-2 rounded-lg border text-sm font-medium transition-all text-center truncate ${watch('category') === cat.id
                    ? `bg-${cat.color}-50 border-${cat.color}-500 text-${cat.color}-700 ring-1 ring-${cat.color}-500`
                    : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                    }`}
                  style={watch('category') === cat.id ? { backgroundColor: cat.color + '20', borderColor: cat.color } : {}}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            <input type="hidden" {...register('category')} />
            {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha</label>
              <input
                type="date"
                {...register('date')}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all dark:text-white"
              />
              {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
            </div>

            <div className="flex items-end">
              <label className={`w-full flex items-center justify-center gap-2 px-4 py-3 border rounded-xl cursor-pointer transition-all ${isRecurring ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-300' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                }`}>
                <input type="checkbox" {...register('isRecurring')} className="hidden" />
                <Repeat size={18} />
                <span className="font-medium text-sm">Mensual</span>
              </label>
            </div>
          </div>

          {isRecurring && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300 mb-2">
                <CalendarClock size={18} />
                <span className="font-bold text-sm">Configuración Recurrente</span>
              </div>
              <label className="block text-xs text-indigo-600 dark:text-indigo-400 mb-1">Día del mes para repetir</label>
              <input
                type="number"
                min="1"
                max="31"
                {...register('recurringDay', { valueAsNumber: true })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white"
              />
              {errors.recurringDay && <p className="text-red-500 text-xs mt-1">{errors.recurringDay.message}</p>}
            </div>
          )}

          {type === 'expense' && (
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Método de Pago</label>
              <div className="flex gap-2">
                <label className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${paymentMethod === 'cash' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-700 dark:text-emerald-400' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600'
                  }`}>
                  <input type="radio" value="cash" {...register('paymentMethod')} className="hidden" />
                  <span className="text-xs font-bold">Efectivo/Débito</span>
                </label>
                <label className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${paymentMethod === 'credit_card' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-400' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600'
                  }`}>
                  <input type="radio" value="credit_card" {...register('paymentMethod')} className="hidden" />
                  <CreditCard size={20} className="mb-1" />
                  <span className="text-xs font-bold">Tarjeta Crédito</span>
                </label>
              </div>

              {paymentMethod === 'credit_card' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 animate-in slide-in-from-top-2">
                  <label className="block text-xs font-bold text-blue-800 dark:text-blue-300 mb-2">Cuotas</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="12"
                      step="1"
                      {...register('installments', { valueAsNumber: true })}
                      className="flex-1 h-2 bg-blue-200 dark:bg-blue-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <span className="font-bold text-blue-700 dark:text-blue-300 w-8 text-center">{installments || 1}</span>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    {installments && installments > 1
                      ? `Se crearán ${installments} transacciones de ${((amount || 0) / installments).toFixed(2)}`
                      : 'Pago en 1 cuota'}
                  </p>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 ${type === 'income'
              ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
              : 'bg-red-600 hover:bg-red-700 shadow-red-200'
              }`}
          >
            <Save size={20} />
            {isEditing ? 'Actualizar' : 'Guardar Transacción'}
          </button>

        </form>
      </div>
    </div>
  );
};