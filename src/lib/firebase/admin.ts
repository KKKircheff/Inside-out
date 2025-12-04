/**
 * Firebase Admin Configuration (SERVER-ONLY)
 *
 * IMPORTANT: This file uses 'server-only' to ensure it's never imported on the client.
 * Used for: Server Actions, API Routes, Server Components
 */

import 'server-only';

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

let adminApp: App;
let adminDb: Firestore;
let adminAuth: Auth;

/**
 * Initialize Firebase Admin SDK
 *
 * Uses service account credentials from environment variables
 */
function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    adminApp = getApps()[0];
  } else {
    // Check if we have service account credentials
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'Firebase Admin credentials are missing. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in your environment variables.'
      );
    }

    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  adminDb = getFirestore(adminApp);
  adminAuth = getAuth(adminApp);

  return { adminApp, adminDb, adminAuth };
}

// Initialize on module load
const { adminApp: app, adminDb: db, adminAuth: auth } = initializeFirebaseAdmin();

export { app as adminApp, db as adminDb, auth as adminAuth };
