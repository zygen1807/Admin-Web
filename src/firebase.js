import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBHZhs3hAbqedLte6Vy5kn3m2covD04FCA",
  authDomain: "palmsapp-30f25.firebaseapp.com",
  projectId: "palmsapp-30f25",
  storageBucket: "palmsapp-30f25.firebasestorage.app",
  messagingSenderId: "296634290513",
  appId: "1:296634290513:web:2919731819529b82a50370",
  measurementId: "G-8H86F3GCRD"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
