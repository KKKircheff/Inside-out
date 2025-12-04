/**
 * Firebase Admin Configuration (SERVER-ONLY)
 *
 * IMPORTANT: This file uses 'server-only' to ensure it's never imported on the client.
 * Used for: Server Actions, API Routes, Server Components
 */

import 'server-only';

import {initializeApp, getApps, cert, type App} from 'firebase-admin/app';
import {getFirestore, type Firestore} from 'firebase-admin/firestore';
import {getAuth, type Auth} from 'firebase-admin/auth';

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
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;

        if (!projectId || !clientEmail || !privateKey) {
            throw new Error(
                'Firebase Admin credentials are missing. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in your environment variables.'
            );
        }

        // Handle different private key formats for local development
        // Production environments (Firebase, Vercel) handle these transformations automatically

        // 1. Remove surrounding quotes if present (Next.js might add them)
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
            privateKey = privateKey.slice(1, -1);
        }
        if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
            privateKey = privateKey.slice(1, -1);
        }

        // 2. Replace literal \n strings with actual newlines
        privateKey = privateKey.replace(/\\n/g, '\n');

        // 3. Remove trailing backslashes before actual newlines
        // This handles Windows .env.local parsing quirks where keys have format: "line\↵"
        privateKey = privateKey.replace(/\\\s*\n/g, '\n');

        // 4. Validate PEM format
        if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
            throw new Error('Invalid private key format: missing BEGIN marker');
        }
        if (!privateKey.includes('-----END PRIVATE KEY-----')) {
            throw new Error('Invalid private key format: missing END marker');
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

    return {adminApp, adminDb, adminAuth};
}

// Initialize on module load
const {adminApp: app, adminDb: db, adminAuth: auth} = initializeFirebaseAdmin();

export {app as adminApp, db as adminDb, auth as adminAuth};
