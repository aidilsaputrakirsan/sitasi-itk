import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getStorage, ref, deleteObject } from 'firebase/storage';

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase app only once
let app;
try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
} catch (error) {
  console.error("Firebase initialization error:", error);
  throw error;
}

const storage = getStorage(app);

export async function POST(request: NextRequest) {
  try {
    const { path } = await request.json();
    
    if (!path) {
      return NextResponse.json({ error: 'No path provided' }, { status: 400 });
    }
    
    console.log("Deleting file from path:", path);
    
    // Delete from Firebase Storage
    const fileRef = ref(storage, path);
    await deleteObject(fileRef);
    
    console.log("File deleted successfully");
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete error:', {
      message: error.message,
      code: error.code,
      serverResponse: error.customData?.serverResponse || 'No server response'
    });
    
    return NextResponse.json({ 
      error: 'Delete failed',
      message: error.message || 'Unknown error',
      code: error.code || 'unknown_error'
    }, { status: 500 });
  }
}