import React, { useEffect } from 'react';
import { useStore } from '../../store';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

export const Toast: React.FC = () => {
  const { notification, hideNotification } = useStore();

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        hideNotification();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification, hideNotification]);

  if (!notification) return null;

  const icons = {
    success: <CheckCircle size={20} className="text-emerald-500" />,
    error: <AlertCircle size={20} className="text-red-500" />,
    info: <Info size={20} className="text-blue-500" />,
    warning: <AlertTriangle size={20} className="text-amber-500" />
  };

  const bgColors = {
    success: 'bg-white border-emerald-100',
    error: 'bg-white border-red-100',
    info: 'bg-white border-blue-100',
    warning: 'bg-white border-amber-100'
  };

  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border animate-in slide-in-from-bottom-5 fade-in duration-300 ${bgColors[notification.type]}`}>
      {icons[notification.type]}
      <p className="text-sm font-medium text-slate-700 pr-2">{notification.message}</p>
      <button onClick={hideNotification} className="text-slate-400 hover:text-slate-600">
        <X size={16} />
      </button>
    </div>
  );
};