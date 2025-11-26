
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

// Configuración del Proveedor de Google
// Nota: Ya no forzamos el client_id aquí porque se ha configurado correctamente 
// en la consola de Firebase > Authentication > Google
export const googleProvider = new GoogleAuthProvider();

// Bandera para indicar a la UI que Firebase está configurado correctamente
export const isFirebaseReady = true;
