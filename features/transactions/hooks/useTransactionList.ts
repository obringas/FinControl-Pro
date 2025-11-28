import { useState } from 'react';
import { useStore } from '../../../store';
import { Transaction, TransactionType } from '../../../types';

export const useTransactionList = () => {
    const { transactions, removeTransaction, categories, filter, deleteRecurringTransaction } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, transaction: Transaction | null }>({ isOpen: false, transaction: null });

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
            const dateStr = date.split('T')[0];
            deleteRecurringTransaction(seriesId, dateStr);
        } else if (mode === 'all' && seriesId) {
            deleteRecurringTransaction(seriesId);
        }

        setDeleteModal({ isOpen: false, transaction: null });
    };

    const closeDeleteModal = () => {
        setDeleteModal({ isOpen: false, transaction: null });
    };

    return {
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
        filter // Export filter to check month/year in UI if needed
    };
};
