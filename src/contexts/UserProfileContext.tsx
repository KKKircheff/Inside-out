'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from './AuthContext';

export interface UserProfile {
  name: string;
  age: number;
  occupation: string;
  location: string;
  financialSituation: string;
  personalGoals: string;
  riskTolerance: 'low' | 'medium' | 'high';
  familyStatus: string;
  additionalContext: string;
}

interface UserProfileContextType {
  profile: UserProfile;
  updateProfile: (profile: UserProfile) => Promise<void>;
  getPersonalContext: () => string;
  loading: boolean;
}

// Default profile template
const DEFAULT_PROFILE: UserProfile = {
  name: '',
  age: 0,
  occupation: '',
  location: '',
  financialSituation: '',
  personalGoals: '',
  riskTolerance: 'medium',
  familyStatus: '',
  additionalContext: '',
};

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);

  // Subscribe to user profile changes in Firestore
  useEffect(() => {
    if (!user) {
      setProfile(DEFAULT_PROFILE);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Real-time listener for profile changes
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setProfile(data);
        } else {
          // Profile doesn't exist yet, use default
          setProfile({
            ...DEFAULT_PROFILE,
            name: user.displayName || user.email?.split('@')[0] || '',
          });
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to profile changes:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const updateProfile = async (newProfile: UserProfile): Promise<void> => {
    if (!user) {
      throw new Error('User must be authenticated to update profile');
    }

    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          ...newProfile,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // The real-time listener will automatically update the local state
    } catch (error) {
      console.error('Error updating profile:', error);
      throw new Error('Failed to update profile');
    }
  };

  const getPersonalContext = (): string => {
    return `
Personal Profile:
- Name: ${profile.name}
- Age: ${profile.age}
- Occupation: ${profile.occupation}
- Location: ${profile.location}
- Financial Situation: ${profile.financialSituation}
- Personal Goals: ${profile.personalGoals}
- Risk Tolerance: ${profile.riskTolerance}
- Family Status: ${profile.familyStatus}
${profile.additionalContext ? `- Additional Context: ${profile.additionalContext}` : ''}
`.trim();
  };

  return (
    <UserProfileContext.Provider value={{ profile, updateProfile, getPersonalContext, loading }}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
}
