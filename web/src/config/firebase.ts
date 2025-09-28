// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA2GWTt5jXRdaaecz9CksL37o52I1x1LHI",
  authDomain: "way-to-globe.firebaseapp.com",
  projectId: "way-to-globe",
  storageBucket: "way-to-globe.firebasestorage.app",
  messagingSenderId: "439030957023",
  appId: "1:439030957023:web:97720430764b60433a7a6a",
  measurementId: "G-4R5N5VFX7W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Initialize Firebase Analytics (optional)
// const analytics = getAnalytics(app);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Functions and get a reference to the service
export const functions = getFunctions(app);

// Initialize Firebase Storage and get a reference to the service
export const storage = getStorage(app);

export default app;