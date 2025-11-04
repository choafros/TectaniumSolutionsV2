// src/lib/firebase.ts
import admin from 'firebase-admin';

// This function ensures initialization happens only once
const initializeFirebaseAdmin = () => {
  // Check if the app is already initialized to prevent errors
  if (!admin.apps.length) {
    
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

    // Add checks to provide clearer build-time errors
    if (!projectId) {
      console.error('Firebase admin initialization error: FIREBASE_PROJECT_ID is not defined. Check your Vercel environment variables.');
      return;
    }
    if (!clientEmail) {
      console.error('Firebase admin initialization error: FIREBASE_CLIENT_EMAIL is not defined. Check your Vercel environment variables.');
      return;
    }
    if (!privateKey) {
      console.error('Firebase admin initialization error: FIREBASE_PRIVATE_KEY is not defined. Check your Vercel environment variables.');
      return;
    }
    if (!storageBucket) {
      console.error('Firebase admin initialization error: FIREBASE_STORAGE_BUCKET is not defined. Check your Vercel environment variables.');
      return;
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
    } catch (error) {
      console.error('Firebase admin initialization error', error);
    }
  }
};

// Call the initialization function right away
initializeFirebaseAdmin();

// Export a function to get storage, not the storage instance itself
// This ensures admin.apps.length is checked before storage() is called
export const getStorage = () => {
  if (!admin.apps.length) {
    // This might be redundant if the above call works, but serves as a safeguard
    initializeFirebaseAdmin();
  }
  return admin.storage();
};

// Export admin itself for other uses
export default admin;

