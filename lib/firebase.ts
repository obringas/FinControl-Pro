
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuración de conexión para FinControl-Pro (Project ID: upheld-ellipse-181313)
const firebaseConfig = {
  apiKey: "AIzaSyBrG6HVhnyiEVediec4uVaSoiiH87lNeeg",
  authDomain: "upheld-ellipse-181313.firebaseapp.com",
  databaseURL: "https://upheld-ellipse-181313.firebaseio.com",
  projectId: "upheld-ellipse-181313",
  storageBucket: "upheld-ellipse-181313.appspot.com",
  messagingSenderId: "941532187940",
  appId: "1:941532187940:web:c57228af3293de995237b1",
  measurementId: "G-TPKTTNX5PY"
};

// Inicialización de la app
const app = initializeApp(firebaseConfig);

// Exportar servicios
export const auth = getAuth(app);
export const db = getFirestore(app);

// Configuración del Proveedor de Google con corrección de Client ID
export const googleProvider = new GoogleAuthProvider();

// FIX CRÍTICO: Forzamos el uso del ID de cliente válido que tienes en Google Cloud Console
// Esto soluciona el error "401 deleted_client"
googleProvider.setCustomParameters({
  client_id: '941532187940-gd0r66oe3ur60fugefd52uc9bqmto9s2.apps.googleusercontent.com'
});

// Bandera para indicar a la UI que Firebase está configurado correctamente
export const isFirebaseReady = true;
