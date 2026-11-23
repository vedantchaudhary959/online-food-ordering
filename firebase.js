
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getFirestore,
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA5kUKtf4wVmhmz2vEVvOuKaHNyqQFHFU4",
    authDomain: "abes-bite.firebaseapp.com",
    projectId: "abes-bite",
    storageBucket: "abes-bite.firebasestorage.app",
    messagingSenderId: "66291689088",
    appId: "1:66291689088:web:086baa4aea6ea6e8e72865",
    measurementId: "G-0Y578D49K2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Connect Firestore
export const db = getFirestore(app);

// Connect Authentication
export const auth = getAuth(app);

// Save orders in Firestore
export async function saveOrder(orderData) {
    const orderRef = await addDoc(collection(db, "orders"), {
        ...orderData,
        createdAt: serverTimestamp()
    });

    return orderRef.id;
}

console.log("ABES.BITE connected to Firebase!");
