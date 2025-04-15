// app/api/verify-firebase/route.ts
import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getStorage, ref, listAll } from 'firebase/storage';

export async function GET() {
  try {
    // Firebase configuration
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    };

    // Log configuration (useful for debugging but remove in production)
    const configDetails = {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      appCount: getApps().length
    };

    // Initialize Firebase with the same pattern as other routes
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const storage = getStorage(app);
    
    // Try to list the root directory
    const rootRef = ref(storage);
    const listResult = await listAll(rootRef);
    
    // Count items
    const itemCount = {
      folders: listResult.prefixes.length,
      files: listResult.items.length
    };
    
    // Return success response with configuration details
    return NextResponse.json({
      status: 'success',
      message: 'Firebase Storage is properly configured',
      configDetails,
      itemCount,
      listResult: {
        prefixes: listResult.prefixes.map(prefix => prefix.fullPath),
        items: listResult.items.map(item => item.fullPath).slice(0, 5) // Show only first 5 files
      }
    });
  } catch (error: any) {
    console.error('Firebase verification error:', error);
    
    // Return detailed error information
    return NextResponse.json({
      status: 'error',
      message: 'Firebase Storage verification failed',
      error: {
        code: error.code || 'unknown',
        message: error.message || 'Unknown error',
        serverResponse: error.customData?.serverResponse || 'No server response'
      },
      config: {
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
      }
    }, { status: 500 });
  }
}