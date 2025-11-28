import React, { useState, Suspense } from 'react';
import { useStore } from './store';
import { getMonthName } from './utils';
import { LayoutDashboard, Receipt, Plus, ChevronLeft, ChevronRight, PieChart, Settings as SettingsIcon, Loader2 } from 'lucide-react';
import { Toast } from './components/ui/Toast';
import { Transaction } from './types';
import { ThemeProvider } from './context/ThemeContext';

// Lazy Imports
const Dashboard = React.lazy(() => import('./features/dashboard/components/Dashboard').then(module => ({ default: module.Dashboard })));
const TransactionList = React.lazy(() => import('./features/transactions/components/TransactionList').then(module => ({ default: module.TransactionList })));
const TransactionForm = React.lazy(() => import('./features/transactions/components/TransactionForm').then(module => ({ default: module.TransactionForm })));
const Settings = React.lazy(() => import('./features/settings/components/Settings').then(module => ({ default: module.Settings })));

function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'transactions' | 'settings'>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const { filter, setFilter } = useStore();

  const changeMonth = (increment: number) => {
    let newMonth = filter.month + increment;
    let newYear = filter.year;

    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    } else if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }

    setFilter({ month: newMonth, year: newYear });
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col md:flex-row font-sans bg-slate-50 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300">
        {/* Sidebar */}
        <aside className="w-full md:w-64 bg-primary text-white flex flex-col shrink-0">
          <div className="p-6 border-b border-slate-800">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <PieChart className="text-accent" />
              FinControl
            </h1>
            <p className="text-slate-400 text-xs mt-1">Gestión Inteligente</p>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'dashboard' ? 'bg-accent text-white shadow-lg shadow-accent/25' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              <LayoutDashboard size={20} />
              Dashboard
            </button>
            <button
              onClick={() => setCurrentView('transactions')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'transactions' ? 'bg-accent text-white shadow-lg shadow-accent/25' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Receipt size={20} />
              Movimientos
            </button>
            <button
              onClick={() => setCurrentView('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'settings' ? 'bg-accent text-white shadow-lg shadow-accent/25' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              <SettingsIcon size={20} />
              Configuración
            </button>
          </nav>

          <div className="p-4 border-t border-slate-800">
            <div className="bg-slate-800/50 rounded-lg p-3 text-xs text-slate-400">
              <p>Usuario Demo</p>
              <p className="truncate">demo@fincontrol.app</p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto h-screen">
          {/* Top Header */}
          <header className="bg-white dark:bg-slate-800 sticky top-0 z-30 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center shadow-sm backdrop-blur-md bg-white/80 dark:bg-slate-800/80 transition-colors duration-300">
            <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-1 transition-colors duration-300">
              <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-white dark:hover:bg-slate-600 rounded-md text-slate-600 dark:text-slate-300 shadow-sm transition-all">
                <ChevronLeft size={18} />
              </button>
              <span className="px-4 font-semibold text-slate-700 dark:text-slate-200 min-w-[140px] text-center capitalize">
                {getMonthName(filter.month)} {filter.year}
              </span>
              <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-white dark:hover:bg-slate-600 rounded-md text-slate-600 dark:text-slate-300 shadow-sm transition-all">
                <ChevronRight size={18} />
              </button>
            </div>

            <button
              onClick={() => {
                setEditingTransaction(null);
                setIsModalOpen(true);
              }}
              className="bg-primary hover:bg-slate-800 dark:bg-accent dark:hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-primary/20 dark:shadow-accent/20 active:scale-95 transition-all"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Nueva Transacción</span>
            </button>
          </header>

          {/* Content Area */}
          <div className="p-6 max-w-7xl mx-auto">
            <Suspense fallback={
              <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
                <Loader2 className="animate-spin text-primary dark:text-accent" size={32} />
                <p>Cargando módulo...</p>
              </div>
            }>
              {currentView === 'dashboard' && <Dashboard />}
              {currentView === 'transactions' && <TransactionList onEdit={handleEditTransaction} />}
              {currentView === 'settings' && <Settings />}
            </Suspense>
          </div>
        </main>

        {/* Modal */}
        {isModalOpen && (
          <Suspense fallback={null}>
            <TransactionForm
              onClose={handleCloseModal}
              initialData={editingTransaction || undefined}
            />
          </Suspense>
        )}

        {/* Global Notification */}
        <Toast />
      </div>
    </ThemeProvider>
  );
}

export default App;