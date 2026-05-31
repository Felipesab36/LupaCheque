import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "gen-lang-client-0728481087",
  appId: "1:123808956961:web:a8626c5ef6d1ddd4895960",
  apiKey: "AIzaSyDqeR8G4vaE3g12qS0gbBlsTQhMgabs7C8",
  authDomain: "gen-lang-client-0728481087.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-ce823d18-a96a-4b7d-b709-393940c0500b",
  storageBucket: "gen-lang-client-0728481087.firebasestorage.app",
  messagingSenderId: "123808956961",
  measurementId: ""
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Standard login popup helper
export { signInWithPopup, signOut };

// Test connection strictly as requested by firebase-integration skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
