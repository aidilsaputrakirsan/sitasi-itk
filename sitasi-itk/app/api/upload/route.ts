import { NextRequest, NextResponse } from 'next/server';
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Get metadata and path
    const metadataStr = formData.get('metadata') as string;
    const metadata = metadataStr ? JSON.parse(metadataStr) : {};
    const providedPath = formData.get('path') as string;

    // Create unique path if not provided
    const fileExt = file.name.split('.').pop();
    const path = providedPath || `sempro/${uuidv4()}/${Date.now()}.${fileExt}`;
    
    // Convert file to array buffer
    const bytes = await file.arrayBuffer();
    const buffer = new Uint8Array(bytes);
    
    // Upload to Firebase Storage
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, buffer, { 
      contentType: file.type,
      customMetadata: metadata
    });
    
    // Wait for upload to complete
    await new Promise((resolve, reject) => {
      uploadTask.on('state_changed', 
        (snapshot) => {}, 
        (error) => reject(error),
        () => resolve(null)
      );
    });
    
    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    return NextResponse.json({
      fileId: path,
      fileUrl: downloadURL,
      fileName: file.name,
      fileType: file.type,
      uploadedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}