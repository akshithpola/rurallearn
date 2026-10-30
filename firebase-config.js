import { initializeApp } from
    "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";

import {
    getAuth
} from
    "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
    getFirestore
} from
    "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";


// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBYlNe5OOVucTzCcff259PyqEcMdqbS9Vc",
  authDomain: "rurallearn-deff6.firebaseapp.com",
  projectId: "rurallearn-deff6",
  storageBucket: "rurallearn-deff6.firebasestorage.app",
  messagingSenderId: "98673556095",
  appId: "1:98673556095:web:c6202df80bc9a0728c9d4a",
  measurementId: "G-F2ESY5YRQD"
};


const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);