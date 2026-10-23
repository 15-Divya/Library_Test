import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCH1KpprI4jKOkfWVmtrdhNPWzQyxK7gQQ",
  authDomain: "libraryroom-a28e1.firebaseapp.com",
  projectId: "libraryroom-a28e1",
  storageBucket: "libraryroom-a28e1.firebasestorage.app",
  messagingSenderId: "62020320475",
  appId: "1:62020320475:web:c6e4571840acd1eeaae0fe",
  measurementId: "G-624JM51QV1"
};

const app = initializeApp(firebaseConfig);

const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, analytics, auth, db };