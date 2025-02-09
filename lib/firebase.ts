import { initializeApp, getApps } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: "***REMOVED***",
  authDomain: "trrag-d6a28.firebaseapp.com",
  projectId: "trrag-d6a28",
  storageBucket: "trrag-d6a28.firebasestorage.app",
  messagingSenderId: "279011225151",
  appId: "1:279011225151:web:abd55717739c95250d128a",
  measurementId: "G-WPDD2831HJ"
}

// Initialize Firebase only if it hasn't been initialized already
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const auth = getAuth(app)
const storage = getStorage(app)

export { auth, storage }

