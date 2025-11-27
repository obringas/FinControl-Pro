import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Transaction, FilterState, Category } from './types';
import { db, auth } from './lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot, writeBatch } from 'firebase/firestore';
import { User } from 'firebase/auth';

interface Notification {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface AppState {
  transactions: Transaction[];
  categories: Category[];
  filter: FilterState;
  notification: Notification | null;
  user: User | null; // Firebase User
  isLoading: boolean;

  // Actions
  addTransaction: (transaction: Transaction) => void;
  addTransactions: (transactions: Transaction[]) => void;
  removeTransaction: (id: string) => void;
  updateTransaction: (id: string, updated: Partial<Transaction>, applyToFuture?: boolean) => void;
  setFilter: (filter: Partial<FilterState>) => void;
  showNotification: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  hideNotification: () => void;
  resetData: () => void;

  // Cloud Sync Actions
  setUser: (user: User | null) => void;
  syncLocalDataToCloud: () => Promise<void>;
  initializeRealtimeListener: () => void;

  // Data Management
  getData: () => { transactions: Transaction[], categories: Category[] };
  loadData: (data: { transactions: Transaction[], categories: Category[] }) => void;
}

const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat_salary', name: 'Sueldo', color: '#10b981', icon: 'Wallet', type: 'income' },
  { id: 'cat_invest', name: 'Inversiones', color: '#34d399', icon: 'TrendingUp', type: 'income' },
  { id: 'cat_food', name: 'Alimentos', color: '#f59e0b', icon: 'ShoppingBasket', type: 'expense' },
  { id: 'cat_transport', name: 'Transporte', color: '#3b82f6', icon: 'Car', type: 'expense' },
  { id: 'cat_housing', name: 'Hogar', color: '#6366f1', icon: 'Home', type: 'expense' },
  { id: 'cat_ent', name: 'Entretenimiento', color: '#8b5cf6', icon: 'Film', type: 'expense' },
  { id: 'cat_health', name: 'Salud', color: '#ef4444', icon: 'Heart', type: 'expense' },
  { id: 'cat_services', name: 'Servicios', color: '#64748b', icon: 'Zap', type: 'expense' },
];

