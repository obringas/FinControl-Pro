import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    writeBatch,
    query,
    onSnapshot,
    Unsubscribe,
    setDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Transaction } from '../types';

export const TransactionRepository = {
    subscribeToTransactions: (userId: string, callback: (data: Transaction[]) => void): Unsubscribe => {
        if (!db) throw new Error("Firestore not initialized");

        const q = query(collection(db, 'users', userId, 'transactions'));

        return onSnapshot(q, (snapshot) => {
            const transactions: Transaction[] = [];
            snapshot.forEach((doc) => {
                transactions.push({ ...doc.data(), id: doc.id } as Transaction);
            });
            callback(transactions);
        });
    },

    addTransaction: async (userId: string, transaction: Transaction): Promise<void> => {
        if (!db) return;
        // Use setDoc with specific ID to keep IDs consistent between local and cloud
        const safeData = JSON.parse(JSON.stringify(transaction));
        await setDoc(doc(db, 'users', userId, 'transactions', transaction.id), safeData);
    },

    addBatchTransactions: async (userId: string, transactions: Transaction[]): Promise<void> => {
        if (!db) return;
        const batch = writeBatch(db);

        transactions.forEach(t => {
            const ref = doc(db, 'users', userId, 'transactions', t.id);
            const safeData = JSON.parse(JSON.stringify(t));
            batch.set(ref, safeData);
        });

        await batch.commit();
    },

    updateTransaction: async (userId: string, id: string, updates: Partial<Transaction>): Promise<void> => {
        if (!db) return;
        const safeUpdate = JSON.parse(JSON.stringify(updates));
        await updateDoc(doc(db, 'users', userId, 'transactions', id), safeUpdate);
    },

    deleteTransaction: async (userId: string, id: string): Promise<void> => {
        if (!db) return;
        await deleteDoc(doc(db, 'users', userId, 'transactions', id));
    },

    deleteBatchTransactions: async (userId: string, ids: string[]): Promise<void> => {
        if (!db) return;
        const batch = writeBatch(db);

        ids.forEach(id => {
            batch.delete(doc(db, 'users', userId, 'transactions', id));
        });

        await batch.commit();
    },

    updateBatchTransactions: async (userId: string, updates: { id: string, data: Partial<Transaction> }[]): Promise<void> => {
        if (!db) return;
        const batch = writeBatch(db);

        updates.forEach(({ id, data }) => {
            const safeUpdate = JSON.parse(JSON.stringify(data));
            batch.update(doc(db, 'users', userId, 'transactions', id), safeUpdate);
        });

        await batch.commit();
    }
};
