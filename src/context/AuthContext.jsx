import React, { createContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword,
  updateEmail,
  updatePassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in, fetch additional profile data from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = {
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            ...userDoc.data(),
            accessToken: await firebaseUser.getIdToken()
          };
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        }
      } else {
        setUser(null);
        localStorage.removeItem('user');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (usernameOrEmail, password) => {
    // Note: Firebase Auth primarily uses email. 
    // If we want to support username login, we'd need a lookup table in Firestore.
    // For now, we'll assume email login as per standard Firebase patterns.
    const userCredential = await signInWithEmailAndPassword(auth, usernameOrEmail, password);
    const firebaseUser = userCredential.user;
    
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (userDoc.exists()) {
      const userData = {
        id: firebaseUser.uid,
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        ...userDoc.data(),
        accessToken: await firebaseUser.getIdToken()
      };
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return userData;
    }
    throw new Error('Usuário não encontrado no banco de dados.');
  };

  const logout = async () => {
    await signOut(auth);
    localStorage.removeItem('user');
    setUser(null);
  };

  const register = async (username, email, password, role, rights) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    const userData = {
      username,
      email,
      role: role || 'Padrão',
      rights: rights || 'Padrão',
      public_ID: Math.random().toString(36).substr(2, 9), // Simple replacement for nanoid
      receive_warranty_emails: false,
      createdAt: new Date()
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), userData);
    
    return { uid: firebaseUser.uid, ...userData };
  };

  const updateProfile = async (id, data) => {
    const userRef = doc(db, 'users', id);
    const updates = { ...data };

    // If email is being updated, we need special handling for Firebase Auth
    if (updates.email && updates.email !== auth.currentUser.email) {
      await updateEmail(auth.currentUser, updates.email);
    }

    // Securely update password if provided
    if (updates.password) {
      await updatePassword(auth.currentUser, updates.password);
      // Remove password from Firestore update payload
      delete updates.password;
    }

    // Remove confirmPassword if present
    delete updates.confirmPassword;

    await updateDoc(userRef, {
      ...updates,
      updatedAt: new Date()
    });

    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    return { user: updatedUser };
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, updateProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
