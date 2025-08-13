'use client';

import { useState } from 'react';
import PhotoUpload from './components/PhotoUpload';

import { Camera, Search } from 'lucide-react';

export default function Home() {
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (file: File, previewUrl: string) => {
    console.log('File uploaded:', file.name, file.type, (file.size / 1024 / 1024).toFixed(1) + 'MB');
    
    setUploadedImage(file);
    setImagePreview(previewUrl);
    setError(null);
  };

  const handleImageRemove = () => {
    console.log('Removing uploaded image');
    
    // Clean up the image preview URL
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    
    setUploadedImage(null);
    setImagePreview(null);
    setError(null);
    setIsAnalyzing(false);
  };

  const handleAnalyze = async () => {
    if (!uploadedImage) {
      setError('No image selected for analysis');
      return;
    }
    
    console.log('Starting image analysis for:', uploadedImage.name);
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // TODO: Implement actual image analysis
      // This will be connected to:
      // 1. Google Vision API for text extraction
      // 2. eBay Finding API for price lookup
      // 3. Product normalization logic
      
      // For now, simulate the analysis process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Analysis complete (simulated)');
      
      // TODO: Process results and display pricing information
      
    } catch (error) {
      console.error('Analysis failed:', error);
      setError('Failed to analyze image. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Camera className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">ProductSource</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Take a photo of any product and discover its market value on eBay
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                Upload Product Photo
              </h2>
              <p className="text-gray-600">
                Get instant pricing insights from eBay sold listings
              </p>
            </div>

            <PhotoUpload
              onImageUpload={handleImageUpload}
              onImageRemove={handleImageRemove}
              uploadedImage={uploadedImage}
              imagePreview={imagePreview}
              isLoading={isAnalyzing}
            />

            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 text-center">{error}</p>
              </div>
            )}

            {uploadedImage && !isAnalyzing && (
              <div className="mt-8 text-center">
                <button
                  onClick={handleAnalyze}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 flex items-center justify-center mx-auto space-x-2"
                >
                  <Search size={20} />
                  <span>Analyze Product</span>
                </button>
              </div>
            )}

            {isAnalyzing && (
              <div className="mt-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Analyzing your product...</p>
              </div>
            )}
          </div>



          {/* How it works section */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h3 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
              How it works
            </h3>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">1. Take a Photo</h4>
                <p className="text-gray-600 text-sm">
                  Upload a clear photo of the product you want to price check
                </p>
              </div>
              <div className="text-center">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">2. AI Analysis</h4>
                <p className="text-gray-600 text-sm">
                  Our AI extracts product details and searches eBay sold listings
                </p>
              </div>
              <div className="text-center">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-purple-600">$</span>
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">3. Get Pricing</h4>
                <p className="text-gray-600 text-sm">
                  See average prices, recent sales, and market trends
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
