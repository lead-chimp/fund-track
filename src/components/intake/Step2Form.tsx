'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { IntakeSession } from '@/services/TokenService';

interface Step2FormProps {
  intakeSession: IntakeSession;
  onComplete: () => void;
}

interface UploadedFile {
  file: File;
  id: string;
  progress: number;
  error?: string | null;
}

export default function Step2Form({ intakeSession, onComplete }: Step2FormProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return 'Only PDF, JPG, PNG, and DOCX files are allowed';
    }
    if (file.size > maxFileSize) {
      return 'File size must be less than 10MB';
    }
    if (file.size === 0) {
      return 'File is empty';
    }
    return null;
  };

  const addFiles = (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const validFiles: UploadedFile[] = [];

    for (const file of fileArray) {
      const error = validateFile(file);
      validFiles.push({
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        progress: 0,
        error,
      });
    }

    setFiles(prev => {
      const combined = [...prev, ...validFiles];
      return combined.slice(0, 3); // Limit to 3 files
    });
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
    }
  };

  const handleUpload = async () => {
    if (files.length !== 3) {
      setUploadError('Please upload exactly 3 documents');
      return;
    }

    const validFiles = files.filter(f => !f.error);
    if (validFiles.length !== 3) {
      setUploadError('Please fix file errors before uploading');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      files.forEach(({ file }) => {
        formData.append('documents', file);
      });

      // Update progress for UI feedback
      setFiles(prev => prev.map(f => ({ ...f, progress: 50 })));

      const response = await fetch(`/api/intake/${intakeSession.token}/step2`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      // Update progress to complete
      setFiles(prev => prev.map(f => ({ ...f, progress: 100 })));

      // Wait a moment to show completion, then proceed
      setTimeout(() => {
        onComplete();
      }, 1000);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
      setFiles(prev => prev.map(f => ({ ...f, progress: 0 })));
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string): string => {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('word')) return '📝';
    return '📎';
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Step 2: Document Upload
        </h2>
        <p className="text-gray-600 mb-4">
          Please upload exactly 3 bank statements or financial documents. 
          Accepted formats: PDF, JPG, PNG, DOCX (max 10MB each).
        </p>
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : files.length >= 3
            ? 'border-gray-300 bg-gray-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {files.length < 3 ? (
          <>
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-900 mb-2">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-gray-500 mb-4">
              {3 - files.length} more document{3 - files.length !== 1 ? 's' : ''} needed
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              disabled={isUploading}
            >
              Choose Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
          </>
        ) : (
          <div className="text-gray-600">
            <svg className="mx-auto h-12 w-12 text-green-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="font-medium">All 3 documents ready for upload</p>
          </div>
        )}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Selected Documents ({files.length}/3)
          </h3>
          <div className="space-y-3">
            {files.map((uploadedFile) => (
              <div
                key={uploadedFile.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3 flex-1">
                  <span className="text-2xl">
                    {getFileIcon(uploadedFile.file.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {uploadedFile.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(uploadedFile.file.size)}
                    </p>
                    {uploadedFile.error && (
                      <p className="text-xs text-red-600 mt-1">
                        {uploadedFile.error}
                      </p>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                {uploadedFile.progress > 0 && (
                  <div className="w-24 mx-3">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadedFile.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Remove Button */}
                {!isUploading && (
                  <button
                    onClick={() => removeFile(uploadedFile.id)}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="Remove file"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {uploadError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{uploadError}</p>
        </div>
      )}

      {/* Upload Button */}
      <div className="mt-8 flex justify-between">
        <div className="text-sm text-gray-500">
          {files.length === 3 && !files.some(f => f.error) && (
            <span className="text-green-600 font-medium">
              ✓ Ready to upload
            </span>
          )}
        </div>
        
        <button
          onClick={handleUpload}
          disabled={files.length !== 3 || files.some(f => f.error) || isUploading}
          className={`px-6 py-2 rounded-md font-medium transition-colors ${
            files.length === 3 && !files.some(f => f.error) && !isUploading
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isUploading ? 'Uploading...' : 'Upload Documents'}
        </button>
      </div>
    </div>
  );
}