const today = new Date();

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      transactions: [],
      categories: INITIAL_CATEGORIES,
      filter: {
        month: today.getMonth(),
        year: today.getFullYear(),
        type: 'all',
      },
      notification: null,
      user: null,
      isLoading: false,

      // --- AUTH & SYNC ACTIONS ---
      setUser: (user) => {
        set({ user });
        if (user) {
          get().initializeRealtimeListener();
        }
      },

      initializeRealtimeListener: () => {
        const user = get().user;
        if (!user || !db) return;

        // Listen to User's Transactions Collection
        const q = query(collection(db, 'users', user.uid, 'transactions'));

        // This sets up a live connection. Any change in DB reflects here immediately.
        onSnapshot(q, (snapshot) => {
          const cloudTransactions: Transaction[] = [];
          snapshot.forEach((doc) => {
            cloudTransactions.push({ ...doc.data(), id: doc.id } as Transaction);
          });
          // Update local state with cloud data
          set({ transactions: cloudTransactions });
        });
      },

      syncLocalDataToCloud: async () => {
        const state = get();
        if (!state.user || !db) return;

        set({ isLoading: true });
        try {
          const batch = writeBatch(db);
          // Take all local transactions and prepare them for upload
          state.transactions.forEach(t => {
            // Use original ID as doc ID to prevent duplicates if re-syncing
            const docRef = doc(db, 'users', state.user!.uid, 'transactions', t.id);
            batch.set(docRef, t);
          });

          await batch.commit();
          set({ notification: { message: 'Sincronización con la nube completada', type: 'success' } });
        } catch (error) {
          console.error(error);
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
          set({ notification: { message: `Error al subir: ${errorMessage}`, type: 'error' } });
        } finally {
          set({ isLoading: false });
        }
      },

      // --- STANDARD ACTIONS (Updated with Cloud Logic) ---

      addTransaction: async (transaction) => {
        const state = get();

        // 1. Optimistic Update (Show immediately)
        set((state) => ({ transactions: [...state.transactions, transaction] }));

        // 2. Cloud Update
        if (state.user && db) {
          try {
            // We use setDoc with specific ID instead of addDoc to keep IDs consistent
            await addDoc(collection(db, 'users', state.user.uid, 'transactions'), transaction);
          } catch (e) {
            console.error("Cloud save failed", e);
            get().showNotification("Guardado localmente. Error en nube.", 'warning');
          }
        }
      },

      addTransactions: async (newTransactions) => {
        const state = get();
        set((state) => ({ transactions: [...state.transactions, ...newTransactions] }));

        if (state.user && db) {
          try {
            const batch = writeBatch(db);
            newTransactions.forEach(t => {
              // Use a new doc ref for each
              const ref = doc(collection(db, 'users', state.user!.uid, 'transactions'));
              // Let's use the local ID as the Firestore ID for consistency
              const fixedRef = doc(db, 'users', state.user!.uid, 'transactions', t.id);
              batch.set(fixedRef, t);
            });
            await batch.commit();
          } catch (e) {
            console.error("Batch cloud save failed", e);
          }
        }
      },

      removeTransaction: async (id) => {
        const state = get();
        set((state) => ({ transactions: state.transactions.filter(t => t.id !== id) }));

        if (state.user && db) {
          try {
            await deleteDoc(doc(db, 'users', state.user.uid, 'transactions', id));
          } catch (e) { console.error(e); }
        }
      },

      updateTransaction: async (id, updated, applyToFuture = false) => {
        const state = get();
        // Optimistic update logic (same as before)
        const targetTx = state.transactions.find(t => t.id === id);
        if (!targetTx) return;
        const recurringId = targetTx.recurringId;
        const referenceDate = new Date(targetTx.date);

        // Calculate new local state
        const updatedTransactions = state.transactions.map(t => {
          if (t.id === id) return { ...t, ...updated };
          if (applyToFuture && recurringId && t.recurringId === recurringId) {
            const tDate = new Date(t.date);
            if (tDate.getTime() > referenceDate.getTime()) {
              return { ...t, amount: updated.amount ?? t.amount, category: updated.category ?? t.category, description: updated.description ?? t.description, paymentMethod: updated.paymentMethod ?? t.paymentMethod, expenseType: updated.expenseType ?? t.expenseType };
            }
          }
          return t;
        });

        set({ transactions: updatedTransactions });

        // Cloud Update
        if (state.user && db) {
          const userId = state.user.uid; // Capture UID to avoid null checks in callbacks
          try {
            const batch = writeBatch(db);

            // Update main doc
            batch.update(doc(db, 'users', userId, 'transactions', id), updated);

            // Update recurring
            if (applyToFuture && recurringId) {
              // We need to find the IDs of the future transactions to update them in Firestore
              // In a real app, this query should happen in Firestore, not filtering local array
              const futureTxs = state.transactions.filter(t =>
                t.recurringId === recurringId && new Date(t.date).getTime() > referenceDate.getTime()
              );
              futureTxs.forEach(ft => {
                batch.update(doc(db, 'users', userId, 'transactions', ft.id), {
                  amount: updated.amount ?? ft.amount,
                  category: updated.category ?? ft.category,
                  description: updated.description ?? ft.description,
                  paymentMethod: updated.paymentMethod ?? ft.paymentMethod,
                  expenseType: updated.expenseType ?? ft.expenseType
                });
              });
            }
            await batch.commit();
          } catch (e) { console.error(e); }
        }
      },

      setFilter: (newFilter) => set((state) => ({
        filter: { ...state.filter, ...newFilter }
      })),

      showNotification: (message, type = 'success') => set({ notification: { message, type } }),
      hideNotification: () => set({ notification: null }),

      resetData: () => {
        // Only allow reset if local or explicit. 
        // If cloud connected, this is dangerous.
        // For now, we clear local. If cloud listener is active, it might re-fetch.
        set({ transactions: [] });
      },

      getData: () => {
        const state = get();
        return { transactions: state.transactions, categories: state.categories };
      },

      loadData: (data) => set({
        transactions: data.transactions || [],
        categories: data.categories || INITIAL_CATEGORIES
      })
    }),
    {
      name: 'fincontrol-storage',
      partialize: (state) => ({
        transactions: state.transactions,
        categories: state.categories,
        // Don't persist user object fully, handled by Auth listener usually, 
        // but for simplicity we let Firebase Auth SDK handle persistence
      }),
    }
  )
);