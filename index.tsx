import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// -------------------------------------------------------------------
// PUENTE DE VARIABLES DE ENTORNO (Vite -> Node/Process compatibility)
// -------------------------------------------------------------------
// Esto permite que librerías estrictas (como Google GenAI) que buscan 'process.env.API_KEY'
// funcionen en Vercel/Vite donde la variable real es 'import.meta.env.VITE_API_KEY'.
// -------------------------------------------------------------------
if (typeof window !== 'undefined') {
  const win = window as any;
  win.process = win.process || { env: {} };
  
  // Asegurar que el objeto env exista
  if (!win.process.env) {
    win.process.env = {};
  }

  // Mapear la variable de Vercel/Vite a la variable estándar de Node
  // NOTA: Asegúrate de agregar VITE_API_KEY en los Settings de Vercel
  const meta = import.meta as any;
  const viteKey = meta.env?.VITE_API_KEY;
  if (viteKey) {
    win.process.env.API_KEY = viteKey;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);