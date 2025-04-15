// lib/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { FileMetadata } from '@/types/sempro';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const storage = getStorage(app);

// Upload file to Firebase Storage
export const uploadFileToStorage = async (
  file: File,
  path: string,
  metadata: any = {},
  onProgress?: (progress: number) => void
): Promise<FileMetadata> => {
  const storageRef = ref(storage, path);
  
  // Create file metadata including content type
  const fileMetadata = {
    contentType: file.type,
    customMetadata: metadata
  };
  
  // Upload file and metadata
  const uploadTask = uploadBytesResumable(storageRef, file, fileMetadata);
  
  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // Track upload progress
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) {
          onProgress(progress);
        }
      },
      (error) => {
        // Handle errors
        console.error('Upload error:', error);
        reject(error);
      },
      async () => {
        // Upload completed successfully
        try {
          // Get download URL
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          // Return file metadata and download URL
          resolve({
            fileId: uploadTask.snapshot.ref.fullPath,
            fileUrl: downloadURL,
            fileName: file.name,
            fileType: file.type,
            uploadedAt: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error getting download URL:', error);
          reject(error);
        }
      }
    );
  });
};

// Delete file from Firebase Storage
export const deleteFileFromStorage = async (path: string): Promise<boolean> => {
  const fileRef = ref(storage, path);
  
  try {
    await deleteObject(fileRef);
    return true;
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
};

export { storage };