// app/api/upload/route.ts - With improved error handling

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

// Initialize Firebase with more precise error logging
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Log configuration for debugging (remove in production)
console.log("Storage Bucket:", process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);

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
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      console.error("No file provided in form data");
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    console.log("File received:", file.name, file.size, file.type);
    
    // Get path from form data
    const path = formData.get('path') as string || `sempro/${Date.now()}_${file.name}`;
    console.log("Upload path:", path);
    
    // Convert file to array buffer
    const bytes = await file.arrayBuffer();
    const buffer = new Uint8Array(bytes);
    
    // Upload to Firebase Storage with better error handling
    const storageRef = ref(storage, path);
    
    console.log("Starting upload to Firebase Storage...");
    
    const uploadTask = uploadBytesResumable(storageRef, buffer, { 
      contentType: file.type
    });
    
    // Track progress with more detailed logging
    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log(`Upload progress: ${progress.toFixed(2)}%`);
      },
      (error) => {
        console.error("Firebase upload error details:", {
          code: error.code,
          message: error.message,
          serverResponse: error.customData?.serverResponse || 'No server response'
        });
      }
    );
    
    // Wait for upload to complete
    const snapshot = await new Promise((resolve, reject) => {
      uploadTask.on('state_changed', 
        (snapshot) => {
          // Progress updates logged above
        }, 
        (error) => {
          console.error("Firebase upload error:", {
            code: error.code,
            message: error.message,
            serverResponse: error.customData?.serverResponse || 'No server response'
          });
          reject(error);
        },
        () => {
          resolve(uploadTask.snapshot);
        }
      );
    });
    
    console.log("Upload completed successfully");
    
    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    console.log("Download URL obtained:", downloadURL);
    
    return NextResponse.json({
      fileId: path,
      fileUrl: downloadURL,
      fileName: file.name,
      fileType: file.type,
      uploadedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Server-side upload error:", error);
    
    // Enhanced error response with more details
    return NextResponse.json({ 
      error: 'Upload failed', 
      message: error.message || 'Unknown error',
      code: error.code || 'unknown_error',
      serverResponse: error.customData?.serverResponse || 'No server response',
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    }, { status: 500 });
  }
}