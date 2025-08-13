// Utility functions to orchestrate the complete product analysis flow

import type { 
  AnalyzeImageResponse, 
  EbaySearchResponse, 
  ProductNormalizeResponse,
  EbayListing,
  NormalizedProduct
} from '@/types/api';

import { 
  assessAnalysisQuality, 
  generateFallbackStrategies, 
  handleEdgeCases, 
  suggestImageImprovements,
  type ProductAnalysisQuality
} from './product-analysis-helpers';

export interface CompleteAnalysisResult {
  success: boolean;
  productInfo: {
    extractedTexts: string[];
    normalized: NormalizedProduct;
    confidence: number;
  };
  pricing: {
    listings: EbayListing[];
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
    totalFound: number;
  };
  searchStrategy: string;
  processingTime: number;
  error?: string;
  // Enhanced analysis metadata
  quality?: ProductAnalysisQuality;
  edgeCase?: {
    isEdgeCase: boolean;
    edgeType: string;
    suggestion: string;
  };
  fallbackStrategies?: Array<{
    name: string;
    description: string;
    keywords: string[];
    confidence: number;
  }>;
  improvements?: string[];
}

/**
 * Orchestrates the complete product analysis flow with enhanced error handling:
 * 1. Analyze image with Google Vision
 * 2. Normalize extracted text  
 * 3. Search eBay for pricing
 * 4. Assess quality and provide fallback strategies
 */
export async function analyzeProductComplete(
  imageBase64: string, 
  imageMetadata?: { width?: number; height?: number; fileSize?: number }
): Promise<CompleteAnalysisResult> {
  const startTime = Date.now();
  
  try {
    // Use the centralized /api/analyze-complete endpoint for better consistency
    const completeAnalysisResponse = await fetch('/api/analyze-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64 }),
    });
    
    if (!completeAnalysisResponse.ok) {
      throw new Error(`Analysis failed: ${completeAnalysisResponse.status}`);
    }
    
    const result: CompleteAnalysisResult = await completeAnalysisResponse.json();
    
    // If analysis was successful, enhance with quality assessment
    if (result.success && result.productInfo) {
      const quality = assessAnalysisQuality(
        result.productInfo.extractedTexts,
        result.productInfo.normalized.brandName,
        result.productInfo.normalized.modelNumber,
        result.productInfo.normalized.searchKeywords
      );
      
      const edgeCase = handleEdgeCases(result.productInfo.extractedTexts, imageMetadata);
      const improvements = suggestImageImprovements(quality);
      
      // Generate fallback strategies if results are poor
      let fallbackStrategies: any[] = [];
      if (quality.overallScore < 0.6 || result.pricing.totalFound < 3) {
        fallbackStrategies = generateFallbackStrategies(
          result.productInfo.extractedTexts,
          [], // We don't have labels/objects in this context
          []
        );
      }
      
      return {
        ...result,
        quality,
        edgeCase,
        fallbackStrategies,
        improvements
      };
    }
    
    return result;

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    return {
      success: false,
      productInfo: {
        extractedTexts: [],
        normalized: {
          productName: '',
          searchKeywords: [],
          confidence: 0,
        },
        confidence: 0,
      },
      pricing: {
        listings: [],
        averagePrice: 0,
        minPrice: 0,
        maxPrice: 0,
        totalFound: 0,
      },
      searchStrategy: 'error',
      processingTime,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Helper function to convert File to base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = error => reject(error);
  });
}

/**
 * Helper function to format price for display
 */
export function formatPrice(price: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(price);
}

/**
 * Helper function to format date for display
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Unknown date';
  }
}

/**
 * Helper function to get confidence level description
 */
export function getConfidenceLevel(confidence: number): { level: string; color: string; description: string } {
  if (confidence >= 0.8) {
    return {
      level: 'High',
      color: 'green',
      description: 'Very confident in product identification',
    };
  } else if (confidence >= 0.6) {
    return {
      level: 'Medium',
      color: 'yellow',
      description: 'Moderately confident in product identification',
    };
  } else if (confidence >= 0.4) {
    return {
      level: 'Low',
      color: 'orange',
      description: 'Low confidence, results may be inaccurate',
    };
  } else {
    return {
      level: 'Very Low',
      color: 'red',
      description: 'Very low confidence, manual verification recommended',
    };
  }
}

/**
 * Retry function for API calls with exponential backoff
 */
export async function retryApiCall<T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // Don't retry on client errors (4xx)
      if (lastError.message.includes('400') || lastError.message.includes('401') || lastError.message.includes('403')) {
        throw lastError;
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries - 1) {
        throw lastError;
      }
      
      // Wait with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Validates image file before processing
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { isValid: false, error: 'Please select an image file' };
  }
  
  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { isValid: false, error: 'Image file is too large. Please select a file smaller than 10MB' };
  }
  
  // Check for minimum size
  const minSize = 1024; // 1KB
  if (file.size < minSize) {
    return { isValid: false, error: 'Image file is too small. Please select a valid image file' };
  }
  
  // Check supported formats
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!supportedTypes.includes(file.type)) {
    return { isValid: false, error: 'Unsupported image format. Please use JPEG, PNG, or WebP' };
  }
  
  return { isValid: true };
}
