
import React, { useState } from 'react';
import { useStore } from '../store';
import { calculateMonthlyStats, formatCurrency, getCategoryData, getMonthlyTrendData } from '../utils';
import { Card } from './ui/Card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area } from 'recharts';
import { ArrowUpCircle, ArrowDownCircle, Wallet, AlertTriangle, Sparkles, CreditCard } from 'lucide-react';
import { getFinancialAdvice } from '../services/geminiService';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1'];

export const Dashboard: React.FC = () => {
  const { transactions, filter, categories } = useStore();
  const stats = calculateMonthlyStats(transactions, filter.month, filter.year);

  // Group data by Category Group for the Pie Chart
  const categoryData = React.useMemo(() => {
    const rawData = getCategoryData(transactions, filter.month, filter.year);
    // Aggregate by group
    const grouped = rawData.reduce((acc, item) => {
      const catDef = categories.find(c => c.name === item.name); // item.name comes from getCategoryData which uses cat name
      // Fallback if name match fails (should rely on ID ideally but getCategoryData returns names)
      const groupName = catDef?.group || 'Otros';

      if (!acc[groupName]) {
        acc[groupName] = { name: groupName, value: 0 };
      }
      acc[groupName].value += item.value;
      return acc;
    }, {} as Record<string, { name: string, value: number }>);

    return Object.values(grouped).sort((a, b) => b.value - a.value);
  }, [transactions, filter.month, filter.year, categories]);

  // Now passing filter month/year to generate projection based on current view
  const trendData = getMonthlyTrendData(transactions, filter.month, filter.year);

  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const handleGetAdvice = async () => {
    setLoadingAi(true);
    const advice = await getFinancialAdvice(stats, transactions, filter.month);
    setAiAdvice(advice);
    setLoadingAi(false);
  };

  // Color logic for progress bar
  const getProgressColor = (percent: number) => {
    if (percent > 95) return 'bg-red-500';
    if (percent > 70) return 'bg-yellow-400';
    return 'bg-emerald-500';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">Ingresos</p>
              <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(stats.totalIncome)}</h3>
            </div>
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
              <ArrowUpCircle size={24} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">Gastos (Flujo)</p>
              <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(stats.totalExpense)}</h3>
            </div>
            <div className="p-2 bg-red-100 rounded-lg text-red-600">
              <ArrowDownCircle size={24} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">Deuda TC Mes</p>
              <h3 className="text-2xl font-bold text-blue-800">{formatCurrency(stats.creditCardConsumption)}</h3>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <CreditCard size={24} />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">Compras realizadas con tarjeta este mes</p>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">Balance</p>
              <h3 className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                {formatCurrency(stats.balance)}
              </h3>
            </div>
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              <Wallet size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Health Indicator */}
      <Card className="p-0">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-600">Uso del Presupuesto (vs Ingresos)</span>
          <span className={`text-sm font-bold ${stats.usagePercentage > 95 ? 'text-red-500' : 'text-slate-700'}`}>
            {stats.usagePercentage.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-1000 ${getProgressColor(stats.usagePercentage)}`}
            style={{ width: `${Math.min(stats.usagePercentage, 100)}%` }}
          ></div>
        </div>
        {stats.usagePercentage > 95 && (
          <div className="mt-3 flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded-lg">
            <AlertTriangle size={16} />
            <span>¡Alerta! Has superado el límite recomendado de gastos.</span>
          </div>
        )}
      </Card>

      {/* AI Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="text-yellow-300" />
          <h3 className="font-bold text-lg">Asistente Financiero Gemini AI</h3>
        </div>

        {!aiAdvice ? (
          <div className="flex items-center justify-between">
            <p className="text-indigo-100 text-sm max-w-xl">
              Obtén un análisis inteligente de tus finanzas actuales y consejos personalizados para mejorar tu ahorro este mes.
            </p>
            <button
              onClick={handleGetAdvice}
              disabled={loadingAi}
              className="px-4 py-2 bg-white text-indigo-700 font-semibold rounded-lg shadow hover:bg-indigo-50 transition-colors disabled:opacity-70"
            >
              {loadingAi ? 'Analizando...' : 'Generar Consejos'}
            </button>
          </div>
        ) : (
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm animate-in fade-in">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{aiAdvice}</pre>
            <button
              onClick={() => setAiAdvice(null)}
              className="mt-3 text-xs text-indigo-200 hover:text-white underline"
            >
              Ocultar
            </button>
          </div>
        )}
      </div>

      {/* Charts Grid - Top Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Gastos por Categoría" className="min-h-[350px]">
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-400">
              Sin datos de gastos este mes
            </div>
          )}
        </Card>

        <Card title="Flujo de Caja Proyectado (Cash Flow)" className="min-h-[350px]">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: '#f1f5f9' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value) => formatCurrency(value as number)}
              />
              <Legend />
              <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Charts Grid - Bottom Row (Credit Cards) */}
      <div className="grid grid-cols-1">
        <Card title="Análisis de Tarjetas de Crédito: Consumo vs Pagos" className="min-h-[350px]">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorConsumo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPago" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis hide />
              <Tooltip
                cursor={{ stroke: '#94a3b8', strokeDasharray: '5 5' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value) => formatCurrency(value as number)}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="ConsumoTC"
                name="Consumo (Nueva Deuda)"
                stroke="#f59e0b"
                fillOpacity={1}
                fill="url(#colorConsumo)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="PagosTC"
                name="Pagos de Resumen"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorPago)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};
