'use client';

import { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';

interface PhotoUploadProps {
  onImageUpload: (file: File, previewUrl: string) => void;
  onImageRemove: () => void;
  uploadedImage?: File | null;
  imagePreview?: string | null;
  isLoading?: boolean;
}

export default function PhotoUpload({
  onImageUpload,
  onImageRemove,
  uploadedImage,
  imagePreview,
  isLoading = false
}: PhotoUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simple file validation
  const validateFile = (file: File): string | null => {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return 'Please upload a JPG, PNG, or WebP image';
    }

    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return 'File must be smaller than 5MB';
    }

    return null;
  };

  const processFile = (file: File) => {
    setError(null);
    
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    onImageUpload(file, previewUrl);
  };

  // Drag and drop handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  // File input handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleClick = () => {
    if (!isLoading) {
      fileInputRef.current?.click();
    }
  };

  const handleRemove = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onImageRemove();
    setError(null);
  };

  // Show preview if image is uploaded
  if (uploadedImage && imagePreview) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="relative">
          <div className="w-full h-64 rounded-lg border-2 border-gray-200 overflow-hidden bg-gray-50">
            <img
              src={imagePreview}
              alt="Product preview"
              className="w-full h-full object-contain"
            />
          </div>
          
          {/* Remove button */}
          <button
            onClick={handleRemove}
            disabled={isLoading}
            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full disabled:opacity-50"
            title="Remove image"
          >
            <X size={16} />
          </button>
        </div>
        
        {/* File info */}
        <div className="mt-3 text-center">
          <p className="text-sm text-gray-600 font-medium">{uploadedImage.name}</p>
          <p className="text-xs text-gray-400">
            {(uploadedImage.size / 1024 / 1024).toFixed(1)} MB
          </p>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>
    );
  }

  // Show upload area
  return (
    <div className="w-full max-w-md mx-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isLoading}
      />
      
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <div className="flex flex-col items-center space-y-3">
          {isLoading ? (
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          ) : (
            <>
              <div className={`p-3 rounded-full ${isDragOver ? 'bg-blue-100' : 'bg-gray-100'}`}>
                <Upload size={24} className={isDragOver ? 'text-blue-500' : 'text-gray-400'} />
              </div>
              <div>
                <p className="font-medium text-gray-700">
                  {isDragOver ? 'Drop image here' : 'Upload product photo'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Click to browse or drag and drop
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  JPG, PNG, WebP up to 5MB
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
