import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuración de conexión para FinControl-Pro (Project ID: upheld-ellipse-181313)
// Actualizado con nueva App Web (V2) para corregir error de credenciales
const firebaseConfig = {
  apiKey: "AIzaSyBrG6HVhnyiEVediec4uVaSoiiH87lNeeg",
  authDomain: "upheld-ellipse-181313.firebaseapp.com",
  databaseURL: "https://upheld-ellipse-181313.firebaseio.com",
  projectId: "upheld-ellipse-181313",
  storageBucket: "upheld-ellipse-181313.appspot.com",
  messagingSenderId: "941532187940",
  appId: "1:941532187940:web:dae5aada8b6995d05237b1",
  measurementId: "G-XSS8X48LPT"
};

// Inicialización de la app
const app = initializeApp(firebaseConfig);

// Exportar servicios
export const auth = getAuth(app);
export const db = getFirestore(app);

// Configuración del Proveedor de Google
export const googleProvider = new GoogleAuthProvider();

// Bandera para indicar a la UI que Firebase está configurado correctamente
export const isFirebaseReady = true;