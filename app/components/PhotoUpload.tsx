'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface PhotoUploadProps {
  onImageUpload: (file: File) => void;
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

  const validateFile = (file: File): boolean => {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPG, PNG, or WebP)');
      return false;
    }

    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('File size must be less than 5MB');
      return false;
    }

    setError(null);
    return true;
  };

  const handleFileSelect = useCallback((file: File) => {
    if (validateFile(file)) {
      onImageUpload(file);
    }
  }, [onImageUpload]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    onImageRemove();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (imagePreview && uploadedImage) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="relative group">
          <div className="w-full h-64 rounded-lg border-2 border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
            <img
              src={imagePreview}
              alt="Uploaded product"
              className="max-w-full max-h-full object-contain"
              style={{ 
                backgroundColor: 'transparent',
                display: 'block'
              }}
              onError={(e) => {
                console.error('Image failed to load:', imagePreview);
                setError('Failed to display image preview. Please try uploading again.');
              }}
              onLoad={(e) => {
                console.log('Image loaded successfully');
                setError(null); // Clear any previous errors
              }}
            />
          </div>
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center pointer-events-none">
            <button
              onClick={handleRemove}
              className="opacity-0 group-hover:opacity-100 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-all duration-200 pointer-events-auto"
              disabled={isLoading}
              title="Remove image"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="mt-4 text-center">
          <div className="text-sm text-gray-700 font-medium">
            {uploadedImage.name}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {uploadedImage.type} • {(uploadedImage.size / 1024 / 1024).toFixed(2)} MB
          </div>
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={isLoading}
      />
      
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <div className="flex flex-col items-center space-y-4">
          {isLoading ? (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          ) : (
            <>
              <div className={`
                p-4 rounded-full
                ${isDragOver ? 'bg-blue-100' : 'bg-gray-100'}
              `}>
                <Upload size={32} className={isDragOver ? 'text-blue-500' : 'text-gray-400'} />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-700">
                  {isDragOver ? 'Drop your image here' : 'Upload a product photo'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Drag and drop or click to browse
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Supports JPG, PNG, WebP (max 5MB)
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
