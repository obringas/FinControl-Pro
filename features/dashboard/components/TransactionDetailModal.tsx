import React from 'react';
import { Transaction } from '../../../types';
import { formatCurrency, formatDate } from '../../../utils';
import { X, ArrowUpCircle, ArrowDownCircle, CreditCard, Repeat } from 'lucide-react';

interface TransactionDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    transactions: Transaction[];
    categories: { id: string; name: string; color: string; type: 'income' | 'expense' }[];
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
    isOpen,
    onClose,
    title,
    transactions,
    categories
}) => {
    if (!isOpen) return null;

    const getCategoryInfo = (id: string) => categories.find(c => c.id === id);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-4 duration-300">

                {/* Header */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{transactions.length} movimientos encontrados</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 dark:text-slate-400"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto p-0 custom-scrollbar">
                    {transactions.length === 0 ? (
                        <div className="p-10 text-center text-slate-400">
                            <p>No hay transacciones para mostrar en esta categoría.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {transactions.map((t) => {
                                const cat = getCategoryInfo(t.category);
                                return (
                                    <div key={t.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 overflow-hidden">
                                            <div className={`p-3 rounded-full shrink-0 ${t.type === 'income'
                                                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                    : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                                }`}>
                                                {t.type === 'income' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                                            </div>

                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{t.description}</p>
                                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                    <span>{formatDate(t.date)}</span>
                                                    <span>•</span>
                                                    <span
                                                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                                                        style={{ backgroundColor: `${cat?.color}20`, color: cat?.color }}
                                                    >
                                                        {cat?.name || 'Otros'}
                                                    </span>
                                                    {t.paymentMethod === 'credit_card' && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="flex items-center gap-1 text-blue-500">
                                                                <CreditCard size={10} />
                                                                {t.installments ? `Cuota ${t.installments.current}/${t.installments.total}` : 'Tarjeta'}
                                                            </span>
                                                        </>
                                                    )}
                                                    {t.recurringId && (
                                                        <Repeat size={10} className="text-indigo-400" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`font-bold whitespace-nowrap ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-white'
                                            }`}>
                                            {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-right">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Total: <span className="text-slate-900 dark:text-white font-bold">{formatCurrency(transactions.reduce((acc, curr) => acc + curr.amount, 0))}</span>
                    </span>
                </div>
            </div>
        </div>
    );
};
