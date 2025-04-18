// components/sempro/FileUpload.tsx - perbaikan untuk mendukung metadata dan mencegah double upload
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadCloud, X, CheckCircle, File, Trash, FileCheck } from 'lucide-react';
import { FileMetadata } from '@/types/sempro';

interface FileUploadProps {
  id: string;
  acceptedFileTypes?: string;
  maxSize?: number; // in MB
  onFileSelected: (file: File | null) => void; // Changed to accept null
  progress?: number;
  currentFile: File | null;
  metadata?: FileMetadata | null; // Tambahan untuk mendukung file yang sudah terupload
}

export function FileUpload({
  id,
  acceptedFileTypes = '.pdf,.doc,.docx',
  maxSize = 10, // default dinaikkan ke 10MB
  onFileSelected,
  progress = 0,
  currentFile,
  metadata
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Get file extension from name
  const getFileExtension = (filename: string): string => {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
  };
  
  // Validate file
  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`Ukuran file melebihi batas ${maxSize}MB`);
      return false;
    }
    
    // Check file type
    const fileExt = getFileExtension(file.name).toLowerCase();
    const acceptedTypes = acceptedFileTypes
      .split(',')
      .map(type => type.trim().replace('.', '').toLowerCase());
      
    if (!acceptedTypes.includes(fileExt)) {
      setError(`Tipe file tidak didukung. Silakan upload file ${acceptedFileTypes}`);
      return false;
    }
    
    setError(null);
    return true;
  };
  
  // Handle file input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      console.log("File selected:", file.name, file.size); // Debug log
      if (validateFile(file)) {
        onFileSelected(file);
      }
    }
  };
  
  // Handle drag events
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  // Handle drop event
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      console.log("File dropped:", file.name, file.size); // Debug log
      if (validateFile(file)) {
        onFileSelected(file);
      }
    }
  };
  
  // Handle button click to trigger file input
  const handleButtonClick = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };
  
  // Handle remove file
  const handleRemoveFile = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    onFileSelected(null);
  };
  
  // Jika metadata tersedia, tandai file sebagai sudah terupload berhasil
  const isFileUploaded = !!metadata && !!metadata.fileUrl;
  
  return (
    <div className="w-full">
      {currentFile || isFileUploaded ? (
        <div className="border rounded-md p-3 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <File className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium truncate max-w-[200px]">
                  {metadata?.fileName || currentFile?.name || "File terupload"}
                </p>
                <p className="text-xs text-gray-500">
                  {currentFile ? formatFileSize(currentFile.size) : (
                    isFileUploaded ? "File sudah terupload" : ""
                  )}
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 text-red-500"
              onClick={handleRemoveFile}
            >
              <Trash className="h-4 w-4" />
              <span className="sr-only">Remove file</span>
            </Button>
          </div>
          
          {/* Hanya tampilkan progress jika file belum selesai diupload */}
          {!isFileUploaded && progress > 0 && progress < 100 && (
            <div className="mt-2">
              <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-right mt-1 text-gray-500">{progress}%</p>
            </div>
          )}
          
          {/* Tampilkan indikator sukses jika upload selesai */}
          {(isFileUploaded || progress === 100) && (
            <div className="flex items-center justify-end mt-2 text-green-600 text-xs">
              <FileCheck className="h-3 w-3 mr-1" />
              <span>Upload selesai</span>
            </div>
          )}
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center transition-colors ${
            dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Input
            id={id}
            ref={inputRef}
            type="file"
            accept={acceptedFileTypes}
            onChange={handleChange}
            className="hidden"
          />
          
          <UploadCloud className={`h-10 w-10 mb-2 ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} />
          <p className="text-sm text-center text-gray-600 mb-1">
            Drag & drop file di sini, atau {' '}
            <button
              type="button"
              className="text-blue-600 hover:text-blue-500 focus:outline-none"
              onClick={handleButtonClick}
            >
              pilih file
            </button>
          </p>
          <p className="text-xs text-gray-500 text-center">
            {acceptedFileTypes.replace(/\./g, '').toUpperCase()} hingga {maxSize}MB
          </p>
          
          {error && (
            <div className="mt-2 text-red-500 text-xs flex items-center">
              <X className="h-3 w-3 mr-1" />
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}