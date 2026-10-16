// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDEi0Bo7dVIeXooBMDjebarmE2U5gUkmzU",
  authDomain: "expenseengine.firebaseapp.com",
  projectId: "expenseengine",
  storageBucket: "expenseengine.firebasestorage.app",
  messagingSenderId: "534058615731",
  appId: "1:534058615731:web:b25fe85a1ffe8fe4bac1c6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize & Export Authentication
export const auth = getAuth(app);