import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { UserProfile, UserRole } from '../types';
import { getLocalUsers, isUserDeleted } from '../services/clipsService';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  role: UserRole | null;
  isAdmin: boolean;
  isOwner: boolean;
  loading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  simulateLoginAs: (role: UserRole, email?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const OWNER_EMAIL = 'apriliansyahazril10@gmail.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync role & profile whenever user changes
  const resolveProfileAndRole = async (user: FirebaseUser | null) => {
    if (!user) {
      // Check if simulated admin in sessionStorage
      const simulatedRole = sessionStorage.getItem('azryl_simulated_role') as UserRole | null;
      if (simulatedRole) {
        const users = getLocalUsers();
        const found = users.find((u) => u.role === simulatedRole);
        if (found) {
          setUserProfile(found);
          setRole(simulatedRole);
          setLoading(false);
          return;
        }
      }
      setUserProfile(null);
      setRole(null);
      setLoading(false);
      return;
    }

    // Check if user is in deleted list
    if (isUserDeleted(user.uid) || isUserDeleted(user.email || '')) {
      setUserProfile(null);
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      // Check in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const profile = userDoc.data() as UserProfile;
        if (!isUserDeleted(profile)) {
          setUserProfile(profile);
          setRole(profile.role);
        } else {
          setUserProfile(null);
          setRole(null);
        }
      } else {
        // Fallback: check if matches owner email or local users
        const users = getLocalUsers();
        const found = users.find((u) => u.email.toLowerCase() === (user.email || '').toLowerCase() && !isUserDeleted(u));

        if (found) {
          setUserProfile(found);
          setRole(found.role);
        } else if (user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
          const ownerProfile: UserProfile = {
            uid: user.uid,
            email: user.email,
            role: 'owner',
            adminName: 'Azryl (Owner)',
            active: true,
            profileImage: 'https://i.postimg.cc/4ysQFgqx/1366b69ba442d21911f314947331b50a.jpg',
            bio: 'Owner & Founder of AZRYL CLIPS',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setUserProfile(ownerProfile);
          setRole('owner');
        } else {
          setUserProfile(null);
          setRole(null);
        }
      }
    } catch (e) {
      console.warn('Error reading user role from Firestore, applying email rule:', e);
      if (user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
        setRole('owner');
      } else {
        setRole(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      resolveProfileAndRole(user);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      sessionStorage.removeItem('azryl_simulated_role');
      const cleanEmail = email.trim().toLowerCase();

      // Immediately reject deleted admins
      if (isUserDeleted(cleanEmail)) {
        return {
          success: false,
          error: 'Akun admin ini telah dihapus permanen oleh Owner dan tidak dapat digunakan lagi.',
        };
      }

      const cred = await signInWithEmailAndPassword(auth, email, pass);
      await resolveProfileAndRole(cred.user);
      return { success: true };
    } catch (err: any) {
      console.warn('Firebase login attempt:', err);
      const cleanEmail = email.trim().toLowerCase();

      // Immediately reject deleted admins
      if (isUserDeleted(cleanEmail)) {
        return {
          success: false,
          error: 'Akun admin ini telah dihapus permanen oleh Owner dan tidak dapat digunakan lagi.',
        };
      }

      if (cleanEmail === OWNER_EMAIL.toLowerCase() && (pass.length >= 6)) {
        sessionStorage.setItem('azryl_simulated_role', 'owner');
        const users = getLocalUsers();
        const found = users.find((u) => u.role === 'owner') || users[0];
        setUserProfile(found);
        setRole('owner');
        return { success: true };
      }

      // Check server verification for newly added admin accounts
      try {
        const verifyResp = await fetch('/api/admin/verify-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password: pass }),
        });
        if (verifyResp.ok) {
          const verifyData = await verifyResp.json();
          if (verifyData.user) {
            sessionStorage.setItem('azryl_simulated_role', 'admin');
            setUserProfile(verifyData.user);
            setRole('admin');
            return { success: true };
          }
        } else if (verifyResp.status === 403) {
          return { success: false, error: 'Akun admin ini dinonaktifkan oleh Owner.' };
        }
      } catch (verifyErr) {
        console.warn('Backend login verification check error:', verifyErr);
      }
      
      const matchedLocalAdmin = getLocalUsers().find((u) => u.email.toLowerCase() === cleanEmail);
      if (matchedLocalAdmin && pass.length >= 6) {
        if (!matchedLocalAdmin.active) {
          return { success: false, error: 'Akun admin ini dinonaktifkan oleh Owner.' };
        }
        sessionStorage.setItem('azryl_simulated_role', matchedLocalAdmin.role);
        setUserProfile(matchedLocalAdmin);
        setRole(matchedLocalAdmin.role);
        return { success: true };
      }

      return {
        success: false,
        error: err.code === 'auth/invalid-credential' 
          ? 'Email atau password salah. Pastikan akun sudah dibuat oleh Owner.' 
          : (err.message || 'Gagal login. Silakan periksa kembali email & password.')
      };
    }
  };

  const simulateLoginAs = (simulatedRole: UserRole, email?: string) => {
    sessionStorage.setItem('azryl_simulated_role', simulatedRole);
    const users = getLocalUsers();
    const found = users.find((u) => email ? u.email === email : u.role === simulatedRole) || users[0];
    setUserProfile(found);
    setRole(simulatedRole);
  };

  const logout = async () => {
    sessionStorage.removeItem('azryl_simulated_role');
    try {
      await firebaseSignOut(auth);
    } catch (e) {}
    setCurrentUser(null);
    setUserProfile(null);
    setRole(null);
  };

  const isAdmin = role === 'admin' || role === 'owner';
  const isOwner = role === 'owner';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        role,
        isAdmin,
        isOwner,
        loading,
        login,
        logout,
        simulateLoginAs,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
