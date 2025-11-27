
import React, { useRef, useEffect, useState } from 'react';
import { useStore } from '../store';
import { Card } from './ui/Card';
import { Download, Upload, Trash2, Database, AlertTriangle, FileSpreadsheet, Cloud, LogIn, LogOut, RefreshCw, Copy, ExternalLink, XCircle, Globe, CheckCircle2 } from 'lucide-react';
import { convertToCSV } from '../utils';
import { auth, googleProvider, isFirebaseReady } from '../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

export const Settings: React.FC = () => {
  const { getData, loadData, resetData, showNotification, user, setUser, syncLocalDataToCloud, isLoading } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [currentDomain, setCurrentDomain] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Initialize Auth Listener & Get Domain
  useEffect(() => {
    // Capturamos el hostname (ej: localhost o midominio.com)
    setCurrentDomain(window.location.hostname);

    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, [setUser]);

  const handleLogin = async () => {
    if (!auth) return;
    setAuthLoading(true);
    setLoginError(null); // Reset previous errors

    try {
      await signInWithPopup(auth, googleProvider);
      showNotification('Sesión iniciada correctamente', 'success');
    } catch (error: any) {
      console.error("Firebase Auth Error:", error);

      // Manejo específico de errores comunes con UI dedicada
      if (error.code === 'auth/unauthorized-domain') {
        setLoginError('unauthorized-domain');
        showNotification('Dominio no autorizado', 'error');
      } else if (error.code === 'auth/operation-not-allowed') {
        setLoginError('provider-disabled');
        showNotification('Google Auth no habilitado', 'error');
      } else if (error.code === 'auth/popup-closed-by-user') {
        showNotification('Inicio de sesión cancelado', 'info');
      } else {
        setLoginError(error.message);
        showNotification('Error de autenticación', 'error');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      showNotification('Sesión cerrada', 'info');
      setLoginError(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSync = async () => {
    if (window.confirm('Esto subirá tus transacciones locales a tu cuenta en la nube. ¿Continuar?')) {
      await syncLocalDataToCloud();
    }
  };

  const handleExportJSON = () => {
    try {
      const data = getData();
      const dataStr = JSON.stringify(data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `fincontrol_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showNotification('Copia de seguridad descargada correctamente', 'success');
    } catch (error) {
      showNotification('Error al generar la copia de seguridad', 'error');
    }
  };

  const handleExportCSV = () => {
    try {
      const { transactions, categories } = getData();
      if (transactions.length === 0) {
        showNotification('No hay datos para exportar', 'info');
        return;
      }

      const csvContent = convertToCSV(transactions, categories);
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `fincontrol_reporte_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showNotification('Reporte Excel (CSV) generado correctamente', 'success');
    } catch (error) {
      console.error(error);
      showNotification('Error al generar el reporte', 'error');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!Array.isArray(json.transactions)) throw new Error('Formato inválido');

        if (window.confirm('Esta acción reemplazará todos tus datos actuales. ¿Estás seguro?')) {
          loadData(json);
          showNotification('Datos restaurados correctamente', 'success');
        }
      } catch (error) {
        showNotification('El archivo seleccionado no es válido', 'error');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (window.confirm('¿ESTÁS SEGURO? Esta acción borrará permanentemente todas tus transacciones locales. No se puede deshacer.')) {
      resetData();
      showNotification('Base de datos local reseteada', 'info');
    }
  };

  const copyDomain = () => {
    navigator.clipboard.writeText(currentDomain);
    showNotification('Dominio copiado al portapapeles', 'success');
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* 🟢 DOMAIN HELPER - SIEMPRE VISIBLE PARA CONFIGURACIÓN */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 rounded-lg text-amber-600 mt-1 sm:mt-0">
            <Globe size={20} />
          </div>
          <div>
            <h3 className="font-bold text-amber-900 text-sm">Configuración de Dominio Firebase</h3>
            <p className="text-xs text-amber-800 mt-1">
              Si ves error de "Unauthorized Domain", agrega esta URL en Firebase Console &gt; Auth &gt; Settings &gt; Authorized Domains.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-amber-200 w-full sm:w-auto shadow-inner">
          <code className="text-xs font-mono text-slate-600 truncate flex-1 select-all min-w-[150px]">
            {currentDomain}
          </code>
          <button
            onClick={copyDomain}
            className="text-amber-600 hover:text-amber-800 hover:bg-amber-50 p-1.5 rounded transition-colors"
            title="Copiar Dominio"
          >
            <Copy size={16} />
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-8 text-white shadow-lg">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-white/10 rounded-lg">
            <Database size={32} className="text-accent" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Gestión de Datos</h2>
            <p className="text-slate-300">Sincronización en la nube y respaldos locales.</p>
          </div>
        </div>
      </div>

      {/* Cloud Sync Section - Level 2 Feature */}
      <Card title="Nube y Sincronización" className={`border-l-4 ${isFirebaseReady ? 'border-l-indigo-500' : 'border-l-slate-300'}`}>
        {!isFirebaseReady ? (
          <div className="text-center py-6">
            <div className="inline-block p-3 bg-slate-100 rounded-full mb-3 text-slate-400">
              <Cloud size={32} />
            </div>
            <h3 className="font-semibold text-slate-700">Modo Nube no configurado</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-2 mb-4">
              Para activar la sincronización, necesitas configurar tu proyecto de Firebase en el archivo <code>lib/firebase.ts</code>.
            </p>
          </div>
        ) : !user ? (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
            <div className="p-3 bg-indigo-50 rounded-full text-indigo-600">
              <Cloud size={32} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Inicia sesión para sincronizar</h3>
              <p className="text-sm text-slate-500">Guarda tus datos en la nube y accede desde cualquier lugar.</p>
            </div>

            {/* Error UI: Unauthorized Domain */}
            {loginError === 'unauthorized-domain' && (
              <div className="w-full max-w-lg bg-red-50 border border-red-200 rounded-xl p-4 text-left animate-in shake">
                <div className="flex items-start gap-3">
                  <XCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
                  <div className="flex-1">
                    <h4 className="font-bold text-red-800 text-sm">Dominio Bloqueado por Firebase</h4>
                    <p className="text-xs text-red-700 mt-1 mb-2">
                      Copia el dominio que aparece en la tarjeta amarilla arriba y agrégalo a tu consola de Firebase.
                    </p>
                    <a
                      href="https://console.firebase.google.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-red-700 underline flex items-center gap-1"
                    >
                      Ir a Firebase Console <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Error UI: Provider Disabled */}
            {loginError === 'provider-disabled' && (
              <div className="w-full max-w-lg bg-amber-50 border border-amber-200 rounded-xl p-4 text-left flex gap-3">
                <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                <div>
                  <h4 className="font-bold text-amber-800 text-sm">Google Auth Desactivado</h4>
                  <p className="text-xs text-amber-700 mt-1">
                    Debes ir a la consola de Firebase &gt; Authentication &gt; Sign-in method y habilitar el proveedor de <b>Google</b>.
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={authLoading}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-indigo-200 transition-all mt-2"
            >
              {authLoading ? <RefreshCw className="animate-spin" size={20} /> : <LogIn size={20} />}
              {loginError ? 'Reintentar Iniciar Sesión' : 'Iniciar sesión con Google'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 py-2">
            <div className="flex items-center gap-4">
              {user.photoURL ? (
                <img src={user.photoURL} alt="User" className="w-12 h-12 rounded-full border-2 border-indigo-100" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl">
                  {user.displayName?.charAt(0) || user.email?.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-semibold text-slate-800">{user.displayName || 'Usuario'}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
                <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600 font-medium">
                  <Cloud size={12} />
                  <span>Conectado a la nube</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button
                onClick={handleSync}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 py-2 rounded-lg font-medium transition-colors"
                title="Subir datos locales a la nube"
              >
                {isLoading ? <RefreshCw className="animate-spin" size={18} /> : <Upload size={18} />}
                <span className="text-sm">Subir Local a Nube</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <LogOut size={18} />
                <span className="text-sm">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Exportar Datos" className="h-full">
          <div className="space-y-4">
            <button
              onClick={handleExportJSON}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl transition-all font-medium"
            >
              <Download size={20} />
              Exportar Backup (JSON)
            </button>

            <button
              onClick={handleExportCSV}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl transition-all font-medium shadow-sm"
            >
              <FileSpreadsheet size={20} />
              Exportar para Excel (CSV)
            </button>
          </div>
        </Card>

        <Card title="Restaurar Copia Local" className="h-full">
          <div className="space-y-4">
            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={handleImportClick}
              className="w-full flex items-center justify-center gap-2 bg-white border-2 border-slate-200 hover:border-primary hover:text-primary text-slate-600 py-3 rounded-xl transition-all font-medium border-dashed"
            >
              <Upload size={20} />
              Importar Archivo de Respaldo
            </button>
            <p className="text-xs text-slate-400 text-center">
              Reemplaza la base de datos local actual
            </p>
          </div>
        </Card>
      </div>

      <Card className="border-red-100 bg-red-50/30">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg text-red-500">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="font-bold text-red-700">Zona de Peligro</h3>
              <p className="text-sm text-red-600/80">Borrar base de datos LOCAL.</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors font-bold text-sm shadow-md hover:shadow-lg"
          >
            <Trash2 size={16} />
            RESET DE FÁBRICA (Borrar Todo)
          </button>
        </div>
      </Card>
    </div>
  );
};
