import {initializeApp, getApps, type FirebaseApp} from 'firebase/app';
import {getAuth, type Auth} from 'firebase/auth';
import {getFirestore, type Firestore} from 'firebase/firestore';

export const firebaseConfig = {
    apiKey: 'AIzaSyBZ7TvaxoxDWPzVQVEZN7AGES1PIa6-bnw',
    authDomain: 'inside-out-agents.firebaseapp.com',
    projectId: 'inside-out-agents',
    storageBucket: 'inside-out-agents.firebasestorage.app',
    messagingSenderId: '217668965870',
    appId: '1:217668965870:web:c9848a84e34b4375ec2aff',
};

// Initialize Firebase (singleton pattern)
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} else {
    app = getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
}

export {app, auth, db};
