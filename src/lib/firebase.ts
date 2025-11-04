// src/lib/firebase.ts
import admin from 'firebase-admin';

// This function ensures initialization happens only once
const initializeFirebaseAdmin = () => {
  // Check if the app is already initialized to prevent errors
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Replace newline characters with actual newlines
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
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
export const getStorage = () => admin.storage();

// Export admin itself for other uses
export default admin;
