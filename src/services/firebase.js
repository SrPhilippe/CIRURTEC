import { initializeApp } from "firebase/app"
import { getAuth, connectAuthEmulator } from "firebase/auth"
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore"
import { getAnalytics } from "firebase/analytics"

const firebaseConfig = {
    apiKey: "AIzaSyCCQ86fYP03pbDMmy_jcAwdeq5kzW-Jg0E",
    authDomain: "cirurtec-d8f30.firebaseapp.com",
    projectId: "cirurtec-d8f30",
    storageBucket: "cirurtec-d8f30.firebasestorage.app",
    messagingSenderId: "1095502087131",
    appId: "1:1095502087131:web:0a3477434da7df01f35dfe",
    measurementId: "G-1B0XGB379R"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

// Connect to Local Emulators if in DEV mode
if (import.meta.env.DEV) {
    connectAuthEmulator(auth, "http://localhost:9099")
    connectFirestoreEmulator(db, "localhost", 8080)
    console.log("🚀 Connected to Firebase Emulators")
}

const analytics = typeof window !== "undefined" ? getAnalytics(app) : null

export { auth, db, analytics }
export default app
