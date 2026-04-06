import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: variabili Vite obbligatorie per bootstrap Firebase web: VITE_FIREBASE_API_KEY,
// VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID.
// TODO: VITE_FIREBASE_DATABASE_URL è obbligatoria solo se usi Firebase Realtime Database (RTDB).
const firebaseEnv = {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
  VITE_FIREBASE_DATABASE_URL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

const requiredFirebaseEnvVars = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_APP_ID",
];

const missingFirebaseEnvVars = requiredFirebaseEnvVars.filter((name) => !String(firebaseEnv[name] || "").trim());
if (missingFirebaseEnvVars.length > 0) {
  throw new Error(
    `Configurazione Firebase Vite incompleta. Variabili mancanti: ${missingFirebaseEnvVars.join(", ")}.`
  );
}

const firebaseConfig = {
  apiKey: firebaseEnv.VITE_FIREBASE_API_KEY,
  authDomain: firebaseEnv.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: firebaseEnv.VITE_FIREBASE_PROJECT_ID,
  appId: firebaseEnv.VITE_FIREBASE_APP_ID,
  databaseURL: firebaseEnv.VITE_FIREBASE_DATABASE_URL,
  storageBucket: firebaseEnv.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: firebaseEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
