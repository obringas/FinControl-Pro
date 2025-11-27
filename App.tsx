import React, { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { TransactionList } from './components/TransactionList';
import { TransactionForm } from './components/TransactionForm';
import { Settings } from './components/Settings';
import { useStore } from './store';
import { getMonthName } from './utils';
import { LayoutDashboard, Receipt, Plus, ChevronLeft, ChevronRight, PieChart, Settings as SettingsIcon } from 'lucide-react';
import { Toast } from './components/ui/Toast';
import { Transaction } from './types';

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
    <div className="min-h-screen flex flex-col md:flex-row font-sans bg-slate-50">
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
        <header className="bg-white sticky top-0 z-30 border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm backdrop-blur-md bg-white/80">
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-white rounded-md text-slate-600 shadow-sm transition-all">
              <ChevronLeft size={18} />
            </button>
            <span className="px-4 font-semibold text-slate-700 min-w-[140px] text-center capitalize">
              {getMonthName(filter.month)} {filter.year}
            </span>
            <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-white rounded-md text-slate-600 shadow-sm transition-all">
              <ChevronRight size={18} />
            </button>
          </div>

          <button
            onClick={() => {
              setEditingTransaction(null);
              setIsModalOpen(true);
            }}
            className="bg-primary hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Nueva Transacción</span>
          </button>
        </header>

        {/* Content Area */}
        <div className="p-6 max-w-7xl mx-auto">
          {currentView === 'dashboard' && <Dashboard />}
          {currentView === 'transactions' && <TransactionList onEdit={handleEditTransaction} />}
          {currentView === 'settings' && <Settings />}
        </div>
      </main>

      {/* Modal */}
      {isModalOpen && (
        <TransactionForm
          onClose={handleCloseModal}
          initialData={editingTransaction || undefined}
        />
      )}

      {/* Global Notification */}
      <Toast />
    </div>
  );
}

export default App;