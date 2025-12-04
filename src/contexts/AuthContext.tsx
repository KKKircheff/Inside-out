'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
  type UserCredential,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<UserCredential>;
  signIn: (email: string, password: string) => Promise<UserCredential>;
  signInWithGoogle: () => Promise<UserCredential>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (displayName: string, photoURL?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Sign up with email and password
   */
  const signUp = async (email: string, password: string, displayName?: string): Promise<UserCredential> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    // Update display name if provided
    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
    }

    return userCredential;
  };

  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string): Promise<UserCredential> => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  /**
   * Sign in with Google
   */
  const signInWithGoogle = async (): Promise<UserCredential> => {
    const provider = new GoogleAuthProvider();
    // Optional: Add custom parameters
    provider.setCustomParameters({
      prompt: 'select_account', // Force account selection
    });

    return signInWithPopup(auth, provider);
  };

  /**
   * Sign out current user
   */
  const signOut = async (): Promise<void> => {
    return firebaseSignOut(auth);
  };

  /**
   * Send password reset email
   */
  const resetPassword = async (email: string): Promise<void> => {
    return sendPasswordResetEmail(auth, email);
  };

  /**
   * Update user profile (display name, photo URL)
   */
  const updateUserProfile = async (displayName: string, photoURL?: string): Promise<void> => {
    if (!user) {
      throw new Error('No user is currently signed in');
    }

    return updateProfile(user, {
      displayName,
      ...(photoURL && { photoURL }),
    });
  };

  const value: AuthContextType = {
    user,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
