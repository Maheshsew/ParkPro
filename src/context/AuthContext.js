import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { pushTokens } from '../notifications';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
          try {
          const adminSnap = await getDoc(doc(db, 'admins', u.uid));
          console.log('LOGIN UID:', u.uid, '| admin doc exists:', adminSnap.exists());
          setIsAdmin(adminSnap.exists());
        } catch (e) {
          console.log('ADMIN CHECK ERROR:', e.message);
          setIsAdmin(false);
        }

        try {
          const snap = await getDoc(doc(db, 'customers', u.uid));
          if (snap.exists()) setProfile(snap.data());
        } catch (e) {}
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  const logout = async () => {
    if (user) await pushTokens.unregister(user.uid);
    return signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, setProfile, isAdmin, initializing, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}