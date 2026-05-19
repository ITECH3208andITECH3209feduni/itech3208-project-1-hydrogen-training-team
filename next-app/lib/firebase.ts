import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAKJNCrLCEbMlP8Cbn2sJAs-GsbDTf3ANA",
  authDomain: "hydrogen-lab.firebaseapp.com",
  projectId: "hydrogen-lab",
  storageBucket: "hydrogen-lab.firebasestorage.app",
  messagingSenderId: "856188696353",
  appId: "1:856188696353:web:7b4e6d0eb191003daf3060"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);