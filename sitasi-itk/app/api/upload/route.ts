// app/api/upload/route.ts - Perbaikan error TypeScript

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Inisialisasi Firebase hanya sekali
let app;
try {
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
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
    
    // Upload to Firebase Storage
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, buffer, { 
      contentType: file.type
    });
    
    // Wait for upload to complete
    const snapshot = await new Promise((resolve, reject) => {
      uploadTask.on('state_changed', 
        (snapshot) => {
          // Log progress for debugging
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload progress: ${progress}%`);
        }, 
        (error) => {
          console.error("Firebase upload error:", error);
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
  } catch (error: any) { // Perbaikan disini: menambahkan type assertion ": any"
    console.error("Server-side upload error:", error);
    return NextResponse.json({ 
      error: 'Upload failed', 
      message: error.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    }, { status: 500 });
  }
}