'use client';

import { useState, useCallback } from 'react';
import PhotoUpload from './components/PhotoUpload';
import AnalysisProgress from './components/AnalysisProgress';
import AnalysisResults from './components/AnalysisResults';

import { Camera, Search } from 'lucide-react';
import { AnalyzeCompleteRequest } from '../types/api';
import type { CompleteAnalysisResult } from '../lib/product-analysis';

export default function Home() {
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<CompleteAnalysisResult | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('image_analysis');
  const [analysisSteps, setAnalysisSteps] = useState<any[]>([]);

  const handleImageUpload = (file: File, previewUrl: string) => {
    console.log('File uploaded:', file.name, file.type, (file.size / 1024 / 1024).toFixed(1) + 'MB');
    
    setUploadedImage(file);
    setImagePreview(previewUrl);
    setError(null);
  };

  const handleImageRemove = useCallback(() => {
    console.log('Removing uploaded image');
    
    // Clean up the image preview URL
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    
    setUploadedImage(null);
    setImagePreview(null);
    setError(null);
    setIsAnalyzing(false);
    setAnalysisResults(null);
    setCurrentStep('image_analysis');
    setAnalysisSteps([]);
  }, [imagePreview]);

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:image/jpeg;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleAnalyze = async () => {
    if (!uploadedImage) {
      setError('No image selected for analysis');
      return;
    }
    
    console.log('Starting image analysis for:', uploadedImage.name);
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResults(null);
    setCurrentStep('image_analysis');
    setAnalysisSteps([]);
    
    try {
      // Convert image to base64
      const base64Image = await fileToBase64(uploadedImage);
      
      const requestBody: AnalyzeCompleteRequest = {
        image: base64Image
      };

      console.log('Sending analysis request...');
      
      const response = await fetch('/api/analyze-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const result: CompleteAnalysisResult = await response.json();
      
      console.log('Analysis complete:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Analysis failed');
      }

      setAnalysisResults(result);
      
      // Determine success based on actual data
      const productFound = result.productInfo.normalized.productName && 
                          result.productInfo.normalized.productName.trim().length > 0 &&
                          result.productInfo.normalized.searchKeywords.length > 0;
      const pricingAvailable = result.pricing.totalFound > 0;
      
      // Show success or partial success messages
      if (productFound && pricingAvailable) {
        console.log('✅ Complete analysis successful');
      } else if (productFound) {
        setError('Product identified but pricing data unavailable. Try a clearer image or check the product name.');
      } else {
        setError('Unable to identify product. Please try a clearer image with visible product text or branding.');
      }
      
    } catch (error) {
      console.error('Analysis failed:', error);
      
      // Provide specific error messages based on error type
      let errorMessage = 'Failed to analyze image. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Analysis timed out. Please try with a smaller image.';
        } else if (error.message.includes('format')) {
          errorMessage = 'Invalid image format. Please use JPG, PNG, or WebP images.';
        } else if (error.message.includes('size')) {
          errorMessage = 'Image too large. Please use an image smaller than 5MB.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNewAnalysis = useCallback(() => {
    setAnalysisResults(null);
    setError(null);
    setCurrentStep('image_analysis');
    setAnalysisSteps([]);
    // Keep the current image for re-analysis
  }, []);

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
          {/* Upload Section - Show only if no results or analyzing */}
          {(!analysisResults || isAnalyzing) && (
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

              {error && !isAnalyzing && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600 text-center">{error}</p>
                </div>
              )}

              {uploadedImage && !isAnalyzing && !analysisResults && (
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

              {analysisResults && (
                <div className="mt-8 text-center">
                  <button
                    onClick={handleNewAnalysis}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center mx-auto space-x-2"
                  >
                    <Search size={18} />
                    <span>Analyze Again</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Progress Component */}
          <AnalysisProgress 
            isAnalyzing={isAnalyzing}
            currentStep={currentStep}
            steps={analysisSteps}
          />

          {/* Results Component */}
          {analysisResults && !isAnalyzing && (
            <AnalysisResults 
              results={analysisResults}
              onNewAnalysis={handleImageRemove}
            />
          )}



          {/* How it works section - Show only when no results */}
          {!analysisResults && (
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
          )}
        </div>
      </div>
    </div>
  );
}
