// src/lib/firebase.ts
import admin from 'firebase-admin';

// This function ensures initialization happens only once
const initializeFirebaseAdmin = () => {
  // Check if the app is already initialized to prevent errors
  if (!admin.apps.length) {
    
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    // Vercel escapes newlines, so we must replace them back
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

    // Add checks to provide clearer build-time errors
    if (!projectId) {
      throw new Error('Firebase admin initialization error: FIREBASE_PROJECT_ID is not defined. Check your Vercel environment variables.');
    }
    if (!clientEmail) {
      throw new Error('Firebase admin initialization error: FIREBASE_CLIENT_EMAIL is not defined. Check your Vercel environment variables.');
    }
    if (!privateKey) {
      throw new Error('Firebase admin initialization error: FIREBASE_PRIVATE_KEY is not defined. Check your Vercel environment variables.');
    }
    if (!storageBucket) {
      throw new Error('Firebase admin initialization error: FIREBASE_STORAGE_BUCKET is not defined. Check your Vercel environment variables.');
    }

    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        storageBucket: storageBucket,
      });
      console.log("Firebase Admin initialized.");
    } catch (error: unknown) {
      console.error('Firebase admin initialization error', error);
      // Re-throw the error so the API route can catch it
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      throw new Error(`Firebase initialization failed: ${message}`);
    }
  }
};

// DO NOT call initializeFirebaseAdmin() here at the top level.

// Export a function to get storage
export const getStorage = () => {
  // Ensure the app is initialized *before* trying to access storage
  initializeFirebaseAdmin();
  
  // Now it's safe to return the storage service
  return admin.storage();
};

// Export admin itself for other uses
export default admin;