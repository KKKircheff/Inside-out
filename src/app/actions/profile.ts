'use server';

import { adminDb, adminAuth } from '@/lib/firebase/admin';
import type { UserProfile } from '@/contexts/UserProfileContext';

/**
 * Get user profile from Firestore
 *
 * @param uid - Firebase Auth user ID
 * @returns User profile or null if not found
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const docRef = adminDb.collection('users').doc(uid);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return null;
    }

    return docSnap.data() as UserProfile;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw new Error('Failed to fetch user profile');
  }
}

/**
 * Save or update user profile in Firestore
 *
 * @param uid - Firebase Auth user ID
 * @param profile - User profile data
 */
export async function saveUserProfile(uid: string, profile: UserProfile): Promise<void> {
  try {
    const docRef = adminDb.collection('users').doc(uid);

    await docRef.set(
      {
        ...profile,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw new Error('Failed to save user profile');
  }
}

/**
 * Initialize user profile with default values on first signup
 *
 * @param uid - Firebase Auth user ID
 * @param email - User email
 * @param displayName - User display name (optional)
 */
export async function initializeUserProfile(
  uid: string,
  email: string,
  displayName?: string
): Promise<UserProfile> {
  try {
    // Check if profile already exists
    const existingProfile = await getUserProfile(uid);
    if (existingProfile) {
      return existingProfile;
    }

    // Create default profile
    const defaultProfile: UserProfile = {
      name: displayName || email.split('@')[0],
      age: 0,
      occupation: '',
      location: '',
      financialSituation: '',
      personalGoals: '',
      riskTolerance: 'medium',
      familyStatus: '',
      additionalContext: '',
    };

    const docRef = adminDb.collection('users').doc(uid);

    await docRef.set({
      ...defaultProfile,
      email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return defaultProfile;
  } catch (error) {
    console.error('Error initializing user profile:', error);
    throw new Error('Failed to initialize user profile');
  }
}

/**
 * Delete user profile and all associated data
 *
 * @param uid - Firebase Auth user ID
 */
export async function deleteUserProfile(uid: string): Promise<void> {
  try {
    // Delete user document
    await adminDb.collection('users').doc(uid).delete();

    // Delete auth user
    await adminAuth.deleteUser(uid);
  } catch (error) {
    console.error('Error deleting user profile:', error);
    throw new Error('Failed to delete user profile');
  }
}
