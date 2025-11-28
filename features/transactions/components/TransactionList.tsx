import React from 'react';
import { useTransactionList } from '../hooks/useTransactionList';
import { formatCurrency, formatDate } from '../../../utils';
import { Trash2, Search, Filter, CreditCard, ArrowUpCircle, ArrowDownCircle, Pencil, Repeat } from 'lucide-react';
import { Transaction } from '../../../types';

interface TransactionListProps {
  onEdit?: (transaction: Transaction) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({ onEdit }) => {
  const {
    searchTerm,
    setSearchTerm,
    typeFilter,
    setTypeFilter,
    filteredTransactions,
    getCategoryInfo,
    deleteModal,
    handleDeleteClick,
    confirmDelete,
    closeDeleteModal,
    filter
  } = useTransactionList();

  return (
    <div className="space-y-6">
      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && deleteModal.transaction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Eliminar Transacción</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Esta transacción es parte de una serie o plan de cuotas. ¿Qué deseas eliminar?
            </p>

            <div className="space-y-3">
              <button
                onClick={() => confirmDelete('single')}
                className="w-full p-3 text-left rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col"
              >
                <span className="font-semibold text-slate-700 dark:text-slate-200">Solo esta transacción</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">Elimina solo el registro de {formatDate(deleteModal.transaction.date)}</span>
              </button>

              <button
                onClick={() => confirmDelete('future')}
                className="w-full p-3 text-left rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col"
              >
                <span className="font-semibold text-slate-700 dark:text-slate-200">Esta y las siguientes</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">Elimina desde {formatDate(deleteModal.transaction.date)} en adelante</span>
              </button>

              <button
                onClick={() => confirmDelete('all')}
                className="w-full p-3 text-left rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col"
              >
                <span className="font-semibold text-slate-700 dark:text-slate-200">Todas las de la serie</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">Elimina todas las repeticiones o cuotas</span>
              </button>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 text-slate-500 dark:text-slate-400 font-medium hover:text-slate-700 dark:hover:text-slate-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Type Filters */}
        <div className="flex p-1 bg-slate-200 dark:bg-slate-700 rounded-lg">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${typeFilter === 'all' ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            Todos
          </button>
          <button
            onClick={() => setTypeFilter('income')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${typeFilter === 'income' ? 'bg-white dark:bg-slate-600 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'}`}
          >
            <ArrowUpCircle size={14} /> Ingresos
          </button>
          <button
            onClick={() => setTypeFilter('expense')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${typeFilter === 'expense' ? 'bg-white dark:bg-slate-600 text-red-600 dark:text-red-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400'}`}
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
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20 outline-none bg-white dark:bg-slate-800 dark:text-white"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="text-left py-3 px-6 font-semibold text-sm text-slate-600 dark:text-slate-400">Fecha Pago</th>
                <th className="text-left py-3 px-6 font-semibold text-sm text-slate-600 dark:text-slate-400">Descripción</th>
                <th className="text-left py-3 px-6 font-semibold text-sm text-slate-600 dark:text-slate-400">Categoría</th>
                <th className="text-right py-3 px-6 font-semibold text-sm text-slate-600 dark:text-slate-400">Monto</th>
                <th className="text-center py-3 px-6 font-semibold text-sm text-slate-600 dark:text-slate-400"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map(t => {
                  const cat = getCategoryInfo(t.category);
                  const paymentDate = new Date(t.date);
                  // Determine if this is shown as a projection (payment is in future month relative to filter)
                  const isProjection = t.paymentMethod === 'credit_card' && (paymentDate.getMonth() !== filter.month || paymentDate.getFullYear() !== filter.year);

                  return (
                    <tr key={t.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors group ${isProjection ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''}`}>
                      <td className="py-4 px-6 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap w-32">
                        {formatDate(t.date)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-medium text-slate-800 dark:text-white flex items-center gap-2">
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
                      <td className={`py-4 px-6 text-right font-bold ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-white'}`}>
                        {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                      </td>
                      <td className="py-4 px-6 text-center w-24">
                        <div className="flex items-center justify-center gap-1">
                          {onEdit && (
                            <button
                              onClick={() => onEdit(t)}
                              className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Pencil size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteClick(t)}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
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
                      <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-full mb-3">
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