import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  setDoc
} from 'firebase/firestore';
import { db } from './lib/firebase';
import { Transaction, Category, FilterState, Notification, User } from './types';

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
  updateRecurringFuture: (recurringId: string, fromDate: string, updated: Partial<Transaction>) => void;
  setFilter: (filter: Partial<FilterState>) => void;
  showNotification: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  hideNotification: () => void;
  resetData: () => void;

  // Cloud Sync Actions
  setUser: (user: User | null) => void;
  syncLocalDataToCloud: () => Promise<void>;
  initializeRealtimeListener: () => void;

  // Delete Recurring Action
  deleteRecurringTransaction: (seriesId: string, fromDate?: string) => void;

  // Data Management
  getData: () => { transactions: Transaction[], categories: Category[] };
  loadData: (data: { transactions: Transaction[], categories: Category[] }) => void;
}

const INITIAL_CATEGORIES: Category[] = [
  // Ingresos
  { id: 'cat_salary', name: 'Sueldo', color: '#10b981', icon: 'Wallet', type: 'income', group: 'Ingresos' },
  { id: 'cat_invest', name: 'Inversiones', color: '#34d399', icon: 'TrendingUp', type: 'income', group: 'Ingresos' },

  // 1. Vivienda
  { id: 'cat_rent', name: 'Alquiler/Hipoteca', color: '#6366f1', icon: 'Home', type: 'expense', group: 'Vivienda' },
  { id: 'cat_services', name: 'Servicios Básicos', color: '#64748b', icon: 'Zap', type: 'expense', group: 'Vivienda' },
  { id: 'cat_internet', name: 'Conectividad (Internet/TV)', color: '#8b5cf6', icon: 'Wifi', type: 'expense', group: 'Vivienda' },
  { id: 'cat_maintenance', name: 'Mantenimiento/Expensas', color: '#a855f7', icon: 'Tool', type: 'expense', group: 'Vivienda' },
  { id: 'cat_taxes_house', name: 'Impuestos Vivienda', color: '#d8b4fe', icon: 'FileText', type: 'expense', group: 'Vivienda' },

  // 2. Alimentación y Hogar
  { id: 'cat_groceries', name: 'Supermercado', color: '#f59e0b', icon: 'ShoppingBasket', type: 'expense', group: 'Alimentación' },
  { id: 'cat_dining', name: 'Comidas fuera', color: '#fbbf24', icon: 'Coffee', type: 'expense', group: 'Alimentación' },

  // 3. Salud y Bienestar
  { id: 'cat_health_ins', name: 'Medicina Prepaga', color: '#ef4444', icon: 'Heart', type: 'expense', group: 'Salud' },
  { id: 'cat_pharmacy', name: 'Farmacia', color: '#f87171', icon: 'Pill', type: 'expense', group: 'Salud' },
  { id: 'cat_doctors', name: 'Consultas/Tratamientos', color: '#fca5a5', icon: 'Stethoscope', type: 'expense', group: 'Salud' },

  // 4. Educación
  { id: 'cat_education', name: 'Cuota Escolar', color: '#3b82f6', icon: 'GraduationCap', type: 'expense', group: 'Educación' },
  { id: 'cat_supplies', name: 'Útiles/Uniformes', color: '#60a5fa', icon: 'BookOpen', type: 'expense', group: 'Educación' },

  // 5. Transporte
  { id: 'cat_fuel', name: 'Combustible/Auto', color: '#0ea5e9', icon: 'Car', type: 'expense', group: 'Transporte' },
  { id: 'cat_public_transport', name: 'Transporte Público', color: '#38bdf8', icon: 'Bus', type: 'expense', group: 'Transporte' },
  { id: 'cat_taxi', name: 'Taxis/Apps', color: '#7dd3fc', icon: 'MapPin', type: 'expense', group: 'Transporte' },

  // 6. Entretenimiento
  { id: 'cat_subs', name: 'Suscripciones', color: '#ec4899', icon: 'PlayCircle', type: 'expense', group: 'Entretenimiento' },
  { id: 'cat_outing', name: 'Salidas/Cine', color: '#f472b6', icon: 'Film', type: 'expense', group: 'Entretenimiento' },
  { id: 'cat_vacation', name: 'Fondo Vacaciones', color: '#fbcfe8', icon: 'Palmtree', type: 'expense', group: 'Entretenimiento' },

  // 7. Deudas
  { id: 'cat_cc_payment', name: 'Pago Tarjeta Crédito', color: '#f43f5e', icon: 'CreditCard', type: 'expense', group: 'Deudas' },
  { id: 'cat_loans', name: 'Préstamos', color: '#fb7185', icon: 'Banknote', type: 'expense', group: 'Deudas' },
  { id: 'cat_insurance', name: 'Seguros', color: '#fda4af', icon: 'Shield', type: 'expense', group: 'Deudas' },

  // 8. Otros
  { id: 'cat_pets', name: 'Mascotas', color: '#84cc16', icon: 'Dog', type: 'expense', group: 'Otros' },
  { id: 'cat_gifts', name: 'Regalos', color: '#a3e635', icon: 'Gift', type: 'expense', group: 'Otros' },
  { id: 'cat_emergency', name: 'Imprevistos', color: '#bef264', icon: 'AlertTriangle', type: 'expense', group: 'Otros' },
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
            // Sanitize: Firestore doesn't like 'undefined', so we strip it.
            const safeData = JSON.parse(JSON.stringify(t));
            batch.set(docRef, safeData);
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
            const safeData = JSON.parse(JSON.stringify(transaction));
            await addDoc(collection(db, 'users', state.user.uid, 'transactions'), safeData);
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
              const safeData = JSON.parse(JSON.stringify(t));
              batch.set(fixedRef, safeData);
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

      deleteRecurringTransaction: async (seriesId, fromDate) => {
        const state = get();
        let transactionsToDelete: Transaction[] = [];

        if (fromDate) {
          // Delete future transactions (inclusive)
          transactionsToDelete = state.transactions.filter(t =>
            (t.recurringId === seriesId || t.installments?.planId === seriesId) &&
            t.date.split('T')[0] >= fromDate
          );
        } else {
          // Delete ALL transactions in the series
          transactionsToDelete = state.transactions.filter(t =>
            t.recurringId === seriesId || t.installments?.planId === seriesId
          );
        }

        const idsToDelete = transactionsToDelete.map(t => t.id);

        // Optimistic Update
        set((state) => ({
          transactions: state.transactions.filter(t => !idsToDelete.includes(t.id))
        }));

        // Cloud Update
        if (state.user && db) {
          const userId = state.user.uid;
          try {
            const batch = writeBatch(db);
            idsToDelete.forEach(id => {
              batch.delete(doc(db, 'users', userId, 'transactions', id));
            });
            await batch.commit();
            get().showNotification(fromDate ? 'Transacciones futuras eliminadas' : 'Serie eliminada correctamente', 'success');
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
              return {
                ...t,
                amount: updated.amount ?? t.amount,
                category: updated.category ?? t.category,
                description: updated.description ?? t.description,
                paymentMethod: updated.paymentMethod ?? t.paymentMethod,
                expenseType: updated.expenseType ?? t.expenseType,
                incomeType: updated.incomeType ?? t.incomeType
              };
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
            const safeUpdate = JSON.parse(JSON.stringify(updated));
            batch.update(doc(db, 'users', userId, 'transactions', id), safeUpdate);

            // Update recurring
            if (applyToFuture && recurringId) {
              // We need to find the IDs of the future transactions to update them in Firestore
              // In a real app, this query should happen in Firestore, not filtering local array
              const futureTxs = state.transactions.filter(t =>
                t.recurringId === recurringId && new Date(t.date).getTime() > referenceDate.getTime()
              );
              futureTxs.forEach(ft => {
                const futureUpdate = {
                  amount: updated.amount ?? ft.amount,
                  category: updated.category ?? ft.category,
                  description: updated.description ?? ft.description,
                  paymentMethod: updated.paymentMethod ?? ft.paymentMethod,
                  expenseType: updated.expenseType ?? ft.expenseType,
                  incomeType: updated.incomeType ?? ft.incomeType
                };
                const safeFutureUpdate = JSON.parse(JSON.stringify(futureUpdate));
                batch.update(doc(db, 'users', userId, 'transactions', ft.id), safeFutureUpdate);
              });
            }
            await batch.commit();
          } catch (e) { console.error(e); }
        }
      },

      updateRecurringFuture: async (recurringId, fromDate, updated) => {
        const state = get();
        // fromDate is "YYYY-MM-DD"

        // Calculate new local state
        const updatedTransactions = state.transactions.map(t => {
          if (t.recurringId === recurringId) {
            // Extract YYYY-MM-DD from transaction date for safe comparison
            const tDateStr = t.date.split('T')[0];

            // Inclusive update: >= fromDate (String comparison works for ISO dates)
            if (tDateStr >= fromDate) {
              return { ...t, ...updated };
            }
          }
          return t;
        });

        set({ transactions: updatedTransactions });

        // Cloud Update
        if (state.user && db) {
          const userId = state.user.uid;
          try {
            const batch = writeBatch(db);

            // Filter using the same string comparison logic
            const futureTxs = state.transactions.filter(t =>
              t.recurringId === recurringId && t.date.split('T')[0] >= fromDate
            );

            futureTxs.forEach(ft => {
              const safeUpdate = JSON.parse(JSON.stringify(updated));
              batch.update(doc(db, 'users', userId, 'transactions', ft.id), safeUpdate);
            });
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
      version: 1, // Increment version to trigger migration
      migrate: (persistedState: any, version) => {
        if (version === 0 || !version) {
          // Force update categories to new structure
          return { ...persistedState, categories: INITIAL_CATEGORIES };
        }
        return persistedState;
      },
      partialize: (state) => ({
        transactions: state.transactions,
        categories: state.categories,
        // Don't persist user object fully, handled by Auth listener usually, 
        // but for simplicity we let Firebase Auth SDK handle persistence
      }),
    }
  )
);