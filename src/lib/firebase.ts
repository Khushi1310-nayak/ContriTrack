import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const getFirebaseConfig = () => {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  };

  const isBrowser = typeof window !== "undefined";
  const missingKeys = Object.entries(config)
    .filter(([ , val]) => !val)
    .map(([key]) => key);

  // Strictly throw real errors to force live configuration when running in user browser
  if (isBrowser && missingKeys.length > 0) {
    throw new Error(
      `Firebase initialization failed. Please configure your .env.local file with keys: ${missingKeys.join(", ")}`
    );
  }

  // Graceful dummy config fallbacks strictly for static build-time compilers
  return {
    apiKey: config.apiKey || "build-dummy-apiKey-12345",
    authDomain: config.authDomain || "build-dummy-authDomain",
    projectId: config.projectId || "build-dummy-projectId",
    storageBucket: config.storageBucket || "build-dummy-storageBucket",
    messagingSenderId: config.messagingSenderId || "1234567890",
    appId: config.appId || "build-dummy-appId"
  };
};

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase App client-side
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Services
const auth = getAuth(app);
const db = getFirestore(app);

// Configure Providers
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

export { app, auth, db, googleProvider, githubProvider };
