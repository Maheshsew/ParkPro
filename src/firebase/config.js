import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyBnk_JL8Q1vU3iZcB-geq3MmRExLN51_tY",
  authDomain: "parkpro-1ad14.firebaseapp.com",
  projectId: "parkpro-1ad14",
  storageBucket: "parkpro-1ad14.firebasestorage.app",
  messagingSenderId: "168595411381",
  appId: "1:168595411381:web:e60088f383628de65d89fc",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  auth = getAuth(app);
}

export const db = getFirestore(app);
export { auth };