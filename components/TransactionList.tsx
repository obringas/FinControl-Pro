import React, { useState } from 'react';
import { useStore } from '../store';
import { formatCurrency, formatDate } from '../utils';
import { Card } from './ui/Card';
import { Trash2, Search, Filter, Calendar, CreditCard, ArrowUpCircle, ArrowDownCircle, Eye, Pencil, Repeat } from 'lucide-react';
import { TransactionType, Transaction } from '../types';

interface TransactionListProps {
  onEdit?: (transaction: Transaction) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({ onEdit }) => {
  const { transactions, removeTransaction, categories, filter } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');

  // Filter logic
  const filteredTransactions = transactions
    .filter(t => {
      const paymentDate = new Date(t.date);
      const isPaymentMonth = paymentDate.getMonth() === filter.month && paymentDate.getFullYear() === filter.year;

      // Logic to show credit card purchases made in current month view, even if payment is future
      let isPurchaseMonth = false;
      if (t.paymentMethod === 'credit_card' && t.originalDate) {
        const purchaseDate = new Date(t.originalDate);
        // Only show if purchased this month AND it's the first installment (to avoid showing 12 future items)
        const isFirstInstallment = !t.installments || t.installments.current === 1;

        if (purchaseDate.getMonth() === filter.month && purchaseDate.getFullYear() === filter.year && isFirstInstallment) {
          isPurchaseMonth = true;
        }
      }

      return isPaymentMonth || isPurchaseMonth;
    })
    .filter(t => typeFilter === 'all' ? true : t.type === typeFilter)
    .filter(t => t.description.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getCategoryInfo = (id: string) => categories.find(c => c.id === id);

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, transaction: Transaction | null }>({ isOpen: false, transaction: null });

  const handleDeleteClick = (transaction: Transaction) => {
    const seriesId = transaction.recurringId || transaction.installments?.planId;
    if (seriesId) {
      setDeleteModal({ isOpen: true, transaction });
    } else {
      // Standard delete for non-recurring
      if (window.confirm('¿Estás seguro de eliminar esta transacción?')) {
        removeTransaction(transaction.id);
      }
    }
  };

  const confirmDelete = (mode: 'single' | 'future' | 'all') => {
    if (!deleteModal.transaction) return;

    const { id, recurringId, installments, date } = deleteModal.transaction;
    const seriesId = recurringId || installments?.planId;

    if (mode === 'single') {
      removeTransaction(id);
    } else if (mode === 'future' && seriesId) {
      // Delete from this date onwards
      // We need to pass the date string YYYY-MM-DD
      const dateStr = date.split('T')[0];
      // We need to cast to any because deleteRecurringTransaction is new in store
      (useStore.getState() as any).deleteRecurringTransaction(seriesId, dateStr);
    } else if (mode === 'all' && seriesId) {
      (useStore.getState() as any).deleteRecurringTransaction(seriesId);
    }

    setDeleteModal({ isOpen: false, transaction: null });
  };

  return (
    <div className="space-y-6">
      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && deleteModal.transaction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Eliminar Transacción</h3>
            <p className="text-slate-600 mb-6">
              Esta transacción es parte de una serie o plan de cuotas. ¿Qué deseas eliminar?
            </p>

            <div className="space-y-3">
              <button
                onClick={() => confirmDelete('single')}
                className="w-full p-3 text-left rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all flex flex-col"
              >
                <span className="font-semibold text-slate-700">Solo esta transacción</span>
                <span className="text-xs text-slate-500">Elimina solo el registro de {formatDate(deleteModal.transaction.date)}</span>
              </button>

              <button
                onClick={() => confirmDelete('future')}
                className="w-full p-3 text-left rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all flex flex-col"
              >
                <span className="font-semibold text-slate-700">Esta y las siguientes</span>
                <span className="text-xs text-slate-500">Elimina desde {formatDate(deleteModal.transaction.date)} en adelante</span>
              </button>

              <button
                onClick={() => confirmDelete('all')}
                className="w-full p-3 text-left rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all flex flex-col"
              >
                <span className="font-semibold text-slate-700">Todas las de la serie</span>
                <span className="text-xs text-slate-500">Elimina todas las repeticiones o cuotas</span>
              </button>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setDeleteModal({ isOpen: false, transaction: null })}
                className="px-4 py-2 text-slate-500 font-medium hover:text-slate-700"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Type Filters */}
        <div className="flex p-1 bg-slate-200 rounded-lg">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${typeFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Todos
          </button>
          <button
            onClick={() => setTypeFilter('income')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${typeFilter === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-emerald-600'}`}
          >
            <ArrowUpCircle size={14} /> Ingresos
          </button>
          <button
            onClick={() => setTypeFilter('expense')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${typeFilter === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-red-600'}`}
          >
            <ArrowDownCircle size={14} /> Gastos
          </button>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-6 font-semibold text-sm text-slate-600">Fecha Pago</th>
                <th className="text-left py-3 px-6 font-semibold text-sm text-slate-600">Descripción</th>
                <th className="text-left py-3 px-6 font-semibold text-sm text-slate-600">Categoría</th>
                <th className="text-right py-3 px-6 font-semibold text-sm text-slate-600">Monto</th>
                <th className="text-center py-3 px-6 font-semibold text-sm text-slate-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map(t => {
                  const cat = getCategoryInfo(t.category);
                  const paymentDate = new Date(t.date);
                  // Determine if this is shown as a projection (payment is in future month relative to filter)
                  const isProjection = t.paymentMethod === 'credit_card' && (paymentDate.getMonth() !== filter.month || paymentDate.getFullYear() !== filter.year);

                  return (
                    <tr key={t.id} className={`hover:bg-slate-50/50 transition-colors group ${isProjection ? 'bg-amber-50/30' : ''}`}>
                      <td className="py-4 px-6 text-sm text-slate-500 whitespace-nowrap w-32">
                        {formatDate(t.date)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-medium text-slate-800 flex items-center gap-2">
                          {t.description}
                          {t.paymentMethod === 'credit_card' && (
                            <CreditCard size={14} className="text-blue-400" />
                          )}
                          {t.recurringId && (
                            <Repeat size={14} className="text-indigo-400" />
                          )}
                        </div>
                        {t.installments && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full mt-1 inline-block">
                            Cuota {t.installments.current} de {t.installments.total}
                          </span>
                        )}
                        {isProjection && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full mt-1 ml-2 inline-block" title="Compra realizada este mes, se paga el próximo">
                            Vence en {formatDate(t.date)}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: `${cat?.color}20`, color: cat?.color }}
                        >
                          {cat?.name || 'Otros'}
                        </span>
                      </td>
                      <td className={`py-4 px-6 text-right font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-slate-800'}`}>
                        {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                      </td>
                      <td className="py-4 px-6 text-center w-24">
                        <div className="flex items-center justify-center gap-1">
                          {onEdit && (
                            <button
                              onClick={() => onEdit(t)}
                              className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Pencil size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteClick(t)}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <div className="bg-slate-100 p-3 rounded-full mb-3">
                        <Filter size={24} />
                      </div>
                      <p>No se encontraron movimientos.</p>
                      <p className="text-xs mt-1">Prueba cambiando el mes o los filtros.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